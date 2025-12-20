# Railway Migration Guide - Add model_image Column

## Problem
The `outfit_history` table on Railway is missing the `model_image` column, causing errors when fetching history.

## Solution
Run the migration script to add the missing column.

## Option 1: Run Migration via Railway CLI (Recommended)

1. Install Railway CLI (if not already installed):
   ```bash
   npm i -g @railway/cli
   ```

2. Login to Railway:
   ```bash
   railway login
   ```

3. Link to your project:
   ```bash
   railway link
   ```

4. Run the migration script:
   ```bash
   railway run python backend/run_railway_migration.py
   ```

## Option 2: Run Migration via Railway Dashboard

1. Go to your Railway project dashboard
2. Open the database service
3. Click on "Connect" or "Query" tab
4. Run this SQL command:
   ```sql
   ALTER TABLE outfit_history 
   ADD COLUMN IF NOT EXISTS model_image TEXT;
   ```

## Option 3: Run Migration Locally with Railway DATABASE_URL

1. Get your Railway database connection string from the Railway dashboard
   - Go to your database service
   - Click on "Connect" or "Variables"
   - Copy the `DATABASE_URL` (use the public connection string, not the internal one)

2. Run the migration script:
   ```bash
   DATABASE_URL="postgresql://user:password@host:port/database" python backend/run_railway_migration.py
   ```

## Verification

After running the migration, verify the column was added:

```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name='outfit_history' AND column_name='model_image';
```

You should see `model_image` in the results.

## Temporary Workaround

The backend code has been updated to handle the missing column gracefully. It will:
- Check if the column exists before querying
- Use raw SQL without the column if it doesn't exist
- Return `model_image: null` for all entries until the migration is run

However, **you should still run the migration** to enable full functionality.






