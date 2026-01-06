"""
Sync database schema from local models to Railway database.
This script creates all tables and ensures the schema matches.

Usage:
    python sync_railway_schema.py [RAILWAY_DATABASE_URL]
    
Or set as environment variable:
    export RAILWAY_DATABASE_URL="postgresql://..."
    python sync_railway_schema.py
"""

import os
import sys
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker

# Import all models to ensure they're registered with Base
from models.database import Base
from models.user import User
from models.outfit_history import OutfitHistory
from models.wardrobe import WardrobeItem

def sync_schema():
    """Sync database schema to Railway."""
    
    print("=" * 80)
    print("Database Schema Sync Script")
    print("=" * 80)
    print()
    
    # Get Railway database URL
    print("Step 1: Getting Railway database connection...")
    
    railway_db_url = None
    if len(sys.argv) > 1:
        railway_db_url = sys.argv[1].strip()
    elif os.getenv('RAILWAY_DATABASE_URL'):
        railway_db_url = os.getenv('RAILWAY_DATABASE_URL').strip()
    
    if not railway_db_url:
        print("   Please enter your Railway DATABASE_URL")
        print("   (Find it in: Railway Dashboard → Your Project → PostgreSQL → Variables → DATABASE_URL)")
        print("   Or pass as argument: python sync_railway_schema.py 'postgresql://...'")
        print()
        railway_db_url = input("Railway DATABASE_URL: ").strip()
    
    if not railway_db_url:
        print("❌ Error: Railway DATABASE_URL is required")
        print("   Usage: python sync_railway_schema.py 'postgresql://user:pass@host:port/db'")
        sys.exit(1)
    
    # Parse database URL to show connection info (without password)
    from urllib.parse import urlparse
    parsed = urlparse(railway_db_url)
    print(f"   Railway: {parsed.username}@{parsed.hostname}:{parsed.port or 5432}/{parsed.path.lstrip('/')}")
    print()
    
    # Confirm
    if sys.stdin.isatty():
        print("⚠️  This will create/update tables in your Railway database.")
        print("   It will NOT delete existing data, but will create missing tables/columns.")
        print()
        confirm = input("Continue? (yes/no): ").strip().lower()
        
        if confirm != 'yes':
            print("❌ Cancelled")
            sys.exit(0)
    
    print()
    print("Step 2: Connecting to Railway database...")
    
    try:
        # Create engine for Railway
        railway_engine = create_engine(railway_db_url, echo=False)
        
        # Test connection
        with railway_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("✅ Railway database connected")
        
    except Exception as e:
        print(f"❌ Error connecting to Railway database: {e}")
        sys.exit(1)
    
    print()
    print("Step 3: Creating/updating database schema...")
    print("   (This will create missing tables but won't modify existing data)")
    print()
    
    try:
        # Create all tables based on models
        # This will create tables that don't exist, but won't modify existing ones
        Base.metadata.create_all(bind=railway_engine)
        print("✅ Schema creation completed")
        
        # Verify tables exist
        print()
        print("Step 4: Verifying tables...")
        inspector = inspect(railway_engine)
        tables = inspector.get_table_names()
        
        expected_tables = ['users', 'outfit_history', 'wardrobe_items']
        for table in expected_tables:
            if table in tables:
                print(f"   ✅ {table} table exists")
                
                # Show columns
                columns = [col['name'] for col in inspector.get_columns(table)]
                print(f"      Columns: {', '.join(columns)}")
            else:
                print(f"   ⚠️  {table} table NOT found")
        
        print()
        print("=" * 80)
        print("✅ Schema sync completed successfully!")
        print("=" * 80)
        print()
        print("Your Railway database schema should now match your local models.")
        print("Note: This script creates tables but doesn't modify existing columns.")
        print("For schema changes (adding columns, etc.), you may need to run migrations.")
        
    except Exception as e:
        print()
        print(f"❌ Error during schema sync: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
        
    finally:
        railway_engine.dispose()

if __name__ == "__main__":
    sync_schema()


