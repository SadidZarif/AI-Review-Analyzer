"""
============ SHOPIFY INTEGRATION ============
Shopify Admin API integration for fetching product reviews.

IMPORTANT NOTES ON SHOPIFY REVIEWS:
-----------------------------------
Shopify's native Admin API does NOT have a built-in reviews endpoint.
Reviews in Shopify stores are typically managed through third-party apps:

1. Judge.me      - Has its own API (most popular, free tier available)
2. Loox          - Photo reviews, has API
3. Yotpo         - Enterprise reviews, has API
4. Stamped.io    - Has API access
5. Shopify's Product Reviews app - Stores in metafields (limited)

This module provides:
1. ShopifyClient - For basic Shopify Admin API operations
2. Product metafield extraction (for stores using native review metafields)
3. Placeholder for Judge.me integration (most common review app)

For production use, you'll need to:
- Either integrate with the specific review app your store uses
- Or use webhooks to sync reviews from Shopify apps
"""

import httpx
from typing import Optional
from dataclasses import dataclass


# ============ CONSTANTS ============

# Shopify API version - update as needed
SHOPIFY_API_VERSION = "2024-01"

# Supported third-party review apps (for reference)
SUPPORTED_REVIEW_APPS = {
    "judge_me": {
        "name": "Judge.me",
        "api_docs": "https://judge.me/api/docs",
        "has_free_tier": True
    },
    "loox": {
        "name": "Loox",
        "api_docs": "https://help.loox.app/",
        "has_free_tier": False
    },
    "yotpo": {
        "name": "Yotpo",
        "api_docs": "https://developers.yotpo.com/",
        "has_free_tier": False
    },
    "stamped": {
        "name": "Stamped.io",
        "api_docs": "https://stamped.io/docs/",
        "has_free_tier": True
    }
}


# ============ CUSTOM EXCEPTIONS ============

class ShopifyAPIError(Exception):
    """
    Shopify API থেকে error আসলে এই exception raise হবে।
    
    Attributes:
        status_code: HTTP status code
        message: Error message
        response_data: Raw response from API
    """
    def __init__(
        self, 
        message: str, 
        status_code: int = None, 
        response_data: dict = None
    ):
        self.message = message
        self.status_code = status_code
        self.response_data = response_data
        super().__init__(self.message)


# ============ DATA CLASSES ============

@dataclass
class ShopifyProduct:
    """
    Shopify product এর simplified representation।
    """
    id: int
    title: str
    description: str
    vendor: str
    product_type: str
    tags: list[str]
    
    
@dataclass  
class ShopifyReview:
    """
    Review data structure (for when reviews are available)।
    """
    product_id: int
    product_title: str
    review_text: str
    rating: int  # 1-5
    author: str
    created_at: str


# ============ SHOPIFY CLIENT CLASS ============

