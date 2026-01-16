// ============ REVIEW CONTEXT ============
// সব pages এ shared state manage করার জন্য React Context
// Dashboard, Products, Reviews - সবাই এই context ব্যবহার করবে
// একবার fetch করা data সব জায়গায় available থাকবে

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import {
  analyzeShopifyReviews,
  fetchShopifyProducts,
  fetchShopifyReviews,
  fetchShopifyProductAnalytics,
  type AnalysisResponse,
  type ShopifyRequest,
  type ShopifyProduct,
  type JudgeMeReview,
  type ProductAnalytics
} from '../api';

// ============ TYPES ============

// Store configuration - Shopify store এর credentials
interface StoreConfig {
  store_domain: string;      // যেমন: "mystore.myshopify.com"
  access_token: string;      // Shopify Admin API token
  review_app: string;        // "judge_me"
  // Optional: Judge.me private API token (backend .env না থাকলে বা override করতে চাইলে)
  review_app_token?: string;
}

// Context এ যা থাকবে
interface ReviewContextType {
  // Analysis results - backend থেকে আসা data
  results: AnalysisResponse | null;

  // Raw shopify data
  products: ShopifyProduct[];
  reviews: JudgeMeReview[];
  productAnalytics: ProductAnalytics[];
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Store configuration
  storeConfig: StoreConfig | null;
  
  // Actions
  setStoreConfig: (config: StoreConfig) => void;      // Store credentials set করা
  fetchReviews: () => Promise<void>;                  // Reviews fetch করা
  clearResults: () => void;                           // Results clear করা
  
  // Last fetch time - কখন শেষবার fetch করা হয়েছে
  lastFetchTime: Date | null;
}

// ============ CONTEXT ============

// Context তৈরি করছি - default value null
const ReviewContext = createContext<ReviewContextType | null>(null);

// ============ PROVIDER COMPONENT ============

interface ReviewProviderProps {
  children: ReactNode;
}

export function ReviewProvider({ children }: ReviewProviderProps) {
  // ============ STATE ============
  
  // Analysis results - backend response
  const [results, setResults] = useState<AnalysisResponse | null>(null);

  // Raw shopify data - Products/Reviews pages এ ব্যবহার হবে
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [reviews, setReviews] = useState<JudgeMeReview[]>([]);
  const [productAnalytics, setProductAnalytics] = useState<ProductAnalytics[]>([]);
  
  // Loading এবং error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Store configuration - localStorage থেকে load করব
  const [storeConfig, setStoreConfigState] = useState<StoreConfig | null>(() => {
    // Component mount হলে localStorage থেকে config load করছি
    const saved = localStorage.getItem('reviewai_store_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });
  
  // Last fetch time
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);

  // Cache/versioning so older caches (e.g. 500 reviews) don't stick around after we increase limits
  const CACHE_VERSION = 2;
  const DEFAULT_REVIEW_LIMIT = 10000; // backend allows up to 10000
  
  // ============ ACTIONS ============
  
  // Store config set করা - localStorage এও save করব
  function setStoreConfig(config: StoreConfig) {
    setStoreConfigState(config);
    localStorage.setItem('reviewai_store_config', JSON.stringify(config));
  }
  
  // Reviews fetch করা - Judge.me API থেকে
  async function fetchReviews() {
    // Config না থাকলে error
    if (!storeConfig) {
      setError('Store configuration not set. Please configure your Shopify store.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Shopify request তৈরি করছি
      const request: ShopifyRequest = {
        store_domain: storeConfig.store_domain,
        access_token: storeConfig.access_token,
        review_app: storeConfig.review_app || 'judge_me',
        // review_app_token দিলে backend সেটাই use করবে; না দিলে backend .env থেকে load করবে
        ...(storeConfig.review_app_token ? { review_app_token: storeConfig.review_app_token } : {}),
        limit: DEFAULT_REVIEW_LIMIT  // Fetch more history for long-range queries (2023+)
      };
      
      // Backend API calls করছি (parallel fetch)
      const [analysisResponse, productsResponse, reviewsResponse, analyticsResponse] = await Promise.all([
        analyzeShopifyReviews(request),
        fetchShopifyProducts(request),
        fetchShopifyReviews(request),
        fetchShopifyProductAnalytics(request)
      ]);

      // Success - states save করছি
      setResults(analysisResponse);
      setProducts(productsResponse);
      setReviews(reviewsResponse);
      setProductAnalytics(analyticsResponse);
      setLastFetchTime(new Date());
      
      // Results localStorage এ cache করছি (সব data একসাথে)
      localStorage.setItem('reviewai_cached_results', JSON.stringify({
        version: CACHE_VERSION,
        data: {
          results: analysisResponse,
          products: productsResponse,
          reviews: reviewsResponse,
          productAnalytics: analyticsResponse
        },
        timestamp: new Date().toISOString()
      }));
      
    } catch (err) {
      // Error handling
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch reviews';
      setError(errorMessage);
      console.error('Fetch reviews error:', err);
    } finally {
      setIsLoading(false);
    }
  }
  
  // Results clear করা
  function clearResults() {
    setResults(null);
    setProducts([]);
    setReviews([]);
    setProductAnalytics([]);
    setLastFetchTime(null);
    localStorage.removeItem('reviewai_cached_results');
  }
  
  // ============ EFFECTS ============
  
  // Component mount হলে cached results load করার চেষ্টা করব
  useEffect(() => {
    const cached = localStorage.getItem('reviewai_cached_results');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const { data, timestamp, version } = parsed || {};
        
        // Cache validity check - 1 ঘন্টার বেশি পুরানো হলে ignore করব
        const cacheAge = Date.now() - new Date(timestamp).getTime();
        const ONE_HOUR = 60 * 60 * 1000;
        const versionOk = version === CACHE_VERSION;

        if (cacheAge < ONE_HOUR && versionOk) {
          // Backward compatible: আগে শুধু results ছিল
          if (data && data.results) {
            setResults(data.results);
            setProducts(data.products || []);
            // Backward compatibility: পুরোনো cache এ id নাও থাকতে পারে
            const cachedReviews = (data.reviews || []).map((r: any, idx: number) => ({
              ...r,
              id: typeof r?.id === 'number' ? r.id : (idx + 1)
            }));
            setReviews(cachedReviews);
            setProductAnalytics(data.productAnalytics || []);
          } else {
            setResults(data);
          }
          setLastFetchTime(new Date(timestamp));
        }
      } catch {
        // Invalid cache - ignore
      }
    }
  }, []);
  
  // Store config থাকলে এবং results না থাকলে auto-fetch করব
  useEffect(() => {
    if (storeConfig && !results && !isLoading && !error) {
      // 500ms delay দিচ্ছি - rapid re-renders এড়াতে
      const timer = setTimeout(() => {
        fetchReviews();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [storeConfig, results, isLoading, error]);
  
  // ============ CONTEXT VALUE ============
  
  const contextValue: ReviewContextType = {
    results,
    products,
    reviews,
    productAnalytics,
    isLoading,
    error,
    storeConfig,
    setStoreConfig,
    fetchReviews,
    clearResults,
    lastFetchTime
  };
  
  return (
    <ReviewContext.Provider value={contextValue}>
      {children}
    </ReviewContext.Provider>
  );
}

// ============ HOOK ============

// Context ব্যবহার করার জন্য custom hook
export function useReviews() {
  const context = useContext(ReviewContext);
  
  if (!context) {
    throw new Error('useReviews must be used within a ReviewProvider');
  }
  
  return context;
}

export default ReviewContext;

