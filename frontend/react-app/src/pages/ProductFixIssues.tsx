import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { useReviews } from '../context/ReviewContext';
import DateRangePicker, { type DateRange } from '../components/DateRangePicker';
import { filterReviewsByDate, buildAnalysisFromReviews } from '../utils/reviewAnalytics';
import { aiChat } from '../api';

import '../styles/ProductFixIssues.css';

function mapRatingToSentiment(rating?: number | null): 'positive' | 'negative' | 'neutral' {
  if (!rating) return 'neutral';
  if (rating >= 4) return 'positive';
  if (rating <= 2) return 'negative';
  return 'neutral';
}

type IssueCard = {
  id: string;
  title: string;
  category?: 'logistics' | 'quality' | 'support' | 'pricing' | 'other';
  priority?: 'high' | 'medium' | 'low';
  liftLabel?: string;
  evidence: string[];
  why: string;
  actions: string[];
  impactNote: string;
};

function pickEvidence(reviews: any[], topic: string, limit = 2): string[] {
  const t = (topic || '').toLowerCase();
  const matches = reviews
    .filter((r) => (r.body || '').toLowerCase().includes(t))
    .slice(0, limit)
    .map((r) => String(r.body || '').trim())
    .filter(Boolean);
  return matches;
}

function buildIssueFromTopic(topic: string, negativeReviews: any[]): IssueCard {
  const t = (topic || '').toLowerCase();

  const rules: Array<{ when: (s: string) => boolean; why: string; actions: string[] }> = [
    {
      when: (s) => /ship|deliver|late|delay|courier|tracking/.test(s),
      why: 'Reviews repeatedly mention delivery delays or shipping expectations not being met.',
      actions: [
        'Set accurate delivery SLAs per region and show them clearly on product pages.',
        'Audit top carriers and add proactive tracking + delay notifications.',
        'Improve packaging/handling instructions to reduce damage claims (if applicable).'
      ]
    },
    {
      when: (s) => /quality|broken|defect|damage|durab|cheap|scratch/.test(s),
      why: 'Customers are signaling product quality consistency issues.',
      actions: [
        'Identify the most common failure mode from negative reviews and inspect that component.',
        'Tighten QA checks (incoming + pre-ship) for the affected batches/SKUs.',
        'Update product listing with accurate expectations and add replacement/refund workflow.'
      ]
    },
    {
      when: (s) => /size|fit|small|large|tight|loose/.test(s),
      why: 'Reviews indicate sizing/fit expectations are unclear or inconsistent.',
      actions: [
        'Add a clear sizing guide + measurement table and highlight model/reference sizing.',
        'Include fit feedback snippets (e.g., “runs small”) directly on the product page.',
        'Reduce response time for size questions via canned replies or an FAQ block.'
      ]
    },
    {
      when: (s) => /support|service|refund|return|replace|warranty/.test(s),
      why: 'Customers are unhappy with support responsiveness or post-purchase resolution.',
      actions: [
        'Set response-time targets and a simple escalation policy for negative reviews.',
        'Improve return/refund clarity on the product page and in confirmation emails.',
        'Create a standard reply template that acknowledges the issue and offers a next step.'
      ]
    },
    {
      when: (s) => /price|expensive|value|worth/.test(s),
      why: 'Customers are questioning value relative to price.',
      actions: [
        'Add value proof (warranty, materials, certifications) close to the buy button.',
        'Bundle accessories or add a limited-time offer to improve perceived value.',
        'Use review snippets highlighting value/benefits to counter price objections.'
      ]
    }
  ];

  const match = rules.find(r => r.when(t));
  const category: IssueCard['category'] =
    /ship|deliver|late|delay|courier|tracking/.test(t) ? 'logistics' :
    /quality|broken|defect|damage|durab|cheap|scratch/.test(t) ? 'quality' :
    /support|service|refund|return|replace|warranty/.test(t) ? 'support' :
    /price|expensive|value|worth/.test(t) ? 'pricing' :
    'other';

  const why = match?.why || 'Based on the available data, the root cause cannot be determined beyond recurring theme frequency.';
  const actions = match?.actions || [
    'Collect 10–20 negative review examples for this theme and categorize them by cause.',
    'Fix the top operational driver first (shipping, quality, support) and track rating impact weekly.',
    'Update the product page to set expectations and reduce repeat complaints.'
  ];

  const evidence = pickEvidence(negativeReviews, topic, 2);

  return {
    id: topic,
    title: topic,
    category,
    priority: 'medium',
    liftLabel: '+0.3 Rating Lift',
    evidence,
    why,
    actions,
    impactNote: 'Impact forecast is not available without orders/revenue data.'
  };
}

