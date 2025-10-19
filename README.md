# 👔 Outfit Suggestor App

> An AI-powered fashion assistant that analyzes your clothing and suggests complete outfits!

[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://sajadparacha.github.io/outfit-suggestor-app)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.12-blue)](https://www.python.org/)
[![React](https://img.shields.io/badge/react-19-blue)](https://reactjs.org/)

**Upload a photo of your shirt or blazer → Get AI-powered complete outfit suggestions!**

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

## 🚀 Quick Start

```bash
# 1. Clone and setup
git clone https://github.com/sajadparacha/outfit-suggestor-app.git
cd outfit-suggestor-app

# 2. Backend setup
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
echo "OPENAI_API_KEY=your_key_here" > .env

# 3. Frontend setup
cd ../frontend
npm install

# 4. Run the app
cd ..
./start.sh
```

**That's it!** Open http://localhost:3000/outfit-suggestor-app

📖 **Need more details?** See [QUICKSTART.md](QUICKSTART.md) or [SETUP_GUIDE.md](SETUP_GUIDE.md)

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