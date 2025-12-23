# Railway CLI Guide - Running Migration

This guide will walk you through installing and using Railway CLI to run the database migration.

## Step 1: Install Railway CLI

### Option A: Using npm (Recommended)
```bash
npm install -g @railway/cli
```

### Option B: Using Homebrew (macOS)
```bash
brew install railway
```

### Option C: Using curl (Linux/macOS)
```bash
curl -fsSL https://railway.app/install.sh | sh
```

### Verify Installation
```bash
railway --version
```

You should see something like: `railway 3.x.x`

---

## Step 2: Login to Railway

```bash
railway login
```

This will:
- Open your browser
- Ask you to authorize Railway CLI
- Complete the login process

**Note:** If you're already logged in, you can skip this step.

---

## Step 3: Link to Your Project

Navigate to your project directory:
```bash
cd /Users/sajad/outfit-suggestor-app
```

Link to your Railway project:
```bash
railway link
```

This will:
- Show a list of your Railway projects
- Ask you to select which project to link
- Create a `.railway` directory with project configuration

**Alternative:** If you know your project ID, you can link directly:
```bash
railway link <project-id>
```

---

## Step 4: Verify Connection

Check that you're linked to the correct project:
```bash
railway status
```

This should show:
- Your project name
- Current environment
- Service information

---

## Step 5: Run the Migration Script

Now you can run the migration script:
```bash
railway run python backend/run_railway_migration.py
```

This will:
- Connect to your Railway database
- Check if the `model_image` column exists
- Add it if it doesn't exist
- Show success/error messages

**Expected Output:**
```
✅ Connecting to database...
🔍 Checking if model_image column exists...
📝 Adding 'model_image' column to 'outfit_history' table...
✅ Successfully added 'model_image' column to 'outfit_history' table
✅ Migration completed successfully!
```

---

## Troubleshooting

### Issue: "railway: command not found"
**Solution:** Make sure Railway CLI is installed and in your PATH. Try:
```bash
which railway
```
If it's not found, reinstall using one of the methods above.

### Issue: "Not logged in"
**Solution:** Run `railway login` again.

### Issue: "No project linked"
**Solution:** Run `railway link` to link to your project.

### Issue: "DATABASE_URL not found"
**Solution:** Railway CLI automatically uses the DATABASE_URL from your Railway project. If it's not set:
1. Go to Railway Dashboard
2. Select your project
3. Go to Variables
4. Make sure `DATABASE_URL` is set

### Issue: "Connection refused" or "Could not connect"
**Solution:** 
- Make sure your Railway service is running
- Check that the DATABASE_URL is correct
- Try using the public connection string instead of the internal one

### Issue: "Column already exists"
**Solution:** This is fine! It means the migration has already been run. The script will exit gracefully.

---

## Alternative: Run Migration via Railway Dashboard

If you prefer not to use CLI, you can run the migration directly in Railway Dashboard:

1. Go to https://railway.app
2. Select your project
3. Click on your **PostgreSQL** database service
4. Click on **"Query"** or **"Connect"** tab
5. Run this SQL:
   ```sql
   ALTER TABLE outfit_history 
   ADD COLUMN IF NOT EXISTS model_image TEXT;
   ```
6. Click **"Run"** or **"Execute"**

---

## Verify Migration Success

After running the migration, verify it worked:

### Using Railway CLI:
```bash
railway run python -c "
from sqlalchemy import create_engine, text
import os
engine = create_engine(os.getenv('DATABASE_URL'))
with engine.connect() as conn:
    result = conn.execute(text(\"\"\"
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='outfit_history' AND column_name='model_image'
    \"\"\"))
    if result.fetchone():
        print('✅ Column exists!')
    else:
        print('❌ Column not found')
"
```

### Using Railway Dashboard:
Run this SQL query:
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name='outfit_history' AND column_name='model_image';
```

You should see `model_image` in the results.

---

## Next Steps

After the migration is complete:
1. ✅ The `/api/outfit-history` endpoint will work without errors
2. ✅ New outfit suggestions with model images will be saved
3. ✅ History will display model images when available

Your application should now work correctly on Railway! 🎉







