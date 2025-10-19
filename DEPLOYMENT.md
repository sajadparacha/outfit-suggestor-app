# Deployment Guide

## Frontend Deployment (GitHub Pages)

### Step 1: Create GitHub Repository
1. Go to GitHub and create a new repository named `outfit-suggestor-app`
2. Copy the repository URL

### Step 2: Push Code to GitHub
```bash
# Add all files
git add .

# Commit changes
git commit -m "Initial commit: Outfit Suggestor App"

# Add remote origin (replace with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/outfit-suggestor-app.git

# Push to main branch
git push -u origin main
```

### Step 3: Enable GitHub Pages
1. Go to your repository on GitHub
2. Click on "Settings" tab
3. Scroll down to "Pages" section
4. Under "Source", select "GitHub Actions"
5. The workflow will automatically deploy your frontend

### Step 4: Update Homepage URL
Update `frontend/package.json` with your actual GitHub username:
```json
"homepage": "https://YOUR_USERNAME.github.io/outfit-suggestor-app"
```

## Backend Deployment Options

### Option 1: Railway (Recommended)

1. **Sign up at [Railway.app](https://railway.app)**
2. **Connect GitHub account**
3. **Deploy from GitHub:**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `outfit-suggestor-app` repository
   - Railway will detect the Python backend automatically

4. **Set Environment Variables:**
   - Go to your project settings
   - Add environment variable: `OPENAI_API_KEY=your_actual_api_key`

5. **Get Backend URL:**
   - Railway will provide a URL like `https://your-app-name.railway.app`
   - Copy this URL

### Option 2: Heroku

1. **Install Heroku CLI**
2. **Login and create app:**
   ```bash
   heroku login
   heroku create your-outfit-app-name
   ```

3. **Set environment variables:**
   ```bash
   heroku config:set OPENAI_API_KEY=your_actual_api_key
   ```

4. **Deploy:**
   ```bash
   git subtree push --prefix backend heroku main
   ```

### Option 3: Render

1. **Sign up at [Render.com](https://render.com)**
2. **Create new Web Service**
3. **Connect GitHub repository**
4. **Configure:**
   - Build Command: `cd backend && pip install -r requirements.txt`
   - Start Command: `cd backend && python main.py`
   - Add environment variable: `OPENAI_API_KEY`

## Connecting Frontend to Backend

### Step 1: Update Frontend Environment
Create `frontend/.env.production` (this file will be ignored by git):
```
REACT_APP_API_URL=https://your-backend-url.railway.app
```

### Step 2: Update CORS Settings
In `backend/main.py`, update the CORS origins:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Development
        "https://YOUR_USERNAME.github.io"  # Production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Step 3: Redeploy
After making changes:
```bash
git add .
git commit -m "Update CORS and environment config"
git push origin main
```

## Testing Your Deployment

1. **Frontend:** Visit `https://YOUR_USERNAME.github.io/outfit-suggestor-app`
2. **Backend:** Test `https://your-backend-url.railway.app/` in browser
3. **Upload an image** and verify the API call works

## Troubleshooting

### Common Issues:

1. **CORS Errors:**
   - Make sure your backend URL is added to CORS origins
   - Check that the frontend is using the correct API URL

2. **Environment Variables:**
   - Verify `OPENAI_API_KEY` is set in your backend deployment
   - Check that `REACT_APP_API_URL` is set in frontend

3. **Build Failures:**
   - Check GitHub Actions logs for specific errors
   - Ensure all dependencies are properly installed

4. **API Not Responding:**
   - Verify backend is running and accessible
   - Check backend logs for errors

## Cost Considerations

- **GitHub Pages:** Free
- **Railway:** Free tier available (limited usage)
- **Heroku:** No longer has free tier
- **Render:** Free tier available (limited usage)
- **OpenAI API:** Pay-per-use (very affordable for testing)

## Security Notes

- Never commit `.env` files to git
- Use environment variables for all sensitive data
- Consider rate limiting for production use
- Add input validation and error handling
