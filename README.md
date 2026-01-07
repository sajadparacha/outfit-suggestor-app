# AI Outfit Suggestor App

**Version 4.0.0** - Multi-Model AI Application

An AI-powered outfit suggestion application that analyzes clothing images and provides complete outfit recommendations. Built with a **modular, multi-platform architecture** that separates the backend API from client applications. Supports web, iOS, and Android clients.

🔗 **Live Demo**: [https://sajadparacha.github.io/outfit-suggestor-app](https://sajadparacha.github.io/outfit-suggestor-app)

---

## 🌟 Features

### Core Capabilities
- 🎯 **Flexible Input Support**: Upload **any clothing item** - shirts, blazers, footwear, or even partial outfit combinations. The AI intelligently adapts to what you provide.
- 🧩 **Smart Combination Analysis**: Upload a combination and the AI identifies existing pieces, then suggests only the **missing elements** to complete your look.
- 🤖 **AI-Powered Recommendations**: Get complete outfit suggestions using OpenAI GPT-4 Vision with expert styling advice.
- 🖼️ **AI Model Visualization**: Generate stunning AI-powered model images wearing your recommended outfit using DALL-E 3, Stable Diffusion, or Nano Banana, customized based on your location.
- 💡 **Style Reasoning**: Understand why each outfit works together with detailed explanations.
- 📋 **Complete Outfit History**: Track all your past suggestions with searchable history, including generated model images.

### Smart Wardrobe Management
- 👔 **Digital Wardrobe**: Build and manage your digital wardrobe with AI-powered item recognition
- 🤖 **AI-Powered Item Analysis**: Automatic categorization using Hugging Face BLIP or ViT-GPT2 models (free alternatives to OpenAI)
- 🔍 **Intelligent Duplicate Detection**: Perceptual hashing prevents duplicate wardrobe items and outfit suggestions, saving API costs
- 🎨 **Category Filtering**: Filter wardrobe by categories (Shirts, Trousers, Blazers, Shoes, Belts, Other)
- ➕ **One-Step Addition**: Upload image → AI analyzes → Review and save

### User Experience
- 🔐 **User Authentication**: Secure accounts with email activation, JWT tokens, and password management
- 🌍 **Location-Based Customization**: Model images customized based on geographical location for culturally appropriate appearances
- 📱 **Modern UI**: Clean, responsive React interface with MVC architecture
- 🔌 **Multi-Platform Ready**: RESTful API supports Web, iOS, and Android clients
- 🔄 **Real-time Updates**: Auto-refresh history and wardrobe updates

---

## 🏗️ Architecture

This application follows a **Service-Oriented Architecture (SOA)** with MVC pattern on the frontend:

### Backend (Service Layer Architecture)
```
backend/
├── models/          # SQLAlchemy ORM models (User, OutfitHistory, WardrobeItem)
├── services/        # Business logic (AI service, Auth service, Wardrobe service)
├── controllers/     # HTTP request handlers
├── routes/          # API endpoints
├── utils/           # Utility functions (image processing, hashing)
├── config.py        # Configuration management
└── main.py          # FastAPI app entry point
```

### Frontend (MVC Pattern)
```
frontend/src/
├── models/          # TypeScript interfaces
├── services/        # API communication layer
├── controllers/     # Business logic (React hooks)
├── views/           # Presentational components
└── utils/           # Helper functions
```

### iOS Client
```
ios-client/OutfitSuggestor/
├── Models/          # Swift data models
├── Services/        # API service layer
├── ViewModels/      # MVVM view models
├── Views/           # SwiftUI views
└── Utils/           # Helper utilities
```

📖 **For detailed architecture information**, see [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 🛠️ Tech Stack

### Backend
- **FastAPI 0.119.0** - Modern Python web framework
- **OpenAI GPT-4 Vision** - AI-powered outfit analysis and recommendations
- **OpenAI DALL-E 3** - AI-powered model image generation
- **Stable Diffusion (Replicate)** - Alternative model image generation
- **Hugging Face BLIP** - Free wardrobe item analysis (alternative to OpenAI)
- **Hugging Face ViT-GPT2** - Alternative wardrobe item analysis model
- **PostgreSQL** - Database for outfit history, wardrobe, and user data
- **SQLAlchemy 2.0** - ORM for database operations
- **Pydantic** - Data validation and serialization
- **PIL/Pillow** - Image processing
- **ImageHash** - Perceptual hashing for duplicate detection
- **Bcrypt** - Password hashing
- **JWT (python-jose)** - User authentication
- **Uvicorn** - ASGI server

### Frontend
- **React 19** with TypeScript
- **Tailwind CSS** - Styling
- **Custom Hooks** - State management (MVC controllers)
- **React Dropzone** - File uploads
- **Service Layer** - API communication

### iOS Client
- **SwiftUI** - Native iOS interface
- **Swift** - Language
- **URLSession** - HTTP client
- **MVVM Architecture**

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- Python 3.12+
- PostgreSQL (or use Railway's managed database)
- OpenAI API key (or use free Hugging Face models for wardrobe)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/sajadparacha/outfit-suggestor-app.git
   cd outfit-suggestor-app
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Database Setup**
   
   **Option 1: Local PostgreSQL**
   ```bash
   createdb outfit_suggestor
   ```
   
   **Option 2: Use Railway (see [DEPLOYMENT_INSTRUCTIONS.md](./DEPLOYMENT_INSTRUCTIONS.md))**

4. **Environment Variables**
   
   Create `backend/.env`:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   DATABASE_URL=postgresql://user:password@localhost:5432/outfit_suggestor
   PORT=8001
   IMAGE_SIMILARITY_THRESHOLD=5
   
   # Optional - for free wardrobe analysis
   HUGGINGFACE_API_TOKEN=your_hf_token_here  # Optional
   WARDROBE_AI_MODEL=huggingface  # Use "openai" or "huggingface"
   HUGGINGFACE_MODEL_TYPE=blip  # Use "blip" or "vit-gpt2"
   
   # Optional - for alternative image generation
   REPLICATE_API_TOKEN=your_replicate_token  # For Stable Diffusion
   ```
   
   Create `frontend/.env` (optional, defaults to localhost):
   ```env
   REACT_APP_API_URL=http://localhost:8001
   ```

5. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   ```

6. **Run the Application**
   
   **Option 1: Use the start script** (recommended)
   ```bash
   chmod +x start.sh
   ./start.sh
   ```
   
   **Option 2: Run separately**
   ```bash
   # Terminal 1 - Backend
   cd backend
   source venv/bin/activate
   python main.py
   
   # Terminal 2 - Frontend
   cd frontend
   npm start
   ```

7. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8001
   - API Docs: http://localhost:8001/docs

---

## 📚 Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Complete architecture overview and design patterns
- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - REST API reference for developers
- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Detailed setup instructions
- **[DEPLOYMENT_INSTRUCTIONS.md](./DEPLOYMENT_INSTRUCTIONS.md)** - Railway and GitHub Pages deployment
- **[ios-client/README.md](./ios-client/README.md)** - iOS client setup guide
- **[ios-client/SETUP_GUIDE.md](./ios-client/SETUP_GUIDE.md)** - iOS Xcode configuration

---

## 🔌 API Endpoints

### Health & Status
- `GET /` - Basic health check
- `GET /health` - Detailed health status

### Authentication
- `POST /api/auth/register` - Register new user (auto-login)
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/change-password` - Change password
- `GET /api/auth/activate/{token}` - Activate account via email

### Outfit Suggestions
- `POST /api/suggest-outfit` - Analyze image and get outfit recommendations
  - **Body**: `multipart/form-data`
  - **Fields**: 
    - `image` (required): Image file
    - `text_input` (optional): Additional context or preferences
    - `generate_model_image` (optional): Boolean to generate AI model image
    - `image_model` (optional): "dalle3", "stable-diffusion", or "nano-banana"
    - `location` (optional): User location for personalized model appearance
  - **Response**: Complete outfit suggestion with optional model image
- `POST /api/check-duplicate` - Check if image already exists in history
- `GET /api/outfit-history` - Get outfit suggestion history (requires auth)

### Wardrobe Management
- `GET /api/wardrobe` - Get user's wardrobe items (requires auth)
- `POST /api/wardrobe` - Add new wardrobe item (requires auth)
- `GET /api/wardrobe/{item_id}` - Get specific wardrobe item (requires auth)
- `PUT /api/wardrobe/{item_id}` - Update wardrobe item (requires auth)
- `DELETE /api/wardrobe/{item_id}` - Delete wardrobe item (requires auth)
- `GET /api/wardrobe/summary` - Get wardrobe statistics (requires auth)
- `POST /api/wardrobe/check-duplicate` - Check for duplicate wardrobe items (requires auth)
- `POST /api/wardrobe/analyze-image` - Analyze wardrobe item with AI (requires auth)

📖 **For complete API documentation**, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

---

## 📱 Multi-Platform Support

### Web (Current Implementation)
- React application with MVC architecture
- Deployed on GitHub Pages
- Live at: https://sajadparacha.github.io/outfit-suggestor-app

### iOS (Available)
- Native SwiftUI application
- MVVM architecture
- See [ios-client/README.md](./ios-client/README.md) for setup

### Android (Future)
```kotlin
// Example API usage
val client = OkHttpClient()
val requestBody = MultipartBody.Builder()
    .addFormDataPart("image", "photo.jpg", imageRequestBody)
    .addFormDataPart("text_input", "Business casual")
    .build()
// ... make request to /api/suggest-outfit
```

---

## 🚢 Deployment

### Frontend (GitHub Pages)
The frontend is configured to deploy automatically:
```bash
cd frontend
npm run build
npm run deploy
```

**Live at**: https://sajadparacha.github.io/outfit-suggestor-app

### Backend (Railway)
1. Go to https://railway.app
2. Sign in with GitHub
3. Create new project from repository
4. Add PostgreSQL database
5. Set environment variables
6. Deploy!

**See [DEPLOYMENT_INSTRUCTIONS.md](./DEPLOYMENT_INSTRUCTIONS.md) for detailed steps.**

---

## 🧪 Testing

### Backend
```bash
cd backend
python -m pytest
```

**Test Coverage**: 35% (see [TEST_COVERAGE_REPORT.md](./TEST_COVERAGE_REPORT.md))

### Frontend
```bash
cd frontend
npm test
```

### Manual Testing
```bash
# Test backend health
curl http://localhost:8001/health

# Test wardrobe API (requires auth token)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8001/api/wardrobe
```

---

## 🗂️ Project Structure

```
outfit-suggestor-app/
├── backend/                      # Python FastAPI backend
│   ├── models/                  # SQLAlchemy ORM models
│   ├── services/                # Business logic
│   ├── controllers/             # HTTP handlers
│   ├── routes/                  # API endpoints
│   ├── utils/                   # Utilities
│   ├── config.py                # Configuration
│   ├── main.py                  # App entry point
│   └── requirements.txt         # Python dependencies
├── frontend/                    # React frontend
│   ├── src/
│   │   ├── models/              # TypeScript types
│   │   ├── services/            # API layer
│   │   ├── controllers/         # React hooks
│   │   ├── views/               # Components
│   │   └── utils/               # Helpers
│   └── package.json
├── ios-client/                  # SwiftUI iOS app
│   └── OutfitSuggestor/
│       ├── Models/              # Swift models
│       ├── Services/            # API service
│       ├── ViewModels/          # MVVM view models
│       ├── Views/               # SwiftUI views
│       └── Utils/               # Utilities
├── ARCHITECTURE.md              # Architecture docs
├── API_DOCUMENTATION.md         # API reference
├── DEPLOYMENT_INSTRUCTIONS.md   # Deployment guide
├── TEST_COVERAGE_REPORT.md      # Test coverage analysis
└── README.md                    # This file
```

---

## 🎯 Key Features in Detail

### Multi-Model AI Support
- **OpenAI GPT-4 Vision**: Outfit analysis and recommendations
- **OpenAI DALL-E 3**: Model image generation (default)
- **Stable Diffusion (Replicate)**: Alternative image generation
- **Hugging Face BLIP**: Free wardrobe item analysis
- **Hugging Face ViT-GPT2**: Alternative wardrobe analysis

### Smart Features
- **Perceptual Hashing**: Detects similar images to prevent duplicates
- **Category Filtering**: Filter wardrobe by clothing categories
- **AI Auto-Analysis**: Automatically extracts item details from photos
- **Search & Filter**: Search outfit history with filters

---

## 🤝 Contributing

We welcome contributions! Here's how:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Follow the architecture patterns:
   - **Backend**: Create service → Define model → Add route
   - **Frontend**: Define model → Create service method → Add controller → Update view
4. Write tests for new features
5. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
6. Push to the branch (`git push origin feature/AmazingFeature`)
7. Open a Pull Request

---

## 🐛 Troubleshooting

### Backend won't start
- Check if port 8001 is already in use: `lsof -i :8001`
- Verify OpenAI API key is set in `backend/.env`
- Ensure PostgreSQL is running and `DATABASE_URL` is correct
- Check all dependencies are installed: `pip install -r requirements.txt`

### Frontend can't connect to backend
- Check if backend is running on http://localhost:8001
- Verify `REACT_APP_API_URL` in `frontend/.env`
- Check browser console for CORS errors
- Ensure backend CORS settings include frontend URL

### Database connection issues
- Verify PostgreSQL is running
- Check `DATABASE_URL` format: `postgresql://user:password@host:port/database`
- Ensure database exists: `createdb outfit_suggestor`
- Check Railway database connection if using Railway

### Image upload fails
- Ensure image is under 20MB (automatically compressed on frontend)
- Check file format (JPEG, PNG, GIF, BMP, WebP supported)
- Verify internet connection for AI API calls

### Model image not generating
- Ensure "Generate Model Image" toggle is enabled
- Check that OpenAI API key has access to DALL-E 3
- Verify backend logs for any generation errors
- Model images may take 10-30 seconds to generate

### Authentication issues
- Verify JWT_SECRET_KEY is set in backend
- Check that email activation is configured (optional)
- Ensure frontend is storing auth token in localStorage

---

## 📄 License

MIT License - see LICENSE file for details

---

## 🙏 Acknowledgments

- OpenAI for GPT-4 Vision and DALL-E 3 APIs
- Hugging Face for free BLIP and ViT-GPT2 models
- FastAPI framework community
- React and TypeScript communities
- Railway for hosting infrastructure

---

## 📧 Contact & Support

**Developer**: Sajjad Ahmed Paracha

For questions or support:
- Open an issue on GitHub
- Check [ARCHITECTURE.md](./ARCHITECTURE.md) for technical details
- Review [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for API usage
- See [DEPLOYMENT_INSTRUCTIONS.md](./DEPLOYMENT_INSTRUCTIONS.md) for deployment help

---

## 📊 Project Status

- ✅ **Version**: 4.0.0
- ✅ **Backend**: Fully functional
- ✅ **Frontend**: Fully functional
- ✅ **iOS Client**: Available
- ✅ **Deployment**: GitHub Pages (frontend), Railway (backend)
- ⚠️ **Test Coverage**: 35% (documented in TEST_COVERAGE_REPORT.md)

---

**Made with ❤️ for better outfit suggestions**

🔗 **Try it now**: [https://sajadparacha.github.io/outfit-suggestor-app](https://sajadparacha.github.io/outfit-suggestor-app)
