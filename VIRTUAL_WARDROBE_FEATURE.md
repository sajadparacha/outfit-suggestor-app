# Virtual Wardrobe Feature Implementation

## Overview

This document describes the implementation of the Virtual Wardrobe feature, which allows users to save their existing clothing items to their account. When generating outfit recommendations, the AI will consider what items the user already has in their wardrobe and prioritize suggesting outfits using those items.

## Features Implemented

### 1. Database Model (`WardrobeItem`)
- Stores individual clothing items with details:
  - Category (shirt, trouser, blazer, shoes, belt, etc.)
  - Name, description, color, brand, size
  - Image (base64 encoded)
  - Tags, condition, purchase date
  - Wear count and last worn date
- Linked to user accounts via foreign key
- Cascade delete when user is deleted

### 2. Wardrobe Service (`WardrobeService`)
Business logic for wardrobe operations:
- `add_wardrobe_item()` - Add new items to wardrobe
- `get_user_wardrobe()` - Get all items, optionally filtered by category
- `get_wardrobe_item()` - Get specific item
- `update_wardrobe_item()` - Update item details
- `delete_wardrobe_item()` - Remove item from wardrobe
- `get_wardrobe_summary()` - Get statistics (total items, by category, by color)
- `get_wardrobe_items_by_categories()` - Get items grouped by categories for outfit suggestions

### 3. API Endpoints (`/api/wardrobe`)

#### POST `/api/wardrobe`
Add a new wardrobe item
- **Auth Required**: Yes
- **Body**: Form data with category (required), name, description, color, brand, size, tags, condition, and optional image file
- **Returns**: Created WardrobeItemResponse

#### GET `/api/wardrobe`
Get user's wardrobe items
- **Auth Required**: Yes
- **Query Parameters**: `category` (optional filter)
- **Returns**: List of WardrobeItemResponse

#### GET `/api/wardrobe/summary`
Get wardrobe statistics
- **Auth Required**: Yes
- **Returns**: WardrobeSummaryResponse (total items, by category, by color)

#### GET `/api/wardrobe/{item_id}`
Get specific wardrobe item
- **Auth Required**: Yes
- **Returns**: WardrobeItemResponse

#### PUT `/api/wardrobe/{item_id}`
Update wardrobe item
- **Auth Required**: Yes
- **Body**: Form data with fields to update (same as POST)
- **Returns**: Updated WardrobeItemResponse

#### DELETE `/api/wardrobe/{item_id}`
Delete wardrobe item
- **Auth Required**: Yes
- **Returns**: Success message

### 4. Integration with Outfit Suggestions

When generating outfit recommendations:
1. If user is authenticated, their wardrobe items are fetched
2. Items are grouped by category (shirt, trouser, blazer, shoes, belt)
3. Wardrobe information is passed to the AI service
4. AI prompt is enhanced to include user's wardrobe items
5. AI prioritizes suggesting outfits using items from the user's wardrobe
6. Only suggests new items if wardrobe doesn't have suitable options

### 5. AI Prompt Enhancement

The outfit suggestion prompt now includes:
- List of user's wardrobe items by category
- Instructions to prioritize using items from wardrobe
- Guidance to only suggest new items when necessary
- Reference to item details (name, color, brand, description) when recommending wardrobe items

## Database Schema

```sql
CREATE TABLE wardrobe_items (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    name VARCHAR(255),
    description TEXT,
    color VARCHAR(100),
    brand VARCHAR(255),
    size VARCHAR(50),
    image_data TEXT,  -- Base64 encoded image
    tags TEXT,
    condition VARCHAR(50),
    purchase_date TIMESTAMP,
    last_worn TIMESTAMP,
    wear_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wardrobe_items_user_id ON wardrobe_items(user_id);
CREATE INDEX idx_wardrobe_items_category ON wardrobe_items(category);
CREATE INDEX idx_wardrobe_items_color ON wardrobe_items(color);
```

## API Request/Response Examples

### Add Wardrobe Item

**Request:**
```
POST /api/wardrobe
Content-Type: multipart/form-data
Authorization: Bearer {token}

Form Data:
- category: "shirt" (required)
- name: "Blue Oxford Shirt"
- description: "Classic blue oxford button-down shirt"
- color: "Navy blue"
- brand: "Ralph Lauren"
- size: "Large"
- image: [image file]
```

**Response:**
```json
{
  "id": 1,
  "category": "shirt",
  "name": "Blue Oxford Shirt",
  "description": "Classic blue oxford button-down shirt",
  "color": "Navy blue",
  "brand": "Ralph Lauren",
  "size": "Large",
  "image_data": "base64_encoded_image...",
  "tags": null,
  "condition": "good",
  "wear_count": 0,
  "created_at": "2024-01-01T12:00:00",
  "updated_at": "2024-01-01T12:00:00"
}
```

### Get Wardrobe Summary

**Request:**
```
GET /api/wardrobe/summary
Authorization: Bearer {token}
```

**Response:**
```json
{
  "total_items": 15,
  "by_category": {
    "shirt": 5,
    "trouser": 3,
    "blazer": 2,
    "shoes": 4,
    "belt": 1
  },
  "by_color": {
    "Navy blue": 3,
    "Black": 5,
    "Gray": 4,
    "White": 3
  },
  "categories": ["shirt", "trouser", "blazer", "shoes", "belt"]
}
```

## Usage Flow

1. **User adds items to wardrobe:**
   - User uploads image and provides details (category, color, brand, etc.)
   - Item is saved to database

2. **User requests outfit suggestion:**
   - User uploads a clothing item image
   - System fetches user's wardrobe items
   - AI generates recommendation considering wardrobe items
   - Recommendation prioritizes items from wardrobe

3. **AI Response includes wardrobe context:**
   - "You already have a navy blue oxford shirt that would work well..."
   - "Consider pairing your black dress trousers with..."
   - Only suggests new items if wardrobe lacks suitable options

## Benefits

1. **Personalized Recommendations**: Outfits tailored to what user already owns
2. **Cost Efficiency**: Reduces need to purchase new items
3. **Sustainability**: Encourages using existing wardrobe
4. **Practical Utility**: Helps users style outfits from their own clothes
5. **Better User Experience**: More relevant and actionable suggestions

## Future Enhancements

1. **Bulk Import**: Upload multiple images at once
2. **AI Item Recognition**: Auto-detect category, color, brand from image
3. **Wardrobe Analytics**: Most worn items, cost per wear, style patterns
4. **Outfit Planning**: Generate outfits using only wardrobe items
5. **Shopping List**: Suggest items to add based on wardrobe gaps
6. **Seasonal Organization**: Organize items by season
7. **Outfit Favorites**: Save favorite outfits using wardrobe items

## Testing

To test the feature:

1. **Add items to wardrobe:**
   ```bash
   curl -X POST http://localhost:8001/api/wardrobe \
     -H "Authorization: Bearer {token}" \
     -F "category=shirt" \
     -F "name=Blue Shirt" \
     -F "color=Navy" \
     -F "image=@shirt.jpg"
   ```

2. **Get wardrobe:**
   ```bash
   curl http://localhost:8001/api/wardrobe \
     -H "Authorization: Bearer {token}"
   ```

3. **Request outfit suggestion:**
   - The system will automatically use wardrobe items in suggestions when user is authenticated

## Notes

- All wardrobe endpoints require authentication
- Items are user-specific (users can only see/modify their own items)
- Images are stored as base64 strings in the database (consider moving to object storage for production)
- Category values are case-insensitive (stored as lowercase)


