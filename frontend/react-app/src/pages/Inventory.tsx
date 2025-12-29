// ============ INVENTORY/PRODUCTS PAGE ============
// Product listing page - সব products এর overview, sentiment bars, filters সহ

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ratingStatus: 'excellent' | 'good' | 'critical' | 'unlinked';
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
  reviewsGrowth: number;
  globalSentiment: number;
  criticalIssues: number;
}

// ============ MOCK DATA ============

// Mock products list - পরে API থেকে আসবে
const mockProducts: Product[] = [
  {
    id: '1',
    name: 'NoiseCancel Pro X1',
    asin: 'B08X45Y7',
    category: 'Electronics',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDubHHwGdvkihUh1nL9HTan2vxAV0tqzjLhJ9rRCsHf30HhQZeF_Y6YL6fNkZ4HazO5Y6nxJIWVZ6MbfMTm9-zFW3ujbp9CYPy31QmZfUs09T84r_sO_M9yCd_j5O3yvnlp5TR5CJRauR2HvVWBvtyVNibaFtcDCwA9MJjSJXhg03zLNzZkZEXMBgWq-tT3bc9HXIagIBM7tK70p2pFaYFtH2FsFIWUTbANSCaCWxXk1kumNSekVrLlwTQYyffWWsuqO01VHmRBnA',
    rating: 4.8,
    ratingStatus: 'excellent',
    isLinked: true,
    hasCriticalIssue: false,
    sentiment: { positive: 75, neutral: 15, negative: 10 },
    tags: [
      { text: 'Audio Quality', type: 'positive' },
      { text: 'Battery', type: 'positive' },
      { text: 'Price', type: 'negative' }
    ]
  },
  {
    id: '2',
    name: 'Viper Gaming Mouse',
    asin: 'B09Z22K1',
    category: 'Gaming',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD9bcg2svJCpNXCmh2gRVAouZaYq0fq48PHdfll0Q-0sa6TuzrJPBc7rddnI5aU2NdwBHwiWgaMX3kurYYKHrZ7EylH8CvUx_z5pOGoeYwLipFdmy_4rJ9N1p-m-GK970aVO-FolUr3tmLBSMLpWa588CUHVq7icGehTWEJxVghuIykn1xDwGy1o47mtBpDGQGcJGLxFRHCg7iQCa1ySb4iZMIbXIEVJ6JTAQ2y-j_x3c3i3buKpMMGYwTpvtkZGauJm0lh47jAOA',
    rating: 3.2,
    ratingStatus: 'critical',
    isLinked: true,
    hasCriticalIssue: true,
    sentiment: { positive: 30, neutral: 20, negative: 50 },
    tags: [
      { text: 'Scroll Wheel', type: 'negative' },
      { text: 'Connectivity', type: 'negative' }
    ]
  },
  {
    id: '3',
    name: 'MechKey K2',
    asin: '---',
    category: 'Computers',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCDyQ1XaZEJYRmeX3uIX1oYfy-CgN0KekmX2o7Ky0HHwihPkYzypjVhc9nFc6Ystcn_njZxCw60svQfkJvHiIOkuRhGWeUhSABPCjPgyMduZ3hRUOkv-fAjgSfh539RCJuJniKeIZ6954vsL3nAzQo5KIRJhJlfn3PCqKHhQjpILr0rjvmA6os3oZt_XxB7aScIpsDRbQMADGVcNwp_9hseq7QA56e4jIcX6tWrfSAj60hA_rgxdrDKmmbr5IFRTthyf27pT2B7Qg',
    rating: 0,
    ratingStatus: 'unlinked',
    isLinked: false,
    hasCriticalIssue: false,
    sentiment: { positive: 0, neutral: 0, negative: 0 },
    tags: []
  },
  {
    id: '4',
    name: 'SmartFit Band 4',
    asin: 'B07J99L3',
    category: 'Wearables',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBRrNqng61O_TFdxpo_vf8cAV-Y0NLjRb2H9znx_3fjsYdBzTjY2YVviY4oJ65CKEBgDCTfG-QcXjYRHoZQExtI_7qH016XhZTPMsgF_IN_FG64JQh6ZBcL0oE6vZmolMmMdVVLT-xfBB-gdABCOA8ptI50lXSbJ14JJXb1e1bvj8_FM4desSBlR1K--2wPc_oC2Ny62o6vDTrgm5O97GkPsyas5HjbonBdPz5Esf3z5pCsbSN-tDOardj15uhZnZL546ZwDyV5-Q',
    rating: 4.5,
    ratingStatus: 'good',
    isLinked: true,
    hasCriticalIssue: false,
    sentiment: { positive: 60, neutral: 30, negative: 10 },
    tags: [
      { text: 'Comfort', type: 'positive' },
      { text: 'App Sync', type: 'neutral' }
    ]
  },
  {
    id: '5',
    name: 'Ceramic Brew Mug',
    asin: 'B01N88K2',
    category: 'Home',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDOVfzBQw_ItRFtPhTcmxjnz3qlu9_XSs3PMiIhcn_ANCTgVAVeCFuLDgxb0OAkLlHjFkAt591v5l2aBE3njs1WtuZO0zuENb4xR7fP63Lf2wzgejAy8LWfOWYE03IaY9C_rr-DhK2fDHiEj5Iy6bgGfBAL3vyhCGKMeOayZanWVJIk4WTHafosguAxAMe5YJo7Gb_va0dJxqygpsTm5WajzYQF2xoNuCbuB-ss3ehYv62wTDVF6ChrAA65JcjuNlMou37p17dqKw',
    rating: 4.9,
    ratingStatus: 'excellent',
    isLinked: true,
    hasCriticalIssue: false,
    sentiment: { positive: 95, neutral: 5, negative: 0 },
    tags: [
      { text: 'Design', type: 'positive' },
      { text: 'Durability', type: 'positive' },
      { text: 'Giftable', type: 'positive' }
    ]
  }
];

