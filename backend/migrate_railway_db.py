"""
Run database migration on Railway database to add missing columns.
"""

import sys
from sqlalchemy import text, create_engine
from models.database import SessionLocal

def migrate_railway():
    """Run migration on Railway database."""
    
    if len(sys.argv) < 2:
        print("Usage: python migrate_railway_db.py 'postgresql://...'")
        sys.exit(1)
    
    railway_db_url = sys.argv[1]
    
    print("=" * 80)
    print("Running Migration on Railway Database")
    print("=" * 80)
    print()
    
    # Create engine
    engine = create_engine(railway_db_url)
    
    with engine.connect() as conn:
        # Check if columns already exist
        print("Step 1: Checking existing schema...")
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='outfit_history' AND column_name='user_id'
        """))
        exists = result.fetchone()
        
        if exists:
            print("✅ user_id column already exists in outfit_history")
        else:
            print("   Adding user_id column...")
            conn.execute(text("""
                ALTER TABLE outfit_history 
                ADD COLUMN user_id INTEGER REFERENCES users(id)
            """))
            conn.commit()
            print("✅ Added user_id column")
        
        # Check for email verification columns in users table
        print()
        print("Step 2: Checking users table schema...")
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='users' AND column_name='email_verified'
        """))
        exists = result.fetchone()
        
        if exists:
            print("✅ email_verified column already exists in users")
        else:
            print("   Adding email verification columns...")
            conn.execute(text("""
                ALTER TABLE users 
                ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE
            """))
            conn.execute(text("""
                ALTER TABLE users 
                ADD COLUMN activation_token VARCHAR(255)
            """))
            conn.execute(text("""
                ALTER TABLE users 
                ADD COLUMN activation_token_expires TIMESTAMP
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_users_activation_token 
                ON users(activation_token)
            """))
            conn.commit()
            print("✅ Added email verification columns")
            
            # Set existing users as verified
            print("   Setting existing users to email_verified=True...")
            result = conn.execute(text("""
                UPDATE users 
                SET email_verified = TRUE
                WHERE email_verified = FALSE
            """))
            conn.commit()
            print(f"✅ Updated {result.rowcount} users")
        
        print()
        print("=" * 80)
        print("✅ Migration completed successfully!")
        print("=" * 80)

if __name__ == "__main__":
    migrate_railway()

