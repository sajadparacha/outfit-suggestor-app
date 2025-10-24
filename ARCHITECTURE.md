# AI Outfit Suggester - Architecture Documentation

## Overview

This application has been refactored to follow a clean, modular architecture that separates the **Backend API** from **Client Applications**. This allows multiple client platforms (Web, Android, iOS) to consume the same backend services.

## Architecture Pattern

The application follows a **Service-Oriented Architecture (SOA)** with:
- **Backend**: RESTful API with service layer architecture
- **Frontend**: MVC (Model-View-Controller) pattern adapted for React

---

## Backend Architecture

### Directory Structure

```
backend/
├── main.py                 # Application entry point
├── config.py              # Configuration and dependency injection
├── models/                # Data models (Pydantic schemas)
│   ├── __init__.py
│   └── outfit.py          # Outfit-related models
├── services/              # Business logic layer
│   ├── __init__.py
│   └── ai_service.py      # AI/OpenAI integration
├── routes/                # API endpoints
│   ├── __init__.py
│   └── outfit_routes.py   # Outfit suggestion endpoints
└── utils/                 # Utility functions
    ├── __init__.py
    └── image_processor.py # Image processing utilities
```

### Layers

#### 1. **Models Layer** (`models/`)
- Defines data structures using Pydantic
- Provides validation and serialization
- Example: `OutfitSuggestion`, `OutfitRequest`

#### 2. **Services Layer** (`services/`)
- Contains business logic
- Handles external API calls (OpenAI)
- Independent of HTTP/API layer
- Reusable across different endpoints

**Key Service:**
- `AIService`: Manages OpenAI API integration for outfit suggestions

#### 3. **Routes Layer** (`routes/`)
- Defines API endpoints
- Handles HTTP requests/responses
- Uses services for business logic
- Returns standardized responses

**Available Endpoints:**
- `GET /` - Health check
- `GET /health` - Detailed health status
- `POST /api/suggest-outfit` - Get outfit suggestions

#### 4. **Utils Layer** (`utils/`)
- Helper functions for common tasks
- Image processing and validation
- No business logic

### Dependency Injection

The application uses dependency injection for:
- AI Service instance (singleton pattern)
- Configuration management
- Easy testing and mocking

### API Specification

#### POST /api/suggest-outfit

**Request:**
```
Content-Type: multipart/form-data

Fields:
- image: File (required) - Image file to analyze
- text_input: String (optional) - Additional context or preferences
```

**Response:**
```json
{
  "shirt": "Description of recommended shirt",
  "trouser": "Description of recommended trousers",
  "blazer": "Description of recommended blazer",
  "shoes": "Description of recommended shoes",
  "belt": "Description of recommended belt",
  "reasoning": "Explanation of why this outfit works"
}
```

**Error Response:**
```json
{
  "detail": "Error message"
}
```

---

## Frontend Architecture

### Directory Structure

```
frontend/src/
├── App.tsx                     # Main application component
├── models/                     # Data models and TypeScript interfaces
│   ├── index.ts
│   └── OutfitModels.ts        # Outfit-related interfaces
├── services/                   # API communication layer
│   ├── index.ts
│   └── ApiService.ts          # Backend API client
├── controllers/                # Business logic (React hooks)
│   ├── index.ts
│   ├── useOutfitController.ts # Outfit management logic
│   └── useToastController.ts  # Toast notification logic
├── views/                      # Presentation layer
│   └── components/            # React components
│       ├── Hero.tsx
│       ├── Sidebar.tsx
│       ├── OutfitPreview.tsx
│       ├── Footer.tsx
│       └── Toast.tsx
└── utils/                      # Utility functions
    ├── index.ts
    ├── imageUtils.ts          # Image helpers
    └── constants.ts           # Application constants
```

### MVC Pattern (Adapted for React)

#### 1. **Models** (`models/`)
- TypeScript interfaces and types
- Define data structures
- No logic, just type definitions

**Key Models:**
- `OutfitSuggestion`: Complete outfit data
- `Filters`: User preference filters
- `OutfitRequest`: API request structure
- `OutfitResponse`: API response structure

#### 2. **Views** (`views/components/`)
- Presentational React components
- Receive data via props
- Emit events via callbacks
- No business logic

**Key Components:**
- `Hero`: Landing section
- `Sidebar`: Input and filters
- `OutfitPreview`: Results display
- `Toast`: Notifications
- `Footer`: Page footer

#### 3. **Controllers** (`controllers/`)
- Custom React hooks
- Contain business logic
- Manage state
- Call services
- Handle user interactions

**Key Controllers:**
- `useOutfitController`: Manages outfit suggestion flow
- `useToastController`: Manages notifications

#### 4. **Services** (`services/`)
- API communication layer
- HTTP request handling
- Can be reused by other platforms (Android/iOS)

