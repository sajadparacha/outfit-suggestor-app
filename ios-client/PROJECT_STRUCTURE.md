# iOS Project Structure

## Complete File Organization

```
ios-client/
├── README.md                           # iOS client documentation
├── SETUP_GUIDE.md                      # Step-by-step setup instructions
├── PROJECT_STRUCTURE.md                # This file
│
└── OutfitSuggestor/                    # Main app directory
    │
    ├── OutfitSuggestorApp.swift       # App entry point (@main)
    │
    ├── Models/                         # Data models
    │   └── OutfitModels.swift         # Outfit data structures
    │       ├── OutfitSuggestion       # Main response model
    │       ├── OutfitFilters          # User preferences
    │       ├── APIError               # Error response
    │       └── Enums                  # Occasion, Season, Style
    │
    ├── Services/                       # API communication layer
    │   └── APIService.swift           # Backend API client
    │       ├── getSuggestion()        # Main API call
    │       ├── healthCheck()          # Server health check
    │       └── APIServiceError        # Custom errors
    │
    ├── ViewModels/                     # Business logic (MVVM Controllers)
    │   └── OutfitViewModel.swift      # Outfit suggestion logic
    │       ├── @Published properties  # Reactive state
    │       ├── getSuggestion()        # Business method
    │       └── State management       # Loading, errors, data
    │
    ├── Views/                          # SwiftUI views (Presentation)
    │   ├── ContentView.swift          # Main container view
    │   ├── HeroView.swift             # Welcome/branding section
    │   ├── ImageUploadView.swift      # Image selection component
    │   ├── FiltersView.swift          # Preference filters UI
    │   └── OutfitSuggestionView.swift # Results display
    │       └── OutfitItemCard.swift   # Reusable item card
    │
    ├── Utils/                          # Utility components
    │   └── ImagePicker.swift          # UIKit wrapper for photo picker
    │
    └── Resources/                      # Assets and configuration
        ├── Info.plist                 # App configuration
        └── Assets.xcassets/           # Images, colors, icons (to be added)
```

## Architecture Pattern: MVVM

### Model
**Files**: `Models/OutfitModels.swift`

**Purpose**: Data structures

**Responsibilities**:
- Define data shape
- Conform to protocols (Codable, Identifiable)
- No business logic
- Pure data representation

**Example**:
```swift
struct OutfitSuggestion: Codable, Identifiable {
    let id: String
    let shirt: String
    // ...
}
```

### View
**Files**: `Views/*.swift`

**Purpose**: User interface

**Responsibilities**:
- Display data
- Handle user interactions
- Trigger ViewModel actions
- No business logic
- SwiftUI declarative code

**Example**:
```swift
struct ContentView: View {
    @StateObject private var viewModel = OutfitViewModel()
    
    var body: some View {
        // UI code
    }
}
```

### ViewModel
**Files**: `ViewModels/OutfitViewModel.swift`

**Purpose**: Business logic and state

**Responsibilities**:
- Manage view state
- Call services
- Transform data
- Handle errors
- Update UI via @Published properties

**Example**:
```swift
@MainActor
class OutfitViewModel: ObservableObject {
    @Published var currentSuggestion: OutfitSuggestion?
    
    func getSuggestion() async {
        // Business logic
    }
}
```

### Service
**Files**: `Services/APIService.swift`

**Purpose**: External communication

**Responsibilities**:
- HTTP requests
- API integration
- Network error handling
- Data serialization

**Example**:
```swift
class APIService {
    func getSuggestion(image: UIImage, textInput: String) async throws -> OutfitSuggestion {
        // API call
    }
}
```

## Data Flow

```
User Interaction (View)
    ↓
ViewModel receives event
    ↓
ViewModel calls Service
    ↓
Service makes API request to Backend
    ↓
Service receives and decodes response
    ↓
Service returns Model to ViewModel
    ↓
ViewModel updates @Published property
    ↓
SwiftUI automatically updates View
    ↓
User sees result
```

## File Dependencies

```
OutfitSuggestorApp
    └── ContentView
        ├── HeroView (no dependencies)
        ├── ImageUploadView
        │   └── ImagePicker (Utils)
        ├── FiltersView
        │   └── OutfitFilters (Model)
        ├── OutfitSuggestionView
        │   ├── OutfitSuggestion (Model)
        │   └── OutfitItemCard (sub-component)
        └── OutfitViewModel
            ├── APIService (Service)
            ├── OutfitModels (Models)
            └── Combine framework
```

## Key Features of Each File

### OutfitSuggestorApp.swift
- Entry point with `@main` attribute
- Creates root `WindowGroup`
- Initializes `ContentView`
- Minimal code - just app structure

### Models/OutfitModels.swift
- **OutfitSuggestion**: Main response from API
  - Conforms to `Codable` for JSON
  - Conforms to `Identifiable` for SwiftUI lists
  - Has custom `init` to generate UUID
- **OutfitFilters**: User preference structure
  - Occasion, Season, Style properties
  - Helper `description` computed property
- **APIError**: Error response structure
- **Enums**: Type-safe filter options with `CaseIterable`

