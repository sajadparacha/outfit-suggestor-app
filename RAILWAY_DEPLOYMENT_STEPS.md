# Railway Backend Deployment - Step by Step

## 🚀 Deploy Your Backend in 10 Minutes

Follow these exact steps to deploy your backend with PostgreSQL database to Railway.

---

## Step 1: Sign Up for Railway (2 minutes)

1. **Open Railway:**
   - Go to: https://railway.app
   
2. **Sign In with GitHub:**
   - Click "Login with GitHub"
   - Authorize Railway to access your repositories
   - ✅ You're now logged in!

---

## Step 2: Create New Project (1 minute)

1. **Click "New Project"** (purple button in top right)

2. **Select "Deploy from GitHub repo"**

3. **Choose your repository:**
   - Find and select: `sajadparacha/outfit-suggestor-app`
   - Click on it

4. **Railway will start deploying automatically**
   - It detects Python and starts building
   - Wait for initial deployment (~2 minutes)

---

## Step 3: Add PostgreSQL Database (1 minute)

1. **In your Railway project dashboard:**
   - Click "New" button
   - Select "Database"
   - Choose "Add PostgreSQL"

2. **Railway automatically:**
   - Creates PostgreSQL database
   - Sets `DATABASE_URL` environment variable
   - Connects it to your backend service

3. **✅ Database is ready!**

---

## Step 4: Configure Environment Variables (2 minutes)

1. **Click on your backend service** (the Python app, not the database)

2. **Go to "Variables" tab**

3. **Add these environment variables:**

   Click "New Variable" for each:

   **Variable 1:**
   ```
   Name: OPENAI_API_KEY
   Value: [Paste your OpenAI API key here]
   ```

   **Variable 2:**
   ```
   Name: PORT
   Value: 8001
   ```

   **Variable 3:**
   ```
   Name: IMAGE_SIMILARITY_THRESHOLD
   Value: 5
   ```

4. **Note:** `DATABASE_URL` is already set automatically by Railway

5. **Click "Deploy"** or it will auto-redeploy

---

## Step 5: Get Your Backend URL (30 seconds)

1. **In your backend service:**
   - Go to "Settings" tab
   - Find "Domains" section
   - You'll see a URL like: `outfit-suggestor-production.railway.app`

2. **Copy this URL** - you'll need it for the frontend!

3. **Test it:**
   - Open: `https://your-url.railway.app/health`
   - Should see: `{"status":"healthy","service":"AI Outfit Suggestor","version":"2.0.0"}`
   - ✅ Backend is live!

---

## Step 6: Connect Frontend to Backend (3 minutes)

Now that your backend is deployed, connect your frontend to it:

### 6.1 Create Production Environment File

```bash
cd /Users/sajad/outfit-suggestor-app

# Create frontend/.env.production with your Railway URL
echo "REACT_APP_API_URL=https://your-actual-railway-url.railway.app" > frontend/.env.production
```

**Replace `your-actual-railway-url` with the URL you copied in Step 5!**

### 6.2 Commit and Push

```bash
git add frontend/.env.production
git commit -m "Add production backend URL"
git push origin main
```

### 6.3 Redeploy Frontend

```bash
cd frontend
npm run deploy
```

Wait ~1 minute for deployment to complete.

---

## Step 7: Test Your Live App! (2 minutes)

1. **Open your app:**
   - Go to: https://sajadparacha.github.io/outfit-suggestor-app

2. **Test features:**
   - ✅ Upload an image
   - ✅ Get outfit suggestion
   - ✅ Check History tab
   - ✅ Try search
   - ✅ View About page

3. **🎉 Your app is LIVE!**

---

## 🎯 Quick Reference

### Your URLs
- **Frontend:** https://sajadparacha.github.io/outfit-suggestor-app
- **Backend:** https://[your-app].railway.app (get from Railway)
- **Backend Health:** https://[your-app].railway.app/health
- **API Docs:** https://[your-app].railway.app/docs

### Railway Dashboard
- **Project:** https://railway.app/project/[your-project-id]
- **Logs:** Click service → "Deployments" → "View Logs"
- **Database:** Click PostgreSQL service → "Data" tab

### Environment Variables Set
- ✅ `OPENAI_API_KEY` - Your OpenAI key
- ✅ `DATABASE_URL` - Auto-set by Railway
- ✅ `PORT` - 8001
- ✅ `IMAGE_SIMILARITY_THRESHOLD` - 5

---

## 🐛 Troubleshooting

### Backend Won't Start
**Check Railway Logs:**
1. Go to your backend service
2. Click "Deployments"
3. Click latest deployment
4. Click "View Logs"
5. Look for error messages

**Common Issues:**
- Missing `OPENAI_API_KEY` → Add in Variables tab
- Database connection error → Verify PostgreSQL is added
- Port conflict → Railway handles this automatically

### Frontend Can't Connect
**Check:**
1. Backend URL is correct in `frontend/.env.production`
2. Backend is running (check Railway dashboard)
3. CORS is configured (should include `sajadparacha.github.io`)
4. Browser console for specific errors

### Database Tables Not Created
**Solution:**
- Railway runs `python main.py` which calls `Base.metadata.create_all()`
- Tables created automatically on first start
- Check logs to verify

---

## 💰 Cost

### Railway Free Tier
- **$5 credit/month** (free)
- **Includes:**
  - Backend hosting
  - PostgreSQL database
  - 500 hours/month
  - 1GB storage

### Sufficient For:
- ✅ MVP and testing
- ✅ 100-500 requests/day
- ✅ Small user base
- ✅ Development and demos

### Upgrade When:
- More than 500 hours/month needed
- Need more database storage
- Higher traffic (1000+ requests/day)

---

## 📋 Post-Deployment Checklist

After completing all steps above:

- [ ] Backend deployed to Railway
- [ ] PostgreSQL database connected
- [ ] Environment variables set
- [ ] Backend health check returns 200
- [ ] Frontend deployed to GitHub Pages
- [ ] Frontend connected to backend
- [ ] Test image upload works
- [ ] Test history saves and displays
- [ ] Test search functionality
- [ ] Test duplicate detection
- [ ] Test About page links
- [ ] Share with friends! 🎉

---

## 🎊 You're Ready!

**What to do right now:**

1. **Open Railway:** https://railway.app
2. **Follow Steps 1-5 above** (~5 minutes)
3. **Copy your Railway backend URL**
4. **Tell me the URL** and I'll update the frontend config
5. **Redeploy frontend** (I'll do this)
6. **Your app is LIVE!** 🚀

**Start with Step 1 - go to https://railway.app and sign in with GitHub!**

Let me know your Railway backend URL once you have it, and I'll complete the frontend connection!










