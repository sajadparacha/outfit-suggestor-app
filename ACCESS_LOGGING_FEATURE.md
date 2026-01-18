# Access Logging Feature

## Overview

This feature tracks all API requests to your application, recording:
- **IP Addresses**: Client IP addresses (handles proxies/load balancers)
- **Countries & Cities**: Geolocation data from IP addresses
- **Timestamps**: When requests were made
- **Age Groups**: User age demographics (when available)
- **Endpoints**: Which API endpoints were accessed
- **Response Times**: Performance metrics
- **User Information**: Associated user IDs for authenticated requests

## Features

### Automatic Logging
- All API requests are automatically logged via middleware
- Non-blocking: Logging doesn't slow down requests
- Handles geolocation lookup for IP addresses
- Extracts user information from JWT tokens
- **Operation Type Tracking**: Automatically categorizes operations:
  - AI Calls: `ai_outfit_suggestion`, `ai_wardrobe_analysis`
  - Wardrobe Operations: `wardrobe_add`, `wardrobe_update`, `wardrobe_delete`, `wardrobe_view`, `wardrobe_check_duplicate`, `wardrobe_summary`
  - Outfit History: `outfit_history_view`
  - Authentication: `auth_login`, `auth_register`

### API Endpoints

#### 1. Get Access Logs
```
GET /api/access-logs/
```
**Query Parameters:**
- `country` - Filter by country name
- `city` - Filter by city name
- `age_group` - Filter by age group (e.g., "18-24", "25-34")
- `ip_address` - Filter by specific IP address
- `user_id` - Filter by user ID
- `operation_type` - Filter by operation type (e.g., "ai_outfit_suggestion", "wardrobe_add", "outfit_history_view")
- `start_date` - Start date (YYYY-MM-DD)
- `end_date` - End date (YYYY-MM-DD)
- `endpoint` - Filter by endpoint path
- `limit` - Number of records (default: 100, max: 1000)
- `offset` - Pagination offset

**Example:**
```bash
GET /api/access-logs/?country=United%20States&start_date=2026-01-01&limit=50
```

#### 2. Get Statistics
```
GET /api/access-logs/stats
```
Returns aggregated statistics:
- Total requests
- Unique IP addresses
- Average response time
- Requests by country (top 20)
- Requests by city (top 20)
- Requests by age group
- Requests by endpoint (top 20)

**Query Parameters:**
- `start_date` - Start date (YYYY-MM-DD)
- `end_date` - End date (YYYY-MM-DD)

**Example:**
```bash
GET /api/access-logs/stats?start_date=2026-01-01&end_date=2026-01-31
```

#### 3. Get Usage Statistics
```
GET /api/access-logs/usage
```
Returns detailed usage statistics for AI calls, wardrobe operations, and outfit history.

**Query Parameters:**
- `start_date` - Start date (YYYY-MM-DD)
- `end_date` - End date (YYYY-MM-DD)
- `user_id` - Filter by specific user ID (optional)

**Returns:**
- AI Calls: outfit suggestions, wardrobe analysis, total calls, unique users, average response time
- Wardrobe Operations: add, update, delete, view, check_duplicate, summary counts
- Outfit History: view counts and unique users
- Top Users: Top 10 users with breakdown of their usage

**Example:**
```bash
GET /api/access-logs/usage?start_date=2026-01-01&end_date=2026-01-31
```

#### 4. Get Timeline
```
GET /api/access-logs/timeline
```
Returns access logs grouped by time period.

**Query Parameters:**
- `start_date` - Start date (YYYY-MM-DD)
- `end_date` - End date (YYYY-MM-DD)
- `group_by` - Time grouping: "hour", "day", or "week" (default: "hour")

**Example:**
```bash
GET /api/access-logs/timeline?group_by=day&start_date=2026-01-01
```

## Authentication

All access log endpoints require authentication. You must include a valid JWT token:
```bash
Authorization: Bearer <your_jwt_token>
```

## Database Schema

The `access_logs` table includes:
- `id` - Primary key
- `ip_address` - Client IP address
- `user_agent` - Browser/client information
- `endpoint` - API endpoint path
- `method` - HTTP method (GET, POST, etc.)
- `country` - Country name
- `country_code` - ISO country code
- `city` - City name
- `region` - Region/state
- `latitude` / `longitude` - Geographic coordinates
- `user_id` - Associated user ID (if authenticated)
- `operation_type` - Type of operation (e.g., "ai_outfit_suggestion", "wardrobe_add", "outfit_history_view")
- `age_group` - Age group (e.g., "18-24", "25-34", "35-44", "45-54", "55+")
- `status_code` - HTTP status code
- `response_time_ms` - Response time in milliseconds
- `timestamp` - Request timestamp
- `referer` - HTTP referer header
- `request_size` / `response_size` - Request/response sizes in bytes

## Geolocation Service

The system uses **ipapi.co** (free tier: 1000 requests/day) for IP geolocation lookup.

**Features:**
- Automatic country and city detection
- Handles localhost and private IPs gracefully
- Timeout protection (3 seconds)
- Error handling for API failures

**Note:** For production with high traffic, consider:
- Upgrading to a paid geolocation service
- Caching geolocation results
- Using a local IP database

## Age Group Tracking

Currently, age groups are set to `None` by default. To enable age group tracking:

1. **Option 1**: Add `age` field to User model
2. **Option 2**: Collect age during registration
3. **Option 3**: Infer from usage patterns (future enhancement)

Once age is available, the system will automatically categorize users into:
- "18-24"
- "25-34"
- "35-44"
- "45-54"
- "55+"

## Setup

1. **Database Migration**: The `access_logs` table will be created automatically when you start the application (via `Base.metadata.create_all()`)

2. **Environment Variables**: No additional environment variables required. The geolocation service uses the free tier.

3. **Dependencies**: All required packages are already in `requirements.txt`:
   - `requests` - For geolocation API calls
   - `SQLAlchemy` - For database operations

## Usage Examples

### View all access logs
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8001/api/access-logs/
```

### Get statistics for January 2026
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8001/api/access-logs/stats?start_date=2026-01-01&end_date=2026-01-31"
```

### View timeline by day
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8001/api/access-logs/timeline?group_by=day&start_date=2026-01-01"
```

### Filter by country
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8001/api/access-logs/?country=United%20States&limit=100"
```

### Filter by operation type (AI calls, wardrobe, etc.)
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8001/api/access-logs/?operation_type=ai_outfit_suggestion&limit=50"
```

### Get usage statistics
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8001/api/access-logs/usage?start_date=2026-01-01&end_date=2026-01-31"
```

## Performance Considerations

- **Non-blocking**: Logging happens after the response is sent, so it doesn't slow down requests
- **Database indexes**: Composite indexes are created for common query patterns
- **Geolocation caching**: Consider implementing caching for frequently accessed IPs
- **Batch processing**: For high-traffic applications, consider batching log writes

## Future Enhancements

- [ ] Add age field to User model for age group tracking
- [ ] Implement geolocation result caching
- [ ] Add real-time dashboard for access logs
- [ ] Export logs to CSV/JSON
- [ ] Add rate limiting based on IP/country
- [ ] Implement anomaly detection for suspicious access patterns

## Notes

- The middleware automatically logs all requests, including health checks
- Health check endpoints (`/`, `/health`) are also logged
- Failed requests (4xx, 5xx) are logged with their status codes
- Private IPs (localhost, 192.168.x.x, 10.x.x.x) won't have geolocation data
