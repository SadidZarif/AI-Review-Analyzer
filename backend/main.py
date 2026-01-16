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
import re
from datetime import datetime

# .env file load করছি (যদি থাকে)
load_dotenv()

# আমাদের তৈরি করা schemas import করছি
# এগুলো request/response এর structure define করে
from schemas import (
    ReviewRequest, 
    ShopifyRequest,  # Shopify integration এর জন্য
    AnalysisResponse, 
    ReviewResult, 
    TopicInfo,
    ShopifyProductOut,
    JudgeMeReviewOut,
    ProductAnalyticsOut,
    GroqReplyRequest,
    GroqReplyResponse,
    GroqSummaryRequest,
    GroqSummaryResponse,
    GroqCampaignIdeaRequest,
    GroqCampaignIdeaResponse,
    AiChatRequest,
    AiChatResponse
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
    SUPPORTED_REVIEW_APPS,
    ShopifyClient
)

# Groq AI integration (LLM)
from groq_ai import groq_chat_completion, DEFAULT_MODEL, GroqError


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
    5. রিভিউ না পেলে এখন 404 error ফিরিয়ে দেয় (demo fallback নেই)।
    
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


# ---------- Shopify Products Endpoint ----------
# Shopify store এর products list return করবে (Products page এ ব্যবহার হবে)

