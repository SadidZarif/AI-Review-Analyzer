// ============ INVENTORY/PRODUCTS PAGE ============
// Product listing page - সব products এর overview, sentiment bars, filters সহ

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

// Context - global state থেকে results নেব
import { useReviews } from '../context/ReviewContext';

import '../styles/Inventory.css';

// ============ TYPE DEFINITIONS ============

// Product এর data structure
interface Product {
  id: string;
  name: string;
  asin: string;
  category: string;
  image: string;
  rating: number;
  ratingStatus: 'excellent' | 'good' | 'issues' | 'critical' | 'no_reviews';
  isLinked: boolean;
  hasCriticalIssue: boolean;
  // Sentiment breakdown (percentage)
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
  // Top keywords/tags
  tags: Array<{
    text: string;
    type: 'positive' | 'neutral' | 'negative';
  }>;
}

// Stats cards এর data
interface StatsData {
  reviewsAnalyzed: number;
  // Historical growth isn't available yet from backend; keep null instead of mock %
  reviewsGrowth: number | null;
  globalSentiment: number;
  criticalIssues: number;
}

// ============ NOTE ============
// আগে এখানে mock products list ছিল।
// এখন Products page সম্পূর্ণ Shopify/Judge.me data থেকে populate হয় (ReviewContext থেকে)।

// ============ COMPONENT ============

