// ============ DASHBOARD PAGE - COMPLETE REDESIGN ============
// Full-featured dashboard - metrics, trends, reviews feed এবং keyword cloud সহ

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Components import
import MetricCard from '../components/MetricCard';
import TrendChart from '../components/TrendChart';
import ReviewCard from '../components/ReviewCard';
import ReviewForm from '../components/ReviewForm';
import ShopifyForm from '../components/ShopifyForm';
import DateRangePicker, { type DateRange } from '../components/DateRangePicker';

// API types এবং utilities
import { type AnalysisResponse } from '../api';
import { mapSentimentToStars, formatNumber } from '../utils/helpers';
import { generateMockReviewer, generateAIReply } from '../utils/mockData';

// Styles import
import '../styles/Dashboard.css';


function Dashboard() {
  // ============ STATE MANAGEMENT ============
  
  // Real analysis results (backend থেকে আসবে)
  const [results, setResults] = useState<AnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // ReviewForm show/hide state - modal বা section toggle করার জন্য
  const [showReviewForm, setShowReviewForm] = useState<boolean>(false);
  const [showShopifyForm, setShowShopifyForm] = useState<boolean>(false);
  
  // Actual results availability flag
  const hasResults = Boolean(results);
  
  // Date range state - custom date range selection এর জন্য
  // Default: শেষ 30 দিনের data show করবে
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // শেষ 30 দিন
    return {
      startDate,
      endDate
    };
  });
  
  // Navigation hook - review details page এ যাওয়ার জন্য
  const navigate = useNavigate();
  
  
  // ============ HANDLERS ============
  
  // Analysis complete callback - ReviewForm বা ShopifyForm থেকে call হবে
  function handleAnalysisComplete(data: AnalysisResponse) {
    setResults(data);
    setShowReviewForm(false); // Analysis complete হলে form hide করছি
    setShowShopifyForm(false); // Shopify form ও hide করছি
  }
  
  // Loading state change callback
  function handleLoadingChange(loading: boolean) {
    setIsLoading(loading);
  }
  
  // Review card click - details page এ navigate করবে
  function handleReviewClick(index: number) {
    // Review ID দিয়ে details page এ navigate করছি
    navigate(`/review/${index + 1}`);
  }
  
  // Quick reply handler - AI suggestion থেকে reply করতে
  function handleQuickReply() {
    alert('Quick reply feature coming soon!');
  }
  
  // Export report handler
  function handleExportReport() {
    alert('Export report feature coming soon!');
  }
  
  
  // ============ RENDER ============
  
  return (
    <div className="dashboard-modern">
      {/* ========== HEADER SECTION ========== */}
      <header className="dashboard-header-modern">
        <div className="header-text">
          <h1 className="header-title">Welcome back, ElectroStore</h1>
          <p className="header-subtitle">
            Here is your review performance overview for today.
          </p>
        </div>
        
        <div className="header-actions">
          {/* Shopify Integration Button - Judge.me থেকে reviews fetch করার জন্য */}
          <button 
            className="export-btn" 
            onClick={() => setShowShopifyForm(true)}
            style={{ marginRight: '1rem', backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
          >
            <span className="material-symbols-outlined">store</span>
            <span>Fetch from Shopify</span>
          </button>
          
          {/* Analyze Reviews Button - Manual ReviewForm open করার জন্য */}
          <button 
            className="export-btn" 
            onClick={() => setShowReviewForm(true)}
            style={{ marginRight: '1rem' }}
          >
            <span className="material-symbols-outlined">rate_review</span>
            <span>Analyze Reviews</span>
          </button>
          
          {/* Date Range Picker - Custom date range selection */}
          <DateRangePicker 
            onDateRangeChange={setDateRange}
            defaultStartDate={dateRange.startDate || undefined}
            defaultEndDate={dateRange.endDate || undefined}
          />
          
          {/* Export Button */}
          <button className="export-btn" onClick={handleExportReport}>
            <span className="material-symbols-outlined">download</span>
            <span>Export Report</span>
          </button>
        </div>
      </header>
      
      
      {/* ========== SHOPIFY FORM MODAL ========== */}
      {showShopifyForm && (
        <div 
          className="modal-overlay" 
          onClick={() => setShowShopifyForm(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div 
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#1e293b',
              padding: '2rem',
              borderRadius: '12px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, color: '#fff' }}>Fetch Reviews from Shopify</h2>
              <button 
                onClick={() => setShowShopifyForm(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  fontSize: '1.5rem',
                  cursor: 'pointer'
                }}
              >
                ×
              </button>
            </div>
            <ShopifyForm 
              onAnalysisComplete={handleAnalysisComplete}
              onLoadingChange={handleLoadingChange}
            />
          </div>
        </div>
      )}
      
      {/* ========== REVIEW FORM MODAL ========== */}
      {showReviewForm && (
        <div 
          className="modal-overlay" 
          onClick={() => setShowReviewForm(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div 
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#1e293b',
              padding: '2rem',
              borderRadius: '12px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, color: '#fff' }}>Analyze Reviews</h2>
              <button 
                onClick={() => setShowReviewForm(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  fontSize: '1.5rem',
                  cursor: 'pointer'
                }}
              >
                ×
              </button>
            </div>
            <ReviewForm 
              onAnalysisComplete={handleAnalysisComplete}
              onLoadingChange={handleLoadingChange}
            />
          </div>
        </div>
      )}
      
      {/* ========== METRICS ROW ========== */}
      <section className="metrics-section">
        {/* Sentiment Score Card - Green theme */}
        <MetricCard
          label="SENTIMENT SCORE"
          value={hasResults ? Math.round(results.positive_percentage) : '—'}
          unit={hasResults ? '/100' : undefined}
          icon="sentiment_satisfied"
          iconColor="linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.05))"
          iconTextColor="#22c55e"
          changeType="neutral"
          progressValue={hasResults ? Math.round(results.positive_percentage) : undefined}
          progressType="positive"
        />
        
        {/* Review Volume Card - Blue theme */}
        <MetricCard
          label="REVIEW VOLUME"
          value={hasResults ? formatNumber(results.total_reviews) : '—'}
          icon="bar_chart"
          iconColor="linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(59, 130, 246, 0.05))"
          iconTextColor="#3b82f6"
          changeType="neutral"
          miniChart={
            // Mini chart bars - Blue colored
            <div className="mini-chart-bars">
              <div className="bar" style={{ height: '30%', opacity: 0.3, background: '#3b82f6' }}></div>
              <div className="bar" style={{ height: '40%', opacity: 0.4, background: '#3b82f6' }}></div>
              <div className="bar" style={{ height: '60%', opacity: 0.6, background: '#3b82f6' }}></div>
              <div className="bar" style={{ height: '80%', opacity: 0.8, background: '#3b82f6' }}></div>
              <div className="bar" style={{ height: '100%', opacity: 1, background: '#3b82f6' }}></div>
              <div className="bar" style={{ height: '20%', opacity: 0.2, background: '#3b82f6' }}></div>
            </div>
          }
        />
        
        {/* Positive Reviews Card - Green theme */}
        <MetricCard
          label="POSITIVE REVIEWS"
          value={hasResults ? formatNumber(results.positive_count) : '—'}
          icon="thumb_up"
          iconColor="linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.05))"
          iconTextColor="#22c55e"
          changeType="neutral"
          progressValue={hasResults && results.total_reviews > 0
            ? (results.positive_count / results.total_reviews) * 100
            : undefined}
          progressType="positive"
        />
        
        {/* Negative Reviews Card - Red theme */}
        <MetricCard
          label="NEGATIVE REVIEWS"
          value={hasResults ? formatNumber(results.negative_count) : '—'}
          icon="thumb_down"
          iconColor="linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))"
          iconTextColor="#ef4444"
          changeType="neutral"
          progressValue={hasResults && results.total_reviews > 0
            ? (results.negative_count / results.total_reviews) * 100
            : undefined}
          progressType="negative"
        />
        
        {/* Pending Actions Card - Orange theme */}
        <MetricCard
          label="PENDING ACTIONS"
          value={hasResults ? formatNumber(results.negative_count) : '—'}
          icon="pending_actions"
          iconColor="linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.05))"
          iconTextColor="#f59e0b"
          changeValue={hasResults ? 'Needs reply' : undefined}
          changeLabel={hasResults ? 'negative reviews pending' : undefined}
          changeType="negative"
          miniChart={
            // User avatars (mock)
            <div className="user-avatars-stack">
              <div className="avatar" style={{ backgroundColor: '#ef4444' }}>SJ</div>
              <div className="avatar" style={{ backgroundColor: '#3b82f6' }}>MR</div>
              <div className="avatar" style={{ backgroundColor: '#22c55e' }}>EW</div>
              <div className="avatar-more">+{hasResults ? Math.max(results.negative_count - 3, 0) : 0}</div>
            </div>
          }
        />
      </section>
      
      
      {/* ========== TREND CHART & AI INSIGHT ========== */}
      <section className="chart-ai-section">
        {/* Trend Chart (2/3 width) */}
        <div className="trend-chart-wrapper">
          <TrendChart dateRange={dateRange} />
        </div>
        
        {/* AI Insight Box (1/3 width) - Gradient border effect */}
        <div className="ai-insight-modern">
          {/* Inner wrapper - dark background */}
          <div className="ai-insight-inner">
            <div className="ai-insight-header">
              <div className="ai-badge">
                <span className="material-symbols-outlined">auto_awesome</span>
              </div>
              <h3>AI SUMMARY</h3>
            </div>
            
            {/* AI Visual */}
            <div className="ai-visual-box">
              <div className="ai-visual-content">
                <img 
                  src="/src/assets/images/ai.png" 
                  alt="AI Assistant" 
                  className="ai-image"
                />
                <p className="ai-status">ANALYZING CLUSTERS...</p>
                <div className="ai-progress-bar">
                  <div className="ai-progress-fill"></div>
                </div>
              </div>
            </div>
            
            {/* AI Insight Text */}
            {results ? (
              <>
                <h4 className="ai-insight-title">
                  {results.positive_percentage >= 50
                    ? 'Battery Life Praise'
                    : 'Areas Need Improvement'
                  }
                </h4>
                <p className="ai-insight-description">
                  Customers are consistently mentioning the{' '}
                  <span className="highlight">extended battery life</span> as a
                  key selling point this week.
                </p>
              </>
            ) : (
              <>
                <h4 className="ai-insight-title">Ready to Analyze</h4>
                <p className="ai-insight-description">
                  Enter product reviews to get AI-powered insights about customer
                  sentiment and trending topics.
                </p>
              </>
            )}
            
            {/* Deep Dive Button */}
            <button className="deep-dive-btn">
              <span>View Deep Dive</span>
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </div>
      </section>
      
      
      {/* ========== REVIEWS FEED & KEYWORD CLOUD ========== */}
      <section className="reviews-keywords-section">
        {/* Recent Reviews Feed (2/3 width) */}
        <div className="reviews-feed">
          <div className="section-header">
            <h3>Recent Reviews</h3>
            <a href="#" className="view-all-link">View All</a>
          </div>
          
          {/* যদি results থাকে তাহলে actual reviews দেখাবে */}
          {results && results.sample_reviews.length > 0 ? (
            <div className="reviews-list-modern">
              {results.sample_reviews.slice(0, 3).map((review, index) => {
                const reviewer = generateMockReviewer();
                const stars = mapSentimentToStars(
                  review.sentiment as 'positive' | 'negative',
                  review.confidence
                );
                const aiSuggestion = generateAIReply(
                  review.sentiment as 'positive' | 'negative'
                );
                
                return (
                  <ReviewCard
                    key={index}
                    reviewerName={review.reviewer_name || reviewer.name}
                    reviewerInitials={review.reviewer_name ? review.reviewer_name.substring(0, 2).toUpperCase() : reviewer.initials}
                    reviewerAvatarColor={reviewer.avatarColor}
                    timestamp={review.review_date || reviewer.timestamp}
                    reviewText={review.text}
                    rating={review.rating || stars}
                    sentiment={review.sentiment as 'positive' | 'negative' | 'neutral'}
                    aiSuggestion={aiSuggestion}
                    onQuickReply={handleQuickReply}
                    onClick={() => handleReviewClick(index)}
                  />
                );
              })}
            </div>
          ) : (
            // No reviews yet - placeholder
            <div className="no-reviews-placeholder">
              <span className="material-symbols-outlined placeholder-icon">rate_review</span>
              <h4>No Reviews Yet</h4>
              <p>
                Start analyzing reviews to see them here with AI-powered
                insights and reply suggestions.
              </p>
            </div>
          )}
        </div>
        
        {/* Keyword Cloud (1/3 width) */}
        <div className="keyword-cloud-section">
          <h3>Keyword Cloud</h3>
          <p className="keyword-subtitle">
            Common adjectives in reviews this week.
          </p>
          
          {/* যদি results থাকে */}
          {results && (results.top_positive_topics.length > 0 || results.top_negative_topics.length > 0) ? (
            <div className="keywords-wrap">
              {/* Positive keywords */}
              {results.top_positive_topics.slice(0, 3).map((topic, index) => (
                <span
                  key={`pos-${index}`}
                  className={`keyword-tag positive ${index === 0 ? 'large' : index === 1 ? 'medium' : 'small'}`}
                >
                  #{topic.topic}
                </span>
              ))}
              
              {/* Negative keywords */}
              {results.top_negative_topics.slice(0, 3).map((topic, index) => (
                <span
                  key={`neg-${index}`}
                  className={`keyword-tag negative ${index === 0 ? 'large' : 'small'}`}
                >
                  #{topic.topic}
                </span>
              ))}
              
              {/* Neutral/Other keywords (mock) */}
              <span className="keyword-tag neutral medium">#packaging</span>
              <span className="keyword-tag neutral small">#color</span>
            </div>
          ) : (
            // Placeholder keywords
            <div className="keywords-wrap">
              <span className="keyword-tag positive large">#fast-charging</span>
              <span className="keyword-tag positive medium">#durable</span>
              <span className="keyword-tag positive small">#sleek</span>
              <span className="keyword-tag negative medium">#expensive</span>
              <span className="keyword-tag negative small">#heavy</span>
              <span className="keyword-tag neutral medium">#packaging</span>
              <span className="keyword-tag neutral small">#color</span>
              <span className="keyword-tag primary large">#sound-quality</span>
            </div>
          )}
          
          {/* View Full Report Button */}
          <button className="view-report-btn">
            VIEW FULL REPORT
            <span className="material-symbols-outlined">open_in_new</span>
          </button>
        </div>
      </section>
      
      
      {/* ========== LOADING STATE ========== */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner-modern"></div>
          <p>Analyzing reviews with AI...</p>
        </div>
      )}
      
    </div>
  );
}

export default Dashboard;
