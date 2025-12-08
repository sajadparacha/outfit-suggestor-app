"""
Migration script to add model_image column to outfit_history table on Railway
This script can be run directly on Railway or locally with Railway DATABASE_URL

Usage:
    # On Railway (via Railway CLI or SSH):
    python backend/run_railway_migration.py
    
    # Locally with Railway DATABASE_URL:
    DATABASE_URL="postgresql://..." python backend/run_railway_migration.py
"""

import sys
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def migrate_database():
    """Add model_image column to outfit_history table"""
    
    # Get database URL from environment
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ ERROR: DATABASE_URL environment variable not set")
        print("Please set DATABASE_URL or run this script with the database URL as an argument")
        sys.exit(1)
    
    # Handle Railway's internal URL format - convert to public if needed
    if "postgres.railway.internal" in database_url:
        print("⚠️  WARNING: Using Railway internal URL. This may not work from outside Railway.")
        print("   If this fails, use the public connection string from Railway dashboard.")
    
    print(f"✅ Connecting to database...")
    try:
        engine = create_engine(database_url)
    except Exception as e:
        print(f"❌ Failed to create database engine: {e}")
        sys.exit(1)
    
    try:
        with engine.connect() as conn:
            # Check if column already exists
            print("🔍 Checking if model_image column exists...")
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='outfit_history' AND column_name='model_image'
            """))
            
            if result.fetchone():
                print("✅ Column 'model_image' already exists in 'outfit_history' table")
                return
            
            # Add the column
            print("📝 Adding 'model_image' column to 'outfit_history' table...")
            conn.execute(text("""
                ALTER TABLE outfit_history 
                ADD COLUMN model_image TEXT
            """))
            conn.commit()
            
            print("✅ Successfully added 'model_image' column to 'outfit_history' table")
            print("✅ Migration completed successfully!")
            
    except Exception as e:
        print(f"❌ Error during migration: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        engine.dispose()

if __name__ == "__main__":
    migrate_database()