function Inventory() {
  const navigate = useNavigate();
  
  // ============ CONTEXT - GLOBAL STATE ============
  const { results, isLoading, error, products: shopifyProducts, productAnalytics } = useReviews();
  
  // ============ STATE ============
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'critical' | 'highVolume' | 'noReviews'>('all');
  
  // ============ PRODUCTS DATA ============ 
  // Shopify থেকে আসা products + analytics merge করে UI-friendly structure বানাচ্ছি
  const products: Product[] = useMemo(() => {
    // Shopify data না থাকলে empty list return করব (mock দেখাব না)
    if (!shopifyProducts || shopifyProducts.length === 0) {
      return [];
    }
    
    return shopifyProducts.map((p) => {
      // Analytics match করার চেষ্টা (product_id match first, fallback title)
      const analytics = productAnalytics.find(a => 
        (a.product_id && a.product_id === p.id) || 
        (a.product_title && a.product_title === p.title)
      );
      
      const avgRating = analytics?.average_rating ?? 0;
      const pos = analytics?.positive_percentage ?? 0;
      const neg = analytics?.negative_percentage ?? 0;
      const neutral = Math.max(0, 100 - pos - neg);
      
      // Rating status define করছি
      const ratingStatus: Product['ratingStatus'] = !analytics
        ? 'no_reviews'
        : avgRating >= 4.5
          ? 'excellent'
          : avgRating >= 4.0
            ? 'good'
            : avgRating >= 3.5
              ? 'issues'
              : 'critical';
      
      // Critical issue detection
      // বাংলা: 3.5-3.9 -> Issues Found, <3.5 -> Critical
      const hasCriticalIssue =
        Boolean(analytics) && (
          ratingStatus === 'issues' ||
          ratingStatus === 'critical' ||
          neg >= 40
        );
      
      // Tags/topics mapping (UI badges)
      const tags: Product['tags'] = [];
      (analytics?.top_positive_topics || []).slice(0, 2).forEach(t => {
        tags.push({ text: t, type: 'positive' });
      });
      (analytics?.top_negative_topics || []).slice(0, 2).forEach(t => {
        tags.push({ text: t, type: 'negative' });
      });
      
      return {
        id: String(p.id),
        name: p.title,
        asin: String(p.id), // Shopify product id ব্যবহার করছি placeholder হিসেবে
        category: p.product_type || 'Uncategorized',
        image: p.image_url || '',
        rating: avgRating,
        ratingStatus,
        isLinked: Boolean(analytics),
        hasCriticalIssue,
        sentiment: { positive: pos, neutral, negative: neg },
        tags
      };
    });
  }, [shopifyProducts, productAnalytics]);

  // Top Rated product (single) - highest rating among linked products
  const topRatedId = useMemo(() => {
    const linked = products.filter(p => p.isLinked && p.rating > 0);
    if (linked.length === 0) return null;
    const best = linked.reduce((acc, cur) => (cur.rating > acc.rating ? cur : acc), linked[0]);
    return best.id;
  }, [products]);
  
  // ============ DERIVED STATE ============
  // Context এর results থেকে stats calculate করছি
  const stats: StatsData = useMemo(() => {
    if (results) {
      return {
        reviewsAnalyzed: results.total_reviews,
        reviewsGrowth: null, // No mock: show as unavailable until we have history
        globalSentiment: parseFloat((results.positive_percentage / 20).toFixed(1)), // 0-100 to 0-5 scale
        criticalIssues: results.negative_count > 10 ? Math.min(results.negative_count, 5) : 0
      };
    }
    return {
      reviewsAnalyzed: 0,
      reviewsGrowth: null,
      globalSentiment: 0,
      criticalIssues: 0
    };
  }, [results]);
  
  // ============ HANDLERS ============
  
  // Search filter করা
  const filteredProducts = products.filter(product => {
    // Search query match করছে কিনা
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.asin.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filter match করছে কিনা
    let matchesFilter = true;
    if (activeFilter === 'critical') {
      matchesFilter = product.hasCriticalIssue;
    } else if (activeFilter === 'highVolume') {
      // User request: show Good + Excellent products
      matchesFilter = product.isLinked && (product.ratingStatus === 'excellent' || product.ratingStatus === 'good');
    } else if (activeFilter === 'noReviews') {
      matchesFilter = !product.isLinked;
    }
    
    return matchesSearch && matchesFilter;
  });
  
  // Product details page এ navigate করা
  const handleProductClick = (productId: string) => {
    navigate(`/product/${productId}/insights`);
  };
 
  const handleFixIssuesClick = (productId: string) => {
    navigate(`/product/${productId}/fix-issues`);
  };
  
  // Rating status অনুযায়ী text return করে
  const getRatingStatusText = (status: Product['ratingStatus']): string => {
    switch (status) {
      case 'excellent': return 'Excellent';
      case 'good': return 'Good';
      case 'issues': return 'Issues Found';
      case 'critical': return 'Critical';
      case 'no_reviews': return 'No Reviews';
      default: return '';
    }
  };
  
  // Number format করা (54200 → "54.2k")
  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };
  
  // ============ RENDER ============
  
  return (
    <div className="inventory-page">
      {/* ========== LOADING STATE ========== */}
      {isLoading && (
        <div style={{
          padding: '1rem',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '8px',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span className="material-symbols-outlined" style={{ color: '#3b82f6', animation: 'spin 1s linear infinite' }}>sync</span>
          <span style={{ color: '#3b82f6' }}>Fetching latest reviews from Judge.me...</span>
        </div>
      )}
      
      {/* ========== ERROR STATE ========== */}
      {error && (
        <div style={{
          padding: '1rem',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span className="material-symbols-outlined" style={{ color: '#ef4444' }}>error</span>
          <span style={{ color: '#ef4444' }}>{error}</span>
        </div>
      )}
      
      {/* ========== PAGE HEADER ========== */}
      <section className="page-header-section">
        <div className="header-content">
          <h1 className="page-title">Product Inventory</h1>
          <p className="page-subtitle">
            Monitor AI insights, manage connections, and optimize your product reputation.
          </p>
        </div>
        
        {/* Stats Cards */}
        <div className="stats-cards">
          {/* Reviews Analyzed */}
          <div className="stat-card stat-card-3d">
            <div className="stat-icon-bg">
              <span className="material-symbols-outlined">analytics</span>
            </div>
            <p className="stat-label">Reviews Analyzed</p>
            <div className="stat-value-row">
              <span className="stat-value">{formatNumber(stats.reviewsAnalyzed)}</span>
              {typeof stats.reviewsGrowth === 'number' ? (
                <span className="stat-badge positive">
                  <span className="material-symbols-outlined">trending_up</span>
                  {stats.reviewsGrowth}%
                </span>
              ) : (
                <span className="stat-badge neutral">—</span>
              )}
            </div>
          </div>
          
          {/* Global Sentiment */}
          <div className="stat-card stat-card-3d">
            <div className="stat-icon-bg">
              <span className="material-symbols-outlined">sentiment_satisfied</span>
            </div>
            <p className="stat-label">Global Sentiment</p>
            <div className="stat-value-row">
              <span className="stat-value">{stats.globalSentiment}</span>
              <span className="stat-unit">/ 5.0</span>
            </div>
            <div className="sentiment-bar-mini">
              <div 
                className="sentiment-bar-fill" 
                style={{ width: `${(stats.globalSentiment / 5) * 100}%` }}
              ></div>
            </div>
          </div>
          
          {/* Critical Issues */}
          <div className="stat-card stat-card-3d stat-warning">
            <div className="stat-icon-bg">
              <span className="material-symbols-outlined">warning</span>
            </div>
            <p className="stat-label">Critical Issues</p>
            <div className="stat-value-row">
              <span className="stat-value">{stats.criticalIssues}</span>
              <span className="stat-badge warning">Action Needed</span>
            </div>
          </div>
        </div>
      </section>
      
      {/* ========== FILTERS & SEARCH ========== */}
      <section className="filters-section glass-panel">
        {/* Search Input */}
        <div className="search-wrapper">
          <span className="material-symbols-outlined search-icon">search</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search by product name, ASIN, or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        {/* Filter Buttons */}
        <div className="filter-buttons">
          <button 
            className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            All Products
          </button>
          <button 
            className={`filter-btn ${activeFilter === 'critical' ? 'active' : ''}`}
            onClick={() => setActiveFilter('critical')}
          >
            <span className="filter-dot red"></span>
            Critical Issues
          </button>
          <button 
            className={`filter-btn ${activeFilter === 'highVolume' ? 'active' : ''}`}
            onClick={() => setActiveFilter('highVolume')}
          >
            <span className="filter-dot green"></span>
            High Volume
          </button>
          <button 
            className={`filter-btn ${activeFilter === 'noReviews' ? 'active' : ''}`}
            onClick={() => setActiveFilter('noReviews')}
          >
            <span className="material-symbols-outlined">speaker_notes_off</span>
            No Reviews
          </button>
        </div>
        
        {/* Divider */}
        <div className="filter-divider"></div>
        
        {/* Add Product Button */}
        <button className="add-product-btn">
          <span className="material-symbols-outlined">add</span>
          Add Product
        </button>
      </section>
      
      {/* ========== PRODUCT GRID ========== */}
      <section className="products-grid">
        {filteredProducts.map((product) => (
          <div 
            key={product.id} 
            className={`product-card card-3d ${product.isLinked ? 'clickable' : ''} ${product.hasCriticalIssue ? 'critical' : ''} ${!product.isLinked ? 'no-reviews' : ''}`}
            onClick={() => { if (product.isLinked) handleProductClick(product.id); }}
            role={product.isLinked ? 'button' : undefined}
            tabIndex={product.isLinked ? 0 : -1}
            onKeyDown={(e) => {
              if (!product.isLinked) return;
              if (e.key === 'Enter' || e.key === ' ') handleProductClick(product.id);
            }}
          >
            {/* Critical Indicator */}
            {product.hasCriticalIssue && (
              <div className="critical-indicator"></div>
            )}
            
            {/* Product Header */}
            <div className="product-header">
              {/* Product Image */}
              <div className={`product-image ${!product.isLinked ? 'grayscale' : ''}`}>
                <img src={product.image} alt={product.name} />
                {!product.isLinked && (
                  <div className="no-reviews-overlay">
                    <span className="material-symbols-outlined">speaker_notes_off</span>
                  </div>
                )}
              </div>
              
              {/* Rating */}
              <div className="product-rating">
                {product.isLinked ? (
                  <>
                    <div className="rating-value">
                      <span className="material-symbols-outlined star-icon">star</span>
                      <span>{product.rating}</span>
                    </div>
                    <span className={`rating-status ${product.ratingStatus}`}>
                      {getRatingStatusText(product.ratingStatus)}
                    </span>
                    {topRatedId && product.id === topRatedId && (
                      <div className="top-rated">
                        <span className="material-symbols-outlined">crown</span>
                        <span>Top Rated</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="rating-value no-reviews">
                      <span>--</span>
                    </div>
                    <span className="rating-status no_reviews">No Reviews</span>
                  </>
                )}
              </div>
            </div>
            
            {/* Product Info */}
            <div className="product-info">
              <h3 className="product-name">{product.name}</h3>
              <p className="product-meta">
                ASIN: {product.asin} • {product.category}
              </p>
            </div>
            
            {/* Sentiment Analysis */}
            {product.isLinked ? (
              <div className="sentiment-section">
                <div className="sentiment-header">
                  <span>Sentiment Analysis</span>
                  {product.hasCriticalIssue ? (
                    <span className="sentiment-status critical">
                      <span className="material-symbols-outlined">warning</span>
                      Issues Found
                    </span>
                  ) : (
                    <span className="sentiment-status active">Active</span>
                  )}
                </div>
                
                {/* Sentiment Bar */}
                <div className="sentiment-bar">
                  <div 
                    className="sentiment-positive" 
                    style={{ width: `${product.sentiment.positive}%` }}
                  ></div>
                  <div 
                    className="sentiment-neutral" 
                    style={{ width: `${product.sentiment.neutral}%` }}
                  ></div>
                  <div 
                    className="sentiment-negative" 
                    style={{ width: `${product.sentiment.negative}%` }}
                  ></div>
                </div>
                
                {/* Tags */}
                <div className="product-tags">
                  {product.tags.map((tag, index) => (
                    <span key={index} className={`product-tag ${tag.type}`}>
                      {tag.text}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="no-reviews-section">
                <p>No reviews found for this product in Judge.me.</p>
              </div>
            )}
            
            {/* Actions */}
            <div className="product-actions">
              {product.isLinked ? (
                <>
                  {(product.ratingStatus === 'excellent' || product.ratingStatus === 'good') ? (
                    <button
                      className="btn-primary"
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleProductClick(product.id); }}
                      style={{ width: '100%' }}
                    >
                      Insights
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </button>
                  ) : (
                    <>
                      <button
                        className="btn-secondary"
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleProductClick(product.id); }}
                      >
                        Insights
                      </button>
                      <button
                        className="btn-primary critical"
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleFixIssuesClick(product.id); }}
                      >
                        Fix Issues
                        <span className="material-symbols-outlined">build</span>
                      </button>
                    </>
                  )}
                </>
              ) : (
                <button className="btn-connect" type="button" disabled title="No reviews available for this product" onClick={(e) => e.stopPropagation()}>
                  <span className="material-symbols-outlined">visibility_off</span>
                  No Reviews
                </button>
              )}
            </div>
          </div>
        ))}
        
        {/* Add New Product Card */}
        <div className="product-card add-card">
          <div className="add-icon">
            <span className="material-symbols-outlined">add</span>
          </div>
          <h3>Add New Product</h3>
          <p>Import from Amazon or Shopify to start tracking.</p>
        </div>
      </section>
      
      {/* ========== MOBILE FAB ========== */}
      <button className="mobile-fab">
        <span className="material-symbols-outlined">add</span>
      </button>
    </div>
  );
}

export default Inventory;
