"""
Unit tests for image processing utilities (validate_image, encode_image)
"""
import pytest
from io import BytesIO
from PIL import Image
from fastapi import UploadFile, HTTPException
from starlette.datastructures import UploadFile as StarletteUploadFile, Headers

# Import after path setup in conftest
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.image_processor import validate_image, encode_image


def _make_upload_file(content: bytes, filename: str = "test.jpg", content_type: str = "image/jpeg") -> UploadFile:
    """Create an UploadFile-like object for testing."""
    file = BytesIO(content)
    headers = Headers({"content-type": content_type}) if content_type else Headers()
    u = StarletteUploadFile(filename=filename, file=file, size=len(content), headers=headers)
    return u


class TestValidateImage:
    """Unit tests for validate_image"""

    def test_accepts_small_image(self):
        """Image under max size should pass validation"""
        img = Image.new('RGB', (100, 100), color='red')
        buf = BytesIO()
        img.save(buf, format='JPEG')
        buf.seek(0)
        content = buf.getvalue()
        upload = _make_upload_file(content)
        # Should not raise
        validate_image(upload, max_size_mb=10)

    def test_accepts_image_at_exact_limit(self):
        """Image at exactly max size should pass"""
        # Create ~10MB content (10 * 1024 * 1024 bytes)
        size = 10 * 1024 * 1024
        content = b'\x00' * size
        upload = _make_upload_file(content, content_type="image/jpeg")
        # At limit - should pass (<= not <)
        validate_image(upload, max_size_mb=10)

    def test_rejects_oversized_image(self):
        """Image over max size should raise HTTPException 400"""
        size = 11 * 1024 * 1024  # 11 MB
        content = b'\x00' * size
        upload = _make_upload_file(content, content_type="image/jpeg")
        with pytest.raises(HTTPException) as exc_info:
            validate_image(upload, max_size_mb=10)
        assert exc_info.value.status_code == 400
        assert "too large" in exc_info.value.detail.lower()
        assert "10" in exc_info.value.detail

    def test_rejects_non_image_content_type(self):
        """Non-image content type should raise HTTPException 400"""
        content = b'\x00\x01\x02'
        upload = _make_upload_file(content, content_type="application/octet-stream")
        with pytest.raises(HTTPException) as exc_info:
            validate_image(upload, max_size_mb=10)
        assert exc_info.value.status_code == 400
        assert "image" in exc_info.value.detail.lower()

    def test_rejects_empty_content_type(self):
        """Missing content type should raise HTTPException 400"""
        content = b'\x00\x01\x02'
        # Create UploadFile with no content-type header
        u = StarletteUploadFile(filename="test", file=BytesIO(content), size=len(content), headers=Headers())
        with pytest.raises(HTTPException) as exc_info:
            validate_image(u, max_size_mb=10)
        assert exc_info.value.status_code == 400


class TestEncodeImage:
    """Unit tests for encode_image"""

    def test_encode_returns_base64_string(self):
        """encode_image should return base64 encoded string"""
        img = Image.new('RGB', (50, 50), color='blue')
        buf = BytesIO()
        img.save(buf, format='JPEG')
        buf.seek(0)
        result = encode_image(buf)
        assert isinstance(result, str)
        # Base64 chars only
        import base64
        try:
            base64.b64decode(result)
        except Exception:
            pytest.fail("Result should be valid base64")

    def test_encode_resizes_large_image(self):
        """encode_image should resize images larger than 1024px"""
        import base64
        img = Image.new('RGB', (2000, 1500), color='green')
        buf = BytesIO()
        img.save(buf, format='JPEG')
        buf.seek(0)
        result = encode_image(buf)
        img_data = base64.b64decode(result)
        out_img = Image.open(BytesIO(img_data))
        assert out_img.width <= 1024
        assert out_img.height <= 1024
