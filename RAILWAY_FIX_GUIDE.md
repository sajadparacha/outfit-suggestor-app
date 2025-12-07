# Railway Deployment Fix Guide

## 🔧 Current Issue
Your backend crashes with: `connection to server at "localhost" failed`

**Root Cause:** The `DATABASE_URL` environment variable is not being passed to your backend service.

---

## ✅ Solution: Properly Connect PostgreSQL to Backend

### Step 1: Verify PostgreSQL Service Exists

1. **Go to your Railway project dashboard**
2. **Check if you see TWO services:**
   - ✅ `outfit-suggestor-app` (your backend)
   - ✅ `PostgreSQL` (database)

**If you DON'T see PostgreSQL service:**
1. Click "New" button
2. Select "Database"
3. Choose "Add PostgreSQL"
4. Wait for it to provision (~30 seconds)

---

### Step 2: Link Database to Backend (CRITICAL)

This is the most important step!

#### Method A: Using Service Variables (Recommended)

1. **Click on your BACKEND service** (outfit-suggestor-app)
2. **Go to "Variables" tab**
3. **Look for `DATABASE_URL` variable**
   - If it exists and shows `${{Postgres.DATABASE_URL}}` → Good! ✅
   - If it's missing → Continue to add it

4. **To add DATABASE_URL reference:**
   - Click "New Variable"
   - Click "Add Reference" (not "Add Variable")
   - Select your PostgreSQL service
   - Choose `DATABASE_URL` from the dropdown
   - Click "Add"

5. **Result:** You should see:
   ```
   DATABASE_URL = ${{Postgres.DATABASE_URL}}
   ```

#### Method B: Manual Copy (Alternative)

1. **Click on your PostgreSQL service**
2. **Go to "Variables" tab**
3. **Find `DATABASE_URL`** (looks like: `postgresql://postgres:...@...railway.app:5432/railway`)
4. **Copy the entire value**

5. **Go to your BACKEND service**
6. **Go to "Variables" tab**
7. **Click "New Variable"**
   - Name: `DATABASE_URL`
   - Value: [paste the copied URL]
8. **Click "Add"**

---

### Step 3: Verify All Environment Variables

In your **backend service** "Variables" tab, you should have:

```
✅ DATABASE_URL = ${{Postgres.DATABASE_URL}}  (or the full URL)
✅ OPENAI_API_KEY = sk-...
✅ PORT = 8001
✅ IMAGE_SIMILARITY_THRESHOLD = 5
```

**If any are missing, add them now!**

---

### Step 4: Redeploy

After adding/fixing variables:

1. **Railway will auto-redeploy** (watch for "Deploying..." status)
2. **OR manually trigger:**
   - Go to "Deployments" tab
   - Click "Redeploy" button

---

### Step 5: Check Deployment Logs

1. **Click on your backend service**
2. **Go to "Deployments" tab**
3. **Click on the latest deployment**
4. **Click "View Logs"**

**You should see:**
```
==================================================
🚀 Starting AI Outfit Suggestor API
==================================================
📊 Environment Variables Check:
   PORT: 8001
   OPENAI_API_KEY: ✅ Set
   DATABASE_URL: ✅ Set
   IMAGE_SIMILARITY_THRESHOLD: 5
==================================================
✅ Using database: postgresql://postgres:...
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8001
```

**If you see `DATABASE_URL: ❌ Not set` in the logs:**
- Go back to Step 2 and properly link the database

---

## 🎯 Quick Checklist

Before redeploying, verify:

- [ ] PostgreSQL service exists in Railway project
- [ ] Backend service has `DATABASE_URL` variable (linked or copied)
- [ ] `DATABASE_URL` shows `${{Postgres.DATABASE_URL}}` or full URL
- [ ] `OPENAI_API_KEY` is set
- [ ] All other variables are set

---

## 🔍 How to Find Your Services

In Railway dashboard:

```
Your Project
├── outfit-suggestor-app (Backend) ← Click here to configure
│   └── Variables tab ← Add DATABASE_URL here
│
└── PostgreSQL (Database) ← This provides DATABASE_URL
    └── Variables tab ← Copy DATABASE_URL from here
```

---

## 📸 Visual Guide

### What You Should See in Backend Variables:

```
┌─────────────────────────────────────────┐
│ Variables                               │
├─────────────────────────────────────────┤
│ DATABASE_URL                            │
│ ${{Postgres.DATABASE_URL}}              │ ← Should reference PostgreSQL
│                                         │
│ OPENAI_API_KEY                          │
│ sk-proj-...                             │
│                                         │
│ PORT                                    │
│ 8001                                    │
│                                         │
│ IMAGE_SIMILARITY_THRESHOLD              │
│ 5                                       │
└─────────────────────────────────────────┘
```

---

## 🆘 Still Not Working?

### Option 1: Check PostgreSQL Connection String Format

Railway's `DATABASE_URL` might use `postgres://` instead of `postgresql://`. 

**In your backend service Variables, add:**
```
Name: DATABASE_URL
Value: [manually copy from PostgreSQL service and ensure it starts with postgresql://]
```

If it starts with `postgres://`, change it to `postgresql://`.

### Option 2: Use Railway's Internal URL

Railway provides internal networking. Try:
```
DATABASE_URL = postgresql://postgres:[password]@postgres.railway.internal:5432/railway
```

Get the password from your PostgreSQL service variables.

---

## 🎉 Success Indicators

**When it works, you'll see:**

1. **In Logs:**
   ```
   ✅ Using database: postgresql://postgres:...
   INFO: Application startup complete
   ```

2. **In Browser:**
   - Visit: `https://your-app.railway.app/health`
   - See: `{"status":"healthy",...}`

3. **No Crashes:**
   - Service stays running
   - No restart loops

---

## 📞 What to Do Now

1. **Go to Railway dashboard**
2. **Check if PostgreSQL service exists**
3. **Add/link DATABASE_URL to backend service** (Step 2 above)
4. **Wait for auto-redeploy**
5. **Check logs** for the startup message
6. **Tell me if you see "✅ Using database" in the logs!**

The fix is simple - just need to properly link the database variable! 🔗




