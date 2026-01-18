"""Migration script to add operation_type column to access_logs table."""
from sqlalchemy import text
from models.database import engine

def migrate():
    """Add operation_type column to access_logs table if it doesn't exist."""
    with engine.connect() as conn:
        # Check if column exists
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='access_logs' AND column_name='operation_type'
        """))
        
        if result.fetchone() is None:
            print("Adding operation_type column to access_logs table...")
            conn.execute(text("""
                ALTER TABLE access_logs 
                ADD COLUMN operation_type VARCHAR(50)
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_operation_type 
                ON access_logs(operation_type)
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_operation_timestamp 
                ON access_logs(operation_type, timestamp)
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_operation_user 
                ON access_logs(operation_type, user_id)
            """))
            conn.commit()
            print("✅ operation_type column added successfully!")
        else:
            print("✅ operation_type column already exists")
        
        # Verify the column exists
        result = conn.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name='access_logs' AND column_name='operation_type'
        """))
        row = result.fetchone()
        if row:
            print(f"✅ Verified: {row[0]} ({row[1]}) column exists")

if __name__ == "__main__":
    migrate()
