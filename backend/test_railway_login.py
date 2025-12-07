"""
Test script to verify login works on Railway database.
This helps debug 401 errors.
"""

import sys
from sqlalchemy import create_engine, text
from utils.auth import verify_password

def test_login():
    if len(sys.argv) < 3:
        print("Usage: python test_railway_login.py 'postgresql://...' 'password'")
        sys.exit(1)
    
    railway_db_url = sys.argv[1]
    test_password = sys.argv[2]
    
    engine = create_engine(railway_db_url)
    
    with engine.connect() as conn:
        # Get user
        result = conn.execute(text("""
            SELECT id, email, hashed_password, email_verified, is_active
            FROM users 
            WHERE email = 'sajadparacha@gmail.com'
        """))
        row = result.fetchone()
        
        if not row:
            print("❌ User not found")
            return
        
        user_id, email, hashed_pwd, email_verified, is_active = row
        
        print(f"User: {email}")
        print(f"Email Verified: {email_verified}")
        print(f"Is Active: {is_active}")
        print()
        
        # Test password
        print("Testing password verification...")
        if verify_password(test_password, hashed_pwd):
            print("✅ Password verification SUCCESSFUL")
            print("   The password is correct in the database.")
            print("   If login still fails, check:")
            print("   1. Frontend is sending password correctly")
            print("   2. Railway backend logs for exact error")
            print("   3. CORS or network issues")
        else:
            print("❌ Password verification FAILED")
            print("   The password you entered does not match the database.")
            print("   Try resetting the password or check if you're using the correct password.")

if __name__ == "__main__":
    test_login()


