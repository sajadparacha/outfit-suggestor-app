"""
Script to export local database data and import to Railway production database.
This script uses SQLAlchemy to transfer data between databases.

Usage:
    python export_to_railway.py [RAILWAY_DATABASE_URL]
    
Or set as environment variable:
    export RAILWAY_DATABASE_URL="postgresql://..."
    python export_to_railway.py
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from urllib.parse import urlparse

# Import models to ensure they're loaded
from models.user import User
from models.outfit_history import OutfitHistory

def get_connection_info(db_url):
    """Parse database URL and return connection info."""
    parsed = urlparse(db_url)
    return {
        'host': parsed.hostname or 'localhost',
        'port': parsed.port or 5432,
        'database': parsed.path.lstrip('/') if parsed.path else 'outfit_suggestor',
        'user': parsed.username or 'postgres',
        'password': parsed.password or '',
        'url': db_url
    }

def export_import_data():
    """Export data from local database and import to Railway."""
    
    print("=" * 80)
    print("Database Export/Import Script")
    print("=" * 80)
    print()
    
    # Get local database URL
    print("Step 1: Getting local database connection...")
    try:  # Support running both as a package (backend.*) and from backend/ directly
        from config import Config
    except ImportError:  # When imported as backend.export_to_railway
        from backend.config import Config
    local_db_url = Config.DATABASE_URL
    
    if not local_db_url:
        print("❌ Error: Local DATABASE_URL not found in config")
        sys.exit(1)
    
    local_info = get_connection_info(local_db_url)
    print(f"   Local: {local_info['user']}@{local_info['host']}:{local_info['port']}/{local_info['database']}")
    print()
    
    # Get Railway database URL
    print("Step 2: Getting Railway database connection...")
    
    # Try to get from command line argument or environment variable
    railway_db_url = None
    if len(sys.argv) > 1:
        railway_db_url = sys.argv[1].strip()
    elif os.getenv('RAILWAY_DATABASE_URL'):
        railway_db_url = os.getenv('RAILWAY_DATABASE_URL').strip()
    
    if not railway_db_url:
        print("   Please enter your Railway DATABASE_URL")
        print("   (Find it in: Railway Dashboard → Your Project → PostgreSQL → Variables → DATABASE_URL)")
        print("   Or pass as argument: python export_to_railway.py 'postgresql://...'")
        print()
        railway_db_url = input("Railway DATABASE_URL: ").strip()
    
    if not railway_db_url:
        print("❌ Error: Railway DATABASE_URL is required")
        print("   Usage: python export_to_railway.py 'postgresql://user:pass@host:port/db'")
        sys.exit(1)
    
    railway_info = get_connection_info(railway_db_url)
    print(f"   Railway: {railway_info['user']}@{railway_info['host']}:{railway_info['port']}/{railway_info['database']}")
    print()
    
    # Confirm (skip if running non-interactively)
    if sys.stdin.isatty():
        print("⚠️  WARNING: This will overwrite data in your Railway database!")
        print()
        confirm = input("Continue? (yes/no): ").strip().lower()
        
        if confirm != 'yes':
            print("❌ Cancelled")
            sys.exit(0)
    else:
        print("⚠️  WARNING: This will overwrite data in your Railway database!")
        print("   Running in non-interactive mode, proceeding...")
    
    print()
    print("Step 3: Connecting to databases...")
    
    # Create engines
    try:
        local_engine = create_engine(local_db_url)
        railway_engine = create_engine(railway_db_url)
        
        # Test connections
        with local_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("✅ Local database connected")
        
        with railway_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("✅ Railway database connected")
        
    except Exception as e:
        print(f"❌ Error connecting to databases: {e}")
        sys.exit(1)
    
    print()
    print("Step 4: Exporting data from local database...")
    
    # Create sessions
    LocalSession = sessionmaker(bind=local_engine)
    RailwaySession = sessionmaker(bind=railway_engine)
    
    local_session = LocalSession()
    railway_session = RailwaySession()
    
    try:
        # Export Users
        print("   Exporting users...")
        local_users = local_session.query(User).all()
        print(f"   Found {len(local_users)} users")
        
        # Import Users
        print("   Importing users to Railway...")
        imported_users = 0
        for user in local_users:
            # Check if user already exists
            existing = railway_session.query(User).filter(User.email == user.email).first()
            if existing:
                # Update existing user
                existing.hashed_password = user.hashed_password
                existing.full_name = user.full_name
                existing.is_active = user.is_active
                existing.email_verified = getattr(user, 'email_verified', True)
                existing.activation_token = getattr(user, 'activation_token', None)
                existing.activation_token_expires = getattr(user, 'activation_token_expires', None)
            else:
                # Create new user
                new_user = User(
                    email=user.email,
                    hashed_password=user.hashed_password,
                    full_name=user.full_name,
                    is_active=user.is_active,
                    email_verified=getattr(user, 'email_verified', True),
                    activation_token=getattr(user, 'activation_token', None),
                    activation_token_expires=getattr(user, 'activation_token_expires', None)
                )
                railway_session.add(new_user)
            imported_users += 1
        
        railway_session.commit()
        print(f"   ✅ Imported/updated {imported_users} users")
        
        # Export Outfit History
        print()
        print("   Exporting outfit history...")
        local_history = local_session.query(OutfitHistory).all()
        print(f"   Found {len(local_history)} history entries")
        
        # Import Outfit History
        print("   Importing outfit history to Railway...")
        imported_history = 0
        for entry in local_history:
            # Check if entry already exists (by id)
            existing = railway_session.query(OutfitHistory).filter(OutfitHistory.id == entry.id).first()
            if not existing:
                # Create new entry
                new_entry = OutfitHistory(
                    id=entry.id,  # Preserve ID if possible
                    user_id=entry.user_id,
                    text_input=entry.text_input,
                    image_data=entry.image_data,
                    shirt=entry.shirt,
                    trouser=entry.trouser,
                    blazer=entry.blazer,
                    shoes=entry.shoes,
                    belt=entry.belt,
                    reasoning=entry.reasoning,
                    created_at=entry.created_at
                )
                railway_session.add(new_entry)
                imported_history += 1
        
        railway_session.commit()
        print(f"   ✅ Imported {imported_history} history entries")
        
        print()
        print("=" * 80)
        print("✅ Database export/import completed successfully!")
        print("=" * 80)
        print()
        print(f"Summary:")
        print(f"  - Users: {imported_users} imported/updated")
        print(f"  - History entries: {imported_history} imported")
        print()
        print("Your local data has been imported to Railway.")
        print("You can verify by checking your Railway database or testing the API.")
        
    except Exception as e:
        railway_session.rollback()
        print()
        print(f"❌ Error during import: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
        
    finally:
        local_session.close()
        railway_session.close()
        local_engine.dispose()
        railway_engine.dispose()

if __name__ == "__main__":
    export_import_data()