### Services/APIService.swift
- Singleton pattern (`static let shared`)
- Async/await for modern concurrency
- Multipart form data construction
- HTTP request/response handling
- Custom error types with `LocalizedError`
- Configurable base URL
- Health check method

### ViewModels/OutfitViewModel.swift
- Inherits `ObservableObject` for SwiftUI
- `@Published` properties trigger view updates
- `@MainActor` ensures UI updates on main thread
- Business logic: prompt building, API calls
- Error handling and user feedback
- State management (loading, errors, data)

### Views/ContentView.swift
- Main container with `NavigationView`
- Owns `OutfitViewModel` with `@StateObject`
- Coordinates sub-views
- Handles sheet presentation (image picker)
- Shows alerts for errors

### Views/HeroView.swift
- Stateless view (no @State)
- Pure presentation
- SF Symbols icons
- Gradient background
- Welcome message

### Views/ImageUploadView.swift
- Uses `@Binding` to communicate with parent
- Shows upload prompt or selected image
- Presents `ImagePicker` sheet
- Remove image functionality

### Views/FiltersView.swift
- Uses `@Binding` for two-way data flow
- Free text input field
- Three picker components
- Clean layout with sections

### Views/OutfitSuggestionView.swift
- Displays results in card format
- Uses `OutfitItemCard` sub-component
- Reasoning section with icon
- Reusable component design

### Utils/ImagePicker.swift
- Bridges UIKit and SwiftUI
- `UIViewControllerRepresentable` protocol
- Coordinator pattern for delegation
- Handles photo library selection

## SwiftUI Concepts Used

### Property Wrappers
- `@State`: View-local state
- `@Binding`: Two-way binding to parent
- `@StateObject`: ViewModel ownership
- `@Published`: Observable property in ViewModel
- `@Environment`: Access environment values

### View Modifiers
- `.padding()`, `.frame()`, `.background()`
- `.cornerRadius()`, `.shadow()`
- `.navigationTitle()`, `.sheet()`
- `.alert()`, `.task()`

### Layout
- `VStack`, `HStack`, `ZStack`
- `ScrollView`
- `Spacer`
- `NavigationView`

## Best Practices Demonstrated

### 1. Separation of Concerns
✅ Views don't call APIs directly  
✅ ViewModels don't know about SwiftUI  
✅ Models are pure data  
✅ Services handle networking only  

### 2. Async/Await
✅ Modern concurrency  
✅ Clean async code  
✅ Proper error propagation  
✅ `@MainActor` for UI updates  

### 3. Type Safety
✅ Enums for fixed values  
✅ Codable for JSON  
✅ Custom error types  
✅ Strong typing throughout  

### 4. SwiftUI Best Practices
✅ Small, focused views  
✅ Reusable components  
✅ Proper property wrappers  
✅ Preview providers  

### 5. Error Handling
✅ Custom error types  
✅ User-friendly messages  
✅ Alert presentation  
✅ Try-catch blocks  

## Adding New Features

### Adding a New View

1. Create new Swift file in `Views/`
2. Import SwiftUI
3. Create struct conforming to `View`
4. Implement `body` property
5. Add preview provider
6. Use in parent view

### Adding New Model

1. Create struct/class in `Models/`
2. Conform to `Codable` for JSON
3. Add `Identifiable` if used in lists
4. Match backend API structure
5. Update `APIService` if needed

### Adding New API Call

1. Add method to `APIService.swift`
2. Define request/response models
3. Handle errors appropriately
4. Add to ViewModel
5. Update View to trigger call

## Code Organization Tips

### Keep Views Small
- Maximum 150 lines per view
- Extract sub-components
- Use computed properties
- Break complex layouts

### One Responsibility
- Each file has one purpose
- ViewModels manage one feature
- Views display one concept
- Services handle one API

### Naming Conventions
- Views: `XyzView.swift`
- ViewModels: `XyzViewModel.swift`
- Models: `XyzModel.swift` or `XyzModels.swift`
- Services: `XyzService.swift`

## Testing Structure (Future)

```
OutfitSuggestorTests/
├── ModelTests/
│   └── OutfitModelsTests.swift
├── ViewModelTests/
│   └── OutfitViewModelTests.swift
└── ServiceTests/
    └── APIServiceTests.swift

OutfitSuggestorUITests/
└── OutfitSuggestorUITests.swift
```

## Summary

This iOS app demonstrates:
- ✅ **Clean Architecture**: MVVM pattern
- ✅ **Modern Swift**: Async/await, property wrappers
- ✅ **SwiftUI**: Declarative UI framework
- ✅ **API Integration**: Multipart form data, JSON decoding
- ✅ **Best Practices**: Type safety, error handling, separation of concerns

The structure is:
- 📁 **Organized**: Clear folder hierarchy
- 🔧 **Maintainable**: Easy to find and modify code
- 🧪 **Testable**: ViewModels and Services can be unit tested
- 📱 **Scalable**: Easy to add new features

---

**Total Files**: 11 Swift files + Info.plist  
**Lines of Code**: ~1,200 lines  
**Architecture**: MVVM with Services  
**Framework**: SwiftUI + Combine  

