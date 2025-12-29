# pydantic হলো data validation library - এটা দিয়ে আমরা API এর input/output structure define করি
# BaseModel inherit করলে automatic validation হয়, wrong data আসলে error দেয়
from pydantic import BaseModel

# List ব্যবহার করব multiple items রাখতে (যেমন অনেকগুলো review)
# Optional মানে এই field না দিলেও চলবে
from typing import List, Optional


# ============ REQUEST SCHEMAS ============
# User যখন API তে request পাঠাবে, তখন এই format এ data আসবে

class ReviewRequest(BaseModel):
    """
    User এর কাছ থেকে আসা request এর structure
    API endpoint এ এই format এ data আশা করা হচ্ছে
    """
    
    # reviews: List[str] মানে এটা একটা list যেখানে string থাকবে
    # উদাহরণ: ["This product is great", "Bad quality", "Love it"]
    # এটা required field - না দিলে error হবে
    reviews: List[str]
    
    # Optional[str] মানে এটা string হতে পারে অথবা None হতে পারে
    # = None মানে default value হলো None, মানে user না দিলেও চলবে
    # ভবিষ্যতে Amazon link দিলে সেখান থেকে reviews scrape করব
    product_link: Optional[str] = None


class ShopifyRequest(BaseModel):
    """
    Shopify store থেকে reviews fetch করার request structure
    
    Shopify Admin API এর জন্য store domain এবং access token দরকার।
    Access token Shopify Admin > Apps > Develop apps থেকে পাওয়া যায়।
    
    Optional: Judge.me বা অন্য review app ব্যবহার করলে সেই app এর
    API token ও দিতে পারবে।
    """
    
    # Shopify store এর domain
    # Example: "cool-store.myshopify.com" or "cool-store"
    store_domain: str
    
    # Shopify Admin API access token
    # Format: "shpat_xxxxxxxx..."
    # Permissions needed: read_products, read_content
    access_token: str
    
    # Maximum reviews to fetch (default 500)
    # বেশি দিলে API call বেশি সময় নিবে
    limit: Optional[int] = 500
    
    # ========== OPTIONAL: Third-party review app ==========
    # যদি Judge.me, Loox, Yotpo ইত্যাদি ব্যবহার করো
    
    # Review app name: "judge_me", "loox", "yotpo", "stamped"
    review_app: Optional[str] = None
    
    # Review app এর নিজস্ব API token (Shopify token না)
    review_app_token: Optional[str] = None


# ============ RESPONSE SCHEMAS ============
# API যখন response পাঠাবে, এই format এ data যাবে

class ReviewResult(BaseModel):
    """
    প্রতিটা individual review এর analysis result
    একটা review analyze করার পর যা পাওয়া যায়
    """
    
    # original review text - যেটা user দিয়েছিল
    # এটা রাখছি যাতে frontend এ দেখাতে পারি কোন review টা positive/negative
    text: str
    
    # sentiment হলো "positive" অথবা "negative"
    # AI model এটা predict করবে review পড়ে
    sentiment: str
    
    # confidence হলো model কতটা sure এই prediction এ (0.0 থেকে 1.0)
    # 0.95 মানে 95% confident, 0.5 মানে ঠিক মাঝামাঝি/uncertain
    confidence: float


class TopicInfo(BaseModel):
    """
    কোন বিষয়/keyword নিয়ে মানুষ কী বলছে সেটার summary
    যেমন: "battery" নিয়ে 15 জন negative বলেছে
    """
    
    # topic হলো keyword/বিষয় যেটা বারবার উঠে আসছে
    # যেমন: "battery", "screen", "delivery", "price"
    topic: str
    
    # count হলো কতবার এই topic mention হয়েছে
    # বেশি count মানে এটা important issue/feature
    count: int
    
    # এই topic নিয়ে বেশিরভাগ মানুষ কী বলেছে
    # "positive" মানে বেশিরভাগ প্রশংসা করেছে
    # "negative" মানে বেশিরভাগ complain করেছে
    sentiment: str


class AnalysisResponse(BaseModel):
    """
    সম্পূর্ণ analysis এর final response
    Frontend এ এই data দিয়ে charts, summaries দেখাবে
    """
    
    # মোট কতগুলো review analyze করা হলো
    total_reviews: int
    
    # কতগুলো positive review পাওয়া গেছে (সংখ্যা)
    positive_count: int
    
    # কতগুলো negative review পাওয়া গেছে (সংখ্যা)
    negative_count: int
    
    # positive review এর percentage (0.0 থেকে 100.0)
    # যেমন: 75.5 মানে 75.5% review positive
    # এটা chart/progress bar দেখাতে কাজে লাগবে
    positive_percentage: float
    
    # negative review এর percentage (0.0 থেকে 100.0)
    negative_percentage: float
    
    # সবচেয়ে বেশি প্রশংসিত topics/features এর list
    # যেমন: [{"topic": "camera", "count": 20, "sentiment": "positive"}]
    # Frontend এ "What customers love" section এ দেখাব
    top_positive_topics: List[TopicInfo]
    
    # সবচেয়ে বেশি complain করা topics এর list
    # Frontend এ "Common complaints" section এ দেখাব
    top_negative_topics: List[TopicInfo]
    
    # কিছু sample reviews with their sentiment
    # Frontend এ উদাহরণ হিসেবে দেখাব
    # সব review না, শুধু কয়েকটা representative example
    sample_reviews: List[ReviewResult]