class ShopifyClient:
    """
    Shopify Admin API client।
    
    এই class Shopify store এর সাথে communicate করে।
    Admin API access token দিয়ে authenticated requests পাঠায়।
    
    Usage:
        client = ShopifyClient(
            store_domain="mystore.myshopify.com",
            access_token="shpat_xxxxx"
        )
        products = await client.get_products(limit=50)
    """
    
    def __init__(self, store_domain: str, access_token: str):
        """
        Initialize Shopify client।
        
        Args:
            store_domain: Shopify store domain (e.g., "mystore.myshopify.com")
            access_token: Shopify Admin API access token (starts with "shpat_")
        """
        # Domain normalization - .myshopify.com থাকতে হবে
        self.store_domain = self._normalize_domain(store_domain)
        self.access_token = access_token
        
        # Base URL for API requests
        self.base_url = f"https://{self.store_domain}/admin/api/{SHOPIFY_API_VERSION}"
        
        # HTTP headers for authentication
        self.headers = {
            "X-Shopify-Access-Token": access_token,
            "Content-Type": "application/json"
        }
    
    def _normalize_domain(self, domain: str) -> str:
        """
        Domain format normalize করে।
        https:// বা trailing slash থাকলে remove করে।
        """
        domain = domain.strip()
        domain = domain.replace("https://", "").replace("http://", "")
        domain = domain.rstrip("/")
        
        # .myshopify.com না থাকলে add করে
        if not domain.endswith(".myshopify.com"):
            if ".myshopify.com" not in domain:
                domain = f"{domain}.myshopify.com"
        
        return domain
    
    async def _make_request(
        self, 
        endpoint: str, 
        method: str = "GET",
        params: dict = None,
        json_data: dict = None
    ) -> dict:
        """
        Shopify API তে HTTP request পাঠায়।
        
        Args:
            endpoint: API endpoint (e.g., "/products.json")
            method: HTTP method (GET, POST, etc.)
            params: Query parameters
            json_data: JSON body for POST/PUT requests
            
        Returns:
            Parsed JSON response
            
        Raises:
            ShopifyAPIError: API error হলে
        """
        url = f"{self.base_url}{endpoint}"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.request(
                    method=method,
                    url=url,
                    headers=self.headers,
                    params=params,
                    json=json_data
                )
                
                # Check for HTTP errors
                if response.status_code >= 400:
                    error_data = response.json() if response.content else {}
                    raise ShopifyAPIError(
                        message=f"Shopify API error: {response.status_code}",
                        status_code=response.status_code,
                        response_data=error_data
                    )
                
                return response.json()
                
            except httpx.RequestError as e:
                raise ShopifyAPIError(
                    message=f"Network error connecting to Shopify: {str(e)}"
                )
    
    async def verify_connection(self) -> bool:
        """
        API connection verify করে shop info নিয়ে।
        
        Returns:
            True if connection successful
            
        Raises:
            ShopifyAPIError: Connection failed হলে
        """
        try:
            data = await self._make_request("/shop.json")
            return "shop" in data
        except ShopifyAPIError:
            raise
    
    async def get_products(
        self, 
        limit: int = 250,
        fields: str = "id,title,body_html,vendor,product_type,tags"
    ) -> list[ShopifyProduct]:
        """
        Store এর products fetch করে।
        
        Args:
            limit: Maximum products to fetch (max 250 per request)
            fields: Comma-separated field names to return
            
        Returns:
            List of ShopifyProduct objects
        """
        params = {
            "limit": min(limit, 250),
            "fields": fields
        }
        
        data = await self._make_request("/products.json", params=params)
        products = []
        
        for p in data.get("products", []):
            products.append(ShopifyProduct(
                id=p.get("id"),
                title=p.get("title", ""),
                description=p.get("body_html", ""),
                vendor=p.get("vendor", ""),
                product_type=p.get("product_type", ""),
                tags=p.get("tags", "").split(", ") if p.get("tags") else []
            ))
        
        return products
    
    async def get_product_metafields(
        self, 
        product_id: int
    ) -> list[dict]:
        """
        Product এর metafields fetch করে।
        কিছু stores reviews metafields এ store করে।
        
        Args:
            product_id: Shopify product ID
            
        Returns:
            List of metafield dictionaries
        """
        data = await self._make_request(
            f"/products/{product_id}/metafields.json"
        )
        return data.get("metafields", [])
    
    async def extract_reviews_from_metafields(
        self,
        product_id: int
    ) -> list[str]:
        """
        Product metafields থেকে reviews extract করার চেষ্টা করে।
        
        Common metafield namespaces for reviews:
        - reviews.* 
        - spr.reviews
        - judgeme.widget
        
        Args:
            product_id: Shopify product ID
            
        Returns:
            List of review texts (empty if no reviews found)
        """
        metafields = await self.get_product_metafields(product_id)
        reviews = []
        
        # Review-related namespaces check করছি
        review_namespaces = ["reviews", "spr", "judgeme", "loox", "yotpo"]
        
        for mf in metafields:
            namespace = mf.get("namespace", "").lower()
            key = mf.get("key", "").lower()
            value = mf.get("value", "")
            
            # Review-related metafield হলে
            if any(ns in namespace for ns in review_namespaces):
                if isinstance(value, str) and len(value) > 10:
                    reviews.append(value)
            
            # "review" key থাকলে
            elif "review" in key:
                if isinstance(value, str) and len(value) > 10:
                    reviews.append(value)
        
        return reviews


# ============ JUDGE.ME INTEGRATION (Optional) ============

