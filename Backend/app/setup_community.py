# =============== app/setup_community.py ===============
"""
Setup script for community forum initial data
"""

import asyncio
from datetime import datetime
from bson import ObjectId
from app.config.database import get_database, connect_to_mongo, close_mongo_connection

async def setup_community():
    """Setup initial community data"""
    # Initialize database connection
    await connect_to_mongo()
    db = await get_database()
    
    # Create collections
    categories_collection = db["community_categories"]
    posts_collection = db["community_posts"]
    replies_collection = db["community_replies"]
    likes_collection = db["community_likes"]
    views_collection = db["community_views"]
    
    # Create indexes
    print("Creating database indexes...")
    
    # Categories indexes
    await categories_collection.create_index("name", unique=True)
    await categories_collection.create_index("status")
    
    # Posts indexes
    await posts_collection.create_index("category_id")
    await posts_collection.create_index("user_id")
    await posts_collection.create_index("created_at")
    await posts_collection.create_index("likes")
    await posts_collection.create_index("views")
    await posts_collection.create_index("is_pinned")
    await posts_collection.create_index("status")
    
    # Full-text search index
    await posts_collection.create_index([
        ("title", "text"),
        ("content", "text"),
        ("tags", "text")
    ])
    
    # Replies indexes
    await replies_collection.create_index("post_id")
    await replies_collection.create_index("user_id")
    await replies_collection.create_index("created_at")
    
    # Likes indexes
    await likes_collection.create_index([
        ("content_type", 1),
        ("content_id", 1),
        ("user_id", 1)
    ], unique=True)
    
    # Views indexes
    await views_collection.create_index([
        ("post_id", 1),
        ("user_id", 1)
    ])
    
    print("✅ Database indexes created")
    
    # Create initial categories
    print("Creating initial categories...")
    
    categories = [
        {
            "name": "General Discussion",
            "description": "General topics about AI, chatbots, and technology",
            "color": "#3B82F6",
            "status": "active",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "Natural Language Processing",
            "description": "NLP techniques, models, and best practices",
            "color": "#10B981",
            "status": "active",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "Computer Vision",
            "description": "Computer vision, image processing, and visual AI",
            "color": "#8B5CF6",
            "status": "active",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "Machine Learning",
            "description": "Machine learning algorithms, training, and optimization",
            "color": "#F59E0B",
            "status": "active",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "Data Science",
            "description": "Data analysis, visualization, and insights",
            "color": "#EF4444",
            "status": "active",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "Chatbot Development",
            "description": "Building, deploying, and optimizing chatbots",
            "color": "#06B6D4",
            "status": "active",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "Product Reviews",
            "description": "Reviews and feedback about AI products and services",
            "color": "#84CC16",
            "status": "active",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "Tutorials & Guides",
            "description": "Step-by-step guides and tutorials",
            "color": "#EC4899",
            "status": "active",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]
    
    # Insert categories
    for category in categories:
        # Check if category already exists
        existing = await categories_collection.find_one({"name": category["name"]})
        if not existing:
            result = await categories_collection.insert_one(category)
            print(f"✅ Created category: {category['name']}")
        else:
            print(f"⏭️  Category already exists: {category['name']}")
    
    print("✅ Community setup completed!")
    
    # Close database connection
    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(setup_community())
