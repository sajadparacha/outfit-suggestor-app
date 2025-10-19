# 👔 Outfit Suggestor App - Complete Setup Guide

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Local Development Setup](#local-development-setup)
5. [Deployment Guide](#deployment-guide)
6. [Configuration](#configuration)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Project Overview

**Outfit Suggestor** is an AI-powered web application that analyzes images of clothing (shirts, blazers) and provides complete outfit recommendations including:
- Complementary shirts
- Matching trousers/pants
- Blazer suggestions
- Shoe recommendations
- Belt suggestions
- Fashion reasoning and styling tips

### Live Demo
- **Frontend:** https://sajadparacha.github.io/outfit-suggestor-app
- **Backend API:** https://outfit-suggestor-app-production.up.railway.app

---

## ✨ Features

- 🖼️ **Drag & Drop Image Upload** - Easy file upload interface
- 🤖 **AI-Powered Analysis** - Uses OpenAI GPT-4 Vision API
- 🎨 **Complete Outfit Suggestions** - Full outfit recommendations
- 💡 **Style Reasoning** - Explains why outfits work together
- 📱 **Responsive Design** - Works on desktop and mobile
- 🚀 **Fast & Modern** - Built with React and FastAPI

---

## 🛠️ Tech Stack

### Frontend
- **React 19** with TypeScript
- **Tailwind CSS** for styling
- **Axios** for API calls
- **React Dropzone** for file uploads

### Backend
- **FastAPI** (Python)
- **OpenAI GPT-4 Vision API**
- **PIL** (Pillow) for image processing
- **Uvicorn** ASGI server

### Deployment
- **Frontend:** GitHub Pages
- **Backend:** Railway.app

---

## 💻 Local Development Setup

### Prerequisites
- Node.js 16+ and npm
- Python 3.12+
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

### Step 1: Clone the Repository
```bash
git clone https://github.com/sajadparacha/outfit-suggestor-app.git
cd outfit-suggestor-app
```

### Step 2: Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
echo "OPENAI_API_KEY=your_actual_api_key_here" > .env
```

### Step 3: Frontend Setup
```bash
cd ../frontend

# Install dependencies
npm install
```

### Step 4: Run the Application

#### Option A: Use the Start Script (Recommended)
```bash
# From project root
./start.sh
```

#### Option B: Run Servers Separately
```bash
# Terminal 1 - Backend
cd backend
source venv/bin/activate
python main.py

# Terminal 2 - Frontend
cd frontend
npm start
```

### Step 5: Access the App
- **Frontend:** http://localhost:3000/outfit-suggestor-app
- **Backend API:** http://localhost:8001
- **API Docs:** http://localhost:8001/docs

---

## 🚀 Deployment Guide

### Deploy Backend to Railway

1. **Sign up at [Railway.app](https://railway.app)** with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose `outfit-suggestor-app` repository

3. **Configure Environment Variables**
   - Go to project → Settings → Variables
   - Add: `OPENAI_API_KEY=your_actual_api_key`

4. **Deploy**
   - Railway auto-detects Python and deploys
   - Get your URL: `https://your-app-name.railway.app`

### Deploy Frontend to GitHub Pages

1. **Enable GitHub Pages**
   - Go to repository → Settings → Pages
   - Source: "Deploy from a branch"
   - Branch: "gh-pages" → "/ (root)"
   - Save

2. **Deploy**
   ```bash
   cd frontend
   npm run deploy
   ```

3. **Access**
   - Your app will be live at: `https://YOUR_USERNAME.github.io/outfit-suggestor-app`

### Connect Frontend to Backend

After deploying backend, create `frontend/.env.production`:
```bash
REACT_APP_API_URL=https://your-railway-app.railway.app
```

Then redeploy:
```bash
cd frontend
npm run deploy
```

---

## ⚙️ Configuration

### Environment Variables

#### Backend (.env)
```bash
OPENAI_API_KEY=sk-...  # Your OpenAI API key
PORT=8001               # Server port (optional, default 8001)
```

#### Frontend (.env.production)
```bash
REACT_APP_API_URL=https://your-backend-url.railway.app
```

### CORS Configuration
The backend is configured to allow:
- `http://localhost:3000` (development)
- `https://sajadparacha.github.io` (production)

To add more origins, edit `backend/main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://your-domain.com"  # Add your domain here
    ],
    ...
)
```

---

## 🐛 Troubleshooting

### Local Development Issues

#### Backend Port Already in Use
```bash
# Find process on port 8001
lsof -ti :8001

# Kill the process
kill -9 $(lsof -ti :8001)
```

#### Frontend Port Already in Use
```bash
# Kill processes on port 3000
lsof -ti :3000 | xargs kill -9
```

#### Module Not Found Errors
```bash
# Reinstall dependencies
cd backend
pip install -r requirements.txt

cd ../frontend
rm -rf node_modules package-lock.json
npm install
```

### Deployment Issues

#### Railway Build Failed
- Check `requirements.txt` is in project root
- Verify Python version compatibility
- Check Railway logs for specific errors

#### GitHub Pages 404
1. Verify GitHub Pages is enabled
2. Check branch is set to `gh-pages`
3. Wait 2-3 minutes for deployment
4. Clear browser cache

#### CORS Errors
- Add your frontend URL to `backend/main.py` CORS origins
- Redeploy backend after changes

### API Issues

#### OpenAI API Errors
- Verify API key is correct
- Check you have credits in your OpenAI account
- Ensure API key has proper permissions

#### Image Upload Fails
- Check image size (max 10MB)
- Verify image format (JPG, PNG, GIF, BMP, WebP)
- Check backend logs for errors

---

## 📁 Project Structure

```
outfit-suggestor-app/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── requirements.txt     # Python dependencies
│   └── .env                 # Environment variables (create this)
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # Main React component
│   │   └── components/
│   │       ├── ImageUpload.tsx
│   │       ├── OutfitSuggestion.tsx
│   │       └── LoadingSpinner.tsx
│   ├── package.json         # Node dependencies
│   └── .env.production      # Production environment (create this)
├── start.sh                 # Local development starter
├── deploy.sh                # Deployment helper
├── README.md                # Project documentation
└── DEPLOYMENT.md            # Detailed deployment guide
```

---

## 🔑 API Endpoints

### GET /
Health check endpoint
```bash
curl http://localhost:8001/
# Response: {"message":"Outfit Suggestor API is running!"}
```

### POST /api/suggest-outfit
Upload image and get outfit suggestions

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body:
  - `image`: Image file (required)
  - `text_input`: Additional context (optional)

**Response:**
```json
{
  "shirt": "Classic white oxford shirt with button-down collar",
  "trouser": "Navy blue chinos or dark grey dress trousers",
  "blazer": "Light grey or navy blazer in a textured fabric",
  "shoes": "Brown leather loafers or oxford shoes",
  "belt": "Brown leather belt matching the shoes",
  "reasoning": "This creates a smart-casual look perfect for business casual or semi-formal occasions..."
}
```

---

## 📝 Development Notes

### Adding New Features
1. Create a new branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Test locally
4. Commit and push
5. Create pull request

### Code Style
- Backend: Follow PEP 8 (Python)
- Frontend: Use ESLint and Prettier
- Use meaningful variable names
- Add comments for complex logic

### Testing
```bash
# Backend tests
cd backend
pytest test_backend.py

# Frontend tests
cd frontend
npm test
```

---

## 📊 Performance

- **Average Response Time:** 3-5 seconds (depends on OpenAI API)
- **Image Processing:** Supports up to 10MB images
- **Concurrent Users:** Scales with Railway/Vercel plan

---

## 💰 Cost Considerations

### OpenAI API
- **GPT-4 Vision:** ~$0.01-0.03 per request
- **Budget:** Set limits in OpenAI dashboard
- **Free Tier:** $5 credit for new accounts

### Hosting
- **Railway:** Free tier (500 hours/month)
- **GitHub Pages:** Free for public repositories
- **Domain:** Optional (Free with GitHub Pages)

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

---

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes!

---

## 🙏 Credits

- **OpenAI** for GPT-4 Vision API
- **Railway** for backend hosting
- **GitHub Pages** for frontend hosting
- **React** and **FastAPI** communities

---

## 📧 Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Open an issue on GitHub
3. Contact: sajadparacha@gmail.com

---

**Built with ❤️ by Sajjad Ahmed Paracha - October 2025**

