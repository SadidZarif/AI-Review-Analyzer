# ============ IMPORTS ============

# FastAPI হলো modern Python web framework
# এটা দিয়ে API endpoints তৈরি করব
from fastapi import FastAPI, HTTPException

# CORS (Cross-Origin Resource Sharing) middleware
# এটা দরকার কারণ frontend (React) আলাদা port এ চলবে
# CORS না থাকলে browser frontend থেকে API call block করবে
from fastapi.middleware.cors import CORSMiddleware

# Environment variables load করার জন্য
# .env file থেকে sensitive data (API tokens) load করবে
from dotenv import load_dotenv
import os

# .env file load করছি (যদি থাকে)
load_dotenv()

# আমাদের তৈরি করা schemas import করছি
# এগুলো request/response এর structure define করে
from schemas import (
    ReviewRequest, 
    ShopifyRequest,  # Shopify integration এর জন্য
    AnalysisResponse, 
    ReviewResult, 
    TopicInfo
)

# আমাদের তৈরি করা ML models import করছি
# analyzer = trained SentimentAnalyzer instance
# TopicExtractor = topic বের করার class
from models import analyzer, TopicExtractor

# Shopify integration
# এটা Shopify store থেকে reviews fetch করে
from integrations.shopify import (
    fetch_shopify_reviews,
    fetch_shopify_reviews_with_metadata,
    ShopifyAPIError,
    SUPPORTED_REVIEW_APPS
)


# ============ APP SETUP ============

# FastAPI app তৈরি করছি
# title, description, version = API documentation এ দেখাবে
app = FastAPI(
    title="AI Review Analyzer",
    description="Product reviews analyze করে sentiment ও topics বের করে",
    version="1.0.0"
)

# CORS middleware যোগ করছি
# এটা ছাড়া React frontend থেকে API call করতে পারবে না
app.add_middleware(
    CORSMiddleware,
    # allow_origins = কোন কোন website থেকে request আসতে পারবে
    # ["*"] মানে সব website থেকে আসতে পারবে (development এর জন্য ok)
    # Production এ specific domain দিতে হবে যেমন ["https://myapp.com"]
    allow_origins=["*"],
    # credentials (cookies, auth headers) allow করছি
    allow_credentials=True,
    # সব HTTP methods allow করছি (GET, POST, PUT, DELETE, etc.)
    allow_methods=["*"],
    # সব headers allow করছি
    allow_headers=["*"],
)


# ============ API ENDPOINTS ============

# ---------- Health Check Endpoint ----------
# এটা check করতে ব্যবহার হয় server চালু আছে কিনা
# GET request মানে শুধু data চাইছে, কিছু পাঠাচ্ছে না

@app.get("/health")
def health_check():
    """
    Server health check করার endpoint
    যদি response আসে, মানে server ঠিকমতো চলছে
    """
    return {
        "status": "healthy",
        "message": "AI Review Analyzer is running!"
    }


# ---------- Main Analysis Endpoint ----------
# এটাই মূল endpoint যেখানে reviews analyze হবে
# POST request মানে data পাঠাচ্ছে (reviews)

@app.post("/analyze-reviews", response_model=AnalysisResponse)
def analyze_reviews(request: ReviewRequest):
    """
    Reviews analyze করে sentiment ও topics বের করে
    
    Input: ReviewRequest (reviews list + optional product_link)
    Output: AnalysisResponse (counts, percentages, topics, samples)
    """
    
    # ---------- Step 1: Input Validation ----------
    # Reviews list খালি কিনা check করছি
    if not request.reviews or len(request.reviews) == 0:
        # HTTPException = HTTP error response
        # status_code=400 মানে "Bad Request" (client এর ভুল)
        raise HTTPException(
            status_code=400,
            detail="Reviews list cannot be empty. Please provide at least one review."
        )
    
    # ---------- Step 2: Sentiment Prediction ----------
    # আমাদের trained model দিয়ে sentiment predict করছি
    # predictions = list of dicts with text, sentiment, confidence
    predictions = analyzer.predict(request.reviews)
    
    # ---------- Step 3: Get Summary Statistics ----------
    # Total, positive count, negative count, percentages বের করছি
    summary = analyzer.get_prediction_summary(predictions)
    
    # ---------- Step 4: Extract Topics ----------
    # Positive ও negative topics আলাদা করে বের করছি
    
    # প্রথমে সব sentiments এর list বানাচ্ছি
    sentiments = [p["sentiment"] for p in predictions]
    
    # TopicExtractor দিয়ে topics বের করছি
    # top_k=5 মানে top 5 টা topics প্রতিটা category তে
    positive_topics, negative_topics = TopicExtractor.extract_topics(
        reviews=request.reviews,
        sentiments=sentiments,
        top_k=5
    )
    
    # ---------- Step 5: Prepare Sample Reviews ----------
    # কিছু sample reviews response এ দেব
    # সব না, প্রথম 10 টা (বা যতগুলো আছে)
    sample_reviews = [
        ReviewResult(
            text=p["text"],
            sentiment=p["sentiment"],
            confidence=p["confidence"]
        )
        for p in predictions[:10]  # প্রথম 10 টা নিচ্ছি
    ]
    
    # ---------- Step 6: Build Response ----------
    # AnalysisResponse schema অনুযায়ী response তৈরি করছি
    response = AnalysisResponse(
        total_reviews=summary["total"],
        positive_count=summary["positive_count"],
        negative_count=summary["negative_count"],
        positive_percentage=summary["positive_percentage"],
        negative_percentage=summary["negative_percentage"],
        top_positive_topics=[
            TopicInfo(
                topic=t["topic"],
                count=t["count"],
                sentiment=t["sentiment"]
            )
            for t in positive_topics
        ],
        top_negative_topics=[
            TopicInfo(
                topic=t["topic"],
                count=t["count"],
                sentiment=t["sentiment"]
            )
            for t in negative_topics
        ],
        sample_reviews=sample_reviews
    )
    
    return response