// Mock stats data
const mockStats: StatsData = {
  reviewsAnalyzed: 54200,
  reviewsGrowth: 12,
  globalSentiment: 4.2,
  criticalIssues: 3
};

// ============ COMPONENT ============

function Inventory() {
  const navigate = useNavigate();
  
  // ============ STATE ============
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'critical' | 'highVolume' | 'unlinked'>('all');
  const [products] = useState<Product[]>(mockProducts);
  const [stats] = useState<StatsData>(mockStats);
  
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
      matchesFilter = product.rating >= 4.5;
    } else if (activeFilter === 'unlinked') {
      matchesFilter = !product.isLinked;
    }
    
    return matchesSearch && matchesFilter;
  });
  
  // Product details page এ navigate করা
  const handleProductClick = (productId: string) => {
    navigate(`/product/${productId}`);
  };
  
  // Product insights page এ navigate করা
  const handleInsightsClick = (productId: string) => {
    navigate(`/product/${productId}/insights`);
  };
  
  // Rating status অনুযায়ী text return করে
  const getRatingStatusText = (status: Product['ratingStatus']): string => {
    switch (status) {
      case 'excellent': return 'Excellent';
      case 'good': return 'Good';
      case 'critical': return 'Critical';
      case 'unlinked': return 'Unlinked';
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
              <span className="stat-badge positive">
                <span className="material-symbols-outlined">trending_up</span>
                {stats.reviewsGrowth}%
              </span>
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
            className={`filter-btn ${activeFilter === 'unlinked' ? 'active' : ''}`}
            onClick={() => setActiveFilter('unlinked')}
          >
            <span className="material-symbols-outlined">link_off</span>
            Unlinked
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
            className={`product-card card-3d ${product.hasCriticalIssue ? 'critical' : ''} ${!product.isLinked ? 'unlinked' : ''}`}
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
                  <div className="unlinked-overlay">
                    <span className="material-symbols-outlined">link_off</span>
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
                  </>
                ) : (
                  <>
                    <div className="rating-value unlinked">
                      <span>--</span>
                    </div>
                    <span className="rating-status unlinked">Unlinked</span>
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
              <div className="unlinked-section">
                <p>Connect a source to start analyzing reviews with AI.</p>
              </div>
            )}
            
            {/* Actions */}
            <div className="product-actions">
              {product.isLinked ? (
                <>
                  <button 
                    className="btn-secondary"
                    onClick={() => handleProductClick(product.id)}
                  >
                    Details
                  </button>
                  <button 
                    className={`btn-primary ${product.hasCriticalIssue ? 'critical' : ''}`}
                    onClick={() => handleInsightsClick(product.id)}
                  >
                    {product.hasCriticalIssue ? (
                      <>
                        Fix Issues
                        <span className="material-symbols-outlined">build</span>
                      </>
                    ) : (
                      <>
                        Insights
                        <span className="material-symbols-outlined">arrow_forward</span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                <button className="btn-connect">
                  <span className="material-symbols-outlined">link</span>
                  Connect Source
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
