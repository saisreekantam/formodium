import random
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict
from datetime import datetime
import numpy as np
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.neighbors import NearestNeighbors
from scipy.sparse import hstack
import pandas as pd
import json
import hashlib
from langchain import HuggingFacePipeline
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
import torch

# Initialize model and tokenizer
model_name = "facebook/opt-350m"  # You can use a larger model if needed
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(model_name, device_map="auto")

# Create pipeline for text generation
text_generator = pipeline(
    "text-generation",
    model=model,
    tokenizer=tokenizer,
    max_length=200,
    temperature=0.7,
    top_p=0.9,
    repetition_penalty=1.2,
    do_sample=True
)

# Create LangChain model
#llm = HuggingFacePipeline(pipeline=pipe)

# Add these to your existing FastAPI app
from pydantic import BaseModel

class ChatMessage(BaseModel):
    message: str
# Keep your existing database configuration
DATABASE_URL = "sqlite:///./gift_recommendation.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Add User model to your existing models
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    has_completed_survey = Column(Boolean, default=False)



# Add authentication models
class UserCreate(BaseModel):
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    email: str
    has_completed_survey: bool

# Authentication helper functions
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_user(db: Session, email: str, password: str):
    user = db.query(User).filter(User.email == email).first()
    if not user or user.password_hash != hash_password(password):
        return None
    return user


# Modified init_db function to create users table


