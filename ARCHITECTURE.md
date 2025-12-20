# AI Outfit Suggester - Architecture Documentation

## Overview

This application has been refactored to follow a clean, modular architecture that separates the **Backend API** from **Client Applications**. This allows multiple client platforms (Web, Android, iOS) to consume the same backend services.

## Architecture Pattern

The application follows a **strict MVC (Model-View-Controller) architecture** with:
- **Backend**: MVC with RESTful services (Routes → Controllers → Services → Models)
- **Frontend**: Strict MVC pattern (Views → Controllers → Services → Models)

---

## Backend Architecture

### Directory Structure

```
backend/
├── main.py                 # Application entry point
├── config.py              # Configuration and dependency injection
├── models/                # Data models (Pydantic schemas + SQLAlchemy ORM)
│   ├── __init__.py
│   ├── outfit.py          # Outfit-related models
│   ├── user.py            # User models
│   └── outfit_history.py  # Outfit history models
├── controllers/           # Request orchestration layer (NEW)
│   ├── __init__.py
│   ├── outfit_controller.py  # Outfit request handling
│   └── auth_controller.py   # Authentication request handling
├── services/              # Business logic layer (pure, reusable)
│   ├── __init__.py
│   ├── ai_service.py      # AI/OpenAI integration
│   ├── outfit_service.py # Outfit business logic
│   └── auth_service.py   # Authentication business logic
├── routes/                # API endpoints (thin HTTP layer)
│   ├── __init__.py
│   ├── outfit_routes.py   # Outfit suggestion endpoints
│   └── auth_routes.py     # Authentication endpoints
└── utils/                 # Utility functions
    ├── __init__.py
    ├── image_processor.py # Image processing utilities
    └── auth.py            # Authentication utilities
```

### Layers

#### 1. **Models Layer** (`models/`)
- Defines data structures using Pydantic (for API) and SQLAlchemy (for database)
- Provides validation and serialization
- No business logic, just data structures
- Examples: `OutfitSuggestion`, `User`, `OutfitHistory`

#### 2. **Services Layer** (`services/`)
- **Pure business logic** - no HTTP concerns
- Handles external API calls (OpenAI)
- Database operations
- Reusable across different entry points (controllers, CLI tools, background jobs)
- Independent of HTTP/API layer

**Key Services:**
- `AIService`: Manages OpenAI API integration for outfit suggestions and model image generation
- `OutfitService`: Outfit history management, duplicate detection
- `AuthService`: User authentication, password management, token generation

