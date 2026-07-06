import os
import logging
from typing import List, Optional
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("auramarket-backend")

app = FastAPI(
    title="AuraMarket API Backend",
    description="Python FastAPI backend serving product catalog and order processing backed by MongoDB",
    version="1.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB Configuration
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://root:example@mongodb:27017/auramarket?authSource=admin")
client = None
db = None

@app.on_event("startup")
async def startup_db_client():
    global client, db
    try:
        logger.info(f"Connecting to MongoDB at: {MONGODB_URI.split('@')[-1]}")  # Hide credentials in log
        client = AsyncIOMotorClient(MONGODB_URI)
        # Verify connection
        await client.admin.command('ping')
        db = client.get_default_database()
        logger.info("Successfully connected to MongoDB!")
        
        # Auto-seed products if the database is empty
        await seed_products_if_empty()
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    if client:
        client.close()
        logger.info("MongoDB connection closed.")

# Pydantic Schemas
class ProductSchema(BaseModel):
    name: str
    price: float
    description: str
    image: str
    category: str
    stock: int
    rating: Optional[float] = 4.5
    featured: Optional[bool] = False

class ProductResponse(ProductSchema):
    id: str

class OrderItem(BaseModel):
    productId: str
    name: str
    price: float
    quantity: int
    image: str

class OrderSchema(BaseModel):
    customerName: str
    customerEmail: str
    shippingAddress: str
    items: List[OrderItem]
    totalAmount: float
    status: Optional[str] = "Pending"

class OrderResponse(OrderSchema):
    id: str

# Helper to convert MongoDB document to response dict
def doc_to_dict(doc, id_field="id") -> dict:
    if not doc:
        return {}
    doc[id_field] = str(doc["_id"])
    del doc["_id"]
    return doc

# Seeding Logic
SEED_PRODUCTS = [
    {
        "name": "Chronos Gold Chronograph",
        "price": 299.99,
        "description": "Exquisite golden watch with chronograph sub-dials, sapphire crystal face, and genuine leather strap. Designed for those who value timeless precision.",
        "image": "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&q=80&w=600",
        "category": "Accessories",
        "stock": 15,
        "rating": 4.8,
        "featured": True
    },
    {
        "name": "Acoustic Pro Headphones",
        "price": 189.99,
        "description": "High-fidelity over-ear headphones with active hybrid noise cancellation, 40-hour battery life, and spatial audio support.",
        "image": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=600",
        "category": "Electronics",
        "stock": 25,
        "rating": 4.7,
        "featured": True
    },
    {
        "name": "Suede Nomad Jacket",
        "price": 149.99,
        "description": "Premium cognac suede utility jacket with weather-resistant lining, reinforced brass hardware, and dual interior utility pockets.",
        "image": "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=80&w=600",
        "category": "Apparel",
        "stock": 10,
        "rating": 4.6,
        "featured": False
    },
    {
        "name": "Minimalist Leather Pack",
        "price": 120.00,
        "description": "Waterproof full-grain leather backpack featuring a padded 16-inch laptop sleeve, hidden passport compartment, and luggage strap.",
        "image": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=600",
        "category": "Accessories",
        "stock": 18,
        "rating": 4.9,
        "featured": True
    },
    {
        "name": "Lumina Ceramic Diffuser",
        "price": 45.00,
        "description": "Elegant hand-crafted matte ceramic essential oil ultrasonic diffuser with ambient warm LED light ring and automatic safety shut-off.",
        "image": "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&q=80&w=600",
        "category": "Lifestyle",
        "stock": 40,
        "rating": 4.5,
        "featured": False
    }
]

async def seed_products_if_empty():
    count = await db.products.count_documents({})
    if count == 0:
        logger.info("Products collection is empty. Seeding standard products into MongoDB...")
        await db.products.insert_many(SEED_PRODUCTS)
        logger.info("MongoDB catalog seeding completed successfully!")
    else:
        logger.info(f"MongoDB already has {count} products. Skipping seeding.")

# API Routes
@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "AuraMarket Python API Backend",
        "framework": "FastAPI",
        "database": "MongoDB"
    }

@app.get("/api/products", response_model=List[ProductResponse])
async def get_products(category: Optional[str] = None):
    query = {}
    if category:
        query["category"] = category
    
    cursor = db.products.find(query)
    products = []
    async for doc in cursor:
        products.append(doc_to_dict(doc))
    return products

@app.get("/api/products/{product_id}", response_model=ProductResponse)
async def get_product(product_id: str):
    if not ObjectId.is_valid(product_id):
        raise HTTPException(status_code=400, detail="Invalid product ID format")
    
    doc = await db.products.find_one({"_id": ObjectId(product_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")
    return doc_to_dict(doc)

@app.post("/api/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(product: ProductSchema):
    new_doc = product.dict()
    result = await db.products.insert_one(new_doc)
    new_doc["_id"] = result.inserted_id
    return doc_to_dict(new_doc)

@app.get("/api/orders", response_model=List[OrderResponse])
async def get_orders(email: Optional[str] = None):
    query = {}
    if email:
        query["customerEmail"] = email
        
    cursor = db.orders.find(query)
    orders = []
    async for doc in cursor:
        orders.append(doc_to_dict(doc))
    return orders

@app.post("/api/orders", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(order: OrderSchema):
    new_doc = order.dict()
    
    # Process stock adjustment (optional sanity check)
    for item in order.items:
        if ObjectId.is_valid(item.productId):
            product = await db.products.find_one({"_id": ObjectId(item.productId)})
            if product:
                current_stock = product.get("stock", 0)
                new_stock = max(0, current_stock - item.quantity)
                await db.products.update_one(
                    {"_id": ObjectId(item.productId)},
                    {"$set": {"stock": new_stock}}
                )
                
    result = await db.orders.insert_one(new_doc)
    new_doc["_id"] = result.inserted_id
    return doc_to_dict(new_doc)