**Key Service:**
- `ApiService`: Singleton service for backend communication

---

## Multi-Platform Support

### How Other Clients Can Use the Backend

The backend is designed as a **platform-agnostic RESTful API**. Any client (Web, Android, iOS, Desktop) can consume it.

#### For Android (Kotlin/Java)

```kotlin
// Example using Retrofit or OkHttp
val client = OkHttpClient()
val requestBody = MultipartBody.Builder()
    .setType(MultipartBody.FORM)
    .addFormDataPart("image", "photo.jpg", 
        RequestBody.create(MediaType.parse("image/jpeg"), imageFile))
    .addFormDataPart("text_input", "Business casual, blue shirt")
    .build()

val request = Request.Builder()
    .url("https://your-api.com/api/suggest-outfit")
    .post(requestBody)
    .build()

client.newCall(request).enqueue(object : Callback {
    override fun onResponse(call: Call, response: Response) {
        val outfit = gson.fromJson(response.body?.string(), OutfitSuggestion::class.java)
        // Use outfit data
    }
})
```

#### For iOS (Swift)

```swift
// Example using URLSession
var request = URLRequest(url: URL(string: "https://your-api.com/api/suggest-outfit")!)
request.httpMethod = "POST"

let boundary = UUID().uuidString
request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

var body = Data()
// Add image and text_input to multipart body

URLSession.shared.dataTask(with: request) { data, response, error in
    if let data = data {
        let outfit = try? JSONDecoder().decode(OutfitSuggestion.self, from: data)
        // Use outfit data
    }
}.resume()
```

#### For React Native

The same `ApiService` from the web frontend can be reused with minimal modifications.

---

## Data Flow

### Complete Request Flow

```
1. User uploads image in UI (View)
   ↓
2. Controller receives image via event handler
   ↓
3. Controller calls ApiService.getSuggestion()
   ↓
4. ApiService sends POST request to backend
   ↓
5. Backend route receives request
   ↓
6. Route validates image (Utils)
   ↓
7. Route calls AIService.get_outfit_suggestion()
   ↓
8. AIService encodes image and calls OpenAI
   ↓
9. AIService parses response and returns OutfitSuggestion
   ↓
10. Route returns JSON response
   ↓
11. ApiService receives response
   ↓
12. Controller updates state with suggestion
   ↓
13. View renders the outfit suggestion
```

---

## Benefits of This Architecture

### 1. **Separation of Concerns**
- Each layer has a single responsibility
- Easy to understand and maintain
- Changes in one layer don't affect others

### 2. **Multi-Platform Ready**
- Backend is platform-agnostic
- Same API for web, mobile, desktop
- Service layer can be reused across clients

### 3. **Testability**
- Each layer can be tested independently
- Services can be mocked for testing
- Business logic is separate from UI

### 4. **Scalability**
- Easy to add new features
- Can add new endpoints without changing existing code
- Can scale backend and frontend independently

### 5. **Maintainability**
- Clear structure makes code easy to find
- New developers can understand quickly
- Follows industry best practices

### 6. **Reusability**
- Services can be reused
- Models define contracts
- Utils can be shared

---

## Environment Configuration

### Backend (.env)
```bash
OPENAI_API_KEY=your_api_key_here
PORT=8001
```

### Frontend (.env)
```bash
REACT_APP_API_URL=http://localhost:8001
```

---

## Running the Application

### Backend
```bash
cd backend
source venv/bin/activate
python main.py
```

### Frontend
```bash
cd frontend
npm start
```

### Both (using start script)
```bash
chmod +x start.sh
./start.sh
```

---

## API Documentation

Once the backend is running, you can access:
- **Interactive API Docs**: http://localhost:8001/docs
- **Alternative API Docs**: http://localhost:8001/redoc

These are automatically generated by FastAPI and show all available endpoints, request/response schemas, and allow you to test the API directly.

---

## Future Enhancements

1. **Authentication & Authorization**
   - Add user accounts
   - API key management
   - Rate limiting

2. **Database Integration**
   - Save outfit history
   - User preferences
   - Analytics

3. **Caching**
   - Cache AI responses
   - Reduce API costs
   - Faster responses

4. **Advanced Features**
   - Multiple image upload
   - Virtual try-on
   - Shopping links
   - Social sharing

5. **Mobile Apps**
   - Native Android app
   - Native iOS app
   - React Native version

---

## Contributing

When adding new features:

1. **Backend**: Create service → Define model → Add route
2. **Frontend**: Define model → Create service method → Add controller logic → Update view
3. **Test** each layer independently
4. **Document** API changes in this file

---

## Questions?

For questions about this architecture, please refer to:
- Backend: Check `backend/main.py` and service layer
- Frontend: Check `frontend/src/App.tsx` and controllers
- API: Visit http://localhost:8001/docs when backend is running