class JudgeMeClient:
    """
    Judge.me Reviews API client (most popular Shopify review app)।
    
    Judge.me ব্যবহার করলে এই client দিয়ে reviews fetch করা যাবে।
    
    Requirements:
    - Judge.me app installed on store
    - Judge.me API token (from app settings > API)
    - Shop domain (without .myshopify.com)
    
    API Docs: https://judge.me/api/docs
    
    IMPORTANT:
    Judge.me API token query parameter হিসেবে pass হয়, Bearer token না।
    Shop domain এ .myshopify.com থাকলে remove করতে হবে।
    """
    
    def __init__(self, shop_domain: str, api_token: str):
        """
        Initialize Judge.me client।
        
        Args:
            shop_domain: Shopify store domain (e.g., "mystore.myshopify.com" or "mystore")
            api_token: Judge.me API token (from Judge.me app settings)
        """
        # Shop domain normalize করছি - .myshopify.com remove করছি
        self.shop_domain = self._normalize_shop_domain(shop_domain)
        self.api_token = api_token
        self.base_url = "https://judge.me/api/v1"
    
    def _normalize_shop_domain(self, domain: str) -> str:
        """
        Shop domain normalize করে - Judge.me API এর জন্য .myshopify.com remove করতে হবে।
        
        Args:
            domain: Raw shop domain
            
        Returns:
            Normalized domain (e.g., "mystore")
        """
        domain = domain.strip()
        # https:// বা http:// remove
        domain = domain.replace("https://", "").replace("http://", "")
        domain = domain.rstrip("/")
        
        # .myshopify.com remove করছি
        if domain.endswith(".myshopify.com"):
            domain = domain.replace(".myshopify.com", "")
        elif ".myshopify.com" in domain:
            # যদি middle এ থাকে
            domain = domain.split(".myshopify.com")[0]
        
        return domain
    
    async def get_reviews(
        self, 
        per_page: int = 100,
        page: int = 1
    ) -> list[dict]:
        """
        Judge.me থেকে reviews fetch করে।
        
        Judge.me API format:
        - Endpoint: https://judge.me/api/v1/reviews
        - Authentication: api_token query parameter
        - Required: shop_domain, api_token
        
        Args:
            per_page: Reviews per page (max 250)
            page: Page number (starts from 1)
            
        Returns:
            List of review dictionaries
            
        Raises:
            ShopifyAPIError: API error হলে
        """
        url = f"{self.base_url}/reviews"
        
        # Judge.me API token query parameter হিসেবে pass হয়
        params = {
            "shop_domain": self.shop_domain,
            "api_token": self.api_token,
            "per_page": min(per_page, 250),  # Max 250 per page
            "page": page
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.get(url, params=params)
                
                # Error handling
                if response.status_code >= 400:
                    error_detail = "Unknown error"
                    try:
                        error_data = response.json()
                        error_detail = error_data.get("message", error_data.get("error", str(response.status_code)))
                    except:
                        error_detail = response.text[:200] if response.text else f"HTTP {response.status_code}"
                    
                    raise ShopifyAPIError(
                        message=f"Judge.me API error: {error_detail}",
                        status_code=response.status_code,
                        response_data={"detail": error_detail}
                    )
                
                # Success response parse করছি
                data = response.json()
                
                # Judge.me API response format check
                # Response হতে পারে: {"reviews": [...]} বা direct list
                if isinstance(data, list):
                    return data
                elif isinstance(data, dict):
                    # "reviews" key থাকলে
                    if "reviews" in data:
                        return data["reviews"]
                    # "data" key থাকলে
                    elif "data" in data:
                        return data["data"] if isinstance(data["data"], list) else []
                    else:
                        # Direct dict হলে empty list return
                        return []
                else:
                    return []
                    
            except httpx.RequestError as e:
                raise ShopifyAPIError(
                    message=f"Network error connecting to Judge.me API: {str(e)}"
                )
    
    async def get_full_reviews(self, limit: int = 500) -> list[dict]:
        """
        Judge.me থেকে full review data fetch করে (metadata সহ)।
        
        Returns:
            List of review dictionaries with:
            - body: Review text
            - reviewer_name: Reviewer name
            - created_at: Review date
            - product_title: Product name
            - product_id: Product ID
            - rating: Star rating (1-5)
        """
        reviews = []
        page = 1
        per_page = 100
        
        while len(reviews) < limit:
            try:
                batch = await self.get_reviews(per_page=per_page, page=page)
                
                if not batch or len(batch) == 0:
                    break
                
                for review in batch:
                    if len(reviews) >= limit:
                        break
                    
                    if isinstance(review, dict):
                        # Judge.me API response structure parse করছি
                        review_data = {
                            "body": "",
                            "reviewer_name": "",
                            "created_at": "",
                            "product_title": "",
                            "product_id": None,
                            "rating": None
                        }
                        
                        # Review text extract
                        body = review.get("body", "")
                        if not body and "review" in review:
                            review_obj = review.get("review", {})
                            if isinstance(review_obj, dict):
                                body = review_obj.get("body", "")
                        
                        # HTML tags remove
                        if body:
                            import re
                            body = re.sub(r'<[^>]+>', '', str(body))
                            body = body.strip()
                            
                            if len(body) >= 10:
                                review_data["body"] = body
                                
                                # Reviewer name
                                review_data["reviewer_name"] = review.get("name", review.get("reviewer_name", ""))
                                if not review_data["reviewer_name"] and "review" in review:
                                    review_obj = review.get("review", {})
                                    review_data["reviewer_name"] = review_obj.get("name", review_obj.get("reviewer_name", ""))
                                
                                # Review date
                                review_data["created_at"] = review.get("created_at", review.get("date", ""))
                                if not review_data["created_at"] and "review" in review:
                                    review_obj = review.get("review", {})
                                    review_data["created_at"] = review_obj.get("created_at", review_obj.get("date", ""))
                                
                                # Product info
                                review_data["product_title"] = review.get("product_title", review.get("product_name", ""))
                                review_data["product_id"] = review.get("product_id")
                                
                                # Rating
                                review_data["rating"] = review.get("rating", review.get("stars"))
                                
                                reviews.append(review_data)
                
                if len(batch) < per_page:
                    break
                
                page += 1
                
            except ShopifyAPIError:
                break
            except Exception as e:
                print(f"Error fetching Judge.me reviews page {page}: {str(e)}")
                break
        
        return reviews[:limit]
    
    async def extract_review_texts(self, limit: int = 500) -> list[str]:
        """
        Judge.me reviews থেকে শুধু text extract করে।
        
        Multiple pages থেকে reviews fetch করে এবং শুধু review text return করে।
        
        Args:
            limit: Maximum reviews to fetch
            
        Returns:
            List of review text strings (cleaned and validated)
        """
        reviews = []
        page = 1
        per_page = 100  # Judge.me default per page
        
        while len(reviews) < limit:
            try:
                batch = await self.get_reviews(per_page=per_page, page=page)
                
                # যদি batch empty হয়, break
                if not batch or len(batch) == 0:
                    break
                
                # প্রতিটি review থেকে text extract করছি
                for review in batch:
                    if len(reviews) >= limit:
                        break
                    
                    # Judge.me API response format:
                    # review["body"] = review text
                    # review["review"] = nested object (sometimes)
                    body = None
                    
                    if isinstance(review, dict):
                        # Direct "body" field
                        body = review.get("body", "")
                        
                        # যদি "body" না থাকে, "review" object check করছি
                        if not body and "review" in review:
                            review_obj = review.get("review", {})
                            if isinstance(review_obj, dict):
                                body = review_obj.get("body", "")
                        
                        # HTML tags remove করছি
                        if body:
                            import re
                            body = re.sub(r'<[^>]+>', '', str(body))
                            body = body.strip()
                            
                            # Minimum length check (at least 10 characters)
                            if len(body) >= 10:
                                reviews.append(body)
                    elif isinstance(review, str):
                        # Direct string হলে
                        if len(review.strip()) >= 10:
                            reviews.append(review.strip())
                
                # যদি batch size per_page এর চেয়ে কম হয়, মানে last page
                if len(batch) < per_page:
                    break
                
                page += 1
                
            except ShopifyAPIError:
                # API error হলে break করছি
                break
            except Exception as e:
                # Unexpected error - log করছি কিন্তু continue করছি
                print(f"Error fetching Judge.me reviews page {page}: {str(e)}")
                break
        
        return reviews[:limit]


# ============ MAIN FETCH FUNCTION ============

async def fetch_shopify_reviews_with_metadata(
    store_domain: str,
    access_token: str,
    limit: int = 500,
    review_app: Optional[str] = None,
    review_app_token: Optional[str] = None
) -> list[dict]:
    """
    Shopify store থেকে reviews fetch করে full metadata সহ।
    
    Returns:
        List of review dictionaries with:
        - body: Review text
        - reviewer_name: Reviewer name
        - created_at: Review date
        - product_title: Product name
        - product_id: Product ID
        - rating: Star rating
    """
    reviews: list[dict] = []
    
    # Validation
    if not store_domain or not store_domain.strip():
        raise ValueError("store_domain is required")
    
    if not access_token or not access_token.strip():
        raise ValueError("access_token is required")
    
    if limit < 1 or limit > 10000:
        raise ValueError("limit must be between 1 and 10000")
    
    # Initialize Shopify client
    client = ShopifyClient(
        store_domain=store_domain,
        access_token=access_token
    )
    
    # Verify connection
    await client.verify_connection()
    
    # Judge.me integration - full metadata সহ
    if review_app and review_app_token:
        if review_app.lower() == "judge_me" or review_app.lower() == "judge.me":
            try:
                judge_me = JudgeMeClient(
                    shop_domain=store_domain,
                    api_token=review_app_token
                )
                reviews = await judge_me.get_full_reviews(limit=limit)
                
                if reviews and len(reviews) > 0:
                    return reviews
            except ShopifyAPIError as e:
                raise ShopifyAPIError(
                    message=f"Judge.me API error: {e.message}",
                    status_code=e.status_code,
                    response_data=e.response_data
                )
            except Exception as e:
                print(f"Judge.me integration error: {str(e)}")
    
    # Fallback: শুধু text return করব
    return reviews


async def fetch_shopify_reviews(
    store_domain: str,
    access_token: str,
    limit: int = 500,
    review_app: Optional[str] = None,
    review_app_token: Optional[str] = None
) -> list[str]:
    """
    Shopify store থেকে reviews fetch করে।
    
    এই function multiple sources থেকে reviews collect করার চেষ্টা করে:
    1. Product metafields (যদি reviews সেখানে stored থাকে)
    2. Third-party review app API (Judge.me, etc.)
    3. Fallback: Product descriptions থেকে relevant text
    
    Args:
        store_domain: Shopify store domain (e.g., "mystore.myshopify.com")
        access_token: Shopify Admin API access token
        limit: Maximum number of reviews to fetch
        review_app: Optional - Third-party review app name ("judge_me", "loox", etc.)
        review_app_token: Optional - API token for the review app
        
    Returns:
        List of review text strings, normalized and cleaned
        
    Raises:
        ShopifyAPIError: If API connection fails
        ValueError: If invalid parameters provided
        
    Example:
        reviews = await fetch_shopify_reviews(
            store_domain="cool-gadgets.myshopify.com",
            access_token="shpat_xxxxx",
            limit=100
        )
    """
    
    # ========== VALIDATION ==========
    if not store_domain or not store_domain.strip():
        raise ValueError("store_domain is required")
    
    if not access_token or not access_token.strip():
        raise ValueError("access_token is required")
    
    if limit < 1 or limit > 10000:
        raise ValueError("limit must be between 1 and 10000")
    
    reviews: list[str] = []
    
    # ========== INITIALIZE SHOPIFY CLIENT ==========
    client = ShopifyClient(
        store_domain=store_domain,
        access_token=access_token
    )
    
    # Verify connection
    await client.verify_connection()
    
    # ========== APPROACH 1: Third-Party Review App ==========
    # Judge.me বা অন্য review app ব্যবহার করলে এটা priority
    if review_app and review_app_token:
        if review_app.lower() == "judge_me" or review_app.lower() == "judge.me":
            try:
                judge_me = JudgeMeClient(
                    shop_domain=store_domain,  # store_domain normalize হবে JudgeMeClient এ
                    api_token=review_app_token
                )
                reviews = await judge_me.extract_review_texts(limit=limit)
                
                # যদি reviews পাওয়া যায়, return করছি
                if reviews and len(reviews) > 0:
                    return reviews
                else:
                    # Reviews না পাওয়া গেলে fallback এ যাবে
                    print(f"Judge.me API returned no reviews. Falling back to other methods.")
            except ShopifyAPIError as e:
                # Judge.me API specific error - user কে জানাচ্ছি
                raise ShopifyAPIError(
                    message=f"Judge.me API error: {e.message}. Please verify your API token and shop domain.",
                    status_code=e.status_code,
                    response_data=e.response_data
                )
            except Exception as e:
                # Unexpected error - fallback এ যাবে
                print(f"Judge.me integration error: {str(e)}. Falling back to other methods.")
    
    # ========== APPROACH 2: Product Metafields ==========
    # কিছু stores reviews metafields এ store করে
    products = await client.get_products(limit=50)
    
    for product in products:
        if len(reviews) >= limit:
            break
            
        try:
            metafield_reviews = await client.extract_reviews_from_metafields(
                product_id=product.id
            )
            reviews.extend(metafield_reviews)
        except Exception:
            # Individual product error তে skip করছি
            continue
    
    # ========== NORMALIZE & CLEAN ==========
    cleaned_reviews = []
    
    for review in reviews:
        if isinstance(review, str):
            # HTML tags remove
            import re
            text = re.sub(r'<[^>]+>', '', review)
            # Extra whitespace remove
            text = ' '.join(text.split())
            # Minimum length check
            if len(text) >= 10:
                cleaned_reviews.append(text)
    
    return cleaned_reviews[:limit]


