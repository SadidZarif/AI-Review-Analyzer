// ============ ANALYSIS PAGE ============
// Deep analysis page - advanced filters + drivers + clusters + filtered reviews
// NOTE: নতুন code এ বাংলা কমেন্ট রাখা হলো (user instruction)

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import DateRangePicker, { type DateRange } from '../components/DateRangePicker';
import StarRating from '../components/StarRating';

import { useReviews } from '../context/ReviewContext';
import { filterReviewsByDate, buildAnalysisFromReviews } from '../utils/reviewAnalytics';
import { generateGroqSummary } from '../api';

import '../styles/Analysis.css';
import AiGlobe from '../assets/images/ai.png';

// ============ HELPERS ============

// Rating -> sentiment map (backend sentiment না থাকলে rating দিয়ে approximated sentiment)
function mapRatingToSentiment(rating?: number | null): 'positive' | 'negative' | 'neutral' {
  if (!rating) return 'neutral';
  if (rating >= 4) return 'positive';
  if (rating <= 2) return 'negative';
  return 'neutral';
}

// Simple tokenizer (Analysis page এর driver/topic বের করার জন্য)
const STOP = new Set([
  'the','and','for','with','that','this','was','were','are','you','your','but','not','have','has','had','too','very','just',
  'from','they','them','their','its','our','out','all','any','can','could','would','should','did','does','product','item',
  'shop','store','buy','bought','purchase','purchased','good','great','nice','okay'
]);

