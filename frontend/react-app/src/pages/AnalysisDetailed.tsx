import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useReviews } from '../context/ReviewContext';
import type { DateRange } from '../components/DateRangePicker';
import { filterReviewsByDate, buildAnalysisFromReviews } from '../utils/reviewAnalytics';
import { generateGroqSummary } from '../api';
import '../styles/AnalysisDetailed.css';

function mapRatingToSentiment(rating?: number | null): 'positive' | 'negative' | 'neutral' {
  if (!rating) return 'neutral';
  if (rating >= 4) return 'positive';
  if (rating <= 2) return 'negative';
  return 'neutral';
}

// Sentiment driver types
interface SentimentDriver {
  name: string;
  icon: string;
  score: number; // 0-10
  trend: number; // percentage change
  mentionRate: number; // percentage of reviews mentioning this
  color: string;
  borderColor: string;
  sparklinePath: string;
}

export default function AnalysisDetailed() {
  const navigate = useNavigate();
  const location = useLocation();
  const { reviews, products } = useReviews();

  const initial = useMemo(() => {
    const st = (location.state || {}) as any;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const presetRange = (st?.presetDateRange as DateRange) || { startDate, endDate };

    const presetQuery = (st?.presetQuery as string) || '';
    const presetSentiment = (st?.presetSentiment as 'all' | 'positive' | 'neutral' | 'negative') || 'all';

    return {
      dateRange: presetRange,
      productId: (st?.productId as string) || null,
      presetQuery,
      presetSentiment,
    };
  }, [location.state]);

  const [dateRange, setDateRange] = useState<DateRange>(initial.dateRange);
  const [selectedProductId] = useState<string | null>(initial.productId);
  const [timeRange, setTimeRange] = useState<'7D' | '30D' | '90D'>(() => {
    const days =
      initial.dateRange.startDate && initial.dateRange.endDate
        ? Math.max(1, Math.round((initial.dateRange.endDate.getTime() - initial.dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24)))
        : 30;
    if (days <= 10) return '7D';
    if (days <= 45) return '30D';
    return '90D';
  });
  const [evidenceFilter, setEvidenceFilter] = useState<'all' | 'positive' | 'negative'>('all');

  const presetQuery = initial.presetQuery || '';
  const presetSentiment = initial.presetSentiment || 'all';

  // Keep date range in sync with time range selection (like the HTML)
  useEffect(() => {
    const endDate = new Date();
    const startDate = new Date();
    const days = timeRange === '7D' ? 7 : timeRange === '30D' ? 30 : 90;
    startDate.setDate(endDate.getDate() - days);
    setDateRange({ startDate, endDate });
  }, [timeRange]);

  // Get selected product
  const selectedProduct = useMemo(() => {
    if (!selectedProductId) {
      // If no product selected, use the first product with reviews
      const productWithReviews = products.find(p => {
        const productReviews = reviews.filter(r => 
          (r.product_id && String(r.product_id) === String(p.id)) || 
          (r.product_title === p.title)
        );
        return productReviews.length > 0;
      });
      return productWithReviews || products[0] || null;
    }
    return products.find(p => String(p.id) === selectedProductId) || products[0] || null;
  }, [products, selectedProductId, reviews]);

  // Filter reviews by date and product
  const filtered = useMemo(() => {
    let list = dateRange.startDate && dateRange.endDate 
      ? filterReviewsByDate(reviews, dateRange) 
      : reviews;

    if (selectedProduct) {
      list = list.filter(r => 
        (r.product_id && String(r.product_id) === String(selectedProduct.id)) || 
        (r.product_title === selectedProduct.title)
      );
    }

    // Apply preset search query from Analysis page (if provided)
    const q = (presetQuery || '').trim().toLowerCase();
    if (q) {
      list = list.filter(r => (r.body || '').toLowerCase().includes(q));
    }

    // Apply preset sentiment from Analysis page (if provided)
    if (presetSentiment !== 'all') {
      list = list.filter(r => mapRatingToSentiment(r.rating) === presetSentiment);
    }

    return list;
  }, [reviews, dateRange, selectedProduct, presetQuery, presetSentiment]);

  const summary = useMemo(() => (filtered.length ? buildAnalysisFromReviews(filtered) : null), [filtered]);

  // Calculate sentiment drivers (battery, quality, shipping, support)
  const drivers: SentimentDriver[] = useMemo(() => {
    if (filtered.length === 0) {
      return [
        {
          name: 'Battery Life',
          icon: 'battery_charging_full',
          score: 8.4,
          trend: 12,
          mentionRate: 42,
          color: 'green',
          borderColor: 'green-500',
          sparklinePath: 'M0 25 L15 22 L30 28 L45 15 L60 18 L75 5 L100 8'
        },
        {
          name: 'Build Quality',
          icon: 'diamond',
          score: 9.2,
          trend: 5,
          mentionRate: 68,
          color: 'blue',
          borderColor: 'blue-500',
          sparklinePath: 'M0 20 L20 18 L40 10 L60 12 L80 5 L100 2'
        },
        {
          name: 'Shipping',
          icon: 'local_shipping',
          score: 4.1,
          trend: -18,
          mentionRate: 24,
          color: 'red',
          borderColor: 'red-500',
          sparklinePath: 'M0 5 L20 15 L40 12 L60 25 L80 22 L100 28'
        },
        {
          name: 'Support',
          icon: 'support_agent',
          score: 6.8,
          trend: 2,
          mentionRate: 15,
          color: 'purple',
          borderColor: 'purple-500',
          sparklinePath: 'M0 20 L25 18 L50 22 L75 15 L100 12'
        }
      ];
    }

    const keywords = {
      battery: ['battery', 'charge', 'charging', 'power', 'life', 'last'],
      quality: ['quality', 'build', 'durable', 'material', 'solid', 'premium', 'robust'],
      shipping: ['shipping', 'delivery', 'arrived', 'package', 'courier', 'logistics'],
      support: ['support', 'customer service', 'help', 'response', 'service', 'assistance']
    };

    const toTime = (d: any) => (d ? new Date(d).getTime() : 0);

    const calculateDriver = (name: string, icon: string, keywords: string[], color: string, borderColor: string): SentimentDriver => {
      let mentions = 0;
      let positiveMentions = 0;
      let negativeMentions = 0;
      const mentionReviews: typeof filtered = [];

      for (const review of filtered) {
        const body = (review.body || '').toLowerCase();
        const matches = keywords.some(k => body.includes(k));
        if (matches) {
          mentions++;
          mentionReviews.push(review);
          const sentiment = mapRatingToSentiment(review.rating);
          if (sentiment === 'positive') positiveMentions++;
          else if (sentiment === 'negative') negativeMentions++;
        }
      }

      const mentionRate = filtered.length > 0 ? Math.round((mentions / filtered.length) * 100) : 0;
      const positivePct = mentions > 0 ? Math.round((positiveMentions / mentions) * 100) : 0;
      const score = (positivePct / 10); // Convert to 0-10 scale

      // Trend (real): compare positive mention-rate in newest half vs oldest half
      const sorted = [...mentionReviews].sort((a, b) => toTime(a.created_at) - toTime(b.created_at));
      const mid = Math.floor(sorted.length / 2) || 1;
      const older = sorted.slice(0, mid);
      const newer = sorted.slice(mid);
      const pct = (arr: any[]) => {
        if (arr.length === 0) return 0;
        const pos = arr.filter(r => mapRatingToSentiment(r.rating) === 'positive').length;
        return (pos / arr.length) * 100;
      };
      const trend = Math.round(pct(newer) - pct(older));

      // Sparkline (real): 7 buckets across timeRange using average rating
      const buckets = 7;
      const times = sorted.map(r => toTime(r.created_at)).filter(Boolean);
      const minT = times.length ? Math.min(...times) : (dateRange.startDate?.getTime() || 0);
      const maxT = times.length ? Math.max(...times) : (dateRange.endDate?.getTime() || minT + 1);
      const span = Math.max(1, maxT - minT);
      const bucketVals: number[] = Array.from({ length: buckets }, () => 0);
      const bucketCounts: number[] = Array.from({ length: buckets }, () => 0);
      for (const r of sorted) {
        const t = toTime(r.created_at);
        const rating = typeof r.rating === 'number' ? r.rating : 0;
        const idx = Math.min(buckets - 1, Math.max(0, Math.floor(((t - minT) / span) * buckets)));
        bucketVals[idx] += rating;
        bucketCounts[idx] += 1;
      }
      const avg = bucketVals.map((v, i) => bucketCounts[i] ? v / bucketCounts[i] : 0);
      // map 0..5 ratings to y 28..2 (higher rating -> lower y)
      const yFor = (val: number) => {
        const clamped = Math.max(0, Math.min(5, val));
        return 28 - (clamped / 5) * 26;
      };
      let path = `M0 ${yFor(avg[0] || 0)}`;
      for (let i = 1; i < buckets; i++) {
        const x = (i / (buckets - 1)) * 100;
        path += ` L${x} ${yFor(avg[i] || 0)}`;
      }

      return {
        name,
        icon,
        score: Math.round(score * 10) / 10,
        trend,
        mentionRate,
        color,
        borderColor,
        sparklinePath: path
      };
    };

    return [
      calculateDriver('Battery Life', 'battery_charging_full', keywords.battery, 'green', 'green-500'),
      calculateDriver('Build Quality', 'diamond', keywords.quality, 'blue', 'blue-500'),
      calculateDriver('Shipping', 'local_shipping', keywords.shipping, 'red', 'red-500'),
      calculateDriver('Support', 'support_agent', keywords.support, 'purple', 'purple-500')
    ];
  }, [filtered]);

  // Get evidence reviews (filtered by driver if needed)
  const evidenceReviews = useMemo(() => {
    if (filtered.length === 0) {
      return [
        {
          id: 'demo-1',
          reviewer_name: 'Sarah Jenkins',
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          rating: 5,
          body:
            '"The battery life is absolutely insane. I used these for an entire international flight and still had 40% left. Finally a pair of headphones that actually lives up to the specs!"'
        },
        {
          id: 'demo-2',
          reviewer_name: 'Mike Ross',
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          rating: 2,
          body:
            '"Package arrived with the outer box completely crushed. Shipping took 12 days instead of the promised 3. Support was helpful but the logistical experience was poor."'
        },
        {
          id: 'demo-3',
          reviewer_name: 'Emily Clarke',
          created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          rating: 4,
          body:
            '"The hinge mechanism feels incredibly robust compared to other brands. You can tell they used premium materials. The noise cancellation is top-tier."'
        }
      ] as any[];
    }

    let list = [...filtered];
    
    if (evidenceFilter === 'positive') {
      list = list.filter(r => mapRatingToSentiment(r.rating) === 'positive');
    } else if (evidenceFilter === 'negative') {
      list = list.filter(r => mapRatingToSentiment(r.rating) === 'negative');
    }

    // Sort by date (newest first)
    list.sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return db - da;
    });

    return list.slice(0, 10);
  }, [filtered, evidenceFilter]);

  // AI Insight
  const [aiInsight, setAiInsight] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);

  async function generateInsight() {
    if (!summary) {
      // Dummy fallback so the page never feels "dead"
      setAiInsight(
        'Critical mass of negative sentiment forming around Shipping Delay in a subset of regions. Consider adjusting fulfillment allocation and proactively communicating delays to reduce rating impact.'
      );
      return;
    }
    if (aiLoading) return;
    setAiLoading(true);
    try {
      const resp = await generateGroqSummary({
        title: 'Product Sentiment Analysis',
        date_range: dateRange.startDate && dateRange.endDate 
          ? `${dateRange.startDate.toISOString().slice(0, 10)} to ${dateRange.endDate.toISOString().slice(0, 10)}`
          : undefined,
        total_reviews: summary.total_reviews,
        positive_percentage: summary.positive_percentage,
        negative_percentage: summary.negative_percentage,
        top_positive_topics: summary.top_positive_topics.map(t => t.topic),
        top_negative_topics: summary.top_negative_topics.map(t => t.topic),
        sample_reviews: filtered.slice(0, 8).map(r => (r.body || '').slice(0, 240))
      });
      setAiInsight(resp.summary || '');
    } catch (e: any) {
      setAiInsight('');
    } finally {
      setAiLoading(false);
    }
  }

  // Calculate sentiment balance
  const sentimentBalance = useMemo(() => {
    if (!summary) return { positive: 78, neutral: 12, negative: 10 };
    return {
      positive: summary.positive_percentage,
      neutral: Math.max(0, 100 - summary.positive_percentage - summary.negative_percentage),
      negative: summary.negative_percentage
    };
  }, [summary]);

  // Product rating
  const productRating = useMemo(() => {
    if (filtered.length === 0) return 4.8;
    const ratings = filtered.map(r => r.rating).filter((r): r is number => typeof r === 'number');
    if (ratings.length === 0) return 0;
    return ratings.reduce((a, b) => a + b, 0) / ratings.length;
  }, [filtered]);

  const usingDummy = filtered.length === 0;
  const productName = usingDummy ? 'SonicPro X1 Wireless' : (selectedProduct?.title || 'All Products');
  const reviewCount = usingDummy ? 1248 : filtered.length;
  const lastAnalyzed = usingDummy
    ? '2 hours ago'
    : (filtered.length > 0 && filtered[0].created_at
        ? new Date(filtered[0].created_at).toLocaleString()
        : 'Never');

  return (
    <div className="detailed-view-page">
      {/* Background glows (match provided HTML) */}
      <div className="detailed-glow detailed-glow-primary" />
      <div className="detailed-glow detailed-glow-secondary" />

      <button 
        className="detailed-back-btn"
        onClick={() => navigate('/analysis')}
      >
        <span className="material-symbols-outlined">arrow_back</span>
        Back to Analysis
      </button>

      {usingDummy && (
        <div className="detailed-demo-note">
          No reviews matched the selected filters — showing an example layout.
        </div>
      )}

      <header className="detailed-header">
        <div className="detailed-header-left">
          <div className="product-thumbnail">
            <img 
              src={selectedProduct?.image_url || '/vite.svg'} 
              alt={productName}
            />
          </div>
          <div className="product-info">
            <h2 className="product-title">
              {productName}
              {selectedProduct?.id && (
                <span className="product-sku">SKU: {selectedProduct.id}</span>
              )}
            </h2>
            <div className="product-meta">
              <div className="product-rating">
                <div className="star-rating-inline">
                  {[1, 2, 3, 4, 5].map(i => (
                    <span 
                      key={i} 
                      className="material-symbols-outlined star-icon"
                      style={{ 
                        fontVariationSettings: i <= Math.round(productRating) ? "'FILL' 1" : "'FILL' 0",
                        color: i <= Math.round(productRating) ? '#fbbf24' : '#64748b'
                      }}
                    >
                      star
                    </span>
                  ))}
                </div>
                <span className="rating-value">{productRating.toFixed(1)}</span>
                <span className="review-count">({reviewCount} Reviews)</span>
              </div>
              <span className="meta-dot"></span>
              <p className="last-analyzed">Last analyzed {lastAnalyzed}</p>
            </div>
          </div>
        </div>
        <div className="detailed-header-right">
          <div className="time-range-selector">
            <button 
              className={`time-btn ${timeRange === '7D' ? 'active' : ''}`}
              onClick={() => setTimeRange('7D')}
            >
              7D
            </button>
            <button 
              className={`time-btn ${timeRange === '30D' ? 'active' : ''}`}
              onClick={() => setTimeRange('30D')}
            >
              30D
            </button>
            <button 
              className={`time-btn ${timeRange === '90D' ? 'active' : ''}`}
              onClick={() => setTimeRange('90D')}
            >
              90D
            </button>
          </div>
          <button className="share-btn">
            <span className="material-symbols-outlined">ios_share</span>
            Share Report
          </button>
        </div>
      </header>

      <div className="detailed-grid">
        <div className="detailed-main">
          <div className="drivers-grid">
            {drivers.map((driver) => (
              <div key={driver.name} className="driver-card">
                <div className="driver-icon-bg">
                  <span className="material-symbols-outlined">{driver.icon}</span>
                </div>
                <div className="driver-header">
                  <div className="driver-title-group">
                    <div className={`driver-icon-box ${driver.color}`}>
                      <span className="material-symbols-outlined">{driver.icon}</span>
                    </div>
                    <h3 className="driver-name">{driver.name}</h3>
                  </div>
                  <div className="driver-score">
                    <span className="score-value">{driver.score}</span>
                    <span className="score-denominator">/10</span>
                  </div>
                </div>
                <div className="driver-progress-bar">
                  <div 
                    className={`driver-progress ${driver.color}`}
                    style={{ width: `${driver.score * 10}%` }}
                  ></div>
                </div>
                <div className="driver-footer">
                  <div className="driver-trend">
                    <span className="trend-label">Sentiment Trend</span>
                    <div className="trend-value-group">
                      <span className={`trend-value ${driver.trend >= 0 ? 'positive' : 'negative'}`}>
                        {driver.trend >= 0 ? '+' : ''}{driver.trend}%
                      </span>
                      <svg className="sparkline" viewBox="0 0 100 30">
                        <path 
                          d={driver.sparklinePath}
                          fill="none"
                          stroke={driver.trend >= 0 ? '#22c55e' : '#ef4444'}
                          strokeLinecap="round"
                          strokeWidth="2"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="driver-mention-rate">
                    <span className="mention-label">Mention Rate</span>
                    <span className="mention-value">{driver.mentionRate}% of reviews</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="evidence-section">
            <div className="evidence-header">
              <div className="evidence-title-group">
                <span className="material-symbols-outlined">format_quote</span>
                <h3 className="evidence-title">Evidence Reviews</h3>
              </div>
              <div className="evidence-filters">
                <button 
                  className={`evidence-filter-btn ${evidenceFilter === 'positive' ? 'active' : ''}`}
                  onClick={() => setEvidenceFilter(evidenceFilter === 'positive' ? 'all' : 'positive')}
                >
                  Positive Only
                </button>
                <button 
                  className={`evidence-filter-btn ${evidenceFilter === 'negative' ? 'active' : ''}`}
                  onClick={() => setEvidenceFilter(evidenceFilter === 'negative' ? 'all' : 'negative')}
                >
                  Negative Only
                </button>
              </div>
            </div>
            <div className="evidence-list">
              {evidenceReviews.map((review, idx) => {
                const driverMatch = drivers.find(d => {
                  const keywords = {
                    'Battery Life': ['battery', 'charge'],
                    'Build Quality': ['quality', 'build'],
                    'Shipping': ['shipping', 'delivery'],
                    'Support': ['support', 'service']
                  }[d.name] || [];
                  const body = (review.body || '').toLowerCase();
                  return keywords.some(k => body.includes(k));
                });
                
                return (
                  <div key={review.id || idx} className="evidence-review">
                    <div className="evidence-review-header">
                      <div className="evidence-reviewer">
                        <div className="evidence-avatar">
                          {(review.reviewer_name || 'A').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="evidence-reviewer-name">{review.reviewer_name || 'Anonymous'}</p>
                          <p className="evidence-reviewer-meta">
                            Verified Purchaser · {review.created_at 
                              ? new Date(review.created_at).toLocaleDateString()
                              : 'Unknown date'}
                          </p>
                        </div>
                      </div>
                      <div className="evidence-review-badges">
                        {driverMatch && (
                          <span className={`evidence-badge ${driverMatch.color}`}>
                            {driverMatch.name.toUpperCase()}
                          </span>
                        )}
                        <div className="star-rating-inline">
                          {[1, 2, 3, 4, 5].map(i => (
                            <span 
                              key={i} 
                              className="material-symbols-outlined star-icon-small"
                              style={{ 
                                fontVariationSettings: i <= (review.rating || 0) ? "'FILL' 1" : "'FILL' 0",
                                color: '#fbbf24',
                                fontSize: '14px'
                              }}
                            >
                              star
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="evidence-review-text">{review.body || 'No review text'}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="detailed-sidebar">
          <div className="sentiment-balance-card">
            <h3 className="sidebar-title">Sentiment Balance</h3>
            <div className="sentiment-chart">
              <svg className="sentiment-circle" viewBox="0 0 100 100">
                <circle 
                  cx="50" 
                  cy="50" 
                  r="45" 
                  fill="none" 
                  stroke="rgba(239, 68, 68, 0.2)" 
                  strokeWidth="8"
                />
                <circle 
                  cx="50" 
                  cy="50" 
                  r="45" 
                  fill="none" 
                  stroke="#22c55e" 
                  strokeDasharray={283}
                  strokeDashoffset={283 - (sentimentBalance.positive / 100) * 283}
                  strokeLinecap="round"
                  strokeWidth="8"
                  className="sentiment-circle-positive"
                />
              </svg>
              <div className="sentiment-chart-center">
                <span className="sentiment-percentage">{sentimentBalance.positive}%</span>
                <span className="sentiment-label">Positive</span>
              </div>
            </div>
            <div className="sentiment-legend">
              <div className="sentiment-legend-item">
                <div className="legend-dot green"></div>
                <span>Positive</span>
                <span className="legend-value">{sentimentBalance.positive}%</span>
              </div>
              <div className="sentiment-legend-item">
                <div className="legend-dot gray"></div>
                <span>Neutral</span>
                <span className="legend-value">{sentimentBalance.neutral}%</span>
              </div>
              <div className="sentiment-legend-item">
                <div className="legend-dot red"></div>
                <span>Negative</span>
                <span className="legend-value">{sentimentBalance.negative}%</span>
              </div>
            </div>
          </div>

          <div className="ai-insight-card">
            <h3 className="sidebar-title">AI Insight</h3>
            {aiInsight ? (
              <div className="ai-insight-content">
                <p className="ai-insight-text">{aiInsight}</p>
              </div>
            ) : (
              <div className="ai-insight-placeholder">
                <p>Click "Generate Action Plan" to get AI insights</p>
              </div>
            )}
            <button 
              className="generate-action-btn"
              onClick={generateInsight}
              disabled={!summary || aiLoading}
            >
              <span>Generate Action Plan</span>
              <span className="material-symbols-outlined">auto_awesome</span>
            </button>
          </div>

          <div className="export-card">
            <h3 className="sidebar-title">Export Analysis</h3>
            <div className="export-buttons">
              <button className="export-btn export-pdf">
                <span className="material-symbols-outlined">picture_as_pdf</span>
                Download PDF Report
              </button>
              <button className="export-btn export-csv">
                <span className="material-symbols-outlined">table_view</span>
                Export Raw Data (CSV)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
