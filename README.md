# Outfit Suggestor App

An AI-powered outfit suggestion application that analyzes clothing images and provides complete outfit recommendations.

## Features

- 🖼️ **Image Analysis**: Upload images of shirts or blazers
- 🤖 **AI-Powered Suggestions**: Get complete outfit recommendations using OpenAI GPT-4 Vision
- 🎨 **Complete Outfits**: Receive suggestions for shirts, trousers, blazers, shoes, and belts
- 💡 **Style Reasoning**: Understand why each outfit works together
- 📱 **Modern UI**: Clean, responsive React interface

## Tech Stack

### Frontend
- React 19 with TypeScript
- Tailwind CSS for styling
- Axios for API calls
- React Dropzone for file uploads

### Backend
- FastAPI (Python)
- OpenAI GPT-4 Vision API
- PIL for image processing
- Uvicorn ASGI server

## Local Development

### Prerequisites
- Node.js 16+ 
- Python 3.8+
- OpenAI API key

### Setup

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
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

4. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   ```

5. **Run the Application**
   ```bash
   # From project root
   ./start.sh
   ```

   Or run separately:
   ```bash
   # Terminal 1 - Backend
   cd backend
   source venv/bin/activate
   python main.py

   # Terminal 2 - Frontend  
   cd frontend
   npm start
   ```

## Deployment

### Frontend (GitHub Pages)
The frontend is configured to deploy automatically to GitHub Pages when you push to the main branch.

### Backend (Railway)
The backend can be deployed to Railway or similar services. See deployment configuration in `.github/workflows/`.

## API Endpoints

- `GET /` - Health check
- `POST /api/suggest-outfit` - Upload image and get outfit suggestions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License