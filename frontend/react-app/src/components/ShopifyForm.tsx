// ============ SHOPIFY FORM COMPONENT ============
// Shopify store থেকে reviews fetch করার form
// Judge.me API token দিয়ে reviews fetch করবে

import { useState, useEffect } from 'react';
import { analyzeShopifyReviews, type AnalysisResponse, type ShopifyRequest } from '../api';

// Context - store config এর জন্য
import { useReviews } from '../context/ReviewContext';

interface ShopifyFormProps {
  onAnalysisComplete: (results: AnalysisResponse) => void;
  onLoadingChange?: (isLoading: boolean) => void;
}

function ShopifyForm({ onAnalysisComplete, onLoadingChange }: ShopifyFormProps) {
  // ============ CONTEXT ============
  const { storeConfig, setStoreConfig } = useReviews();
  
  // ============ LOCAL STATE ============
  // Context থেকে initial values নিচ্ছি (যদি আগে save করা থাকে)
  const [storeDomain, setStoreDomain] = useState<string>(storeConfig?.store_domain || '');
  const [accessToken, setAccessToken] = useState<string>(storeConfig?.access_token || '');
  const [limit, setLimit] = useState<number>(500);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Context change হলে form update করব
  useEffect(() => {
    if (storeConfig) {
      setStoreDomain(storeConfig.store_domain);
      setAccessToken(storeConfig.access_token);
    }
  }, [storeConfig]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!storeDomain.trim()) {
      setError('Store domain is required');
      return;
    }

    if (!accessToken.trim()) {
      setError('Shopify access token is required');
      return;
    }

    try {
      setIsLoading(true);
      onLoadingChange?.(true);

      const request: ShopifyRequest = {
        store_domain: storeDomain.trim(),
        access_token: accessToken.trim(),
        limit: limit || 500,
        review_app: "judge_me",  // Judge.me use করছি
        // review_app_token optional - .env file থেকে load হবে
      };
      
      // Store config save করছি context এ (localStorage এও save হবে)
      setStoreConfig({
        store_domain: storeDomain.trim(),
        access_token: accessToken.trim(),
        review_app: 'judge_me'
      });

      const result = await analyzeShopifyReviews(request);
      onAnalysisComplete(result);

    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Something went wrong. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      onLoadingChange?.(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="review-form">
      <div className="form-group">
        <label htmlFor="store-domain">Shopify Store Domain *</label>
        <input
          type="text"
          id="store-domain"
          value={storeDomain}
          onChange={(e) => setStoreDomain(e.target.value)}
          placeholder="your-store.myshopify.com"
          disabled={isLoading}
          className="product-link-input"
        />
        <small className="input-hint">
          Your Shopify store domain (e.g., "mystore.myshopify.com")
        </small>
      </div>

      <div className="form-group">
        <label htmlFor="access-token">Shopify Admin API Access Token *</label>
        <input
          type="password"
          id="access-token"
          value={accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
          placeholder="shpat_xxxxx"
          disabled={isLoading}
          className="product-link-input"
        />
        <small className="input-hint">
          Get it from Shopify Admin &gt; Apps &gt; Develop apps
        </small>
      </div>

      <div className="form-group">
        <label htmlFor="limit">Maximum Reviews to Fetch</label>
        <input
          type="number"
          id="limit"
          value={limit}
          onChange={(e) => setLimit(parseInt(e.target.value) || 500)}
          min={1}
          max={10000}
          disabled={isLoading}
          className="product-link-input"
        />
        <small className="input-hint">
          Maximum number of reviews to analyze (default: 500)
        </small>
      </div>

      <div className="form-group" style={{ 
        padding: '1rem', 
        backgroundColor: 'rgba(59, 130, 246, 0.1)', 
        borderRadius: '8px',
        marginBottom: '1rem'
      }}>
        <p style={{ margin: 0, fontSize: '0.875rem', color: '#94a3b8' }}>
          <strong>Note:</strong> Judge.me API token is automatically loaded from backend environment variables.
          Make sure your backend has <code>JUDGE_ME_API_TOKEN</code> set in <code>.env</code> file.
        </p>
      </div>

      {error && (
        <div className="error-message">
          <span className="material-symbols-outlined">warning</span>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="submit-button"
      >
        {isLoading ? (
          <>
            <span className="material-symbols-outlined spinning">sync</span>
            Fetching Reviews...
          </>
        ) : (
          <>
            <span className="material-symbols-outlined">store</span>
            Fetch & Analyze Reviews
          </>
        )}
      </button>
    </form>
  );
}

export default ShopifyForm;

