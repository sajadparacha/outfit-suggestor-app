# Deployment Instructions - GitHub & Railway

## Current Status
✅ **GitHub**: Code is already pushed to `feature/virtual-wardrobe` branch  
📦 **Railway**: Ready to deploy

---

## Step 1: Merge to Main Branch (Optional but Recommended)

If you want to deploy the latest features to production:

```bash
# Switch to main branch
git checkout main

# Merge feature branch
git merge feature/virtual-wardrobe

# Push to GitHub
git push origin main
```

**OR** deploy directly from `feature/virtual-wardrobe` branch (Railway can deploy any branch).

---

## Step 2: Deploy to Railway

### Option A: Deploy via Railway Dashboard (Recommended)

1. **Go to Railway:**
   - Visit: https://railway.app
   - Sign in with your GitHub account

2. **Create New Project:**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose: `sajadparacha/outfit-suggestor-app`
   - Select branch: `main` or `feature/virtual-wardrobe`

3. **Configure Service:**
   Railway will auto-detect Python and create a service.
   
   **If auto-detection doesn't work, manually configure:**
   - Click on the service
   - Go to "Settings" → "Build & Deploy"
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

4. **Add PostgreSQL Database:**
   - Click "New" → "Database" → "Add PostgreSQL"
   - Railway automatically sets `DATABASE_URL` environment variable

5. **Set Environment Variables:**
   - Go to your service → "Variables" tab
   - Add these variables:

   ```
   OPENAI_API_KEY=your_openai_api_key_here
   PORT=8001
   IMAGE_SIMILARITY_THRESHOLD=5
   JWT_SECRET_KEY=your-secret-key-change-this
   ```

   **Note:** `DATABASE_URL` is automatically set by Railway when you add PostgreSQL.

6. **Deploy:**
   - Railway will automatically deploy
   - Wait for deployment to complete (~2-3 minutes)
   - Check logs if there are any errors

7. **Get Your Backend URL:**
   - Go to service → "Settings" → "Domains"
   - Railway provides a URL like: `your-app-name.up.railway.app`
   - Copy this URL - you'll need it for the frontend

8. **Test Backend:**
   - Visit: `https://your-app-name.up.railway.app/health`
   - Should see: `{"status":"healthy","service":"AI Outfit Suggestor","version":"2.0.0"}`

---

### Option B: Deploy via Railway CLI

1. **Install Railway CLI:**
   ```bash
   npm i -g @railway/cli
   ```

2. **Login:**
   ```bash
   railway login
   ```

3. **Initialize Project:**
   ```bash
   cd /Users/sajad/outfit-suggestor-app
   railway init
   ```

4. **Link to Existing Project:**
   ```bash
   railway link
   ```

5. **Add Variables:**
   ```bash
   railway variables set OPENAI_API_KEY=your_key_here
   railway variables set PORT=8001
   railway variables set IMAGE_SIMILARITY_THRESHOLD=5
   ```

6. **Deploy:**
   ```bash
   cd backend
   railway up
   ```

---

## Step 3: Update Frontend to Use Railway Backend

1. **Create Production Environment File:**
   ```bash
   cd /Users/sajad/outfit-suggestor-app/frontend
   echo "REACT_APP_API_URL=https://your-railway-url.up.railway.app" > .env.production
   ```
   
   **Replace `your-railway-url` with your actual Railway URL from Step 2!**

2. **Commit and Push:**
   ```bash
   cd /Users/sajad/outfit-suggestor-app
   git add frontend/.env.production
   git commit -m "Add Railway backend URL for production"
   git push origin main
   ```

3. **Deploy Frontend to GitHub Pages:**
   ```bash
   cd frontend
   npm run deploy
   ```

   This will build and deploy to `gh-pages` branch.

---

## Step 4: Verify Deployment

### Backend Tests:
1. ✅ Health Check: `https://your-railway-url.up.railway.app/health`
2. ✅ API Docs: `https://your-railway-url.up.railway.app/docs`
3. ✅ Test endpoint with Postman/curl

### Frontend Tests:
1. ✅ Visit: https://sajadparacha.github.io/outfit-suggestor-app
2. ✅ Upload image and get suggestion
3. ✅ Test login/register
4. ✅ Test wardrobe management
5. ✅ Test outfit history

---

## Environment Variables Reference

### Required for Railway:
- `OPENAI_API_KEY` - Your OpenAI API key
- `DATABASE_URL` - Auto-set by Railway (PostgreSQL)
- `PORT` - Railway sets this automatically (use `$PORT` in code)

### Optional but Recommended:
- `IMAGE_SIMILARITY_THRESHOLD=5` - Duplicate detection sensitivity
- `JWT_SECRET_KEY` - Change from default for security
- `REPLICATE_API_TOKEN` - For Stable Diffusion image generation (optional)
- `HUGGINGFACE_API_TOKEN` - For free BLIP/ViT-GPT2 models (optional)

---

## Troubleshooting

### Backend Won't Start:
1. Check Railway logs: Service → Deployments → View Logs
2. Verify environment variables are set
3. Check that `requirements.txt` is in the `backend` directory
4. Ensure PostgreSQL is connected

### Database Connection Issues:
1. Verify PostgreSQL service is added
2. Check `DATABASE_URL` is set in environment variables
3. Run database migrations if needed (Railway runs `Base.metadata.create_all()` on startup)

### Frontend Can't Connect:
1. Verify `REACT_APP_API_URL` in `frontend/.env.production`
2. Check CORS settings in `backend/config.py`
3. Verify backend is running (check Railway dashboard)
4. Check browser console for specific errors

### CORS Errors:
Update `backend/config.py` ALLOWED_ORIGINS to include:
```python
ALLOWED_ORIGINS = [
    "https://sajadparacha.github.io",
    "https://your-railway-url.up.railway.app",
    # ... other origins
]
```

---

## Quick Deploy Commands

```bash
# 1. Merge to main (if needed)
git checkout main
git merge feature/virtual-wardrobe
git push origin main

# 2. Deploy to Railway (via dashboard or CLI)
# Follow Step 2 above

# 3. Update frontend config
cd frontend
echo "REACT_APP_API_URL=https://your-railway-url.up.railway.app" > .env.production
cd ..
git add frontend/.env.production
git commit -m "Add Railway backend URL"
git push origin main

# 4. Deploy frontend
cd frontend
npm run deploy
```

---

## Next Steps After Deployment

1. ✅ Test all features end-to-end
2. ✅ Monitor Railway logs for errors
3. ✅ Check Railway usage (free tier has limits)
4. ✅ Update CORS settings if needed
5. ✅ Set up monitoring/alerting (optional)

---

**🎉 Your app should now be live on both GitHub Pages (frontend) and Railway (backend)!**

