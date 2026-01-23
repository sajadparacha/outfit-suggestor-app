"""
Pytest configuration and fixtures for API endpoint tests
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import os
import tempfile
import shutil
from io import BytesIO
from PIL import Image

# Import app and database
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from models.database import Base, get_db
from models.user import User
from models.wardrobe import WardrobeItem
from models.outfit_history import OutfitHistory
from utils.auth import get_password_hash
from dependencies import get_current_user, get_current_active_user, get_optional_user


# Create in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db():
    """Create a fresh database for each test"""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db):
    """Create a test client with database override"""
    def override_get_db():
        try:
            yield db
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db):
    """Create a test user"""
    user = User(
        email="test@example.com",
        hashed_password=get_password_hash("testpassword123"),
        full_name="Test User",
        is_active=True,
        email_verified=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def test_user2(db):
    """Create a second test user"""
    user = User(
        email="test2@example.com",
        hashed_password=get_password_hash("testpassword123"),
        full_name="Test User 2",
        is_active=True,
        email_verified=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def auth_token(client, test_user):
    """Get authentication token for test user"""
    response = client.post(
        "/api/auth/login",
        data={"username": test_user.email, "password": "testpassword123"}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.fixture
def auth_headers(auth_token, test_user):
    """Get authorization headers and setup auth override"""
    from tests.test_helpers import setup_auth_override
    setup_auth_override(test_user)
    headers = {"Authorization": f"Bearer {auth_token}"}
    yield headers
    from tests.test_helpers import clear_auth_override
    clear_auth_override()


@pytest.fixture
def sample_image():
    """Create a sample image file for testing"""
    # Create a simple 100x100 RGB image
    img = Image.new('RGB', (100, 100), color='red')
    img_bytes = BytesIO()
    img.save(img_bytes, format='JPEG')
    img_bytes.seek(0)
    return ("test_image.jpg", img_bytes, "image/jpeg")


@pytest.fixture
def sample_image_file(sample_image):
    """Create a file-like object for image upload"""
    return sample_image[1]


@pytest.fixture
def wardrobe_item(db, test_user, sample_image):
    """Create a test wardrobe item"""
    # Read image data
    sample_image[1].seek(0)
    image_data = sample_image[1].read()
    import base64
    image_base64 = base64.b64encode(image_data).decode('utf-8')
    
    item = WardrobeItem(
        user_id=test_user.id,
        category="shirt",
        color="Blue",
        description="Test shirt",
        image_data=image_base64
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@pytest.fixture
def outfit_history_entry(db, test_user):
    """Create a test outfit history entry"""
    entry = OutfitHistory(
        user_id=test_user.id,
        text_input="Test preference",
        shirt="Blue shirt",
        trouser="Black pants",
        blazer="Navy blazer",
        shoes="Brown shoes",
        belt="Black belt",
        reasoning="Test reasoning"
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry
