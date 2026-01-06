#!/bin/bash

# Script to create PostgreSQL user and database
# This script helps set up the PostgreSQL role for DBeaver connection

echo "Creating PostgreSQL role 'sajjad'..."

# Try different PostgreSQL paths
PSQL_PATH=""
for path in "/opt/homebrew/opt/postgresql@14/bin/psql" \
            "/opt/homebrew/bin/psql" \
            "/usr/local/bin/psql" \
            "/Applications/Postgres.app/Contents/Versions/latest/bin/psql"; do
    if [ -f "$path" ]; then
        PSQL_PATH="$path"
        break
    fi
done

if [ -z "$PSQL_PATH" ]; then
    echo "ERROR: Could not find psql. Please install PostgreSQL or add it to your PATH."
    echo ""
    echo "If PostgreSQL is installed, try:"
    echo "1. Find where PostgreSQL is installed"
    echo "2. Add it to your PATH, or run psql with full path"
    echo ""
    echo "Alternative: Create the user through DBeaver by connecting to 'postgres' database"
    echo "and running: CREATE ROLE sajjad WITH LOGIN;"
    exit 1
fi

echo "Found psql at: $PSQL_PATH"
echo ""

# Try to connect and create the role
echo "Attempting to create role 'sajjad'..."
$PSQL_PATH -d postgres -c "CREATE ROLE sajjad WITH LOGIN;" 2>&1

if [ $? -eq 0 ]; then
    echo "✓ Role 'sajjad' created successfully!"
    echo ""
    echo "Creating database 'outfit_suggestor'..."
    $PSQL_PATH -d postgres -c "CREATE DATABASE outfit_suggestor OWNER sajjad;" 2>&1
    if [ $? -eq 0 ]; then
        echo "✓ Database 'outfit_suggestor' created successfully!"
    fi
else
    echo ""
    echo "If you got a permission error, you may need to:"
    echo "1. Connect as the postgres superuser"
    echo "2. Or use DBeaver to connect to 'postgres' database first"
    echo "3. Then run: CREATE ROLE sajjad WITH LOGIN;"
fi

echo ""
echo "You can now connect DBeaver with:"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  Database: outfit_suggestor"
echo "  Username: sajjad"
echo "  Password: (leave blank or set one)"