#### 3. **Controllers Layer** (`controllers/`) - NEW
- Request validation and orchestration
- Coordinates service calls
- Handles business-level errors
- Formats responses
- Manages transactions (if needed)
- No HTTP-specific code (that's in Routes)

**Key Controllers:**
- `OutfitController`: Handles outfit suggestion requests, duplicate checking, model image generation
- `AuthController`: Handles authentication requests, registration, login, password changes

#### 4. **Routes Layer** (`routes/`)
- **Thin HTTP layer** - only HTTP concerns
- Defines API endpoints
- Extracts request data (query params, body, files)
- Calls controllers
- Returns HTTP responses
- No business logic

**Available Endpoints:**
- `GET /` - Health check
- `GET /health` - Detailed health status
- `POST /api/suggest-outfit` - Get outfit suggestions
- `POST /api/check-duplicate` - Check for duplicate images
- `GET /api/outfit-history` - Get outfit history
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/change-password` - Change password

#### 5. **Utils Layer** (`utils/`)
- Helper functions for common tasks
- Image processing and validation
- Authentication utilities (JWT, password hashing)
- No business logic

### Dependency Injection

The application uses dependency injection for:
- Service instances (singleton pattern): `AIService`, `OutfitService`, `AuthService`
- Controller instances: `OutfitController`, `AuthController`
- Configuration management
- Database sessions
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
├── App.tsx                     # Application orchestration (routes views, coordinates controllers)
├── models/                     # Data models and TypeScript interfaces (pure types)
│   ├── index.ts
│   ├── OutfitModels.ts        # Outfit-related interfaces
│   └── AuthModels.ts          # Authentication-related interfaces
├── services/                   # API communication layer (HTTP only)
│   ├── index.ts
│   └── ApiService.ts          # Backend API client (singleton)
├── controllers/                # Business logic (React hooks)
│   ├── index.ts
│   ├── useOutfitController.ts      # Outfit suggestion logic (duplicate checking, compression, location)
│   ├── useHistoryController.ts     # Outfit history management
│   ├── useHistorySearchController.ts # History search/filter logic
│   ├── useAuthController.ts        # Authentication logic
│   └── useToastController.ts      # Toast notification logic
├── views/                      # Presentation layer (pure components)
│   └── components/            # React components
│       ├── Hero.tsx           # Landing section
│       ├── Sidebar.tsx        # Input and filters
│       ├── OutfitPreview.tsx  # Results display
│       ├── OutfitHistory.tsx   # History display
│       ├── Login.tsx          # Login form
│       ├── Register.tsx       # Registration form
│       ├── ChangePassword.tsx # Password change form
│       ├── Footer.tsx         # Page footer
│       └── Toast.tsx          # Notifications
└── utils/                      # Utility functions (pure helpers)
    ├── index.ts
    ├── imageUtils.ts          # Image helpers (compression, etc.)
    ├── geolocation.ts         # Location utilities
    └── constants.ts           # Application constants
```

### MVC Pattern (Strict Implementation)

#### 1. **Models** (`models/`)
- TypeScript interfaces and types
- Define data structures
- **No logic, just type definitions**
- Pure data contracts

**Key Models:**
- `OutfitSuggestion`: Complete outfit data
- `OutfitHistoryEntry`: History entry structure
- `Filters`: User preference filters
- `User`: User data structure
- `TokenResponse`: Authentication token response

#### 2. **Views** (`views/components/`)
- **Pure presentation components**
- Receive data via props
- Emit events via callbacks
- **No business logic**
- **No API calls**
- **No state management** (except UI-only state like modal open/close)
- Focused solely on rendering

**Key Components:**
- `Hero`: Landing section
- `Sidebar`: Input and filters (receives callbacks, no logic)
- `OutfitPreview`: Results display (receives data, emits actions)
- `OutfitHistory`: History display (uses search controller for logic)
- `Login`, `Register`, `ChangePassword`: Form components
- `Toast`: Notifications
- `Footer`: Page footer

#### 3. **Controllers** (`controllers/`)
- Custom React hooks
- **All business logic lives here**
- State management
- API orchestration
- Data transformation
- Error handling
- Event handling

**Key Controllers:**
- `useOutfitController`: 
  - Manages outfit suggestion flow
  - Handles duplicate checking
  - Image compression
  - Location fetching
  - Model image generation coordination
- `useHistoryController`: 
  - Manages outfit history state
  - Fetches history from API
  - Handles authentication changes
- `useHistorySearchController`:
  - Search and filter logic
  - Text highlighting
  - Sorting
- `useAuthController`: 
  - Authentication state
  - Login/logout/register logic
  - Token management
- `useToastController`: 
  - Toast notification state

#### 4. **Services** (`services/`)
- **API communication only**
- HTTP request handling
- Request/response formatting
- **No business logic**
- Can be reused by other platforms (Android/iOS)

**Key Service:**
- `ApiService`: Singleton service for backend communication
  - Methods: `getSuggestion()`, `checkDuplicate()`, `getOutfitHistory()`, `register()`, `login()`, etc.

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

#### Frontend Flow

```
1. User uploads image in UI (View - Sidebar)
   ↓
2. View emits event via callback (onGetSuggestion)
   ↓
3. App.tsx orchestrates (handleGetSuggestion)
   ↓
4. Controller (useOutfitController) receives request
   ↓
5. Controller compresses image (business logic)
   ↓
6. Controller checks for duplicates (business logic)
   ↓
7. Controller fetches location if needed (business logic)
   ↓
8. Controller calls ApiService.getSuggestion()
   ↓
9. ApiService sends POST request to backend (HTTP only)
   ↓
10. ApiService receives response
   ↓
11. Controller updates state with suggestion
   ↓
12. View (OutfitPreview) renders the outfit suggestion
```

#### Backend Flow

```
1. HTTP Request arrives at Route (outfit_routes.py)
   ↓
2. Route extracts request data (file, form data)
   ↓
3. Route calls Controller (OutfitController)
   ↓
4. Controller validates request data
   ↓
5. Controller orchestrates service calls:
   - Calls AIService for outfit suggestion
   - Calls OutfitService for history operations
   ↓
6. Service (AIService) encodes image and calls OpenAI
   ↓
7. Service (AIService) parses response and returns OutfitSuggestion
   ↓
8. Controller formats response
   ↓
9. Route returns HTTP response
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

### Backend:
1. **Define Model** - Add Pydantic/SQLAlchemy models
2. **Create/Update Service** - Add business logic to services
3. **Create/Update Controller** - Add request orchestration to controllers
4. **Add Route** - Add HTTP endpoint (thin layer, calls controller)
5. **Test** each layer independently

### Frontend:
1. **Define Model** - Add TypeScript interfaces
2. **Update Service** - Add API method to ApiService
3. **Create/Update Controller** - Add business logic to controller hook
4. **Update View** - Add presentation component (pure, receives props, emits callbacks)
5. **Update App.tsx** - Orchestrate view and controller
6. **Test** each layer independently

### Testing Strategy:
- **Models**: Type checking
- **Services**: Unit tests with mocked dependencies
- **Controllers**: Integration tests with mocked services
- **Routes/Views**: Component/endpoint tests

---

## Architecture Benefits

### Strict Separation of Concerns
- **Backend Routes**: Only HTTP handling
- **Backend Controllers**: Request orchestration
- **Backend Services**: Pure business logic
- **Frontend Views**: Pure presentation
- **Frontend Controllers**: All business logic
- **Frontend Services**: API communication only

### Testability
- Each layer can be tested independently
- Services can be mocked for testing
- Controllers can be tested with mocked services
- Views can be tested with mock props

### Maintainability
- Clear boundaries make code easy to find
- Changes in one layer don't affect others
- New developers can understand quickly
- Follows industry best practices

### Scalability
- Easy to add new features following the same pattern
- Can scale backend and frontend independently
- Services can be reused across different entry points

## Questions?

For questions about this architecture, please refer to:
- **Backend**: 
  - Routes: `backend/routes/`
  - Controllers: `backend/controllers/`
  - Services: `backend/services/`
  - Models: `backend/models/`
- **Frontend**: 
  - Views: `frontend/src/views/components/`
  - Controllers: `frontend/src/controllers/`
  - Services: `frontend/src/services/`
  - Models: `frontend/src/models/`
- **API Documentation**: Visit http://localhost:8001/docs when backend is running
- **Refactoring Plan**: See `MVC_REFACTORING_PLAN.md` for detailed refactoring documentation

