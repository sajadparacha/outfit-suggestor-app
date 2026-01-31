import pytest
import httpx


pytestmark = pytest.mark.ai


def test_suggest_outfit_optional_ai(
    client: httpx.Client,
    auth_headers: dict,
    sample_image_upload,
    run_ai_tests: bool,
):
    if not run_ai_tests:
        pytest.skip("Set RUN_AI_TESTS=1 to run AI-calling tests against Railway.")

    files = {"image": sample_image_upload}
    data = {"text_input": "business casual", "generate_model_image": "false"}
    resp = client.post("/api/suggest-outfit", headers=auth_headers, files=files, data=data)
    resp.raise_for_status()
    out = resp.json()
    # Basic contract
    for key in ["shirt", "trouser", "blazer", "shoes", "belt", "reasoning"]:
        assert key in out