# ---------- Shopify Integration Endpoint ----------
# Shopify store থেকে reviews fetch করে analyze করে

@app.post("/analyze/shopify", response_model=AnalysisResponse)
async def analyze_shopify_reviews(request: ShopifyRequest):
    """
    Shopify store থেকে reviews fetch করে sentiment analysis করে।
    
    Input: ShopifyRequest (store_domain, access_token, optional review_app details)
    Output: AnalysisResponse (same as /analyze-reviews)
    
    IMPORTANT NOTES:
    ----------------
    1. Shopify Admin API তে native reviews API নেই।
    2. Reviews সাধারণত third-party apps (Judge.me, Loox) দিয়ে manage হয়।
    3. যদি review_app এবং review_app_token দাও, সেই app এর API ব্যবহার করবে।
    4. না দিলে product metafields থেকে reviews খোঁজার চেষ্টা করবে।
    5. কিছু না পেলে demo reviews generate করবে (development এর জন্য)।
    
    Shopify Access Token পেতে:
    1. Shopify Admin > Settings > Apps and sales channels
    2. Develop apps > Create an app
    3. Configure Admin API scopes: read_products, read_content
    4. Install app and copy the Admin API access token
    """
    
    # ---------- Step 1: Validate Store Domain ----------
    if not request.store_domain or not request.store_domain.strip():
        raise HTTPException(
            status_code=400,
            detail="store_domain is required. Example: 'mystore.myshopify.com'"
        )
    
    # ---------- Step 2: Validate Access Token ----------
    if not request.access_token or not request.access_token.strip():
        raise HTTPException(
            status_code=400,
            detail="access_token is required. Get it from Shopify Admin > Apps > Develop apps"
        )
    
    # ---------- Step 2.5: Handle Judge.me API Token ----------
    # যদি review_app_token না দেওয়া হয় কিন্তু Judge.me app use করা হচ্ছে,
    # তাহলে environment variable থেকে token load করব
    review_app_token = request.review_app_token
    
    if (request.review_app and 
        (request.review_app.lower() == "judge_me" or request.review_app.lower() == "judge.me") and
        not review_app_token):
        # Environment variable থেকে Judge.me token load করছি
        env_token = os.getenv("JUDGE_ME_API_TOKEN")
        if env_token:
            review_app_token = env_token
            print("Using Judge.me API token from environment variable")
        else:
            raise HTTPException(
                status_code=400,
                detail="Judge.me API token is required. Either provide 'review_app_token' in request or set JUDGE_ME_API_TOKEN environment variable."
            )
    
    # ---------- Step 3: Fetch Reviews from Shopify ----------
    # Judge.me ব্যবহার করলে full metadata সহ reviews fetch করব
    try:
        if review_app_token and (request.review_app and (request.review_app.lower() == "judge_me" or request.review_app.lower() == "judge.me")):
            # Full metadata সহ reviews fetch করছি
            reviews_with_metadata = await fetch_shopify_reviews_with_metadata(
                store_domain=request.store_domain,
                access_token=request.access_token,
                limit=request.limit or 500,
                review_app=request.review_app,
                review_app_token=review_app_token
            )
            
            # Reviews text extract করছি analysis এর জন্য
            reviews = [r.get("body", "") for r in reviews_with_metadata if r.get("body")]
            review_metadata = reviews_with_metadata  # Metadata store করছি
        else:
            # Normal fetch (text only)
            reviews = await fetch_shopify_reviews(
                store_domain=request.store_domain,
                access_token=request.access_token,
                limit=request.limit or 500,
                review_app=request.review_app,
                review_app_token=review_app_token
            )
            review_metadata = None
    except ShopifyAPIError as e:
        # Shopify API error - authentication বা connection issue
        # Judge.me API error হলে specific message দেখাবে
        error_message = e.message
        if request.review_app and "judge.me" in error_message.lower():
            error_message = f"Judge.me API error: {e.message}. Please verify your Judge.me API token and shop domain."
        
        raise HTTPException(
            status_code=e.status_code or 500,
            detail=error_message
        )
    except ValueError as e:
        # Validation error
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except Exception as e:
        # Unexpected error
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch reviews: {str(e)}"
        )
    
    # ---------- Step 4: Check if we got any reviews ----------
    if not reviews or len(reviews) == 0:
        raise HTTPException(
            status_code=404,
            detail="No reviews found in this Shopify store. Make sure you have a review app installed (Judge.me, Loox, etc.) or reviews stored in product metafields."
        )
    
    # ---------- Step 5: Run Sentiment Analysis ----------
    # এখন থেকে /analyze-reviews এর মতোই logic
    predictions = analyzer.predict(reviews)
    summary = analyzer.get_prediction_summary(predictions)
    
    # ---------- Step 6: Extract Topics ----------
    sentiments = [p["sentiment"] for p in predictions]
    positive_topics, negative_topics = TopicExtractor.extract_topics(
        reviews=reviews,
        sentiments=sentiments,
        top_k=5
    )
    
    # ---------- Step 7: Prepare Sample Reviews ----------
    # Full metadata সহ reviews prepare করছি
    sample_reviews = []
    for i, p in enumerate(predictions[:10]):
        review_result = ReviewResult(
            text=p["text"],
            sentiment=p["sentiment"],
            confidence=p["confidence"]
        )
        
        # যদি metadata থাকে, তাহলে add করছি
        if review_metadata and i < len(review_metadata):
            meta = review_metadata[i]
            review_result.reviewer_name = meta.get("reviewer_name")
            review_result.review_date = meta.get("created_at")
            review_result.product_name = meta.get("product_title")
            review_result.product_id = meta.get("product_id")
            review_result.rating = meta.get("rating")
        
        sample_reviews.append(review_result)
    
    # ---------- Step 8: Build Response ----------
    response = AnalysisResponse(
        total_reviews=summary["total"],
        positive_count=summary["positive_count"],
        negative_count=summary["negative_count"],
        positive_percentage=summary["positive_percentage"],
        negative_percentage=summary["negative_percentage"],
        top_positive_topics=[
            TopicInfo(
                topic=t["topic"],
                count=t["count"],
                sentiment=t["sentiment"]
            )
            for t in positive_topics
        ],
        top_negative_topics=[
            TopicInfo(
                topic=t["topic"],
                count=t["count"],
                sentiment=t["sentiment"]
            )
            for t in negative_topics
        ],
        sample_reviews=sample_reviews
    )
    
    return response


