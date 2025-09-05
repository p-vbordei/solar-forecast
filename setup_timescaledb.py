#!/usr/bin/env python3
"""
Setup TimescaleDB for Railway PostgreSQL
"""

import os
import psycopg2
from psycopg2 import sql
import sys

def setup_timescaledb():
    """Setup TimescaleDB extension and hypertables"""
    
    # Get database URL from environment
    database_url = os.environ.get('DATABASE_URL')
    
    if not database_url:
        print("❌ DATABASE_URL not found in environment variables")
        print("Please set it using: railway variables set DATABASE_URL='your-database-url'")
        return False
    
    try:
        # Connect to database
        print("🔗 Connecting to database...")
        conn = psycopg2.connect(database_url)
        cur = conn.cursor()
        
        # Enable TimescaleDB extension
        print("📊 Enabling TimescaleDB extension...")
        cur.execute("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;")
        conn.commit()
        
        # Check if extension is enabled
        cur.execute("SELECT * FROM pg_extension WHERE extname = 'timescaledb';")
        result = cur.fetchone()
        
        if result:
            print("✅ TimescaleDB extension enabled successfully!")
        else:
            print("⚠️ TimescaleDB extension not found")
            return False
        
        # Read and execute init.sql
        print("🚀 Running initialization script...")
        with open('init.sql', 'r') as f:
            init_sql = f.read()
        
        cur.execute(init_sql)
        conn.commit()
        
        # Call setup function
        print("📈 Setting up hypertables...")
        cur.execute("SELECT setup_hypertables();")
        conn.commit()
        
        # Verify hypertables
        cur.execute("""
            SELECT hypertable_name 
            FROM timescaledb_information.hypertables
            ORDER BY hypertable_name;
        """)
        
        hypertables = cur.fetchall()
        
        if hypertables:
            print("✅ Hypertables created:")
            for table in hypertables:
                print(f"   - {table[0]}")
        else:
            print("⚠️ No hypertables created yet (tables may not exist)")
        
        # Close connection
        cur.close()
        conn.close()
        
        print("🎉 TimescaleDB setup completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error setting up TimescaleDB: {e}")
        return False

if __name__ == "__main__":
    success = setup_timescaledb()
    sys.exit(0 if success else 1)
