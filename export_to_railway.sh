#!/bin/bash
# Script to export local database and import to Railway production database

set -e  # Exit on error

echo "=" | head -c 80
echo ""
echo "Database Export/Import Script"
echo "=" | head -c 80
echo ""
echo ""

# Check if pg_dump and psql are available
if ! command -v pg_dump &> /dev/null; then
    echo "❌ Error: pg_dump not found. Please install PostgreSQL client tools."
    echo "   On macOS: brew install postgresql"
    exit 1
fi

if ! command -v psql &> /dev/null; then
    echo "❌ Error: psql not found. Please install PostgreSQL client tools."
    echo "   On macOS: brew install postgresql"
    exit 1
fi

# Get local database connection details
echo "📋 Step 1: Getting local database connection details..."
LOCAL_DB_URL="${DATABASE_URL:-postgresql://sajad@localhost:5432/outfit_suggestor}"

# Parse local database URL
LOCAL_HOST=$(echo $LOCAL_DB_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
LOCAL_PORT=$(echo $LOCAL_DB_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
LOCAL_DB=$(echo $LOCAL_DB_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
LOCAL_USER=$(echo $LOCAL_DB_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')

if [ -z "$LOCAL_HOST" ]; then
    LOCAL_HOST="localhost"
fi
if [ -z "$LOCAL_PORT" ]; then
    LOCAL_PORT="5432"
fi
if [ -z "$LOCAL_DB" ]; then
    LOCAL_DB="outfit_suggestor"
fi
if [ -z "$LOCAL_USER" ]; then
    LOCAL_USER="postgres"
fi

echo "   Local Database: $LOCAL_USER@$LOCAL_HOST:$LOCAL_PORT/$LOCAL_DB"
echo ""

# Get Railway database URL
echo "📋 Step 2: Getting Railway database connection..."
echo "   Please enter your Railway DATABASE_URL:"
echo "   (You can find this in Railway Dashboard → Your Project → PostgreSQL → Variables → DATABASE_URL)"
echo ""
read -p "Railway DATABASE_URL: " RAILWAY_DB_URL

if [ -z "$RAILWAY_DB_URL" ]; then
    echo "❌ Error: Railway DATABASE_URL is required"
    exit 1
fi

# Confirm before proceeding
echo ""
echo "⚠️  WARNING: This will overwrite data in your Railway database!"
echo "   Local database: $LOCAL_USER@$LOCAL_HOST:$LOCAL_PORT/$LOCAL_DB"
echo "   Railway database: (from DATABASE_URL)"
echo ""
read -p "Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Cancelled"
    exit 0
fi

# Create temporary dump file
DUMP_FILE="/tmp/outfit_suggestor_dump_$(date +%Y%m%d_%H%M%S).sql"
echo ""
echo "📦 Step 3: Exporting local database..."
echo "   Dump file: $DUMP_FILE"

# Export data only (no schema, to avoid conflicts)
pg_dump "$LOCAL_DB_URL" \
    --data-only \
    --no-owner \
    --no-acl \
    --column-inserts \
    -f "$DUMP_FILE"

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to export local database"
    exit 1
fi

echo "✅ Export completed"
echo ""

# Get table sizes
echo "📊 Exported data summary:"
TABLES=$(grep -o "INSERT INTO [a-z_]*" "$DUMP_FILE" | sed 's/INSERT INTO //' | sort -u)
for table in $TABLES; do
    COUNT=$(grep -c "INSERT INTO $table" "$DUMP_FILE" || echo "0")
    echo "   - $table: $COUNT rows"
done
echo ""

# Import to Railway
echo "📤 Step 4: Importing to Railway database..."
psql "$RAILWAY_DB_URL" -f "$DUMP_FILE"

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to import to Railway database"
    echo "   Dump file saved at: $DUMP_FILE"
    exit 1
fi

echo "✅ Import completed"
echo ""

# Cleanup
echo "🧹 Step 5: Cleaning up..."
rm "$DUMP_FILE"
echo "✅ Cleanup completed"
echo ""

echo "=" | head -c 80
echo ""
echo "✅ Database export/import completed successfully!"
echo "=" | head -c 80
echo ""
echo "Your local data has been imported to Railway."
echo "You can verify by checking your Railway database or testing the API."


