# ============ IMPORTS ============

# FastAPI হলো modern Python web framework
# এটা দিয়ে API endpoints তৈরি করব
from fastapi import FastAPI, HTTPException

# CORS (Cross-Origin Resource Sharing) middleware
# এটা দরকার কারণ frontend (React) আলাদা port এ চলবে
# CORS না থাকলে browser frontend থেকে API call block করবে
from fastapi.middleware.cors import CORSMiddleware

# আমাদের তৈরি করা schemas import করছি
# এগুলো request/response এর structure define করে
from schemas import ReviewRequest, AnalysisResponse, ReviewResult, TopicInfo

# আমাদের তৈরি করা ML models import করছি
# analyzer = trained SentimentAnalyzer instance
# TopicExtractor = topic বের করার class
from models import analyzer, TopicExtractor


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
        "health": "/health"
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
