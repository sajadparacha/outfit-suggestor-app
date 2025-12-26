# AI Outfit Suggestor - Architecture Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Core Functions](#core-functions)
6. [API Endpoints](#api-endpoints)
7. [Data Flow](#data-flow)
8. [Database Schema](#database-schema)
9. [AI Integration](#ai-integration)
10. [Frontend Architecture](#frontend-architecture)
11. [Authentication & Security](#authentication--security)
12. [Deployment](#deployment)

---

## Project Overview

The AI Outfit Suggestor is a full-stack web application that uses artificial intelligence to analyze uploaded clothing images and provide personalized outfit recommendations. The system combines computer vision, natural language processing, and generative AI to create a complete fashion styling solution.

### Key Features
- **Image Analysis**: Analyzes uploaded clothing images using GPT-4 Vision
- **Outfit Recommendations**: Provides complete outfit suggestions (shirt, trousers, blazer, shoes, belt)
- **AI Model Generation**: Generates photorealistic images of models wearing recommended outfits
- **Multi-Model Support**: Supports DALL-E 3, Stable Diffusion, and Nano Banana for image generation
- **Duplicate Detection**: Uses perceptual hashing to prevent redundant AI API calls
- **User Authentication**: Secure JWT-based authentication with email verification
- **Outfit History**: Stores and retrieves previous outfit suggestions
- **Location-Based Customization**: Adapts model appearance based on user location
- **Feature Flags**: URL-based feature toggles for controlled rollout

---

## System Architecture

The application follows a **strict MVC (Model-View-Controller) architecture** pattern for both backend and frontend:

### Backend Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FastAPI Application                      │
│                         (main.py)                            │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
┌───────▼────────┐            ┌────────▼────────┐
│  Routes Layer  │            │  Routes Layer   │
│ (HTTP Entry)   │            │  (HTTP Entry)   │
│                │            │                 │
│ outfit_routes  │            │  auth_routes    │
└───────┬────────┘            └────────┬────────┘
        │                               │
        │                               │
┌───────▼────────┐            ┌────────▼────────┐
│ Controller     │            │  Controller     │
│  Layer         │            │   Layer         │
│                │            │                 │
│OutfitController│            │ AuthController  │
└───────┬────────┘            └────────┬────────┘
        │                               │
        │                               │
┌───────▼────────┐            ┌────────▼────────┐
│   Service      │            │   Service       │
│   Layer        │            │    Layer        │
│                │            │                 │
│OutfitService   │            │  AuthService    │
│AIService       │            │                 │
└───────┬────────┘            └────────┬────────┘
        │                               │
        │                               │
┌───────▼───────────────────────────────▼────────┐
│              Model Layer                        │
│          (Database ORM)                         │
│                                                 │
│  OutfitHistory  │  User  │  OutfitSuggestion   │
└─────────────────────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
┌───────▼────────┐            ┌────────▼────────┐
│  PostgreSQL    │            │   External      │
│   Database     │            │   AI Services   │
│                │            │                 │
│                │            │ OpenAI, Replicate│
│                │            │ Nano Banana     │
└────────────────┘            └─────────────────┘
```

### Frontend Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Application                         │
│                      (App.tsx)                               │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
┌───────▼────────┐            ┌────────▼────────┐
│  Views Layer   │            │  Views Layer    │
│  (UI Components)│            │  (UI Components)│
│                │            │                 │
│ Sidebar        │            │  Login          │
│ OutfitPreview  │            │  Register       │
│ History        │            │  History        │
└───────┬────────┘            └────────┬────────┘
        │                               │
        │                               │
┌───────▼────────┐            ┌────────▼────────┐
│  Controller    │            │  Controller     │
│  Layer (Hooks) │            │  Layer (Hooks)  │
│                │            │                 │
│useOutfitCtrl   │            │ useAuthCtrl     │
│useHistoryCtrl  │            │ useToastCtrl    │
└───────┬────────┘            └────────┬────────┘
        │                               │
        │                               │
┌───────▼───────────────────────────────▼────────┐
│              Service Layer                      │
│                                                 │
│              ApiService                         │
│         (HTTP Communication)                    │
└────────────────────┬────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼────────┐      ┌────────▼────────┐
│  Model Layer   │      │   Utils Layer   │
│                │      │                 │
│OutfitModels    │      │ imageUtils      │
│AuthModels      │      │ geolocation     │
└────────────────┘      └─────────────────┘
```

### Architecture Principles

1. **Separation of Concerns**: Each layer has a single, well-defined responsibility
2. **Dependency Injection**: Services and controllers are injected via configuration
3. **Thin Controllers**: Controllers orchestrate services, contain minimal business logic
4. **Service Layer**: Business logic resides in services, reusable across controllers
5. **Model Layer**: Data models define structure and validation (Pydantic for backend, TypeScript interfaces for frontend)

---

## Technology Stack

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Python** | 3.12+ | Programming language |
| **FastAPI** | 0.119.0 | Web framework, API development |
| **Uvicorn** | 0.37.0 | ASGI server |
| **SQLAlchemy** | 2.0.36 | ORM for database operations |
| **PostgreSQL** | Latest | Primary database |
| **Pydantic** | (via FastAPI) | Data validation and serialization |
| **OpenAI** | 2.5.0 | GPT-4 Vision, DALL-E 3 API |
| **Replicate** | 0.34.1 | Stable Diffusion API |
| **Pillow** | 12.0.0 | Image processing |
| **python-jose** | 3.3.0 | JWT token handling |
| **passlib** | 1.7.4 | Password hashing (bcrypt) |
| **imagehash** | 4.3.1 | Perceptual hashing for duplicate detection |
| **requests** | 2.32.5 | HTTP client |
| **python-dotenv** | 1.1.1 | Environment variable management |

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.2.0 | UI framework |
| **TypeScript** | 4.9.5 | Type-safe JavaScript |
| **Tailwind CSS** | 3.4.18 | Utility-first CSS framework |
| **React Scripts** | 5.0.1 | Build tooling |
| **Axios** | 1.12.2 | HTTP client (optional, using fetch) |

### Development & Deployment

| Technology | Purpose |
|------------|---------|
| **GitHub Pages** | Frontend hosting |
| **Railway** | Backend hosting (alternative) |
| **Docker** | Containerization (optional) |
| **npm/yarn** | Frontend package management |
| **pip** | Backend package management |

---

## Project Structure

### Backend Structure

```
backend/
├── main.py                 # Application entry point, FastAPI app initialization
├── config.py               # Configuration and dependency injection
├── dependencies.py         # FastAPI dependencies (auth, database)
│
├── routes/                 # HTTP route definitions (thin layer)
│   ├── outfit_routes.py    # Outfit-related endpoints
│   └── auth_routes.py      # Authentication endpoints
│
├── controllers/            # Request orchestration layer
│   ├── outfit_controller.py  # Outfit request handling
│   └── auth_controller.py    # Authentication request handling
│
├── services/               # Business logic layer
│   ├── ai_service.py       # AI model integration (OpenAI, Replicate, Nano Banana)
│   ├── outfit_service.py   # Outfit business logic, duplicate detection
│   └── auth_service.py     # Authentication business logic
│
├── models/                 # Data models (ORM + Pydantic)
│   ├── database.py         # Database connection and session management
│   ├── user.py             # User model
│   ├── outfit.py           # OutfitSuggestion Pydantic model
│   └── outfit_history.py   # OutfitHistory ORM model
│
├── utils/                  # Utility functions
│   ├── auth.py             # JWT token utilities
│   ├── image_processor.py  # Image encoding, validation
│   └── email_service.py    # Email sending (activation emails)
│
└── requirements.txt        # Python dependencies
```

### Frontend Structure

```
frontend/
├── public/                 # Static files
│   ├── index.html
│   └── ...
│
├── src/
│   ├── App.tsx             # Main application component, routing
│   ├── index.tsx           # Application entry point
│   │
│   ├── views/              # View components (UI layer)
│   │   ├── components/
│   │   │   ├── Sidebar.tsx           # Filter sidebar, image upload
│   │   │   ├── OutfitPreview.tsx     # Outfit display component
│   │   │   ├── OutfitHistory.tsx     # History view
│   │   │   ├── Login.tsx             # Login form
│   │   │   ├── Register.tsx          # Registration form
│   │   │   ├── About.tsx             # About page
│   │   │   └── ...
│   │   └── ...
│   │
│   ├── controllers/        # Controller hooks (business logic)
│   │   ├── useOutfitController.ts    # Outfit suggestion logic
│   │   ├── useAuthController.ts      # Authentication logic
│   │   ├── useHistoryController.ts   # History management
│   │   └── useToastController.ts     # Toast notifications
│   │
│   ├── services/           # Service layer
│   │   └── ApiService.ts   # HTTP API communication
│   │
│   ├── models/             # TypeScript interfaces/models
│   │   ├── OutfitModels.ts # Outfit-related types
│   │   └── AuthModels.ts   # Authentication-related types
│   │
│   └── utils/              # Utility functions
│       ├── imageUtils.ts   # Image compression, processing
│       ├── geolocation.ts  # Location services
│       └── constants.ts    # Constants
│
├── package.json            # Node.js dependencies
└── tailwind.config.js      # Tailwind CSS configuration
```

---

## Core Functions

### 1. Image Analysis & Outfit Suggestion

**Flow:**
1. User uploads clothing image (shirt/blazer)
2. Frontend compresses and encodes image to base64
3. Request sent to `/api/suggest-outfit` with image and preferences
4. Backend validates image (size, format)
5. Image encoded to base64 if needed
6. `AIService.get_outfit_suggestion()` called:
   - Image sent to GPT-4 Vision with detailed analysis prompt
   - GPT-4 analyzes clothing (color, pattern, style, material)
   - GPT-4 generates complete outfit recommendation (shirt, trousers, blazer, shoes, belt, reasoning)
   - Response parsed into `OutfitSuggestion` object
7. Outfit suggestion returned to frontend
8. Displayed in `OutfitPreview` component

**Key Components:**
- `AIService.get_outfit_suggestion()`: GPT-4 Vision integration
- `AIService._analyze_uploaded_clothing()`: Detailed clothing analysis
- `AIService._build_prompt()`: Prompt engineering for outfit suggestions

### 2. AI Model Image Generation

**Flow:**
1. User enables "Generate Model Image" toggle
2. User selects image generation model (DALL-E 3, Stable Diffusion, or Nano Banana)
3. After outfit suggestion is received, image generation is triggered
4. `AIService.generate_model_image()` called with:
   - Outfit suggestion
   - Uploaded image (for reference)
   - User location (for model customization)
   - Selected model type
5. Model-specific generation:
   - **DALL-E 3**: Text-to-image with detailed prompt
   - **Stable Diffusion**: Text-to-image via Replicate API
   - **Nano Banana**: Image-to-image generation (when available)
6. Generated image downloaded and converted to base64
7. Returned to frontend and displayed alongside outfit suggestion

**Key Components:**
- `AIService.generate_model_image()`: Orchestrates model generation
- `AIService._generate_with_dalle3()`: DALL-E 3 implementation
- `AIService._generate_with_stable_diffusion()`: Stable Diffusion implementation
- `AIService._generate_with_nano_banana()`: Nano Banana implementation
- `AIService._build_model_image_prompt()`: Prompt engineering for image generation

**Features:**
- **Location-Based Customization**: Model appearance adapted based on user location
- **Exact Clothing Preservation**: Uploaded shirt details preserved in generated image
- **Full-Body Shots**: Generated images show complete outfit from head to toe
- **Fallback Mechanism**: Automatic fallback to DALL-E 3 if other models fail

### 3. Duplicate Detection

**Flow:**
1. Before generating new outfit suggestion, image is checked for duplicates
2. `OutfitService.check_duplicate_image()` called:
   - Image converted to perceptual hash using `imagehash`
   - Database queried for similar hashes within threshold
   - If duplicate found, existing suggestion returned
   - User shown modal to use cached result or generate new
3. Prevents redundant AI API calls, saving costs

**Key Components:**
- `OutfitService.check_duplicate_image()`: Perceptual hashing and comparison
- `OutfitService._images_are_similar()`: Hash comparison logic
- `IMAGE_SIMILARITY_THRESHOLD`: Configurable similarity threshold (default: 5)

**Technology:**
- **Perceptual Hashing**: `imagehash` library (average hash algorithm)
- **Threshold-Based Matching**: Configurable similarity threshold

### 4. User Authentication

**Flow:**
1. User registers with email and password
2. Password hashed using bcrypt
3. User account created (initially inactive)
4. Activation email sent with unique token
5. User clicks activation link, account activated
6. User can login with email/password
7. JWT token issued upon successful login
8. Token stored in localStorage (frontend) and sent with requests
9. Protected endpoints validate token via `get_current_active_user` dependency

**Key Components:**
- `AuthService.register()`: User registration
- `AuthService.login()`: User authentication
- `AuthService.activate_account()`: Email activation
- `utils.auth.create_access_token()`: JWT token creation
- `utils.auth.verify_token()`: JWT token validation

**Security Features:**
- Password hashing with bcrypt
- JWT tokens with expiration (7 days)
- Email verification required
- Secure password change functionality

### 5. Outfit History

**Flow:**
1. Each outfit suggestion is saved to database
2. User can view history via `/api/outfit-history`
3. History entries include:
   - Original uploaded image
   - Generated model image (if available)
   - Outfit suggestion details
   - Timestamp
4. History searchable and filterable in frontend

**Key Components:**
- `OutfitService.save_outfit_history()`: Save suggestion to database
- `OutfitService.get_user_history()`: Retrieve user's history
- `OutfitHistory` model: Database schema for history entries

### 6. Feature Flags

**Flow:**
1. URL parameters control feature visibility
2. `modelGeneration=true` enables model generation toggle
3. Frontend checks URL parameters on load
4. UI elements shown/hidden based on flags

**Key Components:**
- `App.tsx`: URL parameter detection
- `Sidebar.tsx`: Conditional rendering based on `modelGenerationEnabled` prop

---

## API Endpoints

### Outfit Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/suggest-outfit` | Analyze image and get outfit suggestion | No (optional) |
| POST | `/api/check-duplicate` | Check if image already processed | No (optional) |
| GET | `/api/outfit-history` | Get user's outfit history | Yes |

**Request Format (`/api/suggest-outfit`):**
```
POST /api/suggest-outfit
Content-Type: multipart/form-data

Form Data:
- image: File (image file)
- text_input: string (optional preferences)
- location: string (optional user location)
- generate_model_image: string ("true" or "false")
- image_model: string ("dalle3", "stable-diffusion", or "nano-banana")
```

**Response Format:**
```json
{
  "shirt": "Navy blue dress shirt",
  "trouser": "Charcoal gray dress trousers",
  "blazer": "Navy blue blazer",
  "shoes": "Black leather dress shoes",
  "belt": "Black leather belt",
  "reasoning": "A classic professional look...",
  "model_image": "base64_encoded_image_string_or_null"
}
```

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login and get token | No |
| GET | `/api/auth/activate/{token}` | Activate account | No |
| GET | `/api/auth/me` | Get current user info | Yes |
| POST | `/api/auth/change-password` | Change password | Yes |

**Request Format (`/api/auth/register`):**
```json
{
  "email": "user@example.com",
  "password": "secure_password",
  "full_name": "John Doe"
}
```

**Response Format:**
```json
{
  "access_token": "jwt_token_here",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "full_name": "John Doe",
    "is_active": true,
    "email_verified": false,
    "created_at": "2024-01-01T00:00:00"
  }
}
```

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check endpoint |
| GET | `/` | Root endpoint (health check) |

---

## Data Flow

### Outfit Suggestion Flow

```
User Uploads Image
       │
       ▼
Frontend: Compress & Encode Image
       │
       ▼
Frontend: ApiService.getSuggestion()
       │
       ▼
HTTP POST /api/suggest-outfit
       │
       ▼
Backend: outfit_routes.suggest_outfit()
       │
       ▼
Backend: OutfitController.suggest_outfit()
       │
       ├─► Validate Image
       │
       ├─► Check Duplicate (optional)
       │
       ▼
Backend: AIService.get_outfit_suggestion()
       │
       ├─► Build Prompt
       │
       ├─► Call GPT-4 Vision API
       │   └─► Analyze Image
       │   └─► Generate Outfit Recommendation
       │
       ▼
Backend: Parse Response → OutfitSuggestion
       │
       ├─► If generate_model_image=true:
       │   └─► AIService.generate_model_image()
       │       ├─► Analyze Uploaded Clothing (GPT-4 Vision)
       │       ├─► Build Model Image Prompt
       │       ├─► Call Image Generation API (DALL-E/Stable Diffusion/Nano Banana)
       │       └─► Download & Encode Image
       │
       ▼
Backend: Save to Database (OutfitHistory)
       │
       ▼
Backend: Return OutfitSuggestion with model_image
       │
       ▼
Frontend: Receive Response
       │
       ▼
Frontend: useOutfitController.getSuggestion()
       │
       ▼
Frontend: Update State → Display in OutfitPreview
```

### Authentication Flow

```
User Registers
       │
       ▼
Frontend: ApiService.register()
       │
       ▼
HTTP POST /api/auth/register
       │
       ▼
Backend: AuthController.register()
       │
       ├─► Check if email exists
       │
       ├─► Hash Password (bcrypt)
       │
       ├─► Create User (inactive)
       │
       ├─► Generate Activation Token
       │
       ├─► Send Activation Email
       │
       ├─► Create JWT Token
       │
       ▼
Backend: Return Token & User Info
       │
       ▼
Frontend: Store Token → Auto-Login

---

User Clicks Activation Link
       │
       ▼
HTTP GET /api/auth/activate/{token}
       │
       ▼
Backend: AuthController.activate_account()
       │
       ├─► Verify Token
       │
       ├─► Activate User Account
       │
       ▼
Backend: Return Success Message

---

User Logs In
       │
       ▼
Frontend: ApiService.login()
       │
       ▼
HTTP POST /api/auth/login (form data)
       │
       ▼
Backend: AuthController.login()
       │
       ├─► Verify Credentials
       │
       ├─► Check if Account Active
       │
       ├─► Create JWT Token
       │
       ▼
Backend: Return Token & User Info
       │
       ▼
Frontend: Store Token → Redirect to Main App
```

---

## Database Schema

### User Table

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    is_active BOOLEAN DEFAULT FALSE,
    email_verified BOOLEAN DEFAULT FALSE,
    activation_token VARCHAR(255),
    activation_token_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Outfit History Table

```sql
CREATE TABLE outfit_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    text_input TEXT,
    image_data TEXT,          -- Base64 encoded image (nullable for backward compatibility)
    model_image TEXT,         -- Base64 encoded generated model image (nullable)
    shirt VARCHAR(512) NOT NULL,
    trouser VARCHAR(512) NOT NULL,
    blazer VARCHAR(512) NOT NULL,
    shoes VARCHAR(512) NOT NULL,
    belt VARCHAR(512) NOT NULL,
    reasoning TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_outfit_history_user_id ON outfit_history(user_id);
CREATE INDEX idx_outfit_history_created_at ON outfit_history(created_at DESC);
```

**Note:** Perceptual hashing for duplicate detection is computed in-memory (not stored in the database). The system compares hashes of the current image with hashes of images from the user's history at query time.

---

## AI Integration

### OpenAI Integration

**Models Used:**
- **GPT-4 Vision (gpt-4o)**: Image analysis and outfit recommendations
- **DALL-E 3**: Text-to-image generation for model images
- **GPT-5.2** (configurable): Future upgrade for outfit suggestions

**Usage:**
- Image analysis with detailed prompts for clothing feature extraction
- Outfit recommendation generation with JSON-structured responses
- Model image generation with location-based customization

**Key Methods:**
- `AIService.get_outfit_suggestion()`: GPT-4 Vision for outfit analysis
- `AIService._analyze_uploaded_clothing()`: Detailed clothing analysis
- `AIService._generate_with_dalle3()`: DALL-E 3 image generation

### Stable Diffusion Integration

**Provider:** Replicate API
**Model:** stability-ai/sdxl

**Usage:**
- Alternative to DALL-E 3 for image generation
- Text-to-image generation with detailed prompts
- Better color accuracy in some cases

**Key Methods:**
- `AIService._generate_with_stable_diffusion()`: Replicate API integration

### Nano Banana Integration

**Provider:** Nano Banana API
**Status:** Integrated (requires API key)

**Usage:**
- Advanced image-to-image generation
- Superior detail preservation from uploaded images

**Key Methods:**
- `AIService._generate_with_nano_banana()`: Nano Banana API integration

### Prompt Engineering

The system uses sophisticated prompt engineering to ensure:
1. **Accurate Clothing Analysis**: Detailed prompts for GPT-4 Vision to extract exact clothing features
2. **Complete Outfits**: Explicit requirements for all outfit items (shirt, blazer, trousers, shoes, belt)
3. **Color Accuracy**: Specific color descriptions with exact shade names
4. **Full-Body Images**: Explicit instructions for head-to-toe model images
5. **Location Customization**: Cultural adaptation based on user location

---

## Frontend Architecture

### Component Hierarchy

```
App
├── Router/Routes
│   ├── / (Main App)
│   │   ├── Hero
│   │   ├── Sidebar (filters, upload, model generation toggle)
│   │   ├── OutfitPreview (outfit display, model image)
│   │   └── OutfitHistory (history view)
│   │
│   ├── /login
│   │   └── Login
│   │
│   ├── /register
│   │   └── Register
│   │
│   └── /about
│       └── About
│
└── Toast (global notifications)
```

### State Management

- **React Hooks**: useState, useEffect for local state
- **Custom Hooks**: Controller hooks manage business logic and API calls
- **Context**: (Optional) For global state if needed

### Controller Hooks

1. **useOutfitController**: Manages outfit suggestion flow
   - Image upload
   - Filter/preference management
   - API calls for suggestions
   - Model image generation toggle
   - Duplicate detection handling

2. **useAuthController**: Manages authentication
   - Login/logout
   - Registration
   - Token management
   - User session

3. **useHistoryController**: Manages outfit history
   - Fetching history
   - Search and filtering
   - History display

4. **useToastController**: Manages notifications
   - Success/error messages
   - Toast display/hide

### Service Layer

**ApiService**: Centralized HTTP client
- Handles all API communication
- Token management (localStorage)
- Error handling
- Request/response transformation

---

## Authentication & Security

### Authentication Flow

1. **Registration**: User creates account → Email verification required
2. **Activation**: User clicks email link → Account activated
3. **Login**: User authenticates → JWT token issued
4. **Token Usage**: Token sent in Authorization header for protected endpoints

### Security Features

1. **Password Hashing**: bcrypt with salt rounds
2. **JWT Tokens**: Signed tokens with expiration (7 days)
3. **Email Verification**: Required before account activation
4. **CORS Configuration**: Restricted to allowed origins
5. **Input Validation**: Pydantic models validate all inputs
6. **SQL Injection Prevention**: SQLAlchemy ORM prevents SQL injection
7. **XSS Prevention**: React's built-in XSS protection

### Token Structure

```json
{
  "sub": "user_email@example.com",
  "exp": 1234567890,
  "iat": 1234567890
}
```

---

## Deployment

### Frontend Deployment

**Platform:** GitHub Pages
**Build Command:** `npm run build`
**Deploy Command:** `npm run deploy` (gh-pages)

**Configuration:**
- `homepage` in package.json: GitHub Pages URL
- Environment variables: `REACT_APP_API_URL` for backend URL

### Backend Deployment

**Platform Options:**
- **Railway**: Recommended for easy deployment
- **Heroku**: Alternative platform
- **Docker**: Containerized deployment

**Environment Variables Required:**
```bash
OPENAI_API_KEY=your_key
REPLICATE_API_TOKEN=your_token (optional)
NANO_BANANA_API_KEY=your_key (optional)
DATABASE_URL=postgresql://...
JWT_SECRET_KEY=your_secret_key
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_USER=your_email
EMAIL_SMTP_PASSWORD=your_password
CHATGPT_MODEL=gpt-4o
PORT=8001
```

### Database Migration

- **Auto-Migration**: SQLAlchemy creates tables on startup
- **Manual Migration**: Alembic can be added for version control
- **Initial Schema**: Defined in model classes

---

## Key Design Decisions

1. **MVC Architecture**: Strict separation of concerns for maintainability
2. **Dependency Injection**: Centralized configuration for services
3. **Pydantic Models**: Type-safe data validation
4. **Perceptual Hashing**: Cost-effective duplicate detection
5. **Multi-Model Support**: Flexibility in AI image generation
6. **Feature Flags**: Controlled feature rollout
7. **Location-Based Customization**: Cultural sensitivity in model appearance
8. **Email Verification**: Security and user validation
9. **JWT Authentication**: Stateless authentication for scalability
10. **TypeScript**: Type safety in frontend

---

## Future Enhancements

1. **Real-Time Updates**: WebSocket support for live outfit generation
2. **Mobile Apps**: Native iOS/Android apps (iOS client started)
3. **Recommendation Engine**: Machine learning for personalized suggestions
4. **Social Features**: Sharing, favorites, collections
5. **E-Commerce Integration**: Direct links to purchase recommended items
6. **Advanced Filters**: More granular filtering options
7. **Style Preferences**: Learn user preferences over time
8. **Multi-Language Support**: Internationalization
9. **Analytics**: User behavior tracking and insights
10. **A/B Testing**: Framework for testing different AI prompts

---

## Conclusion

The AI Outfit Suggestor is a well-architected, scalable application that leverages modern web technologies and AI services to provide a comprehensive fashion styling solution. The strict MVC architecture ensures maintainability, while the multi-model AI integration provides flexibility and redundancy. The system is designed to be extensible, with clear separation of concerns and a robust foundation for future enhancements.

