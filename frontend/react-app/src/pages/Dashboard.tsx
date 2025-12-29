// ============ DASHBOARD PAGE - COMPLETE REDESIGN ============
// Full-featured dashboard - metrics, trends, reviews feed এবং keyword cloud সহ

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Components import
import MetricCard from '../components/MetricCard';
import TrendChart from '../components/TrendChart';
import ReviewCard from '../components/ReviewCard';

// API types এবং utilities
import { type AnalysisResponse } from '../api';
import { mapSentimentToStars, formatNumber, formatPercentageChange } from '../utils/helpers';
import {
  generateMockMetrics,
  generateMockReviewer,
  generateAIReply,
  type MockMetrics
} from '../utils/mockData';

// Styles import
import '../styles/Dashboard.css';


function Dashboard() {
  // ============ STATE MANAGEMENT ============
  
  // Real analysis results (backend থেকে আসবে)
  const [results] = useState<AnalysisResponse | null>(null);
  const [isLoading] = useState<boolean>(false);
  
  // Mock metrics (demo এর জন্য)
  const [mockMetrics] = useState<MockMetrics>(generateMockMetrics());
  
  // Navigation hook - review details page এ যাওয়ার জন্য
  const navigate = useNavigate();
  
  
  // ============ HANDLERS ============
  
  // Note: এই handlers গুলো এখনো integrate করা হয়নি
  // ReviewForm component integrate করার পর এগুলো ব্যবহার হবে
  
  // Analysis complete callback - ReviewForm থেকে call হবে
  // function handleAnalysisComplete(data: AnalysisResponse) {
  //   setResults(data);
  // }
  
  // Loading state change callback
  // function handleLoadingChange(loading: boolean) {
  //   setIsLoading(loading);
  // }
  
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
          {/* Date Picker (UI only - functionality TODO) */}
          <button className="date-picker-btn">
            <span>📅</span>
            <span>Oct 2023</span>
            <span>▼</span>
          </button>
          
          {/* Export Button */}
          <button className="export-btn" onClick={handleExportReport}>
            <span>📥</span>
            <span>Export Report</span>
          </button>
        </div>
      </header>
      
      
      {/* ========== METRICS ROW ========== */}
      <section className="metrics-section">
        {/* Sentiment Score Card */}
        <MetricCard
          label="SENTIMENT SCORE"
          value={mockMetrics.sentimentScore}
          unit="/100"
          icon="😊"
          iconColor="linear-gradient(135deg, rgba(34, 197, 94, 0.2), transparent)"
          changeValue={formatPercentageChange(mockMetrics.weeklyChange)}
          changeLabel="vs last week"
          changeType={mockMetrics.weeklyChange >= 0 ? 'positive' : 'negative'}
          progressValue={mockMetrics.sentimentScore}
          progressType="positive"
        />
        
        {/* Review Volume Card */}
        <MetricCard
          label="REVIEW VOLUME"
          value={formatNumber(mockMetrics.totalReviews)}
          icon="📊"
          iconColor="linear-gradient(135deg, rgba(59, 130, 246, 0.2), transparent)"
          changeValue={`+${mockMetrics.newReviews}`}
          changeLabel="new reviews"
          changeType="positive"
          miniChart={
            // Mini chart bars
            <div className="mini-chart-bars">
              <div className="bar" style={{ height: '30%', opacity: 0.3 }}></div>
              <div className="bar" style={{ height: '40%', opacity: 0.4 }}></div>
              <div className="bar" style={{ height: '60%', opacity: 0.6 }}></div>
              <div className="bar" style={{ height: '80%', opacity: 0.8 }}></div>
              <div className="bar" style={{ height: '100%', opacity: 1 }}></div>
              <div className="bar" style={{ height: '20%', opacity: 0.2 }}></div>
            </div>
          }
        />
        
        {/* Pending Actions Card */}
        <MetricCard
          label="PENDING ACTIONS"
          value={mockMetrics.pendingActions}
          icon="⚠️"
          iconColor="linear-gradient(135deg, rgba(245, 158, 11, 0.2), transparent)"
          changeValue="Urgent"
          changeLabel="negatives need reply"
          changeType="negative"
          miniChart={
            // User avatars (mock)
            <div className="user-avatars-stack">
              <div className="avatar" style={{ backgroundColor: '#ef4444' }}>SJ</div>
              <div className="avatar" style={{ backgroundColor: '#3b82f6' }}>MR</div>
              <div className="avatar" style={{ backgroundColor: '#22c55e' }}>EW</div>
              <div className="avatar-more">+{mockMetrics.pendingActions - 3}</div>
            </div>
          }
        />
      </section>
      
      
      {/* ========== TREND CHART & AI INSIGHT ========== */}
      <section className="chart-ai-section">
        {/* Trend Chart (2/3 width) */}
        <div className="trend-chart-wrapper">
          <TrendChart />
        </div>
        
        {/* AI Insight Box (1/3 width) */}
        <div className="ai-insight-modern">
          <div className="ai-insight-header">
            <div className="ai-badge">
              <span>✨</span>
            </div>
            <h3>AI SUMMARY</h3>
          </div>
          
          {/* AI Visual */}
          <div className="ai-visual-box">
            <div className="ai-visual-content">
              <div className="ai-icon-large">🤖</div>
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
            <span>→</span>
          </button>
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
                    reviewerName={reviewer.name}
                    reviewerInitials={reviewer.initials}
                    reviewerAvatarColor={reviewer.avatarColor}
                    timestamp={reviewer.timestamp}
                    reviewText={review.text}
                    rating={stars}
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
              <div className="placeholder-icon">📝</div>
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
            <span>↗</span>
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
