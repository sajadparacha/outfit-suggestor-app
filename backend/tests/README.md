# API Endpoint Test Suite

This directory contains comprehensive test cases for all API endpoints in the Outfit Suggestor application.

## Test Structure

- `conftest.py` - Pytest fixtures and configuration
- `test_auth_endpoints.py` - Authentication endpoints tests
- `test_outfit_endpoints.py` - Outfit suggestion endpoints tests
- `test_wardrobe_endpoints.py` - Wardrobe management endpoints tests
- `test_access_log_endpoints.py` - Access logging endpoints tests

## Running Tests

### Install Dependencies

```bash
cd backend
pip install pytest pytest-asyncio httpx
```

### Run All Tests

```bash
pytest tests/
```

### Run Specific Test File

```bash
pytest tests/test_auth_endpoints.py
```

### Run with Verbose Output

```bash
pytest tests/ -v
```

### Run with Coverage

```bash
pytest tests/ --cov=. --cov-report=html
```

## Test Coverage

### Authentication Endpoints (`/api/auth/*`)
- ✅ User registration
- ✅ User login
- ✅ Get current user info
- ✅ Change password
- ✅ Account activation
- ✅ Error handling (invalid credentials, duplicate emails, etc.)

### Outfit Endpoints (`/api/suggest-outfit`, `/api/outfit-history/*`)
- ✅ Get outfit suggestion
- ✅ Check for duplicate images
- ✅ Get outfit history
- ✅ Delete outfit history entry
- ✅ Suggest outfit from wardrobe item
- ✅ Model image generation
- ✅ Anonymous and authenticated access

### Wardrobe Endpoints (`/api/wardrobe/*`)
- ✅ Add wardrobe item
- ✅ Get wardrobe items (all and filtered)
- ✅ Get specific wardrobe item
- ✅ Update wardrobe item
- ✅ Delete wardrobe item
- ✅ Get wardrobe summary
- ✅ Check for duplicate wardrobe items
- ✅ Analyze wardrobe image with AI
- ✅ User isolation (can't access other users' items)

### Access Log Endpoints (`/api/access-logs/*`)
- ✅ Get access logs
- ✅ Filter by operation type, endpoint, user, date range
- ✅ Pagination (limit, offset)
- ✅ Get statistics
- ✅ Authentication required

## Test Fixtures

- `db` - Fresh database session for each test
- `client` - FastAPI TestClient instance
- `test_user` - Test user with authentication
- `test_user2` - Second test user for isolation tests
- `auth_token` - JWT token for test user
- `auth_headers` - Authorization headers
- `sample_image` - Sample image file for testing
- `wardrobe_item` - Test wardrobe item
- `outfit_history_entry` - Test outfit history entry

## Notes

- Tests use an in-memory SQLite database for isolation
- Each test gets a fresh database state
- Authentication is handled via fixtures
- Some tests may require API keys (OpenAI, etc.) but will gracefully handle missing keys
- Tests are designed to be independent and can run in any order