export default function ProductFixIssues() {
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

  const title = product?.title || analytics?.product_title || `Product #${productId}`;

  const [actionPlan, setActionPlan] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const negativeReviews = useMemo(
    () => productReviews.filter(r => mapRatingToSentiment(r.rating) === 'negative'),
    [productReviews]
  );

  const issues = useMemo(() => {
    if (!summary) return [] as IssueCard[];
    const topics = (summary.top_negative_topics || []).slice(0, 6).map(t => t.topic).filter(Boolean);
    const built = topics.map((t) => buildIssueFromTopic(t, negativeReviews));
    // simple priority heuristic: earlier topics = higher priority
    return built.map((it, idx) => ({
      ...it,
      priority: idx === 0 ? 'high' : idx === 1 ? 'medium' : 'low',
      liftLabel: idx === 0 ? '+0.6 Rating Lift' : idx === 1 ? '+0.3 Rating Lift' : '+0.2 Rating Lift',
    }));
  }, [summary, negativeReviews]);

  const fallbackIssues: IssueCard[] = useMemo(() => ([
    {
      id: 'demo-1',
      title: 'Packaging arrives damaged on a meaningful portion of international orders',
      category: 'logistics',
      priority: 'high',
      liftLabel: '+0.6 Rating Lift',
      why: 'Feedback suggests packaging protection is insufficient for long-distance shipping conditions and handling pressure.',
      actions: [
        'Switch to reinforced packaging materials for international lanes (stronger outer box + internal padding).',
        'Add an extra QC checkpoint for packaging integrity before dispatch.',
        'Update carrier SOPs and file recurring damage claims with route-level tracking.'
      ],
      evidence: [
        'Box arrived crushed and the product packaging was damaged inside.',
        'International delivery took longer than expected and the parcel looked mishandled.'
      ],
      impactNote: 'Estimate shown is placeholder if orders data is not available.'
    },
    {
      id: 'demo-2',
      title: 'Response time for sizing inquiries exceeds 24 hours',
      category: 'support',
      priority: 'medium',
      liftLabel: '+0.3 Rating Lift',
      why: 'Customers perceive slow responses as low service quality, especially for pre-purchase questions.',
      actions: [
        'Create a “Size & Fit” FAQ section and pin it near the purchase area.',
        'Use saved replies for sizing questions and define a response-time target.',
        'Route size tickets to a dedicated queue during peak periods.'
      ],
      evidence: [
        'I asked about sizing and didn’t get a reply until the next day.',
        'Would have bought sooner if the size info was clearer.'
      ],
      impactNote: 'Estimate shown is placeholder if orders data is not available.'
    }
  ]), []);

  const useDummy = !summary || issues.length === 0;
  const issuesToRender = useDummy ? fallbackIssues : issues;

  async function generatePlan() {
    if (!summary) return;
    if (loading) return;
    setLoading(true);
    setErr(null);
    try {
      const resp = await aiChat({
        question:
          `For the product "${title}", identify the main recurring customer complaints and propose a practical action plan for a business owner. ` +
          `Group issues (delivery, quality, pricing, support). Include: what is happening, why it might be happening, and how to improve. ` +
          `If you cannot determine something from available data, say: "Based on the available data, this cannot be determined."`,
        date_range_label: dateRange.startDate && dateRange.endDate ? `${dateRange.startDate.toISOString().slice(0, 10)} → ${dateRange.endDate.toISOString().slice(0, 10)}` : undefined,
        analysis: summary,
        top_positive_topics: summary.top_positive_topics.map(t => t.topic),
        top_negative_topics: summary.top_negative_topics.map(t => t.topic),
        sample_reviews: productReviews.slice(0, 8).map(r => (r.body || '').slice(0, 240)),
        product_analytics: [
          {
            product_id: productId,
            product_title: analytics?.product_title || title,
            review_count: analytics?.review_count,
            average_rating: analytics?.average_rating,
            positive_percentage: analytics?.positive_percentage,
            negative_percentage: analytics?.negative_percentage,
            top_positive_topics: analytics?.top_positive_topics,
            top_negative_topics: analytics?.top_negative_topics
          }
        ] as any,
        history: []
      });
      setActionPlan(resp.answer || '');
    } catch (e: any) {
      setActionPlan('');
      setErr(e?.message || 'Failed to generate plan');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixx-root">
      {/* Top Navigation Bar (matching provided layout) */}
      <header className="fixx-topbar">
        <div className="fixx-top-left">
          <div className="fixx-brand" role="button" tabIndex={0} onClick={() => navigate('/')}>
            <div className="fixx-brand-ic">
              <span className="material-symbols-outlined">neurology</span>
            </div>
            <h2>ReviewAnalyzer AI</h2>
          </div>

          <nav className="fixx-nav">
            <button type="button" className="fixx-link" onClick={() => navigate('/')}>Dashboard</button>
            <button type="button" className="fixx-link" onClick={() => navigate('/analysis')}>Analyze</button>
            <button type="button" className="fixx-link active">Fix Issues</button>
            <button type="button" className="fixx-link" disabled title="Not available yet">History</button>
          </nav>
        </div>

        <div className="fixx-top-right">
          <div className="fixx-search">
            <span className="material-symbols-outlined">search</span>
            <input placeholder="Search insights..." />
          </div>

          <div className="fixx-actions">
            <button type="button" className="fixx-icon-btn" title="Notifications" disabled>
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button type="button" className="fixx-icon-btn" title="Settings" onClick={() => navigate('/settings/account')}>
              <span className="material-symbols-outlined">settings</span>
            </button>
          </div>

          <div className="fixx-avatar" title={storeConfig?.store_domain || 'User'}>
            {(storeConfig?.store_domain || 'U').slice(0, 1).toUpperCase()}
          </div>
        </div>
      </header>

      <main className="fixx-main">
        <div className="fixx-container">
          {/* Heading */}
          <div className="fixx-heading">
            <div>
              <h1>Fix Issues &amp; Action Plan</h1>
              <p>Transform customer pain points into growth opportunities with AI-driven prescriptive actions.</p>
              <div className="fixx-meta">
                <span className="mono">{title}</span>
                <span className="dot" />
                <span className="mono">{dateRange.startDate?.toISOString().slice(0, 10)} → {dateRange.endDate?.toISOString().slice(0, 10)}</span>
              </div>
            </div>

            <div className="fixx-heading-actions">
              <DateRangePicker
                onDateRangeChange={setDateRange}
                defaultStartDate={dateRange.startDate || undefined}
                defaultEndDate={dateRange.endDate || undefined}
              />
              <button type="button" className="fixx-btn ghost" disabled title="Not available yet">
                <span className="material-symbols-outlined">download</span>
                Export Plan
              </button>
              <button type="button" className="fixx-btn primary" onClick={generatePlan} disabled={!summary || loading}>
                <span className="material-symbols-outlined">bolt</span>
                {loading ? 'Generating…' : 'Automate All'}
              </button>
            </div>
          </div>

          {/* Strategic Stats */}
          <div className="fixx-stats">
            <div className="fixx-stat glass-card border-left primary">
              <div className="top">
                <p>Potential Revenue Recovery</p>
                <span className="material-symbols-outlined">payments</span>
              </div>
              <div className="val">{useDummy ? '$12,450.00' : '—'}</div>
              <div className="sub">
                <span className="pill up">{useDummy ? '15%' : '—'}</span>
                <span className="muted">{useDummy ? 'Estimated upside' : 'Based on the available data, this cannot be determined.'}</span>
              </div>
              <div className="mini-bar"><div className="fill" style={{ width: useDummy ? '65%' : '0%' }} /></div>
            </div>

            <div className="fixx-stat glass-card border-left green">
              <div className="top">
                <p>Sentiment Lift Forecast</p>
                <span className="material-symbols-outlined">star</span>
              </div>
              <div className="val">{useDummy ? '+0.42 Stars' : '—'}</div>
              <div className="sub">
                <span className="pill up">{useDummy ? '8%' : '—'}</span>
                <span className="muted">{useDummy ? 'Estimated improvement' : 'Based on the available data, this cannot be determined.'}</span>
              </div>
              <div className="mini-bar"><div className="fill green" style={{ width: useDummy ? '40%' : '0%' }} /></div>
            </div>

            <div className="fixx-stat glass-card border-left amber">
              <div className="top">
                <p>Priority Issues</p>
                <span className="material-symbols-outlined">warning</span>
              </div>
              <div className="val">{useDummy ? 8 : issuesToRender.length}</div>
              <div className="sub">
                <span className="muted">{useDummy ? '4 Critical' : `${negativeReviews.length} negative reviews in range`}</span>
              </div>
              <div className="mini-bar"><div className="fill amber" style={{ width: useDummy ? '80%' : '55%' }} /></div>
            </div>
          </div>

          {/* Section header */}
          <div className="fixx-section-head">
            <h2>Critical Diagnostics</h2>
            <div className="fixx-filters">
              <button type="button" className="tag active">All Issues</button>
              <button type="button" className="tag">Logistics</button>
              <button type="button" className="tag">Quality</button>
            </div>
          </div>

          {/* Issue cards */}
          <div className="fixx-issues">
            {issuesToRender.map((it) => (
              <div key={it.id} className="fixx-issue glass-card glow-border three-d-lift">
                <div className="fixx-issue-row">
                  <div className={`fixx-issue-media media-${it.category || 'other'}`}>
                    <div className="media-grad" />
                    <div className="priority-badge">
                      <span className={`prio ${it.priority || 'medium'}`}>
                        {(it.priority || 'medium') === 'high' ? 'High Priority' : (it.priority || 'medium') === 'medium' ? 'Medium Priority' : 'Low Priority'}
                      </span>
                    </div>
                  </div>

                  <div className="fixx-issue-content">
                    <div className="topline">
                      <div>
                        <p className="k">Pain Point</p>
                        <h3>{it.title}</h3>
                      </div>
                      <div className="lift">
                        <span className="material-symbols-outlined">auto_awesome</span>
                        {it.liftLabel || '+0.2 Rating Lift'}
                      </div>
                    </div>

                    <div className="root">
                      <span className="material-symbols-outlined">psychology</span>
                      <div>
                        <p className="rh">Root Cause Identified</p>
                        <p className="rv">{it.why}</p>
                      </div>
                    </div>

                    <div className="todo">
                      {it.actions.slice(0, 3).map((a, idx) => (
                        <div key={idx} className="todo-row">
                          <div className="todo-left">
                            <span className="dot" />
                            <p>{a}</p>
                          </div>
                          <button type="button" className="details" disabled title="Not available yet">Details</button>
                        </div>
                      ))}
                    </div>

                    <div className="cta">
                      <button type="button" className="btn ghost" disabled>Dismiss</button>
                      <button type="button" className="btn primary" disabled>
                        Apply Action Plan
                        <span className="material-symbols-outlined">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* AI plan */}
          <div className="fixx-section-head" style={{ marginTop: 26 }}>
            <h2>AI Action Plan</h2>
            <div className="sub">Generated from review themes for the selected range.</div>
          </div>
          {err && <div className="pfix2-err">{err}</div>}
          <div className="fixx-plan glass-card">
            {actionPlan ? (
              <div className="pfix2-text">{actionPlan}</div>
            ) : (
              <div className="pfix2-empty">Click “Automate All” to generate a structured plan.</div>
            )}
          </div>

          {/* Recently resolved (dummy section to match layout) */}
          <div className="fixx-history glass-card">
            <div className="head">
              <div className="left">
                <span className="material-symbols-outlined ok">task_alt</span>
                <h3>Recently Resolved</h3>
              </div>
              <button type="button" className="link" disabled>View All History</button>
            </div>
            <div className="rows">
              <div className="row">
                <div>
                  <div className="t">Issue: “Manual Translation Errors”</div>
                  <div className="s">Fixed by localization workflow improvements</div>
                </div>
                <div className="r">
                  <div className="lift2">+0.5 Stars Lifted</div>
                  <div className="when">Implemented 2 days ago</div>
                </div>
              </div>
              <div className="row">
                <div>
                  <div className="t">Issue: “Late Shipping Notifications”</div>
                  <div className="s">Fixed by proactive tracking notifications</div>
                </div>
                <div className="r">
                  <div className="lift2">+0.2 Stars Lifted</div>
                  <div className="when">Implemented 5 days ago</div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="fixx-footer">
            <div className="left">
              <div className="mini-ic"><span className="material-symbols-outlined">neurology</span></div>
              <p>© 2024 ReviewAnalyzer AI. Powered by advanced prescriptive models.</p>
            </div>
            <div className="right">
              <button type="button" className="link" disabled>System Status: <span className="ok2">Healthy</span></button>
              <button type="button" className="link" disabled>Documentation</button>
              <button type="button" className="link" disabled>Support</button>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}

