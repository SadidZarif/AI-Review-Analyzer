// ============ API.TS ============
// Backend API এর সাথে communicate করার জন্য সব functions এখানে
// Frontend এর অন্য কোনো file এ direct fetch call থাকবে না

// Backend এর base URL
// Development এ localhost, production এ actual server URL হবে
const API_BASE_URL = "http://localhost:8000";


// ============ TYPES ============
// TypeScript types - data এর structure define করে

// Single review এর result
export interface ReviewResult {
  text: string;           // original review text
  sentiment: string;      // "positive" বা "negative"
  confidence: number;     // 0.0 to 1.0
}

// Topic info
export interface TopicInfo {
  topic: string;          // keyword/topic name
  count: number;          // কতবার দেখা গেছে
  sentiment: string;      // "positive" বা "negative"
}

// Full analysis response from backend
export interface AnalysisResponse {
  total_reviews: number;
  positive_count: number;
  negative_count: number;
  positive_percentage: number;
  negative_percentage: number;
  top_positive_topics: TopicInfo[];
  top_negative_topics: TopicInfo[];
  sample_reviews: ReviewResult[];
}

// Request body for analysis
export interface AnalysisRequest {
  reviews: string[];
  product_link?: string;  // optional
}


// ============ API FUNCTIONS ============

/**
 * Health check - backend চালু আছে কিনা দেখে
 * @returns Promise with health status
 */
export async function checkHealth(): Promise<{ status: string; message: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    
    if (!response.ok) {
      throw new Error("Backend is not responding");
    }
    
    return await response.json();
  } catch (error) {
    console.error("Health check failed:", error);
    throw error;
  }
}


/**
 * Reviews analyze করে - main API call
 * @param reviews - Array of review texts
 * @param productLink - Optional product URL
 * @returns Promise with analysis results
 */
export async function analyzeReviews(
  reviews: string[],
  productLink?: string
): Promise<AnalysisResponse> {
  try {
    // Request body তৈরি
    const requestBody: AnalysisRequest = {
      reviews: reviews,
    };
    
    // Product link থাকলে add করছি
    if (productLink) {
      requestBody.product_link = productLink;
    }
    
    // API call
    const response = await fetch(`${API_BASE_URL}/analyze-reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
    
    // Error handling
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Analysis failed");
    }
    
    // Success - return data
    return await response.json();
  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
}


/**
 * API base URL পাওয়ার জন্য (debugging এ কাজে লাগে)
 */
export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