# FastAPI app setup
app = FastAPI(title="Gift Recommendation API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Authentication endpoints


# Modified existing endpoints to check authentication
def get_current_user(db: Session = Depends(get_db), email: str = None):
    if not email:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# Database Models
class Gift(Base):
    __tablename__ = "gifts"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    description = Column(String)
    price = Column(Float)
    category = Column(String)
    attributes = Column(JSON)

class SurveyResponse(Base):
    __tablename__ = "survey_responses"
    id = Column(Integer, primary_key=True, index=True)
    responses = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    recommendation_made = Column(String)

# Pydantic Models
class GiftBase(BaseModel):
    name: str
    description: str
    price: float
    category: str
    attributes: Optional[Dict] = None

class GiftCreate(GiftBase):
    pass

class GiftResponse(GiftBase):
    id: int
    score: Optional[float] = None

    class Config:
        orm_mode = True

class SurveyRequest(BaseModel):
    responses: dict

class ShippingDetails(BaseModel):
    full_name: str
    address_line1: str
    city: str
    state: str
    zip_code: str

# ML Recommender Class
class GiftRecommender:
    def __init__(self):
        self.scaler = StandardScaler()
        self.encoder = OneHotEncoder(sparse_output=True, handle_unknown='ignore')
        self.nn_model = NearestNeighbors(n_neighbors=10, metric='cosine')
        self.is_fitted = False

    def _extract_features(self, gift):
        """Extract features from a gift object"""
        features = {
            'price': gift.price,
            'category': gift.category
        }
        if gift.attributes:
            # Extract relevant attributes
            attrs = gift.attributes if isinstance(gift.attributes, dict) else json.loads(gift.attributes)
            features.update({
                'target_age': attrs.get('target_age', 'Any'),
                'style': attrs.get('style', 'Any'),
                'occasion': attrs.get('occasion', 'Any'),
                'popularity': float(attrs.get('popularity', 50))
            })
        return features

    def fit(self, gifts: List[Gift]):
        """Fit the recommender model with gift data"""
        if not gifts:
            return

        # Extract features from all gifts
        gift_features = [self._extract_features(gift) for gift in gifts]
        self.feature_df = pd.DataFrame(gift_features)

        # Separate numerical and categorical features
        self.num_features = ['price', 'popularity']
        self.cat_features = ['category', 'target_age', 'style', 'occasion']

        # Ensure all numerical features exist
        for feat in self.num_features:
            if feat not in self.feature_df.columns:
                self.feature_df[feat] = 0

        # Ensure all categorical features exist
        for feat in self.cat_features:
            if feat not in self.feature_df.columns:
                self.feature_df[feat] = 'Unknown'

        # Fit numerical scaler
        self.scaler.fit(self.feature_df[self.num_features])

        # Fit categorical encoder
        self.encoder.fit(self.feature_df[self.cat_features])

        # Transform features
        num_scaled = self.scaler.transform(self.feature_df[self.num_features])
        cat_encoded = self.encoder.transform(self.feature_df[self.cat_features])

        # Combine features
        self.features = hstack([cat_encoded, num_scaled])

        # Fit nearest neighbors model
        self.nn_model.fit(self.features)
        self.is_fitted = True
        self.gifts = gifts

    def _process_survey(self, responses: dict) -> np.ndarray:
        """Convert survey responses to feature vector"""
        # Create a dataframe with one row
        survey_features = pd.DataFrame([{
            'price': float(responses.get('budget', 100)),
            'popularity': 50,  # Default popularity
            'category': responses.get('interests', 'Any'),
            'target_age': responses.get('age_group', 'Any'),
            'style': responses.get('style', 'Any'),
            'occasion': responses.get('occasion', 'Any')
        }])

        # Transform features
        num_scaled = self.scaler.transform(survey_features[self.num_features])
        cat_encoded = self.encoder.transform(survey_features[self.cat_features])

        return hstack([cat_encoded, num_scaled])

    def recommend(self, survey_responses: dict, n_recommendations: int = 10) -> List[dict]:
        """Get gift recommendations based on survey responses"""
        if not self.is_fitted:
            return []

        # Process survey into feature vector
        user_features = self._process_survey(survey_responses)

        # Get nearest neighbors
        distances, indices = self.nn_model.kneighbors(user_features, n_neighbors=min(n_recommendations, len(self.gifts)))

        # Prepare recommendations
        recommendations = []
        for idx, distance in zip(indices[0], distances[0]):
            gift = self.gifts[idx]
            score = 1 - distance  # Convert distance to similarity score
            
            # Create recommendation with all necessary fields
            rec = {
                'id': gift.id,
                'name': gift.name,
                'description': gift.description,
                'price': gift.price,
                'category': gift.category,
                'attributes': gift.attributes,
                'score': float(score)
            }
            recommendations.append(rec)

        return sorted(recommendations, key=lambda x: x['score'], reverse=True)

# Sample Gifts Data
SAMPLE_GIFTS = [
    {
        "name": "Smart Watch Pro",
        "description": "Advanced fitness tracking and notifications",
        "price": 199.99,
        "category": "Technology",
        "attributes": {
            "target_age": "Adult",
            "style": "Modern",
            "occasion": "Any",
            "tags": ["tech", "fitness", "gadgets"],
            "popularity": 85
        }
    },
    {
        "name": "Premium Leather Wallet",
        "description": "Handcrafted genuine leather wallet with RFID protection",
        "price": 49.99,
        "category": "Accessories",
        "attributes": {
            "target_age": "Adult",
            "style": "Classic",
            "occasion": "Any",
            "tags": ["fashion", "accessories"],
            "popularity": 75
        }
    },
    {
        "name": "Gourmet Cookbook Collection",
        "description": "Set of international cuisine cookbooks",
        "price": 79.99,
        "category": "Books",
        "attributes": {
            "target_age": "Adult",
            "style": "Traditional",
            "occasion": "Any",
            "tags": ["cooking", "books", "culinary"],
            "popularity": 70
        }
    },
    {
        "name": "Professional Art Set",
        "description": "Complete art supplies kit with premium materials",
        "price": 129.99,
        "category": "Arts & Crafts",
        "attributes": {
            "target_age": "Any",
            "style": "Creative",
            "occasion": "Any",
            "tags": ["art", "creative", "supplies"],
            "popularity": 80
        }
    },
    {
        "name": "Wireless Earbuds",
        "description": "High-quality wireless earbuds with noise cancellation",
        "price": 159.99,
        "category": "Technology",
        "attributes": {
            "target_age": "Any",
            "style": "Modern",
            "occasion": "Any",
            "tags": ["tech", "music", "audio"],
            "popularity": 90
        }
    }
]

# Initialize recommender
recommender = GiftRecommender()

# Database initialization

def init_db():
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    existing_gifts = db.query(Gift).first()
    
    if not existing_gifts:
        for gift_data in SAMPLE_GIFTS:
            gift = Gift(**gift_data)
            db.add(gift)
        db.commit()
        
        gifts = db.query(Gift).all()
        recommender.fit(gifts)
    
    db.close()

# Initialize database
init_db()

# FastAPI app initialization
app = FastAPI(title="Gift Recommendation API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# API Endpoints
@app.get("/gifts", response_model=List[GiftResponse])
def get_gifts(db: Session = Depends(get_db)):
    return db.query(Gift).all()
@app.post("/auth/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = hash_password(user.password)
    db_user = User(email=user.email, password_hash=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return {"email": db_user.email, "has_completed_survey": db_user.has_completed_survey}

@app.post("/auth/login", response_model=UserResponse)
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = verify_user(db, user.email, user.password)
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    return {"email": db_user.email, "has_completed_survey": db_user.has_completed_survey}
@app.post("/survey", response_model=List[GiftResponse])
async def submit_survey(survey: SurveyRequest, db: Session = Depends(get_db)):
    try:
        # Log the incoming survey data
        print("Received survey responses:", survey.responses)
        
        # Get all gifts and log the count
        gifts = db.query(Gift).all()
        print(f"Found {len(gifts)} gifts in database")
        
        if not recommender.is_fitted:
            print("Fitting recommender with gifts")
            recommender.fit(gifts)
        
        # Get recommendations with error handling
        try:
            recommendations = recommender.recommend(survey.responses)
            print(f"Generated {len(recommendations)} recommendations")
        except Exception as rec_error:
            print(f"Error in recommender: {str(rec_error)}")
            print(f"Survey responses type: {type(survey.responses)}")
            print(f"Survey responses content: {survey.responses}")
            raise HTTPException(status_code=500, detail=f"Recommendation error: {str(rec_error)}")
        
        # Log recommendations
        print("Recommendations:", recommendations)
        
        # Store survey response
        survey_response = SurveyResponse(
            responses=survey.responses,
            recommendation_made=",".join(str(rec.get('id', '')) for rec in recommendations[:3])
        )
        db.add(survey_response)
        db.commit()
        
        return [GiftResponse(**rec) for rec in recommendations[:3]]
        
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        print("Traceback:", traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/shipping")
def process_shipping(shipping: ShippingDetails):
    return {
        "message": "Order processed successfully",
        "shipping_id": f"SHIP{datetime.now().strftime('%Y%m%d%H%M')}",
        "estimated_delivery": datetime.now().strftime("%Y-%m-%d")
    }

@app.post("/admin/gifts", response_model=GiftResponse)
def create_gift(gift: GiftCreate, db: Session = Depends(get_db)):
    try:
        db_gift = Gift(**gift.dict())
        db.add(db_gift)
        db.commit()
        db.refresh(db_gift)
        
        # Update recommender with new gift data
        gifts = db.query(Gift).all()
        recommender.fit(gifts)
        
        return db_gift
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# Add this new helper function
def get_gift_recommendations(category: str) -> list:
    """Get gift recommendations for a specific category from the database"""
    db = SessionLocal()
    try:
        gifts = db.query(Gift).filter(Gift.category == category).all()
        return [{"name": gift.name, "price": gift.price} for gift in gifts]
    finally:
        db.close()

# Add this new endpoint to your existing FastAPI app
def get_gifts_by_category_and_style(db: Session, category: Optional[str] = None, style: Optional[str] = None) -> List[Gift]:
    """Get gifts from database based on category and/or style"""
    query = db.query(Gift)
    
    if category:
        query = query.filter(Gift.category.ilike(f'%{category}%'))
    if style and isinstance(style, str):
        # Check the style in the attributes JSON field
        query = query.filter(Gift.attributes.contains({'style': style}))
    
    return query.all()

def get_gift_suggestions(db: Session, user_message: str) -> dict:
    """Extract categories and styles from user message and get relevant gifts"""
    # Define categories and their keywords
    categories = {
        "technology": ["tech", "gadget", "electronic", "digital", "laptop", "computer", "smartphone", "phone", "tablet", "watch"],
        "fashion": ["clothing", "fashion", "wear", "accessory", "traditional", "dress", "shoes"],
        "books": ["book", "read", "novel", "literature", "cookbook"],
        "art": ["art", "craft", "creative", "painting"],
        "music": ["music", "audio", "sound", "headphone", "speaker"],
        "gaming": ["game", "gaming", "console", "playstation", "xbox"],
        "food": ["food", "cooking", "kitchen", "gourmet"],
        "wellness": ["health", "fitness", "wellness", "exercise"]
    }
    
    # Find matching gifts from SAMPLE_GIFTS
    matching_gifts = []
    user_message = user_message.lower()
    
    for gift in SAMPLE_GIFTS:
        # Check category match
        if gift["category"].lower() in user_message:
            matching_gifts.append(gift)
            continue
            
        # Check if any category keywords match
        if any(keyword in user_message for keyword in categories.get(gift["category"].lower(), [])):
            matching_gifts.append(gift)
            continue
            
        # Check tags match
        if gift["attributes"].get("tags"):
            if any(tag.lower() in user_message for tag in gift["attributes"]["tags"]):
                matching_gifts.append(gift)
                continue
                
        # Check style match
        if gift["attributes"].get("style", "").lower() in user_message:
            matching_gifts.append(gift)
    
    # If no matches found, return a helpful response
    if not matching_gifts:
        return {
            "response": "I apologize, but I don't have any exact matches for that in our current inventory. Here are some available items that might interest you:",
            "recommendations": SAMPLE_GIFTS[:3]  # Return top 3 available items
        }
    
    # Format response based on matches
    if any("tech" in gift["attributes"].get("tags", []) for gift in matching_gifts):
        response = "Here are some technology gifts that might interest you:"
    else:
        category_counts = {}
        for gift in matching_gifts:
            category_counts[gift["category"]] = category_counts.get(gift["category"], 0) + 1
        main_category = max(category_counts.items(), key=lambda x: x[1])[0]
        response = f"I found some great {main_category.lower()} items that might interest you:"
    
    return {
        "response": response,
        "recommendations": matching_gifts[:3]  # Return top 3 matches
    }


# Modified chatbot endpoint
@app.post("/chatbot")
async def chat(message: ChatMessage, db: Session = Depends(get_db)):
    try:
        user_message = message.message.lower()
        
        # Check if user is asking for specific types of gifts or products
        gift_keywords = ["gift", "recommend", "suggestion", "looking", "find", "search", "want", "need", "buy"]
        
        # Check if the message is gift-related or contains product keywords
        is_gift_query = any(word in user_message for word in gift_keywords)
        has_product_mention = any(gift["category"].lower() in user_message.lower() for gift in SAMPLE_GIFTS)
        has_tag_mention = any(
            tag.lower() in user_message.lower() 
            for gift in SAMPLE_GIFTS 
            for tag in gift["attributes"].get("tags", [])
        )
        
        if is_gift_query or has_product_mention or has_tag_mention:
            result = get_gift_suggestions(db, user_message)
            
            # Format the response with recommendations
            response_text = result["response"] + "\n\n"
            if result["recommendations"]:
                for i, rec in enumerate(result["recommendations"], 1):
                    response_text += (
                        f"{i}. {rec['name']} - ${rec['price']}\n"
                        f"   Description: {rec['description']}\n"
                        f"   Category: {rec['category']}\n\n"
                    )
            
            return {"response": response_text.strip()}
        
        # For non-gift queries, use the text generation pipeline
        context = f"""You are a helpful AI gift assistant. Based on our current inventory, we have:
        - Technology items like smart watches and wireless earbuds
        - Fashion accessories like leather wallets
        - Books including cookbooks
        - Art supplies and creative items
        Keep responses friendly and focused on available items.

        Human: {user_message}
        Assistant:"""
        
        generated = text_generator(
            context,
            max_length=200,
            num_return_sequences=1,
            do_sample=True,
            temperature=0.7,
            top_p=0.9,
            repetition_penalty=1.2
        )[0]['generated_text']
        
        assistant_response = generated.split("Assistant:")[-1].strip()
        
        # Improved fallback responses that reference actual inventory
        if len(assistant_response) < 20:
            if "hello" in user_message or "hi" in user_message:
                return {
                    "response": "Hello! I'm your gift assistant. I can help you find the perfect gift from our selection of smart watches, wireless earbuds, premium wallets, cookbooks, and art supplies. What are you looking for?"
                }
            elif "thank" in user_message:
                return {
                    "response": "You're welcome! Feel free to ask about any of our items - we have some great tech gadgets, fashion accessories, and more!"
                }
            else:
                return {
                    "response": "I can help you find the perfect gift! We have smart watches, wireless earbuds, premium wallets, cookbooks, and art supplies. What interests you?"
                }
        
        return {"response": assistant_response}
            
    except Exception as e:
        print(f"Error in chatbot: {str(e)}")
        return {
            "response": "I apologize, but I'm having trouble processing your request. Could you please try asking in a different way?"
        }
# Add these helper endpoints if you want to expand chatbot functionality
@app.get("/categories")
async def get_categories(db: Session = Depends(get_db)):
    """Get all available gift categories"""
    try:
        categories = db.query(Gift.category).distinct().all()
        return {"categories": [cat[0] for cat in categories]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/gifts/{category}")
async def get_gifts_by_category(category: str, db: Session = Depends(get_db)):
    """Get gifts for a specific category"""
    try:
        gifts = db.query(Gift).filter(Gift.category == category).all()
        return [GiftResponse.from_orm(gift) for gift in gifts]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
