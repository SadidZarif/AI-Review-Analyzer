// ============ API.TS ============
// Backend API এর সাথে communicate করার জন্য সব functions এখানে
// এই file থেকে অন্য components API call করবে

// ============ CONFIGURATION ============

// Backend server এর base URL
// Development এ localhost:8000, production এ actual server URL হবে
const API_BASE_URL = "http://localhost:8000";


// ============ TYPESCRIPT INTERFACES ============
// এগুলো backend এর schemas.py এর সাথে match করে
// TypeScript এ type safety দেয় - ভুল data structure হলে error দেখাবে

// ReviewRequest: Backend এ পাঠানো request এর structure
// এটা /analyze-reviews endpoint এ POST করা হবে
export interface ReviewRequest {
  // reviews হলো strings এর array - user এর দেওয়া review texts
  reviews: string[];
  
  // Optional product link - Amazon/other product URL
  // undefined হলে শুধু reviews analyze হবে
  product_link?: string;
}

// ReviewResult: প্রতিটি individual review এর analysis result
export interface ReviewResult {
  // Original review text
  text: string;
  
  // Predicted sentiment: "positive" বা "negative"
  sentiment: "positive" | "negative";
  
  // Model এর confidence score (0.0 থেকে 1.0)
  confidence: number;
  
  // Optional: Judge.me / Shopify Review Metadata
  reviewer_name?: string;
  review_date?: string;
  product_name?: string;
  product_id?: number;
  rating?: number;
}

// TopicInfo: Extract করা topic/keyword এর তথ্য
export interface TopicInfo {
  // Topic এর নাম (যেমন: "battery", "screen", "delivery")
  topic: string;
  
  // এই topic কতবার এসেছে
  count: number;
  
  // এই topic এর sentiment
  sentiment: "positive" | "negative";
}

// AnalysisResponse: Backend থেকে আসা complete response
// এটা backend এর schemas.py এর সাথে exactly match করে
export interface AnalysisResponse {
  // মোট reviews এর সংখ্যা
  total_reviews: number;
  
  // Positive reviews এর সংখ্যা
  positive_count: number;
  
  // Negative reviews এর সংখ্যা
  negative_count: number;
  
  // Positive reviews এর percentage
  positive_percentage: number;
  
  // Negative reviews এর percentage
  negative_percentage: number;
  
  // Positive reviews থেকে extract করা top topics
  top_positive_topics: TopicInfo[];
  
  // Negative reviews থেকে extract করা top topics
  top_negative_topics: TopicInfo[];
  
  // Sample individual review results
  sample_reviews: ReviewResult[];
}

// HealthResponse: Health check endpoint এর response
export interface HealthResponse {
  status: string;
  message: string;
}


// ============ API FUNCTIONS ============

// checkHealth: Backend server চালু আছে কিনা check করে
// Dashboard এ server status দেখাতে ব্যবহার হবে
export async function checkHealth(): Promise<HealthResponse> {
  // fetch() হলো browser এর built-in function - HTTP request পাঠায়
  // await দিয়ে response আসা পর্যন্ত wait করছি
  const response = await fetch(`${API_BASE_URL}/health`);
  
  // response.ok হলো true যদি status 200-299 হয়
  if (!response.ok) {
    // Error হলে throw করছি - calling code এ catch করা যাবে
    throw new Error(`Health check failed: ${response.status}`);
  }
  
  // JSON response কে JavaScript object এ convert করছি
  // as HealthResponse দিয়ে TypeScript কে বলছি এটা কী type
  return response.json() as Promise<HealthResponse>;
}


// analyzeReviews: মূল analysis function
// Reviews নিয়ে backend এ পাঠায়, analysis result ফেরত আনে
export async function analyzeReviews(
  reviews: string[],
  productLink?: string
): Promise<AnalysisResponse> {
  
  // Request body তৈরি করছি
  const requestBody: ReviewRequest = {
    reviews: reviews,
    // productLink undefined না হলে add করছি
    ...(productLink && { product_link: productLink }),
  };
  
  // POST request পাঠাচ্ছি /analyze-reviews endpoint এ
  const response = await fetch(`${API_BASE_URL}/analyze-reviews`, {
    // HTTP method: POST (data পাঠাচ্ছি)
    method: "POST",
    
    // Headers বলছে আমরা JSON পাঠাচ্ছি
    headers: {
      "Content-Type": "application/json",
    },
    
    // Body তে request data - JSON string এ convert করে পাঠাচ্ছি
    body: JSON.stringify(requestBody),
  });
  
  // Error handling
  if (!response.ok) {
    // Response থেকে error message বের করার চেষ্টা করছি
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.detail || `Analysis failed: ${response.status}`;
    throw new Error(errorMessage);
  }
  
  // Success হলে parsed response return করছি
  return response.json() as Promise<AnalysisResponse>;
}


// ============ UTILITY FUNCTIONS ============

// formatPercentage: Number কে percentage string এ convert করে
// যেমন: 75.5 → "75.5%"
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

// formatConfidence: Confidence score কে readable format এ convert করে
// যেমন: 0.856 → "85.6%"
export function formatConfidence(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

// getSentimentColor: Sentiment অনুযায়ী color return করে
// UI তে positive/negative আলাদা color দেখাতে ব্যবহার হবে
export function getSentimentColor(sentiment: "positive" | "negative"): string {
  return sentiment === "positive" ? "#22c55e" : "#ef4444";
  // Green for positive, Red for negative
}

// getSentimentEmoji: Sentiment অনুযায়ী emoji return করে
export function getSentimentEmoji(sentiment: "positive" | "negative"): string {
  return sentiment === "positive" ? "😊" : "😞";
}

// ============ SHOPIFY INTEGRATION ============

// ShopifyRequest: Shopify store থেকে reviews fetch করার request
export interface ShopifyRequest {
  store_domain: string;
  access_token: string;
  limit?: number;
  review_app?: string;
  review_app_token?: string;
}

// analyzeShopifyReviews: Shopify store থেকে reviews fetch করে analyze করে
export async function analyzeShopifyReviews(
  request: ShopifyRequest
): Promise<AnalysisResponse> {
  const response = await fetch(`${API_BASE_URL}/analyze/shopify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.detail || `Shopify analysis failed: ${response.status}`;
    throw new Error(errorMessage);
  }
  
  return response.json() as Promise<AnalysisResponse>;
}
