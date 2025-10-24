# AI Outfit Suggestor App

An AI-powered outfit suggestion application that analyzes clothing images and provides complete outfit recommendations. Built with a **modular, multi-platform architecture** that separates the backend API from client applications.

## 🌟 Features

- 🖼️ **Image Analysis**: Upload images of shirts or blazers
- 🤖 **AI-Powered Suggestions**: Get complete outfit recommendations using OpenAI GPT-4 Vision
- 🎨 **Complete Outfits**: Receive suggestions for shirts, trousers, blazers, shoes, and belts
- 💡 **Style Reasoning**: Understand why each outfit works together
- 📱 **Modern UI**: Clean, responsive React interface with MVC architecture
- 🔌 **Multi-Platform Ready**: RESTful API can be consumed by Web, Android, iOS, and other clients

## 🏗️ Architecture

This application follows a **Service-Oriented Architecture (SOA)** with clear separation between backend and frontend:

### Backend (Service Layer Architecture)
```
backend/
├── models/      # Data models and schemas
├── services/    # Business logic (AI service)
├── routes/      # API endpoints
├── utils/       # Utility functions
└── config.py    # Configuration management
```

### Frontend (MVC Pattern)
```
frontend/src/
├── models/         # TypeScript interfaces
├── services/       # API communication
├── controllers/    # Business logic (React hooks)
├── views/          # Presentational components
└── utils/          # Helper functions
```

📖 **For detailed architecture information**, see [ARCHITECTURE.md](./ARCHITECTURE.md)

## 🛠️ Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **OpenAI GPT-4 Vision** - AI-powered outfit analysis
- **Pydantic** - Data validation and serialization
- **PIL/Pillow** - Image processing
- **Uvicorn** - ASGI server

### Frontend
- **React 19** with TypeScript
- **Tailwind CSS** - Styling
- **Custom Hooks** - State management (MVC controllers)
- **React Dropzone** - File uploads
- **Service Layer** - API communication

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- Python 3.8+
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd outfit-suggestor-app
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Environment Variables**
   
   Create `backend/.env`:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   PORT=8001
   ```
   
   Create `frontend/.env` (optional):
   ```env
   REACT_APP_API_URL=http://localhost:8001
   ```

4. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   ```

5. **Run the Application**
   
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

6. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8001
   - API Docs: http://localhost:8001/docs

## 📚 Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Complete architecture overview and design patterns
- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - REST API reference for developers
- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Detailed setup instructions
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment guides

## 🔌 API Endpoints

### Health & Status
- `GET /` - Basic health check
- `GET /health` - Detailed health status

### Outfit Suggestions
- `POST /api/suggest-outfit` - Analyze image and get outfit recommendations
  - **Body**: `multipart/form-data`
  - **Fields**: 
    - `image` (required): Image file
    - `text_input` (optional): Additional context

📖 **For complete API documentation**, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

## 📱 Multi-Platform Support

The backend API is designed to work with multiple client platforms:

### Web (Current Implementation)
React application with MVC architecture

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

### iOS (Future)
```swift
// Example API usage
var request = URLRequest(url: apiURL)
request.httpMethod = "POST"
// ... create multipart body with image and text_input
// ... make request to /api/suggest-outfit
```

For platform-specific examples, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md#platform-specific-examples)

## 🧪 Testing

### Backend
```bash
cd backend
pytest
```

### Frontend
```bash
cd frontend
npm test
```

## 🚢 Deployment

### Frontend (GitHub Pages)
The frontend is configured to deploy automatically to GitHub Pages:
```bash
cd frontend
npm run build
npm run deploy
```

### Backend (Railway/Render/Heroku)
The backend can be deployed to any Python-compatible hosting service:
1. Set environment variables (OPENAI_API_KEY)
2. Use `Procfile` for Heroku or `render.yaml` for Render
3. Deploy from GitHub repository

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## 🗂️ Project Structure

```
outfit-suggestor-app/
├── backend/                 # Python FastAPI backend
│   ├── models/             # Pydantic models
│   ├── services/           # Business logic
│   ├── routes/             # API routes
│   ├── utils/              # Utilities
│   ├── config.py           # Configuration
│   └── main.py             # App entry point
├── frontend/               # React frontend
│   └── src/
│       ├── models/         # TypeScript types
│       ├── services/       # API layer
│       ├── controllers/    # React hooks
│       ├── views/          # Components
│       └── utils/          # Helpers
├── ARCHITECTURE.md         # Architecture docs
├── API_DOCUMENTATION.md    # API reference
└── README.md              # This file
```

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

## 🐛 Troubleshooting

### Backend won't start
- Check if port 8001 is already in use: `lsof -i :8001`
- Verify OpenAI API key is set in `backend/.env`
- Ensure all dependencies are installed: `pip install -r requirements.txt`

### Frontend can't connect to backend
- Check if backend is running on http://localhost:8001
- Verify REACT_APP_API_URL in frontend/.env
- Check browser console for CORS errors

### Image upload fails
- Ensure image is under 10MB
- Check file format (JPEG, PNG, GIF, BMP, WebP supported)
- Verify internet connection for OpenAI API calls

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- OpenAI for GPT-4 Vision API
- FastAPI framework
- React and TypeScript communities

## 📧 Contact

For questions or support:
- Open an issue on GitHub
- Check [ARCHITECTURE.md](./ARCHITECTURE.md) for technical details
- Review [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for API usage

---

**Made with ❤️ for better outfit suggestions**
