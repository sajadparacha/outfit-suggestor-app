# iOS Client - Quick Setup Guide

## Step-by-Step Instructions for Getting Started

### 1. Create Xcode Project

1. Open Xcode
2. Create a new project:
   - **File → New → Project**
   - Select **iOS → App**
   - Click **Next**

3. Configure project:
   - **Product Name**: `OutfitSuggestor`
   - **Team**: Select your team
   - **Organization Identifier**: `com.yourname` (or your domain)
   - **Bundle Identifier**: Will be auto-generated as `com.yourname.OutfitSuggestor`
   - **Interface**: **SwiftUI**
   - **Language**: **Swift**
   - **Use Core Data**: ❌ Unchecked
   - **Include Tests**: ✅ Checked (optional)
   - Click **Next**

4. Choose save location and create the project

### 2. Add Source Files to Xcode

1. **Delete default files**:
   - In Xcode Project Navigator, delete:
     - `ContentView.swift`
     - `OutfitSuggestorApp.swift`
   - Choose **Move to Trash** when prompted

2. **Create folder groups in Xcode**:
   - Right-click on `OutfitSuggestor` folder in Project Navigator
   - **New Group** → Name it `Models`
   - Repeat for: `Services`, `ViewModels`, `Views`, `Utils`, `Resources`

3. **Add the Swift files**:
   
   For each file in the `ios-client/OutfitSuggestor` directory:
   
   **Method A - Drag and Drop**:
   - Drag the file from Finder into the corresponding Xcode group
   - Ensure **"Copy items if needed"** is checked
   - Ensure **"Add to targets: OutfitSuggestor"** is checked
   
   **Method B - Add Files**:
   - Right-click group → **Add Files to "OutfitSuggestor"**
   - Navigate to the file
   - Select it and click **Add**

   **Files to add**:
   ```
   Models/
     - OutfitModels.swift
   
   Services/
     - APIService.swift
   
   ViewModels/
     - OutfitViewModel.swift
   
   Views/
     - ContentView.swift
     - HeroView.swift
     - ImageUploadView.swift
     - FiltersView.swift
     - OutfitSuggestionView.swift
   
   Utils/
     - ImagePicker.swift
   
   Root level:
     - OutfitSuggestorApp.swift
   ```

4. **Update Info.plist**:
   - Select `Info.plist` in Project Navigator
   - Add photo library permission:
     - Click **+** button
     - Add key: `Privacy - Photo Library Usage Description`
     - Value: `We need access to your photo library to select images for outfit suggestions.`
   
   Or use the provided `Info.plist` file in `Resources/`

### 3. Configure Backend URL

1. Open `Services/APIService.swift`
2. Find the `init()` method
3. Update the `baseURL`:

**For iOS Simulator**:
```swift
self.baseURL = "http://localhost:8001"
```

**For Physical iPhone (same WiFi network)**:
```swift
// Replace with your computer's IP address
self.baseURL = "http://192.168.1.XXX:8001"
```

**To find your IP address**:
- macOS: System Preferences → Network
- Or run in Terminal: `ipconfig getifaddr en0`

### 4. Configure App Transport Security (Development Only)

Since the backend uses HTTP (not HTTPS) during development:

1. Open `Info.plist`
2. Add this configuration:
   - Click **+** button
   - Add key: `App Transport Security Settings` (Dictionary)
   - Click disclosure triangle to expand
   - Click **+** inside the dictionary
   - Add key: `Allow Arbitrary Loads` (Boolean)
   - Set value to: **YES**

**⚠️ Important**: Remove this in production! Use HTTPS for your deployed backend.

### 5. Start Backend Server

Open Terminal and run:

```bash
cd /path/to/outfit-suggestor-app/backend
source venv/bin/activate
python main.py
```

Verify it's running by visiting: http://localhost:8001/health

### 6. Build and Run

1. In Xcode, select a simulator:
   - Top toolbar: **iPhone 14 Pro** (or any iOS 15+ simulator)

2. Click the **Run** button (▶️) or press **Cmd+R**

