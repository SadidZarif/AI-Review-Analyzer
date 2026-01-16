// ============ REVIEWS PAGE ============
// Shopify/Judge.me থেকে আসা সব reviews list আকারে দেখাবে

import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// Context - global state থেকে reviews নেব
import { useReviews } from '../context/ReviewContext';

// Components
import ReviewCard from '../components/ReviewCard';
import DateRangePicker, { type DateRange } from '../components/DateRangePicker';

// Helpers
import { generateAvatarColor, generateInitials } from '../utils/helpers';
import { generateGroqReply } from '../api';
import { filterReviewsByDate } from '../utils/reviewAnalytics';

import '../styles/Reviews.css';

// Rating থেকে simple sentiment map (backend sentiment না থাকলে)
function mapRatingToSentiment(rating?: number | null): 'positive' | 'negative' | 'neutral' {
  if (!rating) return 'neutral';
  if (rating >= 4) return 'positive';
  if (rating <= 2) return 'negative';
  return 'neutral';
}

function Reviews() {
  const navigate = useNavigate();
  const location = useLocation();
  const { reviews, isLoading, error, fetchReviews, storeConfig } = useReviews();
  // বাংলা: per-review AI reply cache
  const [aiSuggestionById, setAiSuggestionById] = useState<Record<number, string>>({});
  const [aiLoadingById, setAiLoadingById] = useState<Record<number, boolean>>({});

  // Search/filter state
  const [query, setQuery] = useState('');

  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    return { startDate, endDate };
  });

  const [sentimentFilter, setSentimentFilter] = useState<'all' | 'positive' | 'negative' | 'neutral'>('all');
  const [mode, setMode] = useState<'all' | 'pending'>('all');

  // Accept Dashboard deep-link state (preset filters)
  useEffect(() => {
    const st = (location.state || {}) as any;
    if (st?.presetDateRange) {
      setDateRange(st.presetDateRange as DateRange);
    }
    if (st?.presetSentiment) {
      setSentimentFilter(st.presetSentiment);
    }
    if (st?.presetMode) {
      setMode(st.presetMode);
    }
  }, [location.state]);

  // Search match করা reviews list
  const filtered = useMemo(() => {
    const byDate = dateRange.startDate && dateRange.endDate ? filterReviewsByDate(reviews, dateRange) : reviews;
    const q = query.trim().toLowerCase();
    const byQuery = !q
      ? byDate
      : byDate.filter((r) => {
          const body = (r.body || '').toLowerCase();
          const name = (r.reviewer_name || '').toLowerCase();
          const product = (r.product_title || '').toLowerCase();
          return body.includes(q) || name.includes(q) || product.includes(q);
        });

    const bySentiment = sentimentFilter === 'all'
      ? byQuery
      : byQuery.filter(r => mapRatingToSentiment(r.rating) === sentimentFilter);

    const byMode = mode === 'pending'
      ? bySentiment.filter(r => mapRatingToSentiment(r.rating) === 'negative')
      : bySentiment;

    return byMode;
  }, [reviews, query, dateRange, sentimentFilter, mode]);

  return (
    <div className="reviews-page">
      <div className="reviews-header">
        <div>
          <h1 className="reviews-title">Reviews</h1>
          <p className="reviews-subtitle">
            Judge.me থেকে fetch করা সব reviews এখানে দেখাবে।
          </p>
        </div>

        <div className="reviews-actions">
          <div className="reviews-date">
            <DateRangePicker
              onDateRangeChange={setDateRange}
              defaultStartDate={dateRange.startDate || undefined}
              defaultEndDate={dateRange.endDate || undefined}
            />
          </div>

          <input
            className="reviews-search"
            placeholder="Search by customer, product, or text..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <button
            className="reviews-refresh"
            onClick={() => fetchReviews()}
            disabled={isLoading || !storeConfig}
            title={!storeConfig ? 'Dashboard থেকে Shopify connect করুন' : 'Refresh reviews'}
          >
            <span className="material-symbols-outlined">{isLoading ? 'sync' : 'refresh'}</span>
            Refresh
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="reviews-banner reviews-banner-error">
          <span className="material-symbols-outlined">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="reviews-banner reviews-banner-loading">
          <span className="material-symbols-outlined spinning">sync</span>
          <span>Fetching reviews from Judge.me...</span>
        </div>
      )}

      <div className="reviews-filters">
        <button className={`reviews-filter ${sentimentFilter === 'all' ? 'active' : ''}`} onClick={() => setSentimentFilter('all')}>All</button>
        <button className={`reviews-filter ${sentimentFilter === 'positive' ? 'active' : ''}`} onClick={() => setSentimentFilter('positive')}>Positive</button>
        <button className={`reviews-filter ${sentimentFilter === 'neutral' ? 'active' : ''}`} onClick={() => setSentimentFilter('neutral')}>Neutral</button>
        <button className={`reviews-filter ${sentimentFilter === 'negative' ? 'active' : ''}`} onClick={() => setSentimentFilter('negative')}>Negative</button>

        <div className="reviews-filter-divider" />

        <button className={`reviews-filter ${mode === 'pending' ? 'active' : ''}`} onClick={() => setMode(mode === 'pending' ? 'all' : 'pending')}>
          Pending replies
        </button>
      </div>

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <div className="reviews-empty">
          <h3>No Reviews Found</h3>
          <p>
            {storeConfig
              ? 'এই store এ কোনো review পাওয়া যায়নি (বা filter এর কারণে hide হয়েছে)।'
              : 'প্রথমে Dashboard থেকে Shopify connect করুন, তারপর Refresh দিন।'}
          </p>
        </div>
      )}

      {/* Reviews list */}
      <div className="reviews-list">
        {filtered.map((r) => {
          const reviewerName = r.reviewer_name || 'Anonymous';
          const initials = generateInitials(reviewerName);
          const avatarColor = generateAvatarColor(reviewerName);
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
            <div key={r.id} className="reviews-item">
              <div className="reviews-meta">
                <div className="reviews-product">
                  <span className="material-symbols-outlined">shopping_bag</span>
                  <span>{r.product_title || 'Unknown Product'}</span>
                </div>
              </div>

              <ReviewCard
                reviewerName={reviewerName}
                reviewerInitials={initials}
                reviewerAvatarColor={avatarColor}
                timestamp={r.created_at || new Date().toISOString()}
                reviewText={r.body}
                rating={rating}
                sentiment={sentiment}
                aiSuggestion={aiSuggestion}
                onGenerateSuggestion={handleGenerate}
                isGeneratingSuggestion={r.id ? aiLoadingById[r.id] : false}
                onClick={() => navigate(`/review/${r.id}`)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Reviews;


