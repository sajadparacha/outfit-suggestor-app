# AI Outfit Suggestor — Architecture Documentation

Canonical technical reference for the application: system design, stack, data flow, API surface, database, AI integration, security, deployment, and multi-platform clients.

**Related docs (by topic):**

| Document | Focus |
|----------|--------|
| [WEB_USER_INTERACTION.md](./WEB_USER_INTERACTION.md) | Web UX flows, view state, auth gating |
| [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) | REST endpoint reference |
| [IOS_WEB_FEATURE_PARITY.md](./IOS_WEB_FEATURE_PARITY.md) | Web vs iOS feature alignment |
| [ios-client/README.md](./ios-client/README.md) | iOS client setup |
| [DB_SCHEMA_COMPARISON.md](./DB_SCHEMA_COMPARISON.md) | Schema migrations |
| [USER_GUIDE.md](./USER_GUIDE.md) | End-user guide |

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Backend Layers](#backend-layers)
6. [Frontend Architecture](#frontend-architecture)
7. [Core Functions](#core-functions)
8. [API Endpoints](#api-endpoints)
9. [Data Flow](#data-flow)
10. [Database Schema](#database-schema)
11. [AI Integration](#ai-integration)
12. [Authentication & Security](#authentication--security)
13. [Multi-Platform Clients](#multi-platform-clients)
14. [Environment & Running Locally](#environment--running-locally)
15. [Deployment](#deployment)
16. [Contributing](#contributing)
17. [Key Design Decisions](#key-design-decisions)
18. [Future Enhancements](#future-enhancements)

---

## Project Overview

The AI Outfit Suggestor is a full-stack application that analyzes clothing images and provides personalized outfit recommendations. It combines computer vision, NLP, and generative AI behind a **platform-agnostic REST API** consumed by web and iOS clients (Android-ready).

### Key Features

- **Image analysis** — GPT-4 Vision analyzes uploaded clothing
- **Outfit recommendations** — Shirt, trousers, blazer, shoes, belt, and reasoning
- **AI model images** — DALL-E 3, Stable Diffusion, or Nano Banana
- **Virtual wardrobe** — AI-powered item recognition, categories, duplicate detection
- **Duplicate detection** — Perceptual hashing to avoid redundant AI calls
- **User authentication** — JWT, email verification, password management
- **Outfit history** — Searchable history with model images
- **Random picks** — Random from wardrobe or history (logged-in users)
- **Location-based customization** — Model appearance adapted to user location
- **Admin reports** — Access logs and usage statistics (admin users)
- **Feature flags** — URL-based toggles for controlled rollout

---

## System Architecture

Strict **MVC** on both backend and frontend:

- **Backend:** Routes → Controllers → Services → Models
- **Frontend:** Views → Controllers (hooks) → Services → Models

### Backend

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
│ outfit_routes  │            │  auth_routes    │
│ wardrobe_routes│            │  admin_routes   │
└───────┬────────┘            └────────┬────────┘
        │                               │
┌───────▼────────┐            ┌────────▼────────┐
│ Controllers    │            │  Controllers    │
│OutfitController│            │ AuthController  │
└───────┬────────┘            └────────┬────────┘
        │                               │
┌───────▼────────┐            ┌────────▼────────┐
│   Services     │            │   Services      │
│OutfitService   │            │ AuthService     │
│AIService       │            │ WardrobeService │
└───────┬────────┘            └────────┬────────┘
        │                               │
┌───────▼───────────────────────────────▼────────┐
│              Model Layer (ORM + Pydantic)       │
│  User │ OutfitHistory │ WardrobeItem │ …       │
└───────────────────────┬────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
┌───────▼────────┐            ┌────────▼────────┐
│  PostgreSQL    │            │  External AI    │
│   Database     │            │ OpenAI, Replicate│
└────────────────┘            └─────────────────┘
```

### Frontend

```
┌─────────────────────────────────────────────────────────────┐
│                    React Application (App.tsx)                 │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────▼────────┐            ┌────────▼────────┐
│  Views         │            │  Controllers    │
│ Sidebar        │            │ useOutfitCtrl   │
│ OutfitPreview  │            │ useAuthCtrl     │
│ OutfitHistory  │            │ useHistoryCtrl  │
│ Wardrobe …     │            │ useWardrobeCtrl │
└───────┬────────┘            └────────┬────────┘
        │                               │
┌───────▼───────────────────────────────▼────────┐
│ ApiService (HTTP) │ Models │ Utils              │
└───────────────────────┬────────────────────────┘
                        ▼
                   FastAPI Backend
```

### Principles

1. **Separation of concerns** — Each layer has one responsibility
2. **Dependency injection** — Services and controllers wired in `config.py`
3. **Thin routes** — HTTP only; business logic in services
4. **Testability** — Layers mock independently
5. **Multi-platform API** — Same REST contract for web, iOS, and future clients

---

## Technology Stack

### Backend

| Technology | Purpose |
|------------|---------|
| Python 3.12+ | Runtime |
| FastAPI | Web framework, OpenAPI docs |
| Uvicorn | ASGI server |
| SQLAlchemy | ORM |
| PostgreSQL | Primary database |
| Pydantic | Validation / serialization |
| OpenAI | GPT-4 Vision, DALL-E 3 |
| Replicate | Stable Diffusion |
| Pillow | Image processing |
| python-jose, passlib | JWT, bcrypt |
| imagehash | Perceptual duplicate detection |

### Frontend

| Technology | Purpose |
|------------|---------|
| React 19 | UI |
| TypeScript | Type safety |
| Tailwind CSS | Styling |

### Clients & Deployment

| Technology | Purpose |
|------------|---------|
| Swift / SwiftUI | iOS client (`ios-client/`) |
| GitHub Pages | Web hosting |
| Railway | Backend hosting |

---

## Project Structure

### Backend

```
backend/
├── main.py                 # FastAPI entry point
├── config.py               # Configuration, DI
├── dependencies.py         # Auth, DB dependencies
├── routes/                 # HTTP endpoints (thin)
├── controllers/            # Request orchestration
├── services/               # Business logic
├── models/                 # ORM + Pydantic
├── utils/                  # Image, auth, email helpers
└── tests/                  # pytest suite
```

### Frontend

```
frontend/src/
├── App.tsx                 # View orchestration
├── models/                 # TypeScript interfaces
├── services/ApiService.ts    # HTTP client (singleton)
├── controllers/            # Business logic hooks
├── views/components/       # Presentation components
└── utils/                  # imageUtils, geolocation, constants
```

### iOS

```
ios-client/
├── OutfitSuggestor/        # SwiftUI app
├── OutfitSuggestorTests/   # Unit tests
└── OutfitSuggestorUITests/ # UI tests
```

---

## Backend Layers

### Models (`models/`)

Pydantic schemas and SQLAlchemy ORM. Validation and serialization only — no business logic.

### Services (`services/`)

Pure business logic, no HTTP concerns. Reusable from controllers, CLI, or jobs.

| Service | Responsibility |
|---------|----------------|
| `AIService` | OpenAI, Replicate, Nano Banana integration |
| `OutfitService` | History, duplicate detection |
| `AuthService` | Registration, login, tokens |
| `WardrobeService` | Wardrobe CRUD, AI categorization |

### Controllers (`controllers/`)

Validate requests, orchestrate services, format responses.

### Routes (`routes/`)

Define endpoints, extract request data, call controllers, return HTTP responses.

### Utils (`utils/`)

Image processing, JWT helpers, email — shared helpers without domain logic.

---

## Frontend Architecture

### Models (`models/`)

TypeScript interfaces only — `OutfitSuggestion`, `User`, `Filters`, wardrobe types, etc.

### Views (`views/components/`)

Pure presentation: props in, callbacks out. No API calls or business logic (except trivial UI state).

Key components: `Hero`, `Sidebar`, `OutfitPreview`, `OutfitHistory`, `Login`, `Register`, wardrobe views, `Toast`, `Footer`.

### Controllers (`controllers/`)

React hooks holding business logic and state.

| Hook | Responsibility |
|------|----------------|
| `useOutfitController` | Suggestions, compression, duplicates, model images |
| `useHistoryController` | History fetch and state |
| `useHistorySearchController` | Search, filter, highlight |
| `useAuthController` | Login, register, token storage |
| `useWardrobeController` | Wardrobe management |
| `useToastController` | Notifications |

### Services (`services/`)

`ApiService` — HTTP only. Methods mirror backend endpoints; token attached from `localStorage`.

For web interaction flows (views, modals, auth gating), see [WEB_USER_INTERACTION.md](./WEB_USER_INTERACTION.md).

---

## Core Functions

### 1. Image Analysis & Outfit Suggestion

1. User uploads image → frontend compresses
2. `POST /api/suggest-outfit` with image and preferences
3. `AIService.get_outfit_suggestion()` → GPT-4 Vision → `OutfitSuggestion`
4. Optional model image generation if enabled
5. History saved; result shown in `OutfitPreview`

### 2. AI Model Image Generation

Triggered when `generate_model_image=true`. Supports DALL-E 3, Stable Diffusion (Replicate), Nano Banana. Location-aware prompts; fallback to DALL-E 3 on failure.

### 3. Duplicate Detection

Perceptual hash (`imagehash`) compared against user history before new AI calls. Threshold configurable via `IMAGE_SIMILARITY_THRESHOLD`.

### 4. User Authentication

Register → activation email → JWT on login → bearer token on protected routes. See [Authentication & Security](#authentication--security).

### 5. Outfit History

Persisted per user; searchable/filterable in the web UI. Includes original and model images when available.

### 6. Virtual Wardrobe

Upload → AI categorization (OpenAI or Hugging Face models) → save with duplicate checks. Wardrobe-only vs free-generation modes for suggestions.

### 7. Feature Flags

URL parameters (e.g. `modelGeneration=true`) toggle UI features at load time.

---

## API Endpoints

Interactive docs when the backend is running: `http://localhost:8001/docs`

### Outfit

| Method | Endpoint | Auth |
|--------|----------|------|
| POST | `/api/suggest-outfit` | Optional |
| POST | `/api/check-duplicate` | Optional |
| GET | `/api/outfit-history` | Yes |

**`POST /api/suggest-outfit`** (multipart):

- `image` (file, required)
- `text_input` (optional preferences)
- `location` (optional)
- `generate_model_image` (`"true"` / `"false"`)
- `image_model` (`dalle3`, `stable-diffusion`, `nano-banana`)

**Response:**

```json
{
  "shirt": "…",
  "trouser": "…",
  "blazer": "…",
  "shoes": "…",
  "belt": "…",
  "reasoning": "…",
  "model_image": "base64_or_null"
}
```

### Authentication

| Method | Endpoint | Auth |
|--------|----------|------|
| POST | `/api/auth/register` | No |
| POST | `/api/auth/login` | No |
| GET | `/api/auth/activate/{token}` | No |
| GET | `/api/auth/me` | Yes |
| POST | `/api/auth/change-password` | Yes |

Wardrobe, admin, and additional routes are documented in OpenAPI (`/docs`) and [API_DOCUMENTATION.md](./API_DOCUMENTATION.md).

### Health

| Method | Endpoint |
|--------|----------|
| GET | `/` |
| GET | `/health` |

---

## Data Flow

### Outfit suggestion (end-to-end)

```
User upload (View)
  → App.tsx handler
  → useOutfitController (compress, duplicate check, location)
  → ApiService.getSuggestion()
  → outfit_routes → OutfitController
  → AIService (GPT-4 Vision) [+ optional image generation]
  → OutfitService.save_outfit_history()
  → JSON response
  → OutfitPreview
```

### Authentication

```
Register/Login (View)
  → useAuthController
  → ApiService
  → AuthController → AuthService
  → JWT returned → localStorage
  → Bearer header on subsequent requests
```

---

## Database Schema

### Users

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

### Outfit history

```sql
CREATE TABLE outfit_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    text_input TEXT,
    image_data TEXT,
    model_image TEXT,
    shirt VARCHAR(512) NOT NULL,
    trouser VARCHAR(512) NOT NULL,
    blazer VARCHAR(512) NOT NULL,
    shoes VARCHAR(512) NOT NULL,
    belt VARCHAR(512) NOT NULL,
    reasoning TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Perceptual hashes are computed at query time (not stored). Wardrobe and admin tables are defined in ORM models — see [DB_SCHEMA_COMPARISON.md](./DB_SCHEMA_COMPARISON.md) for migration history.

---

## AI Integration

| Provider | Models | Use |
|----------|--------|-----|
| OpenAI | GPT-4 Vision (`gpt-4o`), DALL-E 3 | Analysis, outfit JSON, image gen |
| Replicate | SDXL | Alternative image generation |
| Nano Banana | Image-to-image | Detail preservation (API key required) |
| Hugging Face | BLIP / ViT-GPT2 | Wardrobe categorization (optional) |

Prompt engineering emphasizes exact color extraction, full outfit completeness, full-body model shots, and location-aware appearance.

---

## Authentication & Security

1. **Registration** → inactive account → activation email
2. **Activation** → `GET /api/auth/activate/{token}`
3. **Login** → JWT (7-day expiry typical)
4. **Protected routes** → `Authorization: Bearer <token>`

| Control | Implementation |
|---------|----------------|
| Passwords | bcrypt |
| Tokens | JWT (`sub`, `exp`, `iat`) |
| Input validation | Pydantic |
| SQL injection | SQLAlchemy ORM |
| XSS | React escaping |
| CORS | Configured allowed origins |

---

## Multi-Platform Clients

The backend is a **REST API** — any HTTP client can consume it.

### iOS

Native SwiftUI client in `ios-client/`. Shares the same API contract; parity tracked in [IOS_WEB_FEATURE_PARITY.md](./IOS_WEB_FEATURE_PARITY.md).

### Android (Kotlin example)

```kotlin
val requestBody = MultipartBody.Builder()
    .setType(MultipartBody.FORM)
    .addFormDataPart("image", "photo.jpg",
        RequestBody.create(MediaType.parse("image/jpeg"), imageFile))
    .addFormDataPart("text_input", "Business casual")
    .build()

val request = Request.Builder()
    .url("https://your-api.com/api/suggest-outfit")
    .post(requestBody)
    .build()
```

### iOS / Swift (URLSession)

```swift
var request = URLRequest(url: URL(string: "https://your-api.com/api/suggest-outfit")!)
request.httpMethod = "POST"
// multipart body with image + text_input
```

### React Native

Reuse `ApiService` patterns from the web frontend with minimal changes.

---

## Environment & Running Locally

### Backend (`.env`)

```bash
OPENAI_API_KEY=your_key
DATABASE_URL=postgresql://...
JWT_SECRET_KEY=your_secret
PORT=8001
```

### Frontend (`.env`)

```bash
REACT_APP_API_URL=http://localhost:8001
```

### Commands

```bash
# Backend
cd backend && source venv/bin/activate && python main.py

# Frontend
cd frontend && npm start

# Both
./start.sh
```

---

## Deployment

| Layer | Platform | Notes |
|-------|----------|-------|
| Frontend | GitHub Pages | `npm run build` + `npm run deploy` |
| Backend | Railway | See [DEPLOYMENT_INSTRUCTIONS.md](./DEPLOYMENT_INSTRUCTIONS.md) |
| Database | PostgreSQL | Railway or managed provider |

**Backend env (production):** `OPENAI_API_KEY`, `DATABASE_URL`, `JWT_SECRET_KEY`, optional `REPLICATE_API_TOKEN`, `NANO_BANANA_API_KEY`, email SMTP vars, `CHATGPT_MODEL`, `PORT`.

Tables are created on startup via SQLAlchemy; use Alembic or migration scripts for schema changes.

---

## Contributing

### Backend feature

1. Model (Pydantic / ORM)
2. Service (business logic)
3. Controller (orchestration)
4. Route (HTTP)
5. Tests in `backend/tests/`

### Frontend feature

1. Model (TypeScript interface)
2. `ApiService` method
3. Controller hook
4. View component (pure)
5. Wire in `App.tsx`
6. Tests in `frontend/src`

### Testing strategy

| Layer | Approach |
|-------|----------|
| Models | Types / validation |
| Services | Unit tests, mocked deps |
| Controllers | Integration tests |
| Routes / Views | Endpoint / component tests |

---

## Key Design Decisions

1. MVC with strict layer boundaries
2. Platform-agnostic REST API
3. Perceptual hashing for cost control
4. Multi-model image generation with fallback
5. JWT stateless auth
6. Email verification before activation
7. Feature flags for gradual rollout
8. Separate web and iOS clients, shared backend

---

## Future Enhancements

- WebSocket / real-time generation progress
- Recommendation engine from user preferences
- E-commerce / shopping integrations
- Social sharing and collections
- Expanded admin analytics
- Multi-language support
- Deeper Android client

---

## Questions?

| Area | Location |
|------|----------|
| Backend code | `backend/routes/`, `controllers/`, `services/`, `models/` |
| Frontend code | `frontend/src/views/`, `controllers/`, `services/` |
| iOS code | `ios-client/OutfitSuggestor/` |
| Live API | `http://localhost:8001/docs` |
| Refactoring history | [MVC_REFACTORING_PLAN.md](./MVC_REFACTORING_PLAN.md) |
