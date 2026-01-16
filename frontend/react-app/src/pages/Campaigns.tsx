// ============ CAMPAIGNS PAGE ============
// Campaign management UI (functional) - real reviews data এর উপর based করে KPIs + segments + AI opportunity
// NOTE: নতুন code এ বাংলা কমেন্ট রাখা হলো (user instruction)

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useReviews } from '../context/ReviewContext';
import { buildAnalysisFromReviews, filterReviewsByDate } from '../utils/reviewAnalytics';
import DateRangePicker, { type DateRange } from '../components/DateRangePicker';
import { generateGroqCampaignIdea } from '../api';

import '../styles/Campaigns.css';

function formatK(num: number): string {
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return String(num);
}

function Campaigns() {
  const navigate = useNavigate();
  const { storeConfig, reviews, error } = useReviews();

  // Date range default: last 30 days
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    return { startDate, endDate };
  });

  // Date filtered reviews
  const filtered = useMemo(() => filterReviewsByDate(reviews, dateRange), [reviews, dateRange]);
  const summary = useMemo(() => (filtered.length ? buildAnalysisFromReviews(filtered) : null), [filtered]);

  // ============ GROQ AI OPPORTUNITY STATE ============
  // বাংলা: dummy opportunity text নয়, user click করলে Groq real-time generate করবে
  const [aiIdea, setAiIdea] = useState<{ title: string; description: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Segments (real reviews count থেকে)
  const segments = useMemo(() => {
    let promoters = 0; // 5-star
    let atRisk = 0; // 3-star
    let repeatBuyers = 0; // demo heuristic: reviewers with 2+ reviews

    const perReviewer = new Map<string, number>();
    for (const r of filtered) {
      const name = (r.reviewer_name || 'Anonymous').trim();
      perReviewer.set(name, (perReviewer.get(name) || 0) + 1);
      if (r.rating === 5) promoters += 1;
      if (r.rating === 3) atRisk += 1;
    }
    for (const [, cnt] of perReviewer.entries()) {
      if (cnt >= 2) repeatBuyers += 1;
    }

    return { promoters, atRisk, repeatBuyers };
  }, [filtered]);

  // KPIs (no fake sales/reach/conversion; only real review-driven metrics)
  const kpis = useMemo(() => {
    const totalReviews = filtered.length;
    const positivePct = summary?.positive_percentage ?? 0;
    const negativePct = summary?.negative_percentage ?? 0;
    const promoters = segments.promoters;
    const atRisk = segments.atRisk;
    const aiSuggestions = Math.max(0, summary?.top_negative_topics?.length || 0);
    return { totalReviews, positivePct, negativePct, promoters, atRisk, aiSuggestions };
  }, [filtered.length, summary, segments.promoters, segments.atRisk]);

  async function handleGenerateIdea() {
    if (!summary) return;
    if (aiLoading) return;
    setAiLoading(true);
    try {
      const resp = await generateGroqCampaignIdea({
        positive_topic: summary.top_positive_topics?.[0]?.topic || null,
        negative_topic: summary.top_negative_topics?.[0]?.topic || null,
        store_name: storeConfig?.store_domain || null,
        total_reviews: summary.total_reviews,
        positive_percentage: summary.positive_percentage,
        negative_percentage: summary.negative_percentage
      });
      setAiIdea({ title: resp.title, description: resp.description });
    } catch (e: any) {
      alert(e?.message || "Failed to generate AI campaign idea");
    } finally {
      setAiLoading(false);
    }
  }
  // NOTE: aiOpportunity এখন Groq endpoint থেকে আসে (aiIdea)

  // Recent campaigns (UI list only; no fake performance metrics)
  const recentCampaigns = useMemo(() => {
    const base = [
      { id: 'post_purchase', icon: 'mail', tone: 'Automated', title: 'Review Request - Post Purchase' },
      { id: 'loyalty_discount', icon: 'redeem', tone: 'Manual Blast', title: 'Loyalty Discount for Reviewers' },
      { id: 'winback', icon: 'pause_circle', tone: 'Paused', title: 'Win-back Negative Reviews' }
    ];
    return base;
  }, []);

  // Featured campaign is AI-generated (no fake reach/revenue numbers)
  const featured = useMemo(() => {
    const topTopic = summary?.top_positive_topics?.[0]?.topic || 'Quality';
    return {
      title: aiIdea?.title || 'Suggested Campaign',
      desc: aiIdea?.description || `Generate a campaign idea for customers mentioning "${topTopic}" in the selected range.`,
    };
  }, [aiIdea, summary]);

  // View analytics -> Analysis page এ navigate + query prefill (URL param use না করলে simple redirect)
  function goToAnalysis() {
    navigate('/analysis');
  }

  return (
    <div className="campaigns-page">
      <div className="campaigns-container">
        <header className="campaigns-header">
          <div>
            <h2 className="campaigns-title">Campaign Management</h2>
            <p className="campaigns-subtitle">Leverage positive sentiment to drive sales and engagement.</p>
          </div>
          <div className="campaigns-actions">
            <DateRangePicker
              onDateRangeChange={setDateRange}
              defaultStartDate={dateRange.startDate || undefined}
              defaultEndDate={dateRange.endDate || undefined}
            />
            <button className="campaigns-btn campaigns-btn-ghost" onClick={goToAnalysis}>
              <span className="material-symbols-outlined">insights</span>
              View Analytics
            </button>
            <button className="campaigns-btn campaigns-btn-primary" onClick={handleGenerateIdea} disabled={!summary || aiLoading}>
              <span className="material-symbols-outlined">auto_awesome</span>
              {aiLoading ? 'Generating…' : 'Generate Campaign Idea'}
            </button>
          </div>
        </header>

        {!storeConfig && (
          <div className="campaigns-banner">
            <span className="material-symbols-outlined">info</span>
            <span>Shopify connect করা নেই। Settings → Integrations → Shopify Store connect করুন।</span>
          </div>
        )}

        {error && (
          <div className="campaigns-banner campaigns-banner-error">
            <span className="material-symbols-outlined">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* KPI cards */}
        <section className="campaigns-kpis">
          <div className="kpi glass-panel">
            <div className="kpi-top">
              <div className="kpi-icon kpi-blue">
                <span className="material-symbols-outlined">rate_review</span>
              </div>
              <span className="kpi-badge kpi-badge-indigo">Range</span>
            </div>
            <div className="kpi-value">{formatK(kpis.totalReviews)}</div>
            <div className="kpi-label">Total Reviews</div>
          </div>
          <div className="kpi glass-panel">
            <div className="kpi-top">
              <div className="kpi-icon kpi-purple">
                <span className="material-symbols-outlined">thumb_up</span>
              </div>
              <span className="kpi-badge kpi-badge-green">Positive</span>
            </div>
            <div className="kpi-value">{kpis.positivePct}%</div>
            <div className="kpi-label">Positive Sentiment</div>
          </div>
          <div className="kpi glass-panel">
            <div className="kpi-top">
              <div className="kpi-icon kpi-orange">
                <span className="material-symbols-outlined">thumb_down</span>
              </div>
              <span className={`kpi-badge ${summary && summary.negative_percentage > 25 ? 'kpi-badge-red' : 'kpi-badge-green'}`}>Negative</span>
            </div>
            <div className="kpi-value">{kpis.negativePct}%</div>
            <div className="kpi-label">Negative Sentiment</div>
          </div>
          <div className="kpi glass-panel kpi-special">
            <div className="kpi-top">
              <div className="kpi-icon kpi-indigo pulse">
                <span className="material-symbols-outlined">auto_awesome</span>
              </div>
              <span className="kpi-badge kpi-badge-indigo">New</span>
            </div>
            <div className="kpi-value">{kpis.aiSuggestions}</div>
            <div className="kpi-label">AI Suggestions Ready</div>
          </div>
        </section>

        {/* Main grid */}
        <div className="campaigns-grid">
          <div className="campaigns-left">
            {/* Featured campaign */}
            <div className="glass-panel featured">
              <div className="featured-inner">
                <div className="featured-media">
                  <div className="featured-badge">{aiIdea ? 'Generated' : 'Ready'}</div>
                </div>
                <div className="featured-body">
                  <div className="featured-head">
                    <div className="featured-title">
                      <h3>{featured.title}</h3>
                      <span className="material-symbols-outlined star">star</span>
                    </div>
                    <button className="icon-btn" onClick={handleGenerateIdea} disabled={!summary || aiLoading} title="Generate a new campaign idea">
                      <span className="material-symbols-outlined">refresh</span>
                    </button>
                  </div>
                  <p className="featured-desc">{featured.desc}</p>
                  <div className="featured-actions">
                    <button className="campaigns-btn campaigns-btn-ghost" onClick={() => navigate('/analysis/detailed', { state: { presetDateRange: dateRange } })}>
                      Detailed View
                    </button>
                    <button className="campaigns-btn campaigns-btn-primary" onClick={() => navigate('/ai-chat', { state: { dateRange } })}>
                      Ask AI <span className="material-symbols-outlined">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent campaigns */}
            <div className="recent-campaigns">
              <h4>Recent Campaigns</h4>
              {recentCampaigns.map((c) => (
                <div key={c.id} className={`recent-item glass-panel ${c.id === 'winback' ? 'muted' : ''}`}>
                  <div className={`recent-icon ${c.id === 'post_purchase' ? 'purple' : c.id === 'loyalty_discount' ? 'orange' : 'slate'}`}>
                    <span className="material-symbols-outlined">{c.icon}</span>
                  </div>
                  <div className="recent-body">
                    <div className="recent-title">{c.title}</div>
                    <div className="recent-sub">Triggered • {c.tone}</div>
                  </div>
                  <div className="recent-metrics">
                    <div className="rm">
                      <div className="rm-val">{formatK(filtered.length)}</div>
                      <div className="rm-label">Reviews</div>
                    </div>
                    <div className="rm">
                      <div className="rm-val rm-green">{summary ? `${summary.positive_percentage}%` : '—'}</div>
                      <div className="rm-label">Positive</div>
                    </div>
                  </div>
                  <span className="material-symbols-outlined chevron">chevron_right</span>
                </div>
              ))}
            </div>
          </div>

          <div className="campaigns-right">
            {/* AI Opportunity */}
            <div className="glass-panel ai-opportunity">
              <div className="ai-op-head">
                <span className="material-symbols-outlined">psychology_alt</span>
                <h3>AI Opportunity</h3>
              </div>
              {aiIdea ? (
                <>
                  <p className="ai-op-text">{aiIdea.description}</p>
                  <div className="ai-op-box">
                    <div className="ai-op-chip">Suggested Campaign</div>
                    <div className="ai-op-title">{aiIdea.title}</div>
                    <div className="ai-op-sub">Generated from your real review data (Groq).</div>
                  </div>
                </>
              ) : (
                <p className="ai-op-text">
                  {summary ? 'No AI opportunity generated yet. Click Generate.' : 'Not enough data to generate.'}
                </p>
              )}
              <button className="campaigns-btn campaigns-btn-indigo" onClick={handleGenerateIdea} disabled={!summary || aiLoading}>
                <span className="material-symbols-outlined">auto_fix_high</span>
                {aiLoading ? 'Generating...' : 'Generate Campaign'}
              </button>
            </div>

            {/* Segments */}
            <div className="glass-panel segments">
              <div className="segments-head">
                <h3>Top Segments</h3>
              </div>
              <div className="segment-item" onClick={() => navigate('/reviews', { state: { presetSentiment: 'positive', presetDateRange: dateRange, presetMode: 'all' } })}>
                <div className="seg-icon green"><span className="material-symbols-outlined">thumb_up</span></div>
                <div className="seg-body">
                  <div className="seg-title">Promoters</div>
                  <div className="seg-sub">5-star reviewers</div>
                </div>
                <div className="seg-num">{formatK(segments.promoters)}</div>
              </div>
              <div className="segment-item" onClick={() => navigate('/reviews', { state: { presetSentiment: 'neutral', presetDateRange: dateRange, presetMode: 'all' } })}>
                <div className="seg-icon yellow"><span className="material-symbols-outlined">sentiment_neutral</span></div>
                <div className="seg-body">
                  <div className="seg-title">At Risk</div>
                  <div className="seg-sub">3-star reviewers</div>
                </div>
                <div className="seg-num">{formatK(segments.atRisk)}</div>
              </div>
              <div className="segment-item" onClick={() => navigate('/reviews', { state: { presetSentiment: 'all', presetDateRange: dateRange, presetMode: 'all' } })}>
                <div className="seg-icon blue"><span className="material-symbols-outlined">repeat</span></div>
                <div className="seg-body">
                  <div className="seg-title">Repeat Buyers</div>
                  <div className="seg-sub">&gt; 1 review in range</div>
                </div>
                <div className="seg-num">{formatK(segments.repeatBuyers)}</div>
              </div>
              <button className="segments-add" disabled title="Not available yet">
                + Create New Segment
              </button>
            </div>

            {/* Scheduled (only show when real data exists) */}
            <div className="glass-panel scheduled">
              <div className="scheduled-head">
                <h3>Scheduled</h3>
                <span className="scheduled-sub">Next 7 days</span>
              </div>
              <div className="loading-note">
                Based on the available data, scheduled campaigns cannot be determined.
              </div>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div className="campaigns-footnote">
          <span className="material-symbols-outlined">info</span>
          <span>
            Metrics and segments are derived from reviews within the selected date range.
          </span>
        </div>
      </div>
    </div>
  );
}

export default Campaigns;