function tokenize(text: string): string[] {
  return (text || '')
    .toLowerCase()
    .replace(/<[^>]+>/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length >= 3 && !STOP.has(w));
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function highlight(text: string, q: string) {
  if (!q) return text;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(${escaped})`, 'ig');
  const parts = text.split(re);
  return parts.map((p, idx) => {
    if (p.toLowerCase() === q.toLowerCase()) {
      return <mark key={idx} className="analysis-highlight">{p}</mark>;
    }
    return <span key={idx}>{p}</span>;
  });
}

// ============ COMPONENT ============

function Analysis() {
  const navigate = useNavigate();

  // Context থেকে real data নেব
  const { storeConfig, isLoading, error, reviews, products } = useReviews();

  // Filters state (এগুলো Apply button এ apply হবে)
  const [draftQuery, setDraftQuery] = useState('');
  const [draftCategory, setDraftCategory] = useState<string>('all');
  const [draftSentiment, setDraftSentiment] = useState<'all' | 'positive' | 'negative' | 'neutral'>('all');
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    return { startDate, endDate };
  });

  // Applied filters (UI stable রাখার জন্য)
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [sentiment, setSentiment] = useState<'all' | 'positive' | 'negative' | 'neutral'>('all');

  // Pagination state
  const [page, setPage] = useState(1);
  const perPage = 10;

  // ============ GROQ AI INSIGHT STATE ============
  // বাংলা: Dummy insight নয়—user click করলে real AI insight generate হবে
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiActions, setAiActions] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  // Product title -> category map (Shopify product_type)
  const productTypeByTitle = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of products) {
      if (p.title) m.set(p.title, p.product_type || 'Uncategorized');
    }
    return m;
  }, [products]);

  // Category list build
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) set.add(p.product_type || 'Uncategorized');
    return ['all', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [products]);

  // Date range অনুযায়ী reviews filter
  const dateFiltered = useMemo(() => {
    return filterReviewsByDate(reviews, dateRange);
  }, [reviews, dateRange]);

  // Full filtered reviews (date + category + sentiment + search)
  const filtered = useMemo(() => {
    let list = [...dateFiltered];

    // Category filter
    if (category !== 'all') {
      list = list.filter(r => {
        const t = r.product_title || '';
        const pType = productTypeByTitle.get(t) || 'Uncategorized';
        return pType === category;
      });
    }

    // Sentiment filter
    if (sentiment !== 'all') {
      list = list.filter(r => mapRatingToSentiment(r.rating) === sentiment);
    }

    // Search keyword filter (review body + reviewer + product)
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(r => {
        const body = (r.body || '').toLowerCase();
        const name = (r.reviewer_name || '').toLowerCase();
        const prod = (r.product_title || '').toLowerCase();
        return body.includes(q) || name.includes(q) || prod.includes(q);
      });
    }

    // Latest first
    list.sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return db - da;
    });
    return list;
  }, [dateFiltered, category, sentiment, query, productTypeByTitle]);

  // Page slice
  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageItems = useMemo(() => {
    const p = clamp(page, 1, pageCount);
    const start = (p - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page, pageCount]);

  // Analysis summary from filtered reviews (real data)
  const summary = useMemo(() => {
    if (filtered.length === 0) return null;
    return buildAnalysisFromReviews(filtered);
  }, [filtered]);

  // ============ SENTIMENT DRIVERS ============
  // Top keywords -> per-keyword pos/neu/neg breakdown
  const drivers = useMemo(() => {
    if (filtered.length === 0) return [];

    // Candidate keywords count
    const counts = new Map<string, number>();
    for (const r of filtered) {
      const words = tokenize(r.body || '');
      for (const w of words) counts.set(w, (counts.get(w) || 0) + 1);
    }

    // Take top 4 frequent words
    const top = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([word]) => word);

    // For each keyword compute breakdown
    return top.map((word) => {
      let pos = 0, neg = 0, neu = 0, total = 0;
      for (const r of filtered) {
        const body = (r.body || '').toLowerCase();
        if (!body.includes(word)) continue;
        total += 1;
        const s = mapRatingToSentiment(r.rating);
        if (s === 'positive') pos += 1;
        else if (s === 'negative') neg += 1;
        else neu += 1;
      }

      const posPct = total ? Math.round((pos / total) * 100) : 0;
      const neuPct = total ? Math.round((neu / total) * 100) : 0;
      const negPct = total ? Math.round((neg / total) * 100) : 0;
      const score10 = total ? Math.round((posPct / 10) * 10) / 10 : 0;

      return {
        word,
        score10,
        posPct,
        neuPct,
        negPct
      };
    });
  }, [filtered]);

  // ============ TOPIC CLUSTERS ============
  const clusters = useMemo(() => {
    if (!summary) return { pos: [], neg: [] };
    return {
      pos: summary.top_positive_topics.slice(0, 4).map(t => t.topic),
      neg: summary.top_negative_topics.slice(0, 4).map(t => t.topic)
    };
  }, [summary]);

  async function handleGenerateInsight() {
    if (!summary) return;
    if (aiLoading) return;
    setAiLoading(true);
    try {
      const resp = await generateGroqSummary({
        title: "Deep Analysis Insight",
        date_range: dateRange.startDate && dateRange.endDate
          ? `${dateRange.startDate.toISOString().slice(0, 10)} to ${dateRange.endDate.toISOString().slice(0, 10)}`
          : undefined,
        total_reviews: summary.total_reviews,
        positive_percentage: summary.positive_percentage,
        negative_percentage: summary.negative_percentage,
        top_positive_topics: summary.top_positive_topics.map(t => t.topic),
        top_negative_topics: summary.top_negative_topics.map(t => t.topic),
        sample_reviews: filtered.slice(0, 6).map(r => (r.body || '').slice(0, 240))
      });
      setAiInsight(resp.summary);
      setAiActions(resp.key_actions || []);
    } catch (e: any) {
      alert(e?.message || "Failed to generate AI insight");
    } finally {
      setAiLoading(false);
    }
  }

  function exportPdf() {
    const qs = new URLSearchParams();
    if (dateRange.startDate) qs.set('start', dateRange.startDate.toISOString().slice(0, 10));
    if (dateRange.endDate) qs.set('end', dateRange.endDate.toISOString().slice(0, 10));
    navigate(`/reports/detailed?${qs.toString()}`);
  }

  // Apply filters
  function applyFilters() {
    setQuery(draftQuery);
    setCategory(draftCategory);
    setSentiment(draftSentiment);
    setPage(1);
  }

  // Clear filters
  function clearFilters() {
    setDraftQuery('');
    setDraftCategory('all');
    setDraftSentiment('all');
    setQuery('');
    setCategory('all');
    setSentiment('all');
    setPage(1);
  }

  return (
    <div className="analysis-page">
      <div className="analysis-container">
        <header className="analysis-header">
          <div>
            <h2 className="analysis-title">Deep Analysis</h2>
            <p className="analysis-subtitle">Explore advanced metrics, custom filtering, and generate reports.</p>
          </div>
          <div className="analysis-header-actions">
            <button className="analysis-btn analysis-btn-ghost" onClick={() => navigate('/analysis/detailed', { state: { presetDateRange: dateRange, presetSentiment: sentiment, presetQuery: query } })}>
              <span className="material-symbols-outlined">open_in_new</span>
              Detailed View
            </button>
            <button className="analysis-btn analysis-btn-primary" onClick={exportPdf} disabled={!dateRange.startDate || !dateRange.endDate}>
              <span className="material-symbols-outlined">picture_as_pdf</span>
              Export PDF
            </button>
          </div>
        </header>

        {/* Connection warning */}
        {!storeConfig && (
          <div className="analysis-banner">
            <span className="material-symbols-outlined">info</span>
            <span>Shopify connect করা নেই। Settings → Integrations → Shopify Store connect করুন, তারপর Refresh করুন।</span>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="analysis-banner analysis-banner-error">
            <span className="material-symbols-outlined">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Filters bar */}
        <div className="analysis-filters glass-panel">
          <div className="analysis-filters-left">
            <div className="analysis-search">
              <span className="material-symbols-outlined">search</span>
              <input
                value={draftQuery}
                onChange={(e) => setDraftQuery(e.target.value)}
                placeholder="Search specific keywords..."
              />
            </div>

            <div className="analysis-divider" />

            <select
              className="analysis-select"
              value={draftCategory}
              onChange={(e) => setDraftCategory(e.target.value)}
              title="Category"
            >
              {categories.map(c => (
                <option key={c} value={c}>
                  {c === 'all' ? 'All Categories' : c}
                </option>
              ))}
            </select>

            <select
              className="analysis-select"
              value={draftSentiment}
              onChange={(e) => setDraftSentiment(e.target.value as any)}
              title="Sentiment"
            >
              <option value="all">Sentiment: Mixed</option>
              <option value="positive">Sentiment: Positive</option>
              <option value="neutral">Sentiment: Neutral</option>
              <option value="negative">Sentiment: Negative</option>
            </select>

            <DateRangePicker
              onDateRangeChange={(r) => {
                setDateRange(r);
                // Date change হলে pagination reset (UX)
                setPage(1);
              }}
              defaultStartDate={dateRange.startDate || undefined}
              defaultEndDate={dateRange.endDate || undefined}
            />
          </div>

          <div className="analysis-filters-right">
            <button className="analysis-link" onClick={clearFilters}>Clear All</button>
            <button className="analysis-btn analysis-btn-light" onClick={applyFilters}>Apply Filters</button>
          </div>
        </div>

        {/* Main grid */}
        <div className="analysis-grid">
          {/* Drivers */}
          <div className="analysis-card glass-panel analysis-card-lg">
            <div className="analysis-card-head">
              <div>
                <h3>Sentiment Drivers</h3>
                <p>Breakdown of positive vs negative feedback by keyword.</p>
              </div>
              <button className="analysis-link" onClick={() => navigate('/analysis/detailed', { state: { presetDateRange: dateRange, presetSentiment: sentiment, presetQuery: query } })}>
                Detailed View <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>

            {drivers.length === 0 ? (
              <div className="analysis-empty">
                {isLoading ? 'Loading...' : 'No data for selected filters.'}
              </div>
            ) : (
              <div className="analysis-drivers">
                {drivers.map((d) => (
                  <div key={d.word} className="driver">
                    <div className="driver-top">
                      <div className="driver-left">
                        <div className="driver-icon">
                          <span className="material-symbols-outlined">insights</span>
                        </div>
                        <span className="driver-name">{d.word}</span>
                      </div>
                      <div className="driver-score">
                        <span className="driver-score-num">{d.score10.toFixed(1)}</span>
                        <span className="driver-score-den">/ 10</span>
                      </div>
                    </div>

                    <div className="driver-bar">
                      <div className="seg seg-pos" style={{ width: `${d.posPct}%` }} />
                      <div className="seg seg-neu" style={{ width: `${d.neuPct}%` }} />
                      <div className="seg seg-neg" style={{ width: `${d.negPct}%` }} />
                    </div>

                    <div className="driver-meta">
                      <span>{d.posPct}% Positive</span>
                      <span>{d.negPct}% Negative</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Clusters */}
          <div className="analysis-card glass-panel analysis-card-clusters glow-panel">
            <div className="clusters-head">
              <div className="clusters-badge">
                <span className="material-symbols-outlined">hub</span>
              </div>
              <h3>Topic Clusters</h3>
            </div>

            {/* Visual cluster preview (screenshot style) */}
            <div className="clusters-hero">
              <div className="clusters-globe">
                <img className="clusters-globe-img" src={AiGlobe} alt="" />
                {[...clusters.neg.slice(0, 2).map(t => ({ t, kind: 'neg' as const })), ...clusters.pos.slice(0, 2).map(t => ({ t, kind: 'pos' as const }))]
                  .slice(0, 4)
                  .map((item, idx) => (
                    <span
                      key={`${item.kind}-${item.t}`}
                      className={`cluster-pill ${item.kind}`}
                      data-pos={idx}
                    >
                      {item.t}
                    </span>
                  ))}
              </div>
            </div>

            <div className="clusters-body">
              <h4>Emerging Patterns</h4>
              <p>
                {aiInsight
                  ? aiInsight
                  : (summary ? 'No AI insight generated yet. Click “Explore Clusters” to generate real-time AI insight.' : 'No patterns yet.')}
              </p>
              {aiActions.length > 0 && (
                <ul className="analysis-actions">
                  {aiActions.slice(0, 5).map((a, idx) => <li key={idx}>{a}</li>)}
                </ul>
              )}
            </div>

            <div className="clusters-cta-row">
              <button
                className="analysis-btn analysis-btn-light"
                onClick={handleGenerateInsight}
                disabled={!summary || aiLoading}
              >
                {aiLoading ? 'Generating…' : 'Generate Insight'}
              </button>
              <button
                className="analysis-btn analysis-btn-ghost clusters-cta"
                onClick={() => navigate('/analysis/clusters', { state: { presetDateRange: dateRange } })}
                disabled={!summary}
              >
                Explore Clusters <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom grid */}
        <div className="analysis-bottom-grid">
          {/* Custom report */}
          <div className="analysis-card glass-panel">
            <div className="report-head">
              <div className="report-icon">
                <span className="material-symbols-outlined">tune</span>
              </div>
              <div>
                <h3>Custom Report</h3>
                <p>Configure your export parameters.</p>
              </div>
            </div>

            <div className="report-options">
              <label className="report-opt">
                <input type="checkbox" defaultChecked />
                <div>
                  <div className="opt-title">Sentiment Analysis</div>
                  <div className="opt-sub">Charts & trend data</div>
                </div>
              </label>
              <label className="report-opt">
                <input type="checkbox" defaultChecked />
                <div>
                  <div className="opt-title">Keyword Clouds</div>
                  <div className="opt-sub">Positive & negative adjectives</div>
                </div>
              </label>
              <label className="report-opt">
                <input type="checkbox" />
                <div>
                  <div className="opt-title">Raw Review Data</div>
                  <div className="opt-sub">Review rows are included as samples in the PDF export</div>
                </div>
              </label>
              <label className="report-opt">
                <input type="checkbox" defaultChecked />
                <div>
                  <div className="opt-title">AI Executive Summary</div>
                  <div className="opt-sub">Summary based on your filters</div>
                </div>
              </label>
            </div>

            <div className="report-footer">
              <button className="analysis-btn analysis-btn-primary" onClick={exportPdf} disabled={!summary || !dateRange.startDate || !dateRange.endDate}>
                <span className="material-symbols-outlined">download</span>
                Generate Report (PDF)
              </button>
            </div>
          </div>

          {/* Filtered reviews */}
          <div className="analysis-card glass-panel analysis-card-wide">
            <div className="filtered-head">
              <h3>
                Filtered Reviews{' '}
                <span className="chip">{filtered.length} results</span>
              </h3>
              <div className="pager-buttons">
                <button
                  className="pager-btn"
                  onClick={() => setPage(1)}
                  disabled={page <= 1}
                  title="First page"
                >
                  <span className="material-symbols-outlined">first_page</span>
                </button>
                <button
                  className="pager-btn"
                  onClick={() => setPage(pageCount)}
                  disabled={page >= pageCount}
                  title="Last page"
                >
                  <span className="material-symbols-outlined">last_page</span>
                </button>
              </div>
            </div>

            <div className="filtered-list">
              {pageItems.map((r) => {
                const name = r.reviewer_name || 'Anonymous';
                const sentimentLabel = mapRatingToSentiment(r.rating);
                const badgeClass = sentimentLabel === 'positive' ? 'badge-pos' : sentimentLabel === 'negative' ? 'badge-neg' : 'badge-neu';

                return (
                  <div key={r.id} className="filtered-item" onClick={() => navigate(`/review/${r.id}`)}>
                    <div className="avatar">{name.slice(0, 2).toUpperCase()}</div>
                    <div className="filtered-body">
                      <div className="filtered-top">
                        <h4>{name}</h4>
                        <span className={`badge ${badgeClass}`}>{sentimentLabel.toUpperCase()}</span>
                      </div>
                      <div className="stars">
                        <StarRating rating={r.rating || 0} size="small" />
                      </div>
                      <p className="filtered-text">
                        {highlight(r.body || '', query.trim())}
                      </p>
                      <div className="filtered-meta">
                        <span className="meta-pill">{r.product_title || 'Unknown Product'}</span>
                        <span className="meta-pill">{r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="filtered-footer">
              <div className="page-info">Page {clamp(page, 1, pageCount)} / {pageCount}</div>
              <div className="page-nav">
                <button className="analysis-btn analysis-btn-ghost" onClick={() => setPage(p => clamp(p - 1, 1, pageCount))} disabled={page <= 1}>
                  Prev
                </button>
                <button className="analysis-btn analysis-btn-ghost" onClick={() => setPage(p => clamp(p + 1, 1, pageCount))} disabled={page >= pageCount}>
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Analysis;


