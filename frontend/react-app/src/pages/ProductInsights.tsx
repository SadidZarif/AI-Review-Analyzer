import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { useReviews } from '../context/ReviewContext';
import DateRangePicker, { type DateRange } from '../components/DateRangePicker';
import TrendChart from '../components/TrendChart';
import { filterReviewsByDate, buildAnalysisFromReviews, buildTrendDataFromReviews } from '../utils/reviewAnalytics';
import { generateGroqSummary } from '../api';

import '../styles/ProductInsights.css';

function mapRatingToSentiment(rating?: number | null): 'positive' | 'negative' | 'neutral' {
  if (!rating) return 'neutral';
  if (rating >= 4) return 'positive';
  if (rating <= 2) return 'negative';
  return 'neutral';
}

function fmtCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function ratingStars(rating?: number | null): number {
  const r = typeof rating === 'number' ? rating : 0;
  if (!Number.isFinite(r)) return 0;
  return Math.max(0, Math.min(5, Math.round(r)));
}

export default function ProductInsights() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { products, reviews, productAnalytics, storeConfig } = useReviews();

  const productId = String(id || '');
  const product = useMemo(() => products.find(p => String(p.id) === productId) || null, [products, productId]);
  const analytics = useMemo(() => productAnalytics.find(a => String(a.product_id) === productId) || null, [productAnalytics, productId]);

  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const st = (location.state || {}) as any;
    if (st?.presetDateRange) return st.presetDateRange as DateRange;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    return { startDate, endDate };
  });

  const productReviews = useMemo(() => {
    const list = reviews.filter(r => String(r.product_id || '') === productId);
    if (!dateRange.startDate || !dateRange.endDate) return list;
    return filterReviewsByDate(list, dateRange);
  }, [reviews, productId, dateRange]);

  const summary = useMemo(() => (productReviews.length ? buildAnalysisFromReviews(productReviews) : null), [productReviews]);

  const trend = useMemo(() => {
    if (!dateRange.startDate || !dateRange.endDate) return [];
    return buildTrendDataFromReviews(dateRange, productReviews);
  }, [dateRange, productReviews]);

  const [aiSummary, setAiSummary] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  async function handleGenerateInsight() {
    if (!summary) return;
    if (aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const resp = await generateGroqSummary({
        title: `Product Insights: ${product?.title || analytics?.product_title || 'Product'}`,
        date_range: dateRange.startDate && dateRange.endDate ? `${dateRange.startDate.toISOString().slice(0, 10)} → ${dateRange.endDate.toISOString().slice(0, 10)}` : undefined,
        total_reviews: summary.total_reviews,
        positive_percentage: summary.positive_percentage,
        negative_percentage: summary.negative_percentage,
        top_positive_topics: summary.top_positive_topics.map(t => t.topic),
        top_negative_topics: summary.top_negative_topics.map(t => t.topic),
        sample_reviews: productReviews.slice(0, 6).map(r => (r.body || '').slice(0, 240))
      });
      setAiSummary(resp.summary || '');
    } catch (e: any) {
      setAiSummary('');
      setAiError(e?.message || 'Failed to generate insight');
    } finally {
      setAiLoading(false);
    }
  }

  if (!productId) {
    return (
      <div className="pins-page">
        <div className="pins-empty glass-panel">Product not found.</div>
      </div>
    );
  }

  const title = product?.title || analytics?.product_title || `Product #${productId}`;
  const avgRating = analytics?.average_rating ?? null;
  const totalReviews = analytics?.review_count ?? productReviews.length;

  const posPct = analytics?.positive_percentage ?? summary?.positive_percentage ?? 0;
  const negPct = analytics?.negative_percentage ?? summary?.negative_percentage ?? 0;
  const neuPct = Math.max(0, 100 - posPct - negPct);

  const noRevenueNote = 'Based on the available data, this cannot be determined.';

  return (
    <div className="pins2-page">
      <header className="pins2-top">
        <div className="pins2-top-left">
          <button className="pins2-back" onClick={() => navigate('/inventory')}>
            <span className="material-symbols-outlined">arrow_back</span>
            Products
          </button>
          <div className="pins2-head">
            <span className="material-symbols-outlined pins2-ic">insights</span>
            <h2>User Insights</h2>
          </div>
          <div className="pins2-sub">
            <span className="mono">Product ID: {productId}</span>
            <span className="dot" />
            <span className="mono">Store: {storeConfig?.store_domain || '—'}</span>
          </div>
        </div>

        <div className="pins2-top-actions">
          <DateRangePicker
            onDateRangeChange={setDateRange}
            defaultStartDate={dateRange.startDate || undefined}
            defaultEndDate={dateRange.endDate || undefined}
          />
          <button className="pins2-btn primary" onClick={handleGenerateInsight} disabled={!summary || aiLoading}>
            <span className="material-symbols-outlined">auto_awesome</span>
            {aiLoading ? 'Generating…' : 'Generate Insight'}
          </button>
          <button
            className="pins2-btn ghost"
            onClick={() => navigate(`/product/${productId}/fix-issues`, { state: { presetDateRange: dateRange } })}
            disabled={!summary}
          >
            Fix Issues
          </button>
        </div>
      </header>

      <div className="pins2-wrap">
        <div className="pins2-hero">
          <div className="pins2-hero-left">
            <div className="pins2-product">
              <div className="pins2-product-img">
                {product?.image_url ? (
                  <img src={product.image_url} alt={title} />
                ) : (
                  <div className="pins2-img-placeholder" />
                )}
              </div>
              <div className="pins2-product-meta">
                <div className="pins2-badges">
                  <span className="pins2-pill">Insights</span>
                  {avgRating !== null && avgRating >= 4.5 && <span className="pins2-pill pos">Top performer</span>}
                  {avgRating !== null && avgRating >= 4.0 && avgRating < 4.5 && <span className="pins2-pill good">Good</span>}
                </div>
                <h1 className="pins2-title">{title}</h1>
                <p className="pins2-desc">Performance analysis & real-time sentiment overview from reviews.</p>
              </div>
            </div>

            <div className="pins2-stats">
              <div className="pins2-stat">
                <div className="pins2-stat-top">
                  <p>Total Revenue</p>
                  <span className="material-symbols-outlined">payments</span>
                </div>
                <div className="pins2-stat-value">—</div>
                <div className="pins2-stat-note">{noRevenueNote}</div>
              </div>

              <div className="pins2-stat">
                <div className="pins2-stat-top">
                  <p>Avg. Rating</p>
                  <span className="material-symbols-outlined star">star</span>
                </div>
                <div className="pins2-stat-value">
                  {avgRating !== null ? `${avgRating.toFixed(1)}/5` : '—'}
                </div>
                <div className="pins2-stat-sub">
                  <span className="stars" aria-hidden="true">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className={`material-symbols-outlined ${i < ratingStars(avgRating) ? 'on' : ''}`}>star</span>
                    ))}
                  </span>
                  <span className="muted">{fmtCompact(totalReviews || 0)} reviews</span>
                </div>
              </div>

              <div className="pins2-stat">
                <div className="pins2-stat-top">
                  <p>Total Reviews</p>
                  <span className="material-symbols-outlined">forum</span>
                </div>
                <div className="pins2-stat-value">{fmtCompact(totalReviews || 0)}</div>
                <div className="pins2-stat-note">{productReviews.length} in selected range</div>
              </div>

              <div className="pins2-stat">
                <div className="pins2-stat-top">
                  <p>Sentiment Score</p>
                  <span className="material-symbols-outlined">sentiment_satisfied</span>
                </div>
                <div className="pins2-stat-value">{Math.round(posPct)}%</div>
                <div className="pins2-stat-note">Positive share from reviews</div>
              </div>
            </div>
          </div>

          <div className="pins2-hero-right">
            <div className="pins2-panel">
              <div className="pins2-panel-head">
                <h3>AI Sentiment Deep Dive</h3>
              </div>
              <div className="pins2-bars">
                <div className="row">
                  <div className="lbl"><span className="dot pos" /> Positive</div>
                  <div className="pct">{Math.round(posPct)}%</div>
                </div>
                <div className="track">
                  <div className="fill pos" style={{ width: `${posPct}%` }} />
                </div>
                <div className="row">
                  <div className="lbl"><span className="dot neu" /> Neutral</div>
                  <div className="pct">{Math.round(neuPct)}%</div>
                </div>
                <div className="track">
                  <div className="fill neu" style={{ width: `${neuPct}%` }} />
                </div>
                <div className="row">
                  <div className="lbl"><span className="dot neg" /> Negative</div>
                  <div className="pct">{Math.round(negPct)}%</div>
                </div>
                <div className="track">
                  <div className="fill neg" style={{ width: `${negPct}%` }} />
                </div>
              </div>

              <div className="pins2-keyphrases">
                <div className="kh">Top keyphrases</div>
                <div className="klist">
                  {(summary?.top_positive_topics || []).slice(0, 6).map((t) => (
                    <span key={`p-${t.topic}`} className="kchip">{t.topic}</span>
                  ))}
                  {(summary?.top_negative_topics || []).slice(0, 6).map((t) => (
                    <span key={`n-${t.topic}`} className="kchip">{t.topic}</span>
                  ))}
                  {!summary && <span className="muted">No review data in this range.</span>}
                </div>
              </div>
            </div>

            <div className="pins2-panel ai">
              <div className="pins2-panel-head">
                <div className="aihead">
                  <span className="material-symbols-outlined">psychology</span>
                  <span>Insight</span>
                </div>
              </div>
              {aiError ? (
                <div className="pins2-ai err">{aiError}</div>
              ) : aiSummary ? (
                <div className="pins2-ai">{aiSummary}</div>
              ) : (
                <div className="pins2-ai muted">No insight generated yet.</div>
              )}
            </div>
          </div>
        </div>

        <section className="pins2-section">
          <div className="pins2-section-head">
            <h3>Perception Trend</h3>
            <div className="sub">Based on review sentiment score over time.</div>
          </div>
          <div className="pins2-card">
            <TrendChart dateRange={dateRange} data={trend} />
          </div>
        </section>

        <section className="pins2-section">
          <div className="pins2-section-head">
            <h3>Recent Reviews</h3>
            <div className="sub">AI analyzed reviews (real data) for selected range.</div>
          </div>
          <div className="pins2-card">
            {productReviews.length === 0 ? (
              <div className="pins2-empty">No reviews found for this product in the selected range.</div>
            ) : (
              <div className="pins2-reviews">
                {productReviews.slice(0, 10).map((r) => {
                  const s = mapRatingToSentiment(r.rating);
                  return (
                    <div key={r.id} className="pins2-review">
                      <div className="top">
                        <div className="who">
                          <div className={`avatar ${s}`}>{(r.reviewer_name || 'A').slice(0, 1).toUpperCase()}</div>
                          <div className="meta">
                            <div className="name">{r.reviewer_name || 'Anonymous'}</div>
                            <div className="line">
                              <span className={`badge ${s}`}>{s}</span>
                              <span className="mono">{(r.created_at || '').slice(0, 10) || '—'}</span>
                            </div>
                          </div>
                        </div>
                        <button className="open" onClick={() => navigate(r.id ? `/review/${r.id}` : '/reviews')}>
                          Open <span className="material-symbols-outlined">arrow_forward</span>
                        </button>
                      </div>
                      <div className="body">{(r.body || '').slice(0, 320)}{(r.body || '').length > 320 ? '…' : ''}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

