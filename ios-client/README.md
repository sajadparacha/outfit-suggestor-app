# Outfit Suggestor - iOS Client

Native iOS application for AI-powered outfit suggestions, built with Swift and SwiftUI.

## Overview

This is the iOS client for the Outfit Suggestor application. It consumes the same backend API as the web application, demonstrating the multi-platform architecture.

## Features

- 📱 **Native iOS Experience**: Built with SwiftUI for a modern, native feel
- 🖼️ **Image Upload**: Select photos from your library
- 🤖 **AI-Powered**: Uses the backend AI service for outfit suggestions
- 🎨 **Beautiful UI**: Clean, modern interface following iOS design guidelines
- ⚡ **Fast & Responsive**: Async/await for smooth performance
- 🏗️ **MVVM Architecture**: Clean separation of concerns

## Architecture

The iOS app follows the MVVM (Model-View-ViewModel) pattern:

```
OutfitSuggestor/
├── Models/              # Data models
│   └── OutfitModels.swift
├── Services/            # API communication
│   └── APIService.swift
├── ViewModels/          # Business logic
│   └── OutfitViewModel.swift
├── Views/               # SwiftUI views
│   ├── ContentView.swift
│   ├── HeroView.swift
│   ├── ImageUploadView.swift
│   ├── FiltersView.swift
│   └── OutfitSuggestionView.swift
├── Utils/               # Utility components
│   └── ImagePicker.swift
└── Resources/           # Assets and configuration
    └── Info.plist
```

### Architecture Layers

#### Models
- `OutfitModels.swift`: Data structures matching the backend API
  - `OutfitSuggestion`: Complete outfit data
  - `OutfitFilters`: User preference filters
  - `APIError`: Error handling
  - Enums for filter options

#### Services
- `APIService.swift`: Backend API communication
  - Singleton pattern for global access
  - Async/await for modern concurrency
  - Multipart form data handling
  - Error handling with custom errors

#### ViewModels
- `OutfitViewModel.swift`: Business logic and state management
  - ObservableObject for SwiftUI integration
  - @Published properties for reactive updates
  - API calls and data transformation

#### Views
- `ContentView.swift`: Main container view
- `HeroView.swift`: Welcome section
- `ImageUploadView.swift`: Image selection component
- `FiltersView.swift`: Preference filters
- `OutfitSuggestionView.swift`: Results display

## Requirements

- iOS 15.0+
- Xcode 13.0+
- Swift 5.5+
- SwiftUI

## Setup

### 1. Prerequisites

Make sure you have:
- macOS with Xcode installed
- Backend server running (see main README)
- Apple Developer account (for device testing)

### 2. Open in Xcode

Since this is a file structure only, you'll need to create an Xcode project:

1. **Create New Xcode Project**:
   ```
   File > New > Project > iOS > App
   ```

2. **Project Settings**:
   - Product Name: `OutfitSuggestor`
   - Team: Your team
   - Organization Identifier: `com.yourcompany`
   - Interface: SwiftUI
   - Language: Swift
   - Minimum Deployment: iOS 15.0

3. **Add the Files**:
   - Delete the default `ContentView.swift` and `OutfitSuggestorApp.swift`
   - Add all the files from this directory to your project
   - Organize them into groups matching the folder structure

### 3. Configure Backend URL

In `Services/APIService.swift`, update the base URL:

```swift
private init() {
    // For local development:
    self.baseURL = "http://localhost:8001"
    
    // For production (update with your deployed backend):
    // self.baseURL = "https://your-backend-url.com"
}
```

**Important for iOS Simulator**:
- If testing on iOS Simulator, `localhost` will work
- If testing on a physical device, use your computer's IP address:
  ```swift
  self.baseURL = "http://192.168.1.XXX:8001"
  ```

### 4. Configure App Transport Security

