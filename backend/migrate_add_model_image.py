"""
Migration script to add model_image column to outfit_history table
Run this script to add the model_image column to existing database tables.
"""

import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

def migrate_database():
    """Add model_image column to outfit_history table"""
    
    # Get database URL
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ ERROR: DATABASE_URL environment variable not set")
        print("Please set DATABASE_URL or run this script with the database URL as an argument")
        sys.exit(1)
    
    print(f"✅ Connecting to database...")
    engine = create_engine(database_url)
    
    try:
        with engine.connect() as conn:
            # Check if column already exists
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
            
    except Exception as e:
        print(f"❌ Error during migration: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    migrate_database()










