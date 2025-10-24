# API Documentation - AI Outfit Suggester

## Base URL

- **Development**: `http://localhost:8001`
- **Production**: `https://your-domain.com`

## Authentication

Currently, the API does not require authentication. Future versions will include API key authentication.

---

## Endpoints

### 1. Health Check

Check if the API is running.

**Endpoint**: `GET /`

**Response**:
```json
{
  "message": "AI Outfit Suggestor API is running!",
  "version": "2.0.0",
  "status": "healthy"
}
```

**Status Codes**:
- `200 OK`: API is running

---

### 2. Detailed Health Check

Get detailed health status.

**Endpoint**: `GET /health`

**Response**:
```json
{
  "status": "healthy",
  "service": "AI Outfit Suggestor",
  "version": "2.0.0"
}
```

**Status Codes**:
- `200 OK`: Service is healthy

---

### 3. Get Outfit Suggestion

Analyze an uploaded image and get AI-powered outfit suggestions.

**Endpoint**: `POST /api/suggest-outfit`

**Content-Type**: `multipart/form-data`

**Request Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `image` | File | Yes | Image file of shirt/blazer (JPEG, PNG, GIF, BMP, WebP) |
| `text_input` | String | No | Additional context or preferences (e.g., "Business meeting", "Casual Friday") |

**Example Request (cURL)**:
```bash
curl -X POST "http://localhost:8001/api/suggest-outfit" \
  -F "image=@/path/to/shirt.jpg" \
  -F "text_input=Business casual, modern style"
```

**Example Request (JavaScript)**:
```javascript
const formData = new FormData();
formData.append('image', imageFile);
formData.append('text_input', 'Business casual, modern style');

const response = await fetch('http://localhost:8001/api/suggest-outfit', {
  method: 'POST',
  body: formData
});

const outfit = await response.json();
```

**Example Request (Python)**:
```python
import requests

url = "http://localhost:8001/api/suggest-outfit"
files = {'image': open('shirt.jpg', 'rb')}
data = {'text_input': 'Business casual, modern style'}

response = requests.post(url, files=files, data=data)
outfit = response.json()
```

**Success Response** (200 OK):
```json
{
  "shirt": "A crisp white button-down dress shirt with subtle texture",
  "trouser": "Navy blue tailored dress trousers with a slim fit",
  "blazer": "Charcoal gray single-breasted blazer with notch lapels",
  "shoes": "Dark brown leather oxford shoes with cap toe detail",
  "belt": "Cognac brown leather belt with silver buckle",
  "reasoning": "This outfit combines classic business attire with modern proportions. The white shirt provides a clean base, while the navy trousers and charcoal blazer create a sophisticated palette. The brown shoes and belt add warmth and break up the cool tones, creating a balanced, professional look suitable for most business occasions."
}
```

**Error Responses**:

**400 Bad Request** - Invalid image:
```json
{
  "detail": "File must be an image"
}
```

**400 Bad Request** - Image too large:
```json
{
  "detail": "Image too large. Please upload an image smaller than 10MB"
}
```

**500 Internal Server Error** - Processing error:
```json
{
  "detail": "Error calling OpenAI API: [error details]"
}
```

**Status Codes**:
- `200 OK`: Suggestion generated successfully
- `400 Bad Request`: Invalid request (wrong file type, too large, etc.)
- `500 Internal Server Error`: Server-side error

---

## Data Models

### OutfitSuggestion

```typescript
interface OutfitSuggestion {
  shirt: string;      // Description of recommended shirt
  trouser: string;    // Description of recommended trousers/pants
  blazer: string;     // Description of recommended blazer/jacket
  shoes: string;      // Description of recommended shoes
  belt: string;       // Description of recommended belt
  reasoning: string;  // Explanation of why this outfit works
}
```

---

## Rate Limiting

Currently, there are no rate limits. Future versions will implement:
- 100 requests per hour for free tier
- Higher limits for authenticated users

---

## Error Handling

All errors follow this structure:

```json
{
  "detail": "Human-readable error message"
}
```

Common error scenarios:
1. **Invalid file type**: Upload a valid image format
2. **File too large**: Reduce image size to under 10MB
3. **Missing image**: Include image in the request
4. **API key issues**: Check OpenAI API key configuration
5. **Network errors**: Check internet connection

