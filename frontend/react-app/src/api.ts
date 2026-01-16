// ============ API.TS ============
// Backend API এর সাথে communicate করার জন্য সব functions এখানে
// এই file থেকে অন্য components API call করবে

// ============ CONFIGURATION ============

// Backend server এর base URL
// Development এ .env থেকে VITE_API_BASE_URL নেবে; না থাকলে dynamic fallback
const API_BASE_URL = (() => {
  const fromEnv = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  // Production/static build এ same-origin ধরে নেব
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  // Development fallback (Vite dev server থাকলে)
  if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
    return "http://localhost:8000";
  }

  // Default: same origin, আর origin খালি হলে localhost fallback
  return origin || "http://localhost:8000";
})();


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
  // NOTE: UI তে neutral ও ব্যবহার হয় (rating=3 বা unknown হলে)
  sentiment: "positive" | "negative" | "neutral";
  
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

// ============ GROQ AI (LLM) TYPES ============
// Backend এর /ai/* endpoints এর জন্য

export interface GroqReplyRequest {
  review_text: string;
  tone?: "empathetic" | "formal" | "short";
  language?: "en" | "bn";
  customer_name?: string;
  product_name?: string;
  store_name?: string;
  custom_instruction?: string;
}

export interface GroqReplyResponse {
  reply_text: string;
  model: string;
}

export interface GroqSummaryRequest {
  title?: string;
  date_range?: string;
  total_reviews: number;
  positive_percentage: number;
  negative_percentage: number;
  top_positive_topics: string[];
  top_negative_topics: string[];
  sample_reviews: string[];
}

export interface GroqSummaryResponse {
  summary: string;
  key_actions: string[];
  model: string;
}

export interface GroqCampaignIdeaRequest {
  positive_topic?: string | null;
  negative_topic?: string | null;
  store_name?: string | null;
  total_reviews: number;
  positive_percentage: number;
  negative_percentage: number;
}

export interface GroqCampaignIdeaResponse {
  title: string;
  description: string;
  model: string;
}

// ============ AI CHAT (Deep Dive) ============
export interface AiChatRequest {
  question: string;
  date_range_label?: string;
  date_range?: { start: string; end: string };
  analysis?: AnalysisResponse;
  reviews?: Array<Record<string, any>>;
  shopify?: ShopifyRequest;
  top_positive_topics?: string[];
  top_negative_topics?: string[];
  sample_reviews?: string[];
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  product_analytics?: Array<Record<string, any>>;
  product_id?: string;
}

export interface AiChatResponse {
  answer: string;
  model: string;
  suggested_actions?: string[];
  used_filters?: Record<string, any>;
}

// ============ SHOPIFY / JUDGE.ME DATA TYPES ============
// Products + raw reviews + per-product analytics এর জন্য

export interface ShopifyProduct {
  id: number;
  title: string;
  handle?: string | null;
  vendor?: string | null;
  product_type?: string | null;
  tags: string[];
  image_url?: string | null;
}

export interface JudgeMeReview {
  id: number;
  body: string;
  reviewer_name?: string | null;
  created_at?: string | null;
  product_title?: string | null;
  product_id?: number | null;
  rating?: number | null;
}

export interface ProductAnalytics {
  product_id?: number | null;
  product_title: string;
  review_count: number;
  average_rating?: number | null;
  positive_percentage: number;
  negative_percentage: number;
  positive_count: number;
  negative_count: number;
  top_positive_topics: string[];
  top_negative_topics: string[];
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

// ============ GROQ AI API CALLS ============

export async function generateGroqReply(request: GroqReplyRequest): Promise<GroqReplyResponse> {
  const response = await fetch(`${API_BASE_URL}/ai/reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg = errorData.detail || `AI reply failed: ${response.status}`;
    throw new Error(msg);
  }

  return response.json() as Promise<GroqReplyResponse>;
}

export async function generateGroqSummary(request: GroqSummaryRequest): Promise<GroqSummaryResponse> {
  const response = await fetch(`${API_BASE_URL}/ai/summary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg = errorData.detail || `AI summary failed: ${response.status}`;
    throw new Error(msg);
  }

  return response.json() as Promise<GroqSummaryResponse>;
}

export async function generateGroqCampaignIdea(request: GroqCampaignIdeaRequest): Promise<GroqCampaignIdeaResponse> {
  const response = await fetch(`${API_BASE_URL}/ai/campaign-idea`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg = errorData.detail || `AI campaign idea failed: ${response.status}`;
    throw new Error(msg);
  }

  return response.json() as Promise<GroqCampaignIdeaResponse>;
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
export function getSentimentColor(sentiment: "positive" | "negative" | "neutral"): string {
  if (sentiment === "positive") return "#22c55e"; // Green
  if (sentiment === "negative") return "#ef4444"; // Red
  return "#eab308"; // Yellow for neutral
}

// getSentimentEmoji: Sentiment অনুযায়ী emoji return করে
export function getSentimentEmoji(sentiment: "positive" | "negative" | "neutral"): string {
  if (sentiment === "positive") return "😊";
  if (sentiment === "negative") return "😞";
  return "😐";
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

// ============ SHOPIFY DATA FETCH ENDPOINTS ============
// Dashboard/Products/Reviews page এ real data দেখানোর জন্য

// Shopify products list fetch করে
export async function fetchShopifyProducts(
  request: ShopifyRequest
): Promise<ShopifyProduct[]> {
  const response = await fetch(`${API_BASE_URL}/shopify/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.detail || `Failed to fetch products: ${response.status}`;
    throw new Error(errorMessage);
  }

  return response.json() as Promise<ShopifyProduct[]>;
}

// Judge.me raw reviews list fetch করে (metadata সহ)
export async function fetchShopifyReviews(
  request: ShopifyRequest
): Promise<JudgeMeReview[]> {
  const response = await fetch(`${API_BASE_URL}/shopify/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.detail || `Failed to fetch reviews: ${response.status}`;
    throw new Error(errorMessage);
  }

  return response.json() as Promise<JudgeMeReview[]>;
}

// Per-product analytics fetch করে (sentiment breakdown + rating + topics)
export async function fetchShopifyProductAnalytics(
  request: ShopifyRequest
): Promise<ProductAnalytics[]> {
  const response = await fetch(`${API_BASE_URL}/shopify/products/analytics`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.detail || `Failed to fetch product analytics: ${response.status}`;
    throw new Error(errorMessage);
  }

  return response.json() as Promise<ProductAnalytics[]>;
}

// Deep dive chat: answer questions using current range stats + topics
export async function aiChat(request: AiChatRequest): Promise<AiChatResponse> {
  const response = await fetch(`${API_BASE_URL}/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.detail || `Failed to chat: ${response.status}`;
    throw new Error(errorMessage);
  }

  return response.json() as Promise<AiChatResponse>;
}