3. Wait for the build to complete

4. The app should launch in the simulator!

### 7. Test the App

1. **Upload an Image**:
   - Drag an image file into the iOS Simulator
   - This adds it to the Photos app
   - In the app, tap "Tap to Upload Image"
   - Select the photo you just added

2. **Set Preferences**:
   - Type in the text field, OR
   - Use the filter pickers

3. **Get Suggestion**:
   - Tap "Get Outfit Suggestion"
   - Wait for the AI to process (a few seconds)
   - View the results!

## Troubleshooting

### "Cannot connect to backend"

**Check**:
1. Is backend server running? Visit http://localhost:8001/health
2. Is the URL correct in `APIService.swift`?
3. Is App Transport Security configured in Info.plist?
4. On physical device, are you using the correct IP address?

**Solution**:
```bash
# In Terminal, verify backend is running:
curl http://localhost:8001/health

# Should return:
# {"status":"healthy","service":"AI Outfit Suggestor","version":"2.0.0"}
```

### Build Errors

**"No such module 'SwiftUI'"**:
- Minimum deployment target must be iOS 15.0+
- Check in Project Settings → Deployment Info

**"Cannot find type 'OutfitSuggestion' in scope"**:
- Ensure all Swift files are added to the target
- Project Navigator → Select file → File Inspector → Target Membership should be checked

**Clean and Rebuild**:
1. Product → Clean Build Folder (Cmd+Shift+K)
2. Product → Build (Cmd+B)

### Simulator Issues

**Photos not showing**:
- Drag an image into the simulator window
- It will be saved to the Photos app
- Then you can select it in the app

**Slow performance**:
- The iOS Simulator can be slow
- Try a newer iPhone model in the simulator
- Or test on a physical device

### Physical Device Testing

1. **Connect your iPhone** via USB
2. **Trust the computer** on your iPhone
3. **Select your device** in Xcode's device menu
4. **Configure Signing**:
   - Project Settings → Signing & Capabilities
   - Select your team
   - Xcode will create a provisioning profile
5. **Update backend URL** to use your computer's IP address
6. **Ensure both devices are on the same WiFi network**
7. **Run** the app

## Next Steps

### Customization

**Change App Icon**:
1. Create icon images (1024x1024 and various sizes)
2. Add to `Assets.xcassets/AppIcon`

**Change Colors**:
- Edit color values in View files
- Create a color scheme in `Assets.xcassets`

**Add Features**:
- Camera support (add to `ImagePicker.swift`)
- Save favorites (use Core Data or UserDefaults)
- Share functionality (use UIActivityViewController)

### Production Deployment

1. **Update Backend URL** to production HTTPS URL
2. **Remove App Transport Security exception**
3. **Add proper error handling**
4. **Test thoroughly**
5. **Create App Store Connect entry**
6. **Archive and upload to TestFlight**
7. **Submit for App Store Review**

## File Checklist

Make sure you have all these files in Xcode:

```
✅ OutfitSuggestorApp.swift (app entry point)

Models/
  ✅ OutfitModels.swift

Services/
  ✅ APIService.swift

ViewModels/
  ✅ OutfitViewModel.swift

Views/
  ✅ ContentView.swift
  ✅ HeroView.swift
  ✅ ImageUploadView.swift
  ✅ FiltersView.swift
  ✅ OutfitSuggestionView.swift

Utils/
  ✅ ImagePicker.swift

Resources/
  ✅ Info.plist (with photo library permission)
```

## Quick Reference

**Run App**: Cmd+R  
**Stop App**: Cmd+.  
**Clean Build**: Cmd+Shift+K  
**Build**: Cmd+B  
**Show Project Navigator**: Cmd+1  
**Show Debug Area**: Cmd+Shift+Y  

## Getting Help

- Check the [iOS README](README.md) for detailed documentation
- Review [API Documentation](../API_DOCUMENTATION.md) for API details
- See [Architecture Documentation](../ARCHITECTURE.md) for system design

---

**Happy Coding! 🚀**