---

## Best Practices

### 1. Image Requirements
- **Formats**: JPEG, PNG, GIF, BMP, WebP
- **Size**: Maximum 10MB
- **Content**: Clear image of shirt, blazer, or upper body garment
- **Quality**: Higher quality images produce better suggestions

### 2. Text Input Tips
- Be specific about occasion (e.g., "Wedding guest", "Job interview")
- Mention preferred style (e.g., "Modern", "Classic", "Trendy")
- Include season if relevant (e.g., "Summer outdoor event")
- Mention color preferences or restrictions

### 3. Performance Optimization
- Resize images before upload (recommended max: 2048x2048)
- Compress images to reduce upload time
- Cache responses when possible

### 4. Error Handling
```javascript
try {
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const error = await response.json();
    console.error('API Error:', error.detail);
    // Handle error
  }
  
  const data = await response.json();
  // Use data
} catch (error) {
  console.error('Network Error:', error);
  // Handle network error
}
```

---

## Platform-Specific Examples

### Android (Kotlin)

```kotlin
val client = OkHttpClient()

val requestBody = MultipartBody.Builder()
    .setType(MultipartBody.FORM)
    .addFormDataPart(
        "image", 
        "photo.jpg",
        RequestBody.create(MediaType.parse("image/jpeg"), imageFile)
    )
    .addFormDataPart("text_input", "Business casual")
    .build()

val request = Request.Builder()
    .url("http://your-api.com/api/suggest-outfit")
    .post(requestBody)
    .build()

client.newCall(request).enqueue(object : Callback {
    override fun onResponse(call: Call, response: Response) {
        val json = response.body?.string()
        val outfit = Gson().fromJson(json, OutfitSuggestion::class.java)
        // Use outfit
    }
    
    override fun onFailure(call: Call, e: IOException) {
        // Handle error
    }
})
```

### iOS (Swift)

```swift
let url = URL(string: "http://your-api.com/api/suggest-outfit")!
var request = URLRequest(url: url)
request.httpMethod = "POST"

let boundary = UUID().uuidString
request.setValue("multipart/form-data; boundary=\(boundary)", 
                 forHTTPHeaderField: "Content-Type")

// Create multipart body
var body = Data()
// ... add image and text_input parts ...

request.httpBody = body

URLSession.shared.dataTask(with: request) { data, response, error in
    guard let data = data else { return }
    
    let outfit = try? JSONDecoder().decode(OutfitSuggestion.self, from: data)
    // Use outfit
}.resume()
```

### React Native

```javascript
import { launchImageLibrary } from 'react-native-image-picker';

const pickImage = async () => {
  const result = await launchImageLibrary({ mediaType: 'photo' });
  
  if (result.assets && result.assets[0]) {
    const formData = new FormData();
    formData.append('image', {
      uri: result.assets[0].uri,
      type: 'image/jpeg',
      name: 'photo.jpg'
    });
    formData.append('text_input', 'Casual weekend');
    
    const response = await fetch('http://your-api.com/api/suggest-outfit', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });
    
    const outfit = await response.json();
    // Use outfit
  }
};
```

---

## Interactive Documentation

When the backend is running, visit these URLs for interactive API documentation:

- **Swagger UI**: http://localhost:8001/docs
- **ReDoc**: http://localhost:8001/redoc

These interfaces allow you to:
- See all endpoints
- View request/response schemas
- Test API calls directly in the browser
- Download OpenAPI specification

---

## Changelog

### Version 2.0.0 (Current)
- Refactored to service-oriented architecture
- Improved error handling
- Added health check endpoints
- Better documentation
- Platform-agnostic design

### Version 1.0.0
- Initial release
- Basic outfit suggestion endpoint
- OpenAI integration

---

## Support

For API issues or questions:
1. Check this documentation
2. Visit interactive docs at `/docs`
3. Review error messages in responses
4. Check application logs

---

## Future Roadmap

- [ ] Authentication with API keys
- [ ] Rate limiting
- [ ] Webhook support
- [ ] Batch processing
- [ ] Image URL support (in addition to file upload)
- [ ] Multiple image analysis
- [ ] User preference profiles
- [ ] Outfit history
- [ ] Shopping link integration