For development with HTTP (non-HTTPS), you need to update `Info.plist`:

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
```

**Note**: Remove this in production and use HTTPS!

## Running the App

### 1. Start Backend Server

First, make sure the backend API is running:

```bash
cd backend
source venv/bin/activate
python main.py
```

Backend should be running on http://localhost:8001

### 2. Run iOS App

1. Open the project in Xcode
2. Select a simulator or connected device
3. Click Run (Cmd+R)

## Usage

1. **Launch App**: Open the app on your device/simulator
2. **Upload Image**: Tap the upload area and select a photo
3. **Set Preferences**: 
   - Enter free text description, OR
   - Use the filter pickers
4. **Get Suggestion**: Tap "Get Outfit Suggestion"
5. **View Results**: See the AI-generated outfit recommendation

## API Integration

The iOS app communicates with the backend using the same REST API:

### Endpoint: POST /api/suggest-outfit

**Request**:
```
Content-Type: multipart/form-data

- image: Image file (JPEG/PNG)
- text_input: User preferences (string)
```

**Response**:
```json
{
  "shirt": "...",
  "trouser": "...",
  "blazer": "...",
  "shoes": "...",
  "belt": "...",
  "reasoning": "..."
}
```

## Code Structure

### Models

```swift
struct OutfitSuggestion: Codable, Identifiable {
    let id: String
    let shirt: String
    let trouser: String
    // ... other fields
}
```

### API Service

```swift
class APIService {
    static let shared = APIService()
    
    func getSuggestion(image: UIImage, textInput: String) async throws -> OutfitSuggestion {
        // Multipart form data request
        // Returns decoded OutfitSuggestion
    }
}
```

### ViewModel

```swift
@MainActor
class OutfitViewModel: ObservableObject {
    @Published var selectedImage: UIImage?
    @Published var currentSuggestion: OutfitSuggestion?
    @Published var isLoading = false
    
    func getSuggestion() async {
        // Call API service
        // Update UI state
    }
}
```

### View

```swift
struct ContentView: View {
    @StateObject private var viewModel = OutfitViewModel()
    
    var body: some View {
        // SwiftUI view hierarchy
    }
}
```

## Testing

### Unit Tests

Create test files in the Tests folder:

```swift
@testable import OutfitSuggestor
import XCTest

class OutfitViewModelTests: XCTestCase {
    func testGetSuggestion() async throws {
        // Test ViewModel logic
    }
}
```

### UI Tests

Test the complete user flow:

```swift
class OutfitSuggestorUITests: XCTestCase {
    func testOutfitSuggestionFlow() throws {
        let app = XCUIApplication()
        app.launch()
        // Test UI interactions
    }
}
```

## Troubleshooting

### Backend Connection Issues

**Problem**: "Cannot connect to backend"

**Solutions**:
1. Verify backend is running: `http://localhost:8001/health`
2. Check firewall settings
3. On physical device, use computer's IP address instead of localhost
4. Ensure App Transport Security is configured for HTTP

### Image Upload Fails

**Problem**: "Invalid image" error

**Solutions**:
1. Check image format (JPEG, PNG supported)
2. Verify image size (max 10MB)
3. Check network connection

### Build Errors

**Problem**: "Module not found" or similar

**Solutions**:
1. Clean build folder (Cmd+Shift+K)
2. Delete derived data
3. Restart Xcode
4. Verify all files are added to target

## Deployment

### TestFlight

1. Archive the app (Product > Archive)
2. Upload to App Store Connect
3. Distribute via TestFlight

### App Store

1. Prepare app metadata
2. Take screenshots for all device sizes
3. Submit for review

**Important**: Update backend URL to production before release!

## Future Enhancements

- [ ] Camera support for taking new photos
- [ ] Save favorite outfit suggestions
- [ ] Share suggestions via social media
- [ ] Offline mode with cached results
- [ ] iPad optimization
- [ ] Dark mode support
- [ ] Accessibility improvements
- [ ] Localization for multiple languages

## Architecture Benefits

✅ **Reuses Backend API**: Same API as web app  
✅ **Clean Separation**: MVVM pattern  
✅ **Type-Safe**: Swift's strong typing  
✅ **Modern**: SwiftUI and async/await  
✅ **Maintainable**: Clear file organization  
✅ **Testable**: ViewModels can be unit tested  

## Related Documentation

- [Main README](../README.md) - Project overview
- [ARCHITECTURE.md](../ARCHITECTURE.md) - Complete architecture
- [API_DOCUMENTATION.md](../API_DOCUMENTATION.md) - API reference

## License

Same as the main project - MIT License

---

**Built with ❤️ using Swift and SwiftUI**