# ---------- Shopify Info Endpoint ----------
# Supported review apps এর তথ্য দেয়

@app.get("/shopify/supported-apps")
def get_supported_review_apps():
    """
    Supported third-party review apps এর list
    এদের API integration available আছে
    """
    return {
        "message": "Shopify native API তে reviews endpoint নেই। নিচের apps এর মধ্যে একটা ব্যবহার করো:",
        "supported_apps": SUPPORTED_REVIEW_APPS,
        "recommendation": "Judge.me সবচেয়ে popular এবং free tier আছে।",
        "note": "review_app এবং review_app_token দিলে সেই app এর API ব্যবহার করবে।"
    }


# ---------- Root Endpoint ----------
# Base URL এ গেলে কী দেখাবে

@app.get("/")
def root():
    """
    API এর welcome message
    """
    return {
        "message": "Welcome to AI Review Analyzer API!",
        "docs": "/docs",  # Swagger UI এর link
        "health": "/health",
        "endpoints": {
            "manual_analysis": "POST /analyze-reviews",
            "shopify_integration": "POST /analyze/shopify",
            "supported_apps": "GET /shopify/supported-apps"
        }
    }


# ============ RUN SERVER ============
# এই part টা শুধু তখনই চলে যখন directly python main.py করা হয়
# uvicorn দিয়ে চালালে এটা skip হয়

if __name__ == "__main__":
    # uvicorn হলো ASGI server যেটা FastAPI app চালায়
    import uvicorn
    
    # Server start করছি
    # host="0.0.0.0" মানে সব network interface এ listen করবে
    # port=8000 মানে 8000 port এ চলবে
    # reload=True মানে code change করলে auto restart হবে
    uvicorn.run(
        "main:app",  # main.py এর app object
        host="0.0.0.0",
        port=8000,
        reload=True
    ) 