@app.post("/shopify/products", response_model=list[ShopifyProductOut])
async def get_shopify_products(request: ShopifyRequest):
    """
    Shopify store এর products list fetch করে।
    
    Frontend Products page এ cards দেখানোর জন্য basic product info return করে।
    """
    if not request.store_domain or not request.store_domain.strip():
        raise HTTPException(status_code=400, detail="store_domain is required")
    if not request.access_token or not request.access_token.strip():
        raise HTTPException(status_code=400, detail="access_token is required")

    try:
        client = ShopifyClient(store_domain=request.store_domain, access_token=request.access_token)
        await client.verify_connection()
        products = await client.get_products(limit=min(request.limit or 250, 250))

        return [
            ShopifyProductOut(
                id=p.id,
                title=p.title,
                handle=p.handle,
                vendor=p.vendor,
                product_type=p.product_type,
                tags=p.tags,
                image_url=p.image_url
            )
            for p in products
        ]
    except ShopifyAPIError as e:
        raise HTTPException(status_code=e.status_code or 500, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch products: {str(e)}")


# ---------- Shopify Reviews (Judge.me) Endpoint ----------
# Full raw reviews list return করবে (Reviews page এ ব্যবহার হবে)

@app.post("/shopify/reviews", response_model=list[JudgeMeReviewOut])
async def get_shopify_reviews(request: ShopifyRequest):
    """
    Judge.me থেকে full reviews (metadata সহ) fetch করে return করে।
    
    NOTE: Judge.me API token backend এর .env থেকে auto load হবে (JUDGE_ME_API_TOKEN)।
    """
    if not request.store_domain or not request.store_domain.strip():
        raise HTTPException(status_code=400, detail="store_domain is required")
    if not request.access_token or not request.access_token.strip():
        raise HTTPException(status_code=400, detail="access_token is required")

    # Judge.me token resolve করছি
    review_app = request.review_app or "judge_me"
    review_app_token = request.review_app_token or os.getenv("JUDGE_ME_API_TOKEN")
    if not review_app_token:
        raise HTTPException(status_code=400, detail="JUDGE_ME_API_TOKEN not set in backend environment")

    try:
        reviews = await fetch_shopify_reviews_with_metadata(
            store_domain=request.store_domain,
            access_token=request.access_token,
            limit=request.limit or 500,
            review_app=review_app,
            review_app_token=review_app_token
        )
        return [
            JudgeMeReviewOut(
                id=r.get("id") or 0,
                body=r.get("body", ""),
                reviewer_name=r.get("reviewer_name"),
                created_at=r.get("created_at"),
                product_title=r.get("product_title"),
                product_id=r.get("product_id"),
                rating=r.get("rating")
            )
            for r in reviews
            if r.get("body")
        ]
    except ShopifyAPIError as e:
        raise HTTPException(status_code=e.status_code or 500, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch reviews: {str(e)}")


# ---------- Product Analytics Endpoint ----------
# Reviews থেকে per-product sentiment breakdown + rating compute করবে

@app.post("/shopify/products/analytics", response_model=list[ProductAnalyticsOut])
async def get_product_analytics(request: ShopifyRequest):
    """
    Judge.me reviews নিয়ে per-product analytics বানায়:
    - avg rating
    - positive/negative breakdown (sentiment model দিয়ে)
    - top topics (positive/negative)
    """
    if not request.store_domain or not request.store_domain.strip():
        raise HTTPException(status_code=400, detail="store_domain is required")
    if not request.access_token or not request.access_token.strip():
        raise HTTPException(status_code=400, detail="access_token is required")

    review_app = request.review_app or "judge_me"
    review_app_token = request.review_app_token or os.getenv("JUDGE_ME_API_TOKEN")
    if not review_app_token:
        raise HTTPException(status_code=400, detail="JUDGE_ME_API_TOKEN not set in backend environment")

    try:
        reviews = await fetch_shopify_reviews_with_metadata(
            store_domain=request.store_domain,
            access_token=request.access_token,
            limit=request.limit or 500,
            review_app=review_app,
            review_app_token=review_app_token
        )

        # Group reviews by product_id (fallback: product_title)
        grouped: dict[str, list[dict]] = {}
        for r in reviews:
            body = r.get("body", "")
            if not body:
                continue
            key = str(r.get("product_id") or r.get("product_title") or "unknown")
            grouped.setdefault(key, []).append(r)

        analytics: list[ProductAnalyticsOut] = []

        for _key, group in grouped.items():
            texts = [g.get("body", "") for g in group if g.get("body")]
            if not texts:
                continue

            # Sentiment predictions
            preds = analyzer.predict(texts)
            summary = analyzer.get_prediction_summary(preds)

            # Topics
            sentiments = [p["sentiment"] for p in preds]
            pos_topics, neg_topics = TopicExtractor.extract_topics(
                reviews=texts,
                sentiments=sentiments,
                top_k=3
            )

            # Ratings (Judge.me rating থাকলে average)
            ratings = [g.get("rating") for g in group if isinstance(g.get("rating"), int)]
            avg_rating = round(sum(ratings) / len(ratings), 2) if ratings else None

            first = group[0]
            analytics.append(ProductAnalyticsOut(
                product_id=first.get("product_id"),
                product_title=first.get("product_title") or "Unknown Product",
                review_count=len(texts),
                average_rating=avg_rating,
                positive_percentage=summary["positive_percentage"],
                negative_percentage=summary["negative_percentage"],
                positive_count=summary["positive_count"],
                negative_count=summary["negative_count"],
                top_positive_topics=[t["topic"] for t in pos_topics],
                top_negative_topics=[t["topic"] for t in neg_topics]
            ))

        # Sort: বেশি review যাদের, আগে
        analytics.sort(key=lambda a: a.review_count, reverse=True)
        return analytics
    except ShopifyAPIError as e:
        raise HTTPException(status_code=e.status_code or 500, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to build analytics: {str(e)}")


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


# ============ GROQ AI ENDPOINTS ============
# NOTE: Bengali comments রাখা হলো

@app.post("/ai/reply", response_model=GroqReplyResponse)
async def generate_ai_reply(request: GroqReplyRequest):
    """
    Review text থেকে Groq (llama-3.1-8b-instant) দিয়ে reply generate করে।
    """
    if not request.review_text or not request.review_text.strip():
        raise HTTPException(status_code=400, detail="review_text is required")

    tone = (request.tone or "empathetic").strip().lower()
    if tone not in ("empathetic", "formal", "short"):
        tone = "empathetic"

    # System prompt (brand-safe + helpful)
    system = (
        "You are a helpful customer support assistant for an e-commerce store. "
        "Write concise, professional, and human-sounding replies to customer reviews. "
        "Do not mention that you are an AI. Do not fabricate refunds or policies. "
        "If the review mentions an issue, apologize and suggest next steps."
    )

    # User prompt (context)
    name = request.customer_name or "Customer"
    product = request.product_name or "the product"
    store = request.store_name or "our store"

    style = {
        "empathetic": "Warm, empathetic, and solution-oriented. 4-8 sentences.",
        "formal": "Formal, professional tone. 4-8 sentences.",
        "short": "Short and direct. 2-4 sentences."
    }[tone]

    user = (
        f"Store: {store}\n"
        f"Customer name: {name}\n"
        f"Product: {product}\n"
        f"Tone: {style}\n\n"
        f"Customer review:\n{request.review_text}\n\n"
        + (f"Customer preference/instructions:\n{request.custom_instruction.strip()}\n\n"
           if request.custom_instruction and request.custom_instruction.strip() else "")
        + "Write the reply now."
    )

    try:
        reply = await groq_chat_completion(
            system_prompt=system,
            user_prompt=user,
            model=DEFAULT_MODEL,
            temperature=0.2,
            max_tokens=220,
            use_cache=True
        )
        return GroqReplyResponse(reply_text=reply, model="assistant")
    except GroqError as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ai/summary", response_model=GroqSummaryResponse)
async def generate_ai_summary(request: GroqSummaryRequest):
    """
    Dashboard/Analysis এর জন্য executive summary generate করে।
    """
    system = (
        "You are an analytics assistant for e-commerce review insights. "
        "Given statistics and topics, write a short executive summary and 3-5 action items. "
        "Be concrete and data-driven."
    )
    title = request.title or "Review Insights"
    dr = request.date_range or "selected range"
    user = (
        f"Title: {title}\n"
        f"Date range: {dr}\n"
        f"Total reviews: {request.total_reviews}\n"
        f"Positive %: {request.positive_percentage}\n"
        f"Negative %: {request.negative_percentage}\n"
        f"Top positive topics: {', '.join(request.top_positive_topics[:6])}\n"
        f"Top negative topics: {', '.join(request.top_negative_topics[:6])}\n"
        f"Sample reviews (may be empty):\n- " + "\n- ".join([s[:240] for s in request.sample_reviews[:6]]) + "\n\n"
        "Return output as:\n"
        "Summary: <one paragraph>\n"
        "Actions:\n"
        "- <action 1>\n"
        "- <action 2>\n"
        "- <action 3>\n"
    )
    try:
        text = await groq_chat_completion(
            system_prompt=system,
            user_prompt=user,
            model=DEFAULT_MODEL,
            temperature=0.3,
            max_tokens=350,
            use_cache=True
        )
        # Very simple parse
        summary = text
        actions: list[str] = []
        if "Actions:" in text:
            parts = text.split("Actions:", 1)
            summary = parts[0].replace("Summary:", "").strip()
            actions = [ln.strip("- ").strip() for ln in parts[1].splitlines() if ln.strip().startswith("-")]
        return GroqSummaryResponse(summary=summary, key_actions=actions[:6], model="assistant")
    except GroqError as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ai/campaign-idea", response_model=GroqCampaignIdeaResponse)
async def generate_ai_campaign(request: GroqCampaignIdeaRequest):
    """
    Campaigns page এর AI Opportunity text generate করে।
    """
    system = (
        "You are a marketing strategist for an e-commerce brand. "
        "Create a campaign idea based on review sentiment and topics. "
        "Return a short title and a 2-3 sentence description."
    )
    store = request.store_name or "the store"
    user = (
        f"Store: {store}\n"
        f"Total reviews: {request.total_reviews}\n"
        f"Positive %: {request.positive_percentage}\n"
        f"Negative %: {request.negative_percentage}\n"
        f"Top positive topic: {request.positive_topic or 'N/A'}\n"
        f"Top negative topic: {request.negative_topic or 'N/A'}\n\n"
        "Generate one campaign idea. Format:\n"
        "Title: ...\n"
        "Description: ...\n"
    )
    try:
        text = await groq_chat_completion(
            system_prompt=system,
            user_prompt=user,
            model=DEFAULT_MODEL,
            temperature=0.5,
            max_tokens=220,
            use_cache=True
        )
        title = "Campaign Idea"
        desc = text.strip()
        for line in text.splitlines():
            if line.lower().startswith("title:"):
                title = line.split(":", 1)[1].strip() or title
            if line.lower().startswith("description:"):
                desc = line.split(":", 1)[1].strip() or desc
        return GroqCampaignIdeaResponse(title=title, description=desc, model="assistant")
    except GroqError as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ai/chat", response_model=AiChatResponse)
async def ai_chat(request: AiChatRequest):
    """
    Enhanced AI chat with date range filtering, real review data, and all user intents.
    Supports: stats, breakdowns, topics, recommendations, reporting, export, screenshot guidance.
    """
    # Import chat_handler functions
    try:
        from chat_handler import (
            parse_date_range, filter_reviews_by_date, compute_stats_from_reviews,
            extract_topics_from_reviews, format_response_template,
            generate_screenshot_guidance, generate_export_guidance,
            build_evidence_quotes
        )
    except Exception as e:
        # If import fails, use simple fallback
        import traceback
        error_msg = f"Chat handler import error: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)  # Log for debugging
        
        # Return a simple response that still works
        analysis = request.analysis or {}
        total = int(analysis.get("total_reviews") or 0)
        pos_cnt = int(analysis.get("positive_count") or 0)
        neg_cnt = int(analysis.get("negative_count") or 0)
        return AiChatResponse(
            answer=f"Total reviews: {total}. Positive: {pos_cnt}, Negative: {neg_cnt}. (Note: Advanced features temporarily unavailable)",
            model="assistant"
        )
    
    q = (request.question or "").strip()
    if not q:
        raise HTTPException(status_code=400, detail="question is required")

    try:
        ql = q.lower()
        
        # Get raw reviews data (safe handling)
        # Prefer request.reviews; if too few, optionally fetch from Shopify/Judge.me directly
        raw_reviews = getattr(request, 'reviews', None) or []
        if not isinstance(raw_reviews, list):
            raw_reviews = []

        # Optional server-side fetch (avoids frontend cache/limit). Uses ShopifyRequest-like payload.
        shop = getattr(request, "shopify", None)
        try:
            shop_dict = shop.model_dump() if hasattr(shop, "model_dump") else (shop or None)
        except Exception:
            shop_dict = None

        if (not raw_reviews or len(raw_reviews) < 100) and isinstance(shop_dict, dict):
            try:
                review_app_token = shop_dict.get("review_app_token") or os.getenv("JUDGE_ME_API_TOKEN")
                fetched = await fetch_shopify_reviews_with_metadata(
                    store_domain=shop_dict.get("store_domain") or "",
                    access_token=shop_dict.get("access_token") or "",
                    limit=int(shop_dict.get("limit") or 10000),
                    review_app=shop_dict.get("review_app") or "judge_me",
                    review_app_token=review_app_token
                )
                if isinstance(fetched, list) and fetched:
                    raw_reviews = fetched
                    print(f"[AI Chat] Server-side fetched reviews: {len(raw_reviews)}")
            except Exception as e:
                print(f"[AI Chat] Server-side fetch failed: {e}")
        
        # Debug: Log how many reviews we received
        print(f"[AI Chat] Received {len(raw_reviews)} reviews from frontend")
        
        # Parse date range from question or use provided
        parsed_range = None
        try:
            parsed_range = parse_date_range(q)
            if parsed_range:
                print(f"[AI Chat] Parsed date range from question: {parsed_range}")
        except Exception as e:
            print(f"Date range parsing error: {e}")
        
        used_range = parsed_range or request.date_range
        if used_range:
            print(f"[AI Chat] Using date range: {used_range}")
        
        # If user asked for a long historical range but we have few reviews, try server-side fetch
        if isinstance(shop_dict, dict):
            try:
                wants_history = bool(re.search(r"\b20(2[0-9])\b|থেকে|theke|porjonto|পর্যন্ত", q, re.IGNORECASE))
            except Exception:
                wants_history = False

            try:
                span_days = None
                if isinstance(used_range, dict) and used_range.get("start") and used_range.get("end"):
                    d0 = datetime.strptime(str(used_range["start"]), "%Y-%m-%d")
                    d1 = datetime.strptime(str(used_range["end"]), "%Y-%m-%d")
                    span_days = abs((d1 - d0).days)
            except Exception:
                span_days = None

            if (wants_history or (span_days is not None and span_days > 90)) and len(raw_reviews) < 1000:
                try:
                    review_app_token = shop_dict.get("review_app_token") or os.getenv("JUDGE_ME_API_TOKEN")
                    fetched = await fetch_shopify_reviews_with_metadata(
                        store_domain=shop_dict.get("store_domain") or "",
                        access_token=shop_dict.get("access_token") or "",
                        limit=int(shop_dict.get("limit") or 10000),
                        review_app=shop_dict.get("review_app") or "judge_me",
                        review_app_token=review_app_token
                    )
                    if isinstance(fetched, list) and fetched and len(fetched) > len(raw_reviews):
                        raw_reviews = fetched
                        print(f"[AI Chat] Server-side fetched more reviews: {len(raw_reviews)}")
                except Exception as e:
                    print(f"[AI Chat] History fetch failed: {e}")

        # Filter reviews by date range and product
        filtered_reviews = raw_reviews
        try:
            if used_range and isinstance(used_range, dict):
                before_count = len(filtered_reviews)
                filtered_reviews = filter_reviews_by_date(filtered_reviews, used_range)
                after_count = len(filtered_reviews)
                print(f"[AI Chat] Filtered reviews: {before_count} -> {after_count} (date range: {used_range})")
        except Exception as e:
            print(f"Date filtering error: {e}")
            # Continue with unfiltered reviews
        
        if request.product_id:
            try:
                filtered_reviews = [r for r in filtered_reviews if r and str(r.get("product_id", "")) == str(request.product_id)]
            except Exception as e:
                print(f"Product filtering error: {e}")
        
        # Compute stats from filtered reviews (real data, no hallucination)
        try:
            stats = compute_stats_from_reviews(filtered_reviews)
        except Exception as e:
            print(f"Stats computation error: {e}")
            stats = {
                "total": 0,
                "positive_count": 0,
                "negative_count": 0,
                "neutral_count": 0,
                "positive_pct": 0.0,
                "negative_pct": 0.0,
                "neutral_pct": 0.0,
                "avg_rating": None,
            }
        
        # Extract topics
        try:
            negative_topics = extract_topics_from_reviews(filtered_reviews, "negative", 5)
            positive_topics = extract_topics_from_reviews(filtered_reviews, "positive", 5)
        except Exception as e:
            print(f"Topic extraction error: {e}")
            negative_topics = []
            positive_topics = []
        
        # Evidence quotes (grounded, max 3 quotes, max 12 words each)
        evidence_quotes = []
        try:
            evidence_quotes = build_evidence_quotes(q, filtered_reviews, max_quotes=3)
        except Exception as e:
            print(f"Evidence retrieval error: {e}")
            evidence_quotes = []

        # Handle specific user intents
        
        # 1) Screenshot/Report UI guidance
        if any(k in ql for k in ["screenshot", "ui generate", "report layout", "ki show korbo"]):
            topics_dict = {"negative": negative_topics, "positive": positive_topics}
            guidance = generate_screenshot_guidance(stats, topics_dict)
            return AiChatResponse(
                answer=guidance,
                model="assistant",
                suggested_actions=["Capture screenshot", "Share with team"],
                used_filters={"date_range": used_range, "product_id": request.product_id} if (used_range or request.product_id) else None
            )
        
        # 2) Export guidance
        if any(k in ql for k in ["export", "csv", "download", "export kivabe"]):
            guidance = generate_export_guidance()
            return AiChatResponse(
                answer=guidance,
                model="assistant",
                suggested_actions=["Click Export CSV", "Verify date range"],
                used_filters={"date_range": used_range} if used_range else None
            )
        
        # 3) Quick stats
        if any(k in ql for k in ["total", "koyta", "how many", "koto"]):
            if any(k in ql for k in ["negative", "neg", "kharap"]):
                answer = f"Negative reviews: {stats['negative_count']} ({stats['negative_pct']}%)."
                if negative_topics:
                    top_issue = negative_topics[0]
                    answer += f" Top issue: '{top_issue[0]}' ({top_issue[1]} mentions)."
                return AiChatResponse(
                    answer=answer,
                    model="assistant",
                    suggested_actions=["Check top negative topics", "Review product page"] if stats['total'] > 0 else None,
                    used_filters={"date_range": used_range} if used_range else None
                )
            
            if any(k in ql for k in ["positive", "pos", "valo", "bhalo"]):
                answer = f"Positive reviews: {stats['positive_count']} ({stats['positive_pct']}%)."
                if positive_topics:
                    top_praise = positive_topics[0]
                    answer += f" Top praise: '{top_praise[0]}' ({top_praise[1]} mentions)."
                return AiChatResponse(
                    answer=answer,
                    model="assistant",
                    suggested_actions=["Highlight in marketing", "Feature in product page"] if stats['total'] > 0 else None,
                    used_filters={"date_range": used_range} if used_range else None
                )
            
            if "neutral" in ql:
                return AiChatResponse(
                    answer=f"Neutral reviews: {stats['neutral_count']} ({stats['neutral_pct']}%).",
                    model="assistant",
                    used_filters={"date_range": used_range} if used_range else None
                )
            
            if any(k in ql for k in ["rating", "average", "avg"]):
                if stats['avg_rating']:
                    return AiChatResponse(
                        answer=f"Average rating: {stats['avg_rating']}/5.0 (from {len([r for r in filtered_reviews if r.get('rating')])} rated reviews).",
                        model="assistant",
                        used_filters={"date_range": used_range} if used_range else None
                    )
                else:
                    return AiChatResponse(
                        answer="Rating data not available. Reviews may not have ratings.",
                        model="assistant",
                        used_filters={"date_range": used_range} if used_range else None
                    )
            
            # Total reviews
            answer = format_response_template(
                key_numbers=[
                    f"Total reviews: {stats['total']}",
                    f"Positive: {stats['positive_count']} ({stats['positive_pct']}%)",
                    f"Neutral: {stats['neutral_count']} ({stats['neutral_pct']}%)",
                    f"Negative: {stats['negative_count']} ({stats['negative_pct']}%)"
                ],
                insight=f"In the selected range, {stats['positive_pct']}% are positive and {stats['negative_pct']}% are negative.",
                next_actions=["Check top negative topics to reduce returns", "Highlight positive feedback in marketing"]
            )
            return AiChatResponse(
                answer=answer,
                model="assistant",
                used_filters={"date_range": used_range} if used_range else None
            )
        
        # 4) Topics & Pain Points
        if any(k in ql for k in ["topic", "issue", "problem", "pain", "complaint", "praise"]):
            if any(k in ql for k in ["negative", "issue", "problem", "complaint", "kharap"]):
                if not negative_topics:
                    return AiChatResponse(
                        answer="No negative issues found in the selected range. Great news!",
                        model="assistant",
                        used_filters={"date_range": used_range} if used_range else None
                    )
                
                top_issues = negative_topics[:3]
                issue_list = [f"'{t[0]}' ({t[1]} mentions)" for t in top_issues]
                
                # Get example review for top issue
                evidence = []
                top_issue_keyword = top_issues[0][0]
                for r in filtered_reviews[:5]:
                    body = (r.get("body") or r.get("text") or "").lower()
                    if top_issue_keyword in body and len(evidence) < 2:
                        text = (r.get("body") or r.get("text") or "")[:60]
                        evidence.append(text)
                
                answer = format_response_template(
                    key_numbers=[f"Top negative issues: {', '.join(issue_list)}"],
                    insight=f"Most common issue is '{top_issues[0][0]}' with {top_issues[0][1]} mentions. Consider addressing this first.",
                    next_actions=[
                        f"Update product page to address '{top_issues[0][0]}'",
                        "Add sizing guide or FAQ section",
                        "Review customer support templates"
                    ],
                    evidence=evidence
                )
                return AiChatResponse(
                    answer=answer,
                    model="assistant",
                    suggested_actions=[f"Fix {top_issues[0][0]} issue", "Update product listing"],
                    used_filters={"date_range": used_range} if used_range else None
                )
            
            if any(k in ql for k in ["positive", "praise", "good", "valo"]):
                if not positive_topics:
                    return AiChatResponse(
                        answer="No specific positive topics identified in the selected range.",
                        model="assistant",
                        used_filters={"date_range": used_range} if used_range else None
                    )
                
                top_praises = positive_topics[:3]
                praise_list = [f"'{t[0]}' ({t[1]} mentions)" for t in top_praises]
                
                answer = format_response_template(
                    key_numbers=[f"Top positive topics: {', '.join(praise_list)}"],
                    insight=f"Customers love '{top_praises[0][0]}' - highlight this in marketing and product pages.",
                    next_actions=[
                        f"Feature '{top_praises[0][0]}' in product description",
                        "Use in social media campaigns",
                        "Add to product highlights"
                    ]
                )
                return AiChatResponse(
                    answer=answer,
                    model="assistant",
                    suggested_actions=["Create marketing campaign", "Update product page"],
                    used_filters={"date_range": used_range} if used_range else None
                )
        
        # 5) Product-specific queries
        if request.product_id and any(k in ql for k in ["product", "item", "this product"]):
            product_reviews = [r for r in filtered_reviews if str(r.get("product_id", "")) == str(request.product_id)]
            if not product_reviews:
                return AiChatResponse(
                    answer="No reviews found for this product in the selected range.",
                    model="assistant",
                    used_filters={"date_range": used_range, "product_id": request.product_id} if (used_range or request.product_id) else None
                )
        
        # 6) Recommendations
        if any(k in ql for k in ["recommend", "suggest", "improve", "fix", "what should", "ki kora"]):
            actions = []
            if negative_topics:
                top_issue = negative_topics[0]
                actions.append(f"Address '{top_issue[0]}' issue: {top_issue[1]} customers mentioned this")
            if positive_topics:
                top_praise = positive_topics[0]
                actions.append(f"Highlight '{top_praise[0]}': {top_praise[1]} customers praised this")
            actions.append("Update product listing with clear sizing/features")
            actions.append("Create FAQ section for common questions")
            
            answer = format_response_template(
                key_numbers=[f"Based on {stats['total']} reviews"],
                insight="Focus on addressing negative issues first, then amplify positive feedback.",
                next_actions=actions
            )
            return AiChatResponse(
                answer=answer,
                model="assistant",
                suggested_actions=actions[:3] if actions else None,
                used_filters={"date_range": used_range} if used_range else None
            )
        
        # Default: Use LLM with grounded data
        system = (
            "You are an AI assistant helping users understand their review data.\n\n"
            "CRITICAL RULES:\n"
            "1. NEVER guess or hallucinate numbers, dates, or percentages.\n"
            "2. Use ONLY the provided statistics and data.\n"
            "3. If data is missing, say: 'I don't have that data yet. Please connect a data source or upload reviews.'\n"
            "4. Always cite numbers from the provided stats.\n"
            "5. When computing, show brief formula (e.g., 'Positive % = positive_count / total_reviews').\n\n"
            "Response format:\n"
            "- Keep responses clean, short, and structured\n"
            "- ALWAYS start with: Answer:\n"
            "- Then bullet key numbers\n"
            "- Then: Insight:\n"
            "- Then: Next actions:\n"
            "- If quoting reviews: max 12 words per quote, max 3 quotes\n"
            "- Use bullets for key numbers\n"
            "- Provide 1-2 sentence insights\n"
            "- List actionable next steps\n"
            "- For deep analysis, include 2-3 example review snippets\n\n"
            "Privacy: Never reveal emails or personal info. Mask emails as a***@b.com if present.\n\n"
            "Supported intents:\n"
            "- Quick stats (total, positive/negative counts)\n"
            "- Breakdowns by date range, product, rating\n"
            "- Topics & pain points\n"
            "- Business recommendations\n"
            "- Export/CSV guidance\n"
            "- Screenshot/report UI guidance\n"
        )
        
        # Build context with real data
        dr_label = request.date_range_label or (f"{used_range['start']} to {used_range['end']}" if used_range and isinstance(used_range, dict) else "selected range")
        
        user_context = (
            f"Structured data (use ONLY this - never guess):\n"
            f"- date_range: {dr_label}\n"
            f"- total_reviews: {stats['total']}\n"
            f"- positive_count: {stats['positive_count']}\n"
            f"- negative_count: {stats['negative_count']}\n"
            f"- neutral_count: {stats['neutral_count']}\n"
            f"- positive_percentage: {stats['positive_pct']}\n"
            f"- negative_percentage: {stats['negative_pct']}\n"
            f"- neutral_percentage: {stats['neutral_pct']}\n"
            f"- average_rating: {stats['avg_rating'] or 'N/A'}\n"
            f"- top_negative_topics: {[(t[0], t[1]) for t in negative_topics[:5]]}\n"
            f"- top_positive_topics: {[(t[0], t[1]) for t in positive_topics[:5]]}\n"
            f"- evidence_quotes: {evidence_quotes}\n"
            f"- sample_reviews_count: {len(filtered_reviews[:5])}\n"
            f"- product_analytics: {len(request.product_analytics or [])} products\n\n"
            f"User question: {q}\n\n"
            f"IMPORTANT: If the user asks about something not in the data above, say 'I don't have that data yet' and explain how to get it."
        )
        
        try:
            messages = [{"role": "system", "content": system}]
            for m in (request.history or [])[-10:]:
                role = (m or {}).get("role")
                content = (m or {}).get("content")
                if role not in ("user", "assistant"):
                    continue
                if not isinstance(content, str) or not content.strip():
                    continue
                messages.append({"role": role, "content": content.strip()[:1200]})
            messages.append({"role": "user", "content": user_context})
            
            text = await groq_chat_completion(
                system_prompt=system,
                user_prompt=user_context,
                messages=messages,
                model=DEFAULT_MODEL,
                temperature=0.2,
                max_tokens=500,
                use_cache=True
            )
            return AiChatResponse(
                answer=text.strip(),
                model="assistant",
                used_filters={"date_range": used_range, "product_id": request.product_id} if (used_range or request.product_id) else None
            )
        except Exception as llm_error:
            # Fallback to deterministic answer
            try:
                return AiChatResponse(
                    answer=format_response_template(
                        key_numbers=[
                            f"Total: {stats['total']}",
                            f"Positive: {stats['positive_count']} ({stats['positive_pct']}%)",
                            f"Negative: {stats['negative_count']} ({stats['negative_pct']}%)"
                        ],
                        insight="Ask about specific topics, issues, or recommendations.",
                        next_actions=["Check top negative topics", "Review positive feedback"]
                    ),
                    model="assistant",
                    used_filters={"date_range": used_range} if used_range else None
                )
            except Exception as fallback_error:
                # Ultimate fallback
                return AiChatResponse(
                    answer=f"Total reviews: {stats.get('total', 0)}. Positive: {stats.get('positive_count', 0)}, Negative: {stats.get('negative_count', 0)}. Error: {str(llm_error)}",
                    model="assistant"
                )
    except Exception as e:
        # Catch any unexpected errors
        import traceback
        error_trace = traceback.format_exc()
        print(f"AI Chat Error: {error_trace}")
        
        # Return a helpful error message
        return AiChatResponse(
            answer=f"I encountered an error processing your request: {str(e)}. Please try rephrasing your question or contact support if the issue persists.",
            model="assistant"
        )


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



