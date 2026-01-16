// ============ DASHBOARD PAGE - COMPLETE REDESIGN ============
// Full-featured dashboard - metrics, trends, reviews feed এবং keyword cloud সহ

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Components import
import MetricCard from '../components/MetricCard';
import TrendChart from '../components/TrendChart';
import ReviewCard from '../components/ReviewCard';
import ReviewForm from '../components/ReviewForm';
import ShopifyForm from '../components/ShopifyForm';
import DateRangePicker, { type DateRange } from '../components/DateRangePicker';

// Context - global state থেকে results নেব
import { useReviews } from '../context/ReviewContext';

// API types এবং utilities
import { type AnalysisResponse } from '../api';
import { generateAvatarColor, generateInitials, formatNumber } from '../utils/helpers';
import { filterReviewsByDate, buildAnalysisFromReviews, buildTrendDataFromReviews } from '../utils/reviewAnalytics';
import { generateGroqReply, generateGroqSummary } from '../api';

// Styles import
import '../styles/Dashboard.css';


function Dashboard() {
  // ============ CONTEXT - GLOBAL STATE ============
  
  // Context থেকে shared state নিচ্ছি
  const { 
    results,                // Analysis results - backend থেকে
    reviews,                // Raw Judge.me reviews list
    isLoading,              // Loading state
    error,                  // Error message যদি থাকে
    storeConfig,            // Store configuration
    setStoreConfig,         // Store config set করার function
    fetchReviews            // Reviews fetch করার function
  } = useReviews();
  
  // ============ LOCAL STATE ============
  
  // ReviewForm show/hide state - modal toggle করার জন্য
  const [showReviewForm, setShowReviewForm] = useState<boolean>(false);
  const [showShopifyForm, setShowShopifyForm] = useState<boolean>(false);
  
  // Store config input state - প্রথমবার setup এর জন্য
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [configInput, setConfigInput] = useState({
    store_domain: '',
    access_token: ''
  });
  
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

  // ============ GROQ AI STATE ============
  // বাংলা: per-review AI suggestion cache (dummy text নয়)
  const [aiSuggestionById, setAiSuggestionById] = useState<Record<number, string>>({});
  const [aiLoadingById, setAiLoadingById] = useState<Record<number, boolean>>({});

  // Dashboard AI summary (real Groq; no dummy text)
  const [aiSummary, setAiSummary] = useState<string>('');
  const [aiSummaryLoading, setAiSummaryLoading] = useState<boolean>(false);
  const [aiSummaryError, setAiSummaryError] = useState<string | null>(null);

  // Keyword -> related reviews popup
  const [keywordPopup, setKeywordPopup] = useState<{ keyword: string; sentiment: 'positive' | 'negative' } | null>(null);


  // ============ DATE RANGE BASED VIEW ============
  // Date range change করলে Dashboard metrics/reviews/topics recompute হবে
  const filteredReviews = useMemo(() => {
    if (!reviews || reviews.length === 0) return [];
    return filterReviewsByDate(reviews, dateRange);
  }, [reviews, dateRange]);

  const viewResults: AnalysisResponse | null = useMemo(() => {
    // যদি reviews list থাকে, date range অনুযায়ী compute করব
    if (filteredReviews && filteredReviews.length > 0) {
      return buildAnalysisFromReviews(filteredReviews);
    }
    // fallback: backend analysis results (যদি available থাকে)
    return results;
  }, [filteredReviews, results]);

  const dateRangeLabel = useMemo(() => {
    const s = dateRange.startDate ? dateRange.startDate.toISOString().slice(0, 10) : '';
    const e = dateRange.endDate ? dateRange.endDate.toISOString().slice(0, 10) : '';
    return s && e ? `${s} → ${e}` : 'selected range';
  }, [dateRange.startDate, dateRange.endDate]);

  // Generate AI summary whenever range/results change
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!viewResults) {
        setAiSummary('');
        setAiSummaryError(null);
        setAiSummaryLoading(false);
        return;
      }

      setAiSummaryLoading(true);
      setAiSummaryError(null);
      try {
        const resp = await generateGroqSummary({
          title: 'Dashboard Summary',
          date_range: dateRangeLabel,
          total_reviews: viewResults.total_reviews,
          positive_percentage: viewResults.positive_percentage,
          negative_percentage: viewResults.negative_percentage,
          top_positive_topics: (viewResults.top_positive_topics || []).slice(0, 8).map(t => t.topic),
          top_negative_topics: (viewResults.top_negative_topics || []).slice(0, 8).map(t => t.topic),
          sample_reviews: filteredReviews
            .filter(r => (r.body || '').trim().length > 0)
            .slice(0, 6)
            .map(r => (r.body || '').slice(0, 240))
        });
        if (cancelled) return;
        setAiSummary(resp.summary || '');
      } catch (e: any) {
        if (cancelled) return;
        setAiSummary('');
        setAiSummaryError(e?.message || 'Failed to generate AI summary');
      } finally {
        if (!cancelled) setAiSummaryLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [viewResults, dateRangeLabel, filteredReviews]);

  // Trend chart data - real reviews based (flat line expected if score constant)
  const trendData = useMemo(() => {
    if (!dateRange.startDate || !dateRange.endDate) return [];
    return buildTrendDataFromReviews(dateRange, filteredReviews);
  }, [dateRange, filteredReviews, viewResults]);

  // ============ RECENT REVIEWS LIST (DATE RANGE FILTERED) ============
  // Date range change হলে pagination reset করব
  const [visibleRecentCount, setVisibleRecentCount] = useState<number>(3);

  useEffect(() => {
    setVisibleRecentCount(3);
  }, [dateRange.startDate, dateRange.endDate]);

  const sortedRecent = useMemo(() => {
    // Latest first
    return [...filteredReviews].sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return db - da;
    });
  }, [filteredReviews]);

  const pendingInitials = useMemo(() => {
    const negatives = sortedRecent.filter(r => mapRatingToSentiment(r.rating) === 'negative');
    return negatives.slice(0, 3).map(r => {
      const name = r.reviewer_name || 'Anonymous';
      return {
        initials: generateInitials(name),
        color: generateAvatarColor(name)
      };
    });
  }, [sortedRecent]);

  const keywordMatches = useMemo(() => {
    if (!keywordPopup) return [];
    const k = keywordPopup.keyword.trim().toLowerCase();
    if (!k) return [];
    return filteredReviews.filter(r => (r.body || '').toLowerCase().includes(k));
  }, [keywordPopup, filteredReviews]);

  const visibleRecent = useMemo(() => {
    return sortedRecent.slice(0, visibleRecentCount);
  }, [sortedRecent, visibleRecentCount]);

  function mapRatingToSentiment(rating?: number | null): 'positive' | 'negative' | 'neutral' {
    if (!rating) return 'neutral';
    if (rating >= 4) return 'positive';
    if (rating <= 2) return 'negative';
    return 'neutral';
  }
  
  // ============ EFFECTS ============
  
  // NOTE:
  // আগে storeConfig না থাকলে Dashboard load এ auto modal খুলত।
  // User experience খারাপ হচ্ছিল (প্রতি page load এ popup)।
  // এখন শুধু user "Connect Shopify" click করলে modal খুলবে।
  
  // ============ HANDLERS ============
  
  // Store config save করা
  function handleSaveConfig() {
    if (!configInput.store_domain || !configInput.access_token) {
      alert('Please fill in both Store Domain and Access Token');
      return;
    }
    
    // Config save করছি
    setStoreConfig({
      store_domain: configInput.store_domain.trim(),
      access_token: configInput.access_token.trim(),
      review_app: 'judge_me'
    });
    
    setShowConfigModal(false);
  }
  
  // Analysis complete callback - ReviewForm বা ShopifyForm থেকে call হবে
  function handleAnalysisComplete(_data: AnalysisResponse) {
    // Context automatically update হবে ShopifyForm থেকে
    setShowReviewForm(false);
    setShowShopifyForm(false);
  }
  
  // Loading state change callback
  function handleLoadingChange(_loading: boolean) {
    // Context handles loading state now
  }
  
  // NOTE: Review click এখন direct /review/:id route use করে (Recent Reviews section এ)
  
  // Export report handler
  function handleExportReport() {
    const start = dateRange.startDate ? dateRange.startDate.toISOString().slice(0, 10) : '';
    const end = dateRange.endDate ? dateRange.endDate.toISOString().slice(0, 10) : '';
    const qs = new URLSearchParams();
    if (start) qs.set('start', start);
    if (end) qs.set('end', end);
    navigate(`/reports/detailed?${qs.toString()}`);
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
          {storeConfig ? (
            // Config আছে - Refresh button দেখাব
            <button 
              className="export-btn" 
              onClick={() => fetchReviews()}
              disabled={isLoading}
              style={{ marginRight: '1rem', backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
            >
              <span className="material-symbols-outlined">{isLoading ? 'sync' : 'refresh'}</span>
              <span>{isLoading ? 'Fetching...' : 'Refresh Data'}</span>
            </button>
          ) : (
            // Config নেই - Setup button দেখাব
            <button 
              className="export-btn" 
              onClick={() => setShowConfigModal(true)}
              style={{ marginRight: '1rem', backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
            >
              <span className="material-symbols-outlined">store</span>
              <span>Connect Shopify</span>
            </button>
          )}
          
          {/* Export Button */}
          <button className="export-btn" onClick={handleExportReport}>
            <span className="material-symbols-outlined">download</span>
            <span>Export Report</span>
          </button>
        </div>
      </header>
      
      
      {/* ========== ERROR BANNER ========== */}
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
          <button 
            onClick={() => setShowConfigModal(true)}
            style={{ 
              marginLeft: 'auto', 
              padding: '0.5rem 1rem',
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              border: 'none',
              borderRadius: '4px',
              color: '#3b82f6',
              cursor: 'pointer'
            }}
          >
            Configure Store
          </button>
        </div>
      )}
      
      {/* ========== CONFIG MODAL - প্রথমবার setup এর জন্য ========== */}
      {showConfigModal && (
        <div 
          className="modal-overlay" 
          onClick={() => setShowConfigModal(false)}
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
              maxWidth: '500px',
              width: '90%'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, color: '#fff' }}>
                <span className="material-symbols-outlined" style={{ marginRight: '0.5rem', verticalAlign: 'middle' }}>settings</span>
                Connect Your Shopify Store
              </h2>
              <button 
                onClick={() => setShowConfigModal(false)}
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
            
            <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
              Connect your Shopify store to automatically fetch reviews from Judge.me.
            </p>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#fff' }}>
                Store Domain *
              </label>
              <input
                type="text"
                value={configInput.store_domain}
                onChange={(e) => setConfigInput(prev => ({ ...prev, store_domain: e.target.value }))}
                placeholder="your-store.myshopify.com"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '1rem'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#fff' }}>
                Shopify Admin API Access Token *
              </label>
              <input
                type="password"
                value={configInput.access_token}
                onChange={(e) => setConfigInput(prev => ({ ...prev, access_token: e.target.value }))}
                placeholder="shpat_xxxxx..."
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '1rem'
                }}
              />
              <small style={{ color: '#64748b', display: 'block', marginTop: '0.5rem', lineHeight: '1.5' }}>
                <strong>কিভাবে পাবেন:</strong><br/>
                1. Shopify Admin → <strong>Settings</strong> → <strong>Apps and sales channels</strong><br/>
                2. <strong>Develop apps</strong> → <strong>Create an app</strong><br/>
                3. App name দিন (যেমন: "RevuMax") → <strong>Create app</strong><br/>
                4. <strong>Configure Admin API scopes</strong> → Enable: <code>read_products</code>, <code>read_content</code><br/>
                5. <strong>Install app</strong> → <strong>Reveal token once</strong> → Copy token<br/>
                <span style={{ color: '#3b82f6', marginTop: '0.5rem', display: 'block' }}>
                  Token format: <code>shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</code>
                </span>
              </small>
            </div>
            
            <div style={{ 
              padding: '1rem', 
              backgroundColor: 'rgba(59, 130, 246, 0.1)', 
              borderRadius: '8px',
              marginBottom: '1.5rem',
              border: '1px solid rgba(59, 130, 246, 0.2)'
            }}>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#94a3b8', lineHeight: '1.6' }}>
                <strong style={{ color: '#3b82f6' }}>📝 Important:</strong><br/>
                • Judge.me API token automatically backend থেকে load হবে<br/>
                • Backend এর <code>.env</code> file এ <code>JUDGE_ME_API_TOKEN</code> set করা আছে<br/>
                • শুধু Shopify Admin API token দিলেই হবে
              </p>
            </div>
            
            <button
              onClick={handleSaveConfig}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: '#3b82f6',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <span className="material-symbols-outlined">save</span>
              Save & Fetch Reviews
            </button>
          </div>
        </div>
      )}
      
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
          value={viewResults ? Math.round(viewResults.positive_percentage) : '—'}
          unit={viewResults ? '/100' : undefined}
          icon="sentiment_satisfied"
          iconColor="linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.05))"
          iconTextColor="#22c55e"
          changeType="neutral"
          progressValue={viewResults ? Math.round(viewResults.positive_percentage) : undefined}
          progressType="positive"
        />
        
        {/* Review Volume Card - Blue theme */}
        <MetricCard
          label="REVIEW VOLUME"
          value={viewResults ? formatNumber(viewResults.total_reviews) : '—'}
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
          value={viewResults ? formatNumber(viewResults.positive_count) : '—'}
          icon="thumb_up"
          iconColor="linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.05))"
          iconTextColor="#22c55e"
          changeType="neutral"
          progressValue={viewResults && viewResults.total_reviews > 0
            ? (viewResults.positive_count / viewResults.total_reviews) * 100
            : undefined}
          progressType="positive"
          onClick={() => navigate('/reviews', { state: { presetSentiment: 'positive', presetDateRange: dateRange, presetMode: 'all' } })}
        />
        
        {/* Negative Reviews Card - Red theme */}
        <MetricCard
          label="NEGATIVE REVIEWS"
          value={viewResults ? formatNumber(viewResults.negative_count) : '—'}
          icon="thumb_down"
          iconColor="linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))"
          iconTextColor="#ef4444"
          changeType="neutral"
          progressValue={viewResults && viewResults.total_reviews > 0
            ? (viewResults.negative_count / viewResults.total_reviews) * 100
            : undefined}
          progressType="negative"
          onClick={() => navigate('/reviews', { state: { presetSentiment: 'negative', presetDateRange: dateRange, presetMode: 'all' } })}
        />

        {/* Neutral Reviews Card */}
        <MetricCard
          label="NEUTRAL REVIEWS"
          value={viewResults ? formatNumber(Math.max(0, viewResults.total_reviews - viewResults.positive_count - viewResults.negative_count)) : '—'}
          icon="sentiment_neutral"
          iconColor="linear-gradient(135deg, rgba(148, 163, 184, 0.16), rgba(148, 163, 184, 0.06))"
          iconTextColor="rgba(148, 163, 184, 1)"
          changeType="neutral"
          progressValue={viewResults && viewResults.total_reviews > 0
            ? (Math.max(0, viewResults.total_reviews - viewResults.positive_count - viewResults.negative_count) / viewResults.total_reviews) * 100
            : undefined}
          progressType="primary"
          onClick={() => navigate('/reviews', { state: { presetSentiment: 'neutral', presetDateRange: dateRange, presetMode: 'all' } })}
        />
        
        {/* Pending Actions Card - Orange theme */}
        <MetricCard
          label="PENDING ACTIONS"
          value={viewResults ? formatNumber(viewResults.negative_count) : '—'}
          icon="pending_actions"
          iconColor="linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.05))"
          iconTextColor="#f59e0b"
          changeValue={viewResults ? 'Needs reply' : undefined}
          changeLabel={viewResults ? 'negative reviews pending' : undefined}
          changeType="negative"
          miniChart={
            <div className="user-avatars-stack">
              {pendingInitials.map((a, idx) => (
                <div key={idx} className="avatar" style={{ backgroundColor: a.color }}>{a.initials}</div>
              ))}
              <div className="avatar-more">+{viewResults ? Math.max(viewResults.negative_count - pendingInitials.length, 0) : 0}</div>
            </div>
          }
          onClick={() => navigate('/reviews', { state: { presetSentiment: 'negative', presetDateRange: dateRange, presetMode: 'pending' } })}
        />
      </section>
      
      
      {/* ========== TREND CHART & AI INSIGHT ========== */}
      <section className="chart-ai-section">
        {/* Trend Chart (2/3 width) */}
        <div className="trend-chart-wrapper">
          {/* Date Range Picker (moved above chart) */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
            <DateRangePicker
              onDateRangeChange={setDateRange}
              defaultStartDate={dateRange.startDate || undefined}
              defaultEndDate={dateRange.endDate || undefined}
            />
          </div>
          <TrendChart dateRange={dateRange} data={trendData} />
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
            {!viewResults ? (
              <>
                <h4 className="ai-insight-title">No data yet</h4>
                <p className="ai-insight-description">
                  Connect your store and fetch reviews to generate an AI summary.
                </p>
              </>
            ) : aiSummaryLoading ? (
              <>
                <h4 className="ai-insight-title">Generating summary…</h4>
                <p className="ai-insight-description">
                  Analyzing your selected date range.
                </p>
              </>
            ) : aiSummaryError ? (
              <>
                <h4 className="ai-insight-title">Summary unavailable</h4>
                <p className="ai-insight-description">{aiSummaryError}</p>
              </>
            ) : (
              <>
                <h4 className="ai-insight-title">Summary</h4>
                <p className="ai-insight-description">{aiSummary || '—'}</p>
              </>
            )}
            
            {/* Deep Dive Button */}
            <button className="deep-dive-btn" onClick={() => navigate('/ai-chat', { state: {
              dateRangeLabel,
              analysis: viewResults,
              topPositiveTopics: (viewResults?.top_positive_topics || []).slice(0, 8).map(t => t.topic),
              topNegativeTopics: (viewResults?.top_negative_topics || []).slice(0, 8).map(t => t.topic),
              sampleReviews: filteredReviews.filter(r => (r.body || '').trim().length > 0).slice(0, 6).map(r => (r.body || '').slice(0, 240))
            } })}>
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
            <a
              href="/reviews"
              className="view-all-link"
              onClick={(e) => {
                e.preventDefault();
                navigate('/reviews');
              }}
            >
              View All
            </a>
          </div>
          
          {/* Date range অনুযায়ী filtered reviews দেখাবে */}
          {visibleRecent.length > 0 ? (
            <div className="reviews-list-modern">
              {visibleRecent.map((r) => {
                const reviewerName = r.reviewer_name || 'Anonymous';
                const reviewerInitials = generateInitials(reviewerName);
                const reviewerAvatarColor = generateAvatarColor(reviewerName);

                const rating = r.rating || 3;
                const sentiment = mapRatingToSentiment(r.rating);
                const aiSuggestion = r.id ? aiSuggestionById[r.id] : undefined;

                async function handleGenerate() {
                  if (!r.id) return;
                  if (aiLoadingById[r.id]) return;
                  setAiLoadingById(prev => ({ ...prev, [r.id]: true }));
                  try {
                    const resp = await generateGroqReply({
                      review_text: r.body,
                      tone: "empathetic",
                      language: "en",
                      customer_name: reviewerName,
                      product_name: r.product_title || undefined,
                      store_name: storeConfig?.store_domain || undefined
                    });
                    setAiSuggestionById(prev => ({ ...prev, [r.id!]: resp.reply_text }));
                  } catch (e: any) {
                    alert(e?.message || "Failed to generate AI suggestion");
                  } finally {
                    setAiLoadingById(prev => ({ ...prev, [r.id!]: false }));
                  }
                }
                
                return (
                  <ReviewCard
                    key={r.id}
                    reviewerName={reviewerName}
                    reviewerInitials={reviewerInitials}
                    reviewerAvatarColor={reviewerAvatarColor}
                    timestamp={r.created_at || new Date().toISOString()}
                    reviewText={r.body}
                    rating={rating}
                    sentiment={sentiment}
                    aiSuggestion={aiSuggestion}
                    onGenerateSuggestion={handleGenerate}
                    isGeneratingSuggestion={r.id ? aiLoadingById[r.id] : false}
                    onClick={() => navigate(r.id ? `/review/${r.id}` : '/reviews')}
                  />
                );
              })}

              {/* Load more */}
              {sortedRecent.length > visibleRecentCount && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                  <button
                    onClick={() => setVisibleRecentCount((c) => Math.min(c + 5, sortedRecent.length))}
                    style={{
                      padding: '0.75rem 1.25rem',
                      borderRadius: '9999px',
                      background: 'rgba(59, 130, 246, 0.12)',
                      border: '1px solid rgba(59, 130, 246, 0.35)',
                      color: '#dbeafe',
                      cursor: 'pointer'
                    }}
                  >
                    Load more ({Math.max(sortedRecent.length - visibleRecentCount, 0)} left)
                  </button>
                </div>
              )}
            </div>
          ) : (
            // No reviews yet - placeholder
            <div className="no-reviews-placeholder">
              <span className="material-symbols-outlined placeholder-icon">rate_review</span>
              <h4>No Reviews Yet</h4>
              <p>
                Selected date range এর মধ্যে কোনো review পাওয়া যায়নি।
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
          {viewResults && (viewResults.top_positive_topics.length > 0 || viewResults.top_negative_topics.length > 0) ? (
            <div className="keywords-wrap">
              {/* Positive keywords */}
              {viewResults.top_positive_topics.slice(0, 3).map((topic, index) => (
                <span
                  key={`pos-${index}`}
                  className={`keyword-tag positive ${index === 0 ? 'large' : index === 1 ? 'medium' : 'small'}`}
                  onClick={() => setKeywordPopup({ keyword: topic.topic, sentiment: 'positive' })}
                >
                  #{topic.topic}
                </span>
              ))}
              
              {/* Negative keywords */}
              {viewResults.top_negative_topics.slice(0, 3).map((topic, index) => (
                <span
                  key={`neg-${index}`}
                  className={`keyword-tag negative ${index === 0 ? 'large' : 'small'}`}
                  onClick={() => setKeywordPopup({ keyword: topic.topic, sentiment: 'negative' })}
                >
                  #{topic.topic}
                </span>
              ))}
            </div>
          ) : (
            <div className="keywords-wrap" style={{ opacity: 0.9 }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                No keyword data available for the selected range.
              </span>
            </div>
          )}

          {/* Keyword popup (window style) */}
          {keywordPopup && (
            <div className="kw-modal-overlay" role="dialog" aria-modal="true" onClick={() => setKeywordPopup(null)}>
              <div className="kw-modal glass-panel" onClick={(e) => e.stopPropagation()}>
                <div className="kw-modal-head">
                  <div className="kw-modal-title">
                    <span className={`kw-pill ${keywordPopup.sentiment}`}>{keywordPopup.sentiment.toUpperCase()}</span>
                    <h4>#{keywordPopup.keyword}</h4>
                  </div>
                  <button className="kw-close" onClick={() => setKeywordPopup(null)} aria-label="Close">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <p className="kw-modal-sub">
                  {keywordMatches.length} review{keywordMatches.length === 1 ? '' : 's'} mention this keyword in the selected date range.
                </p>

                <div className="kw-modal-list">
                  {keywordMatches.length === 0 ? (
                    <div className="kw-empty">No matching reviews found.</div>
                  ) : (
                    keywordMatches.slice(0, 20).map((r) => (
                      <div key={r.id} className="kw-item">
                        <div className="kw-item-top">
                          <div className="kw-item-left">
                            <div className="kw-item-avatar" style={{ backgroundColor: generateAvatarColor(r.reviewer_name || 'Anonymous') }}>
                              {generateInitials(r.reviewer_name || 'Anonymous')}
                            </div>
                            <div className="kw-item-meta">
                              <div className="kw-item-name">{r.reviewer_name || 'Anonymous'}</div>
                              <div className="kw-item-date">{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</div>
                            </div>
                          </div>
                          <div className="kw-item-actions">
                            <button className="kw-open" onClick={() => navigate(r.id ? `/review/${r.id}` : '/reviews')}>
                              Open
                              <span className="material-symbols-outlined">arrow_forward</span>
                            </button>
                          </div>
                        </div>
                        <div className="kw-item-body">{(r.body || '').slice(0, 220)}{(r.body || '').length > 220 ? '…' : ''}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
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
