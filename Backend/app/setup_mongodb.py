# backend/app/setup_mongodb.py
# Run this script once to set up MongoDB collections and indexes

import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from passlib.context import CryptContext

# Load environment variables
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb+srv://hamza:hamza@cluster0.n44j3.mongodb.net/")
DATABASE_NAME = os.getenv("DATABASE_NAME", "nozama_ai")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def setup_mongodb():
    """Set up MongoDB collections and indexes for Simple Admin system"""
    
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    
    try:
        # Test connection
        await db.command("ping")
        print(f"✅ Connected to MongoDB: {DATABASE_NAME}")
        
        # Create Simple Admins collection with indexes
        await db.simple_admins.create_index("email", unique=True)
        await db.simple_admins.create_index("is_active")
        await db.simple_admins.create_index("created_at")
        print("✅ Created simple_admins collection with indexes")
        
        # Create index on products collection for simple admin tracking
        await db.products.create_index("created_by_simple_admin_id")
        await db.products.create_index([("created_by_simple_admin_id", 1), ("status", 1)])
        print("✅ Added indexes to products collection for simple admin support")
        
        # Optional: Create a test simple admin (remove this in production)
        test_admin = await db.simple_admins.find_one({"email": "test@simpleadmin.com"})
        if not test_admin:
            hashed_password = pwd_context.hash("password123")
            test_simple_admin = {
                "name": "Test Simple Admin",
                "email": "test@simpleadmin.com",
                "password_hash": hashed_password,
                "is_active": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "last_login": None,
                "created_by_admin_id": None  # You can set this to a real admin ID
            }
            await db.simple_admins.insert_one(test_simple_admin)
            print("✅ Created test simple admin: test@simpleadmin.com / password123")
        
        print("\n🎉 MongoDB setup completed successfully!")
        print("\nCollections created:")
        print("- simple_admins (with email, is_active, created_at indexes)")
        print("- Enhanced products collection (with simple admin indexes)")
        
        print("\nYou can now:")
        print("1. Run your FastAPI server")
        print("2. Create simple admins via Super Admin panel")
        print("3. Login as simple admin to manage products")
        
    except Exception as e:
        print(f"❌ Error setting up MongoDB: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(setup_mongodb())