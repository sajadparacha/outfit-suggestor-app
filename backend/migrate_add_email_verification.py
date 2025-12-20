"""
Database migration script to add email verification columns to users table.
This script:
1. Adds email_verified, activation_token, and activation_token_expires columns
2. Sets all existing users to email_verified=True (so they can continue using the app)
3. Clears activation tokens for existing users
"""

from sqlalchemy import text
from models.database import SessionLocal, engine

def migrate():
    """Run the migration to add email verification columns."""
    db = SessionLocal()
    
    try:
        print("=" * 80)
        print("Starting Email Verification Migration")
        print("=" * 80)
        print()
        
        # Check if columns already exist
        result = db.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='users' AND column_name='email_verified'
        """))
        exists = result.fetchone()
        
        if exists:
            print("⚠️  Email verification columns already exist. Skipping migration.")
            return
        
        print("Step 1: Adding email_verified column...")
        db.execute(text("""
            ALTER TABLE users 
            ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE
        """))
        db.commit()
        print("✅ Added email_verified column")
        print()
        
        print("Step 2: Adding activation_token column...")
        db.execute(text("""
            ALTER TABLE users 
            ADD COLUMN activation_token VARCHAR(255)
        """))
        db.commit()
        print("✅ Added activation_token column")
        print()
        
        print("Step 3: Adding activation_token_expires column...")
        db.execute(text("""
            ALTER TABLE users 
            ADD COLUMN activation_token_expires TIMESTAMP
        """))
        db.commit()
        print("✅ Added activation_token_expires column")
        print()
        
        print("Step 4: Creating index on activation_token for faster lookups...")
        db.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_users_activation_token 
            ON users(activation_token)
        """))
        db.commit()
        print("✅ Created index on activation_token")
        print()
        
        print("Step 5: Setting all existing users to email_verified=True...")
        result = db.execute(text("""
            UPDATE users 
            SET email_verified = TRUE,
                activation_token = NULL,
                activation_token_expires = NULL
            WHERE email_verified = FALSE
        """))
        db.commit()
        updated_count = result.rowcount
        print(f"✅ Updated {updated_count} existing users to email_verified=True")
        print()
        
        # Verify the migration
        print("Step 6: Verifying migration...")
        result = db.execute(text("""
            SELECT 
                COUNT(*) as total_users,
                COUNT(CASE WHEN email_verified = TRUE THEN 1 END) as verified_users,
                COUNT(CASE WHEN email_verified = FALSE THEN 1 END) as unverified_users
            FROM users
        """))
        stats = result.fetchone()
        
        print("=" * 80)
        print("Migration Summary:")
        print("=" * 80)
        print(f"Total users: {stats[0]}")
        print(f"Verified users: {stats[1]}")
        print(f"Unverified users: {stats[2]}")
        print("=" * 80)
        print()
        print("✅ Migration completed successfully!")
        print()
        print("Note: All existing users have been set to email_verified=True")
        print("      so they can continue using the app without re-activation.")
        print("      New users will need to activate their email addresses.")
        
    except Exception as e:
        db.rollback()
        print()
        print("=" * 80)
        print("❌ Migration failed!")
        print("=" * 80)
        print(f"Error: {str(e)}")
        print()
        print("Rolling back changes...")
        raise
    
    finally:
        db.close()


if __name__ == "__main__":
    try:
        migrate()
    except Exception as e:
        print(f"\nMigration failed: {e}")
        exit(1)







