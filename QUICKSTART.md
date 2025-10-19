# 🚀 Quick Start Guide - Outfit Suggestor App

## Get Running in 5 Minutes!

### 1️⃣ **Clone & Install** (2 minutes)
```bash
# Clone the repo
git clone https://github.com/sajadparacha/outfit-suggestor-app.git
cd outfit-suggestor-app

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend setup
cd ../frontend
npm install
```

### 2️⃣ **Get OpenAI API Key** (1 minute)
1. Go to: https://platform.openai.com/api-keys
2. Create new secret key
3. Copy it!

### 3️⃣ **Configure** (30 seconds)
```bash
# Create backend/.env file
cd ../backend
echo "OPENAI_API_KEY=paste_your_key_here" > .env
```

### 4️⃣ **Run** (30 seconds)
```bash
# From project root
cd ..
./start.sh
```

### 5️⃣ **Use It!** (1 minute)
1. Open: http://localhost:3000/outfit-suggestor-app
2. Upload a shirt/blazer image
3. Get AI outfit suggestions!

---

## 🌐 Deploy to Internet (10 minutes)

### Backend (Railway)
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. "New Project" → "Deploy from GitHub repo"
4. Add environment variable: `OPENAI_API_KEY=your_key`
5. Done! Copy your Railway URL

### Frontend (GitHub Pages)
```bash
cd frontend
npm run deploy
```

Then enable GitHub Pages:
1. Go to repo → Settings → Pages
2. Source: "Deploy from a branch"
3. Branch: "gh-pages" → "/ (root)"
4. Save!

Your app is now live! 🎉

---

## 🆘 Having Issues?

- **Port in use?** Run: `./start.sh` again
- **OpenAI errors?** Check your API key in `backend/.env`
- **404 on GitHub Pages?** Wait 2-3 minutes after deployment

See [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed troubleshooting!

