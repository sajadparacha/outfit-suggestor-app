# MVC Architecture Refactoring Plan

## Overview
This document outlines the plan to refactor the application to follow a strict **MVC (Model-View-Controller)** architecture pattern with **RESTful Python services**.

## Current Architecture

### Backend
- **Routes** → **Services** → **Models**
- Routes handle HTTP requests/responses
- Services contain business logic
- Models define data structures

### Frontend
- **Views** (React Components)
- **Controllers** (React Hooks)
- **Services** (API Communication)
- **Models** (TypeScript Interfaces)

## Target Architecture

### Backend: MVC with RESTful Services

```
┌─────────────┐
│   Routes    │  HTTP endpoints, request/response handling
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Controllers │  Request validation, orchestration, response formatting
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Services   │  Pure business logic, reusable across controllers
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Models    │  Data structures (Pydantic + SQLAlchemy)
└─────────────┘
```

#### Directory Structure
```
backend/
├── main.py
├── config.py
├── models/              # Data models (Pydantic schemas + SQLAlchemy ORM)
│   ├── outfit.py
│   ├── user.py
│   └── outfit_history.py
├── controllers/         # NEW: Request handling, validation, orchestration
│   ├── __init__.py
│   ├── outfit_controller.py
│   └── auth_controller.py
├── services/            # Business logic (pure, reusable)
│   ├── ai_service.py
│   ├── outfit_service.py  # NEW: Outfit business logic
│   └── auth_service.py   # NEW: Auth business logic
├── routes/              # HTTP endpoints (thin layer)
│   ├── outfit_routes.py
│   └── auth_routes.py
└── utils/               # Utility functions
    └── image_processor.py
```

#### Responsibilities

**Routes Layer:**
- Define HTTP endpoints
- Handle HTTP-specific concerns (status codes, headers)
- Extract request data (query params, body, files)
- Call controllers
- Return HTTP responses

**Controllers Layer:**
- Validate request data
- Orchestrate service calls
- Handle business-level errors
- Format responses
- Manage transactions (if needed)

**Services Layer:**
- Pure business logic
- No HTTP concerns
- Reusable across different entry points
- Can be called by controllers, CLI tools, background jobs, etc.

**Models Layer:**
- Data structures
- Validation rules
- Database schemas

### Frontend: Strict MVC

```
┌─────────────┐
│    Views    │  Pure presentation, no logic
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Controllers │  All business logic, state management
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Services   │  API communication only
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Models    │  TypeScript interfaces/types
└─────────────┘
```

#### Directory Structure
```
frontend/src/
├── App.tsx              # Application entry, routes views
├── models/              # TypeScript interfaces (pure data)
│   ├── OutfitModels.ts
│   └── AuthModels.ts
├── controllers/         # Business logic, state management
│   ├── useOutfitController.ts
│   ├── useAuthController.ts
│   └── useHistoryController.ts
├── views/               # Pure presentation components
│   └── components/
│       ├── Hero.tsx
│       ├── Sidebar.tsx
│       ├── OutfitPreview.tsx
│       └── ...
├── services/            # API communication only
│   └── ApiService.ts
└── utils/               # Pure utility functions
    └── imageUtils.ts
```

#### Responsibilities

**Views Layer:**
- Display data (props)
- Emit events (callbacks)
- No business logic
- No state management (except UI-only state like modal open/close)
- No API calls

**Controllers Layer:**
- All business logic
- State management
- Event handling
- API orchestration
- Data transformation
- Error handling

**Services Layer:**
- HTTP requests only
- Request/response formatting
- No business logic
- Reusable across controllers

**Models Layer:**
- TypeScript interfaces
- Type definitions
- No logic

## Refactoring Steps

### Phase 1: Backend Controllers

1. **Create `backend/controllers/` directory**
2. **Create `OutfitController`**
   - Move request validation from routes
   - Move orchestration logic from routes
   - Keep services for pure business logic
3. **Create `AuthController`**
   - Handle authentication logic
   - Token management
   - Password validation
4. **Update Routes**
   - Make routes thin (just HTTP handling)
   - Call controllers instead of services directly

### Phase 2: Backend Services Refinement

1. **Create `OutfitService`**
   - Extract outfit-related business logic from routes
   - Handle outfit history operations
   - Duplicate detection logic
2. **Create `AuthService`**
   - Extract auth business logic
   - Password hashing/verification
   - Token generation
3. **Refine `AIService`**
   - Keep only AI/OpenAI related logic
   - Remove any HTTP or request handling

### Phase 3: Frontend Views

1. **Review all View components**
2. **Remove business logic from Views**
   - Move state management to controllers
   - Move API calls to controllers
   - Keep only presentation logic
3. **Ensure Views are pure**
   - Receive data via props
   - Emit events via callbacks
   - No direct service calls

### Phase 4: Frontend Controllers

1. **Enhance Controllers**
   - Move all business logic from Views
   - Centralize state management
   - Handle all event orchestration
2. **Ensure Controllers are complete**
   - All API calls go through controllers
   - All data transformation in controllers
   - All error handling in controllers

### Phase 5: Documentation

1. **Update ARCHITECTURE.md**
2. **Add code examples**
3. **Document data flow**

## Benefits

1. **Separation of Concerns**: Each layer has a single, clear responsibility
2. **Testability**: Each layer can be tested independently
3. **Maintainability**: Changes in one layer don't affect others
4. **Reusability**: Services can be reused across different entry points
5. **Scalability**: Easy to add new features following the same pattern
6. **Team Collaboration**: Clear boundaries for different developers

## Migration Strategy

- Refactor incrementally
- Keep existing functionality working
- Test after each phase
- Update documentation as we go

## Success Criteria

- ✅ Backend has explicit Controller layer
- ✅ Routes are thin (only HTTP handling)
- ✅ Services contain only business logic
- ✅ Frontend Views are pure presentation
- ✅ All business logic in Controllers
- ✅ No direct service calls from Views
- ✅ All layers are independently testable







