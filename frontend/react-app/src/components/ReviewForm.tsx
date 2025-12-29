// ============ REVIEW FORM COMPONENT ============
// User এর কাছ থেকে reviews input নেওয়ার form
// এই form submit হলে backend এ reviews পাঠানো হয় analysis এর জন্য

import { useState } from 'react';

// api.ts থেকে types এবং functions import করছি
import { analyzeReviews, type AnalysisResponse } from '../api';


// ============ COMPONENT PROPS INTERFACE ============
// Parent component থেকে যা আসবে এবং যা পাঠাবে

interface ReviewFormProps {
  // Analysis complete হলে results parent এ পাঠানোর জন্য callback
  // Dashboard এ এই function define করা থাকবে
  onAnalysisComplete: (results: AnalysisResponse) => void;
  
  // Optional: Loading state parent এ জানানোর জন্য
  onLoadingChange?: (isLoading: boolean) => void;
}


// ============ MAIN COMPONENT ============

function ReviewForm({ onAnalysisComplete, onLoadingChange }: ReviewFormProps) {
  // ============ STATE MANAGEMENT ============
  // useState hook দিয়ে component এর local state manage করছি
  
  // reviewText: Textarea তে user যা লিখবে
  // setReviewText: এই state update করার function
  const [reviewText, setReviewText] = useState<string>('');
  
  // productLink: Optional product URL
  const [productLink, setProductLink] = useState<string>('');
  
  // isLoading: API call চলছে কিনা
  // true হলে button disabled থাকবে, loading indicator দেখাবে
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // error: কোনো error হলে এখানে store হবে
  // null মানে কোনো error নেই
  const [error, setError] = useState<string | null>(null);
  
  
  // ============ FORM SUBMISSION HANDLER ============
  // Form submit হলে এই function run হবে
  
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    // Default form submission prevent করছি (page reload হতো)
    event.preventDefault();
    
    // আগের error clear করছি
    setError(null);
    
    // ========== INPUT VALIDATION ==========
    // Textarea খালি হলে error দেখাবো
    if (!reviewText.trim()) {
      setError('Please enter at least one review.');
      return; // Function এখানে থেমে যাবে
    }
    
    // ========== REVIEWS PARSING ==========
    // Textarea থেকে reviews আলাদা করছি
    // প্রতি নতুন line এ একটা review ধরে নিচ্ছি
    // filter(Boolean) দিয়ে empty strings বাদ দিচ্ছি
    const reviews = reviewText
      .split('\n')                    // Line break দিয়ে split
      .map(line => line.trim())       // প্রতিটা line এর whitespace remove
      .filter(Boolean);               // Empty strings filter out
    
    // যদি valid reviews না থাকে
    if (reviews.length === 0) {
      setError('Please enter at least one valid review.');
      return;
    }
    
    // ========== API CALL ==========
    try {
      // Loading state on করছি
      setIsLoading(true);
      // Parent কে জানাচ্ছি loading শুরু হয়েছে
      onLoadingChange?.(true);
      
      // Backend এ reviews পাঠাচ্ছি
      // productLink খালি হলে undefined পাঠাবে
      const result = await analyzeReviews(
        reviews,
        productLink.trim() || undefined
      );
      
      // Success! Results parent component এ পাঠাচ্ছি
      onAnalysisComplete(result);
      
      // Form clear করছি (optional - চাইলে রেখে দিতে পারো)
      // setReviewText('');
      // setProductLink('');
      
    } catch (err) {
      // Error হলে error message set করছি
      // err যদি Error object হয় তাহলে message নিচ্ছি
      // না হলে generic message
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Something went wrong. Please try again.';
      setError(errorMessage);
      
    } 
    finally {
      // try বা catch যেটাই হোক, শেষে loading off করছি
      setIsLoading(false);
      onLoadingChange?.(false);
    }
  }
  
  
  // ============ RENDER ============
  // Component এর UI return করছি
  
  return (
      /* Form element - onSubmit এ handleSubmit function call হবে */
      <form onSubmit={handleSubmit} className="review-form">
        
        {/* ========== REVIEWS TEXTAREA ========== */}
        <div className="form-group">
          <label htmlFor="reviews">Reviews *</label>
          <textarea
            id="reviews"
            // value এবং onChange দিয়ে controlled input বানাচ্ছি
            // React এই input এর value control করছে
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Enter reviews here...&#10;&#10;Example:&#10;This product is amazing!&#10;Terrible quality, broke after one week.&#10;Great value for money."
            rows={8}
            // Loading এ থাকলে input disabled থাকবে
            disabled={isLoading}
            className="review-textarea"
          />
          <small className="input-hint">
            Enter one review per line. Empty lines will be ignored.
          </small>
        </div>
        
        {/* ========== PRODUCT LINK INPUT (Optional) ========== */}
        <div className="form-group">
          <label htmlFor="product-link">Product Link (Optional)</label>
          <input
            type="url"
            id="product-link"
            value={productLink}
            onChange={(e) => setProductLink(e.target.value)}
            placeholder="https://www.amazon.com/product/..."
            disabled={isLoading}
            className="product-link-input"
          />
          <small className="input-hint">
            Paste a product URL for reference (scraping coming soon)
          </small>
        </div>
        
        {/* ========== ERROR MESSAGE ========== */}
        {/* error null না হলে error message দেখাবে */}
        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}
        
        {/* ========== SUBMIT BUTTON ========== */}
        <button
          type="submit"
          disabled={isLoading}
          className="submit-button"
        >
          {/* Loading হলে different text দেখাবে */}
          {isLoading ? '🔄 Analyzing...' : '🔍 Analyze Reviews'}
        </button>
        
      </form>
  );
}

export default ReviewForm;
