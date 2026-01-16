import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import { useReviews } from '../context/ReviewContext';
import { filterReviewsByDate, buildAnalysisFromReviews, buildTrendDataFromReviews } from '../utils/reviewAnalytics';

import LogoWithName from '../assets/Logo_with_name.png';

import '../styles/DetailedReport.css';

function parseRange(search: string): { startDate: Date | null; endDate: Date | null; label: string } {
  const params = new URLSearchParams(search);
  const start = params.get('start');
  const end = params.get('end');
  const startDate = start ? new Date(`${start}T00:00:00`) : null;
  const endDate = end ? new Date(`${end}T00:00:00`) : null;
  const label = start && end ? `${start} → ${end}` : 'All time';
  return { startDate: Number.isNaN(startDate?.getTime() ?? NaN) ? null : startDate, endDate: Number.isNaN(endDate?.getTime() ?? NaN) ? null : endDate, label };
}

export default function DetailedReport() {
  const location = useLocation();
  const { reviews, productAnalytics, products } = useReviews();

  const range = useMemo(() => parseRange(location.search), [location.search]);

  const filtered = useMemo(() => {
    if (!range.startDate || !range.endDate) return reviews;
    return filterReviewsByDate(reviews, { startDate: range.startDate, endDate: range.endDate });
  }, [reviews, range.startDate, range.endDate]);

  const summary = useMemo(() => {
    if (!filtered || filtered.length === 0) return null;
    return buildAnalysisFromReviews(filtered);
  }, [filtered]);

  const trend = useMemo(() => {
    if (!range.startDate || !range.endDate) return [];
    return buildTrendDataFromReviews({ startDate: range.startDate, endDate: range.endDate }, filtered);
  }, [range.startDate, range.endDate, filtered]);

  const topProducts = useMemo(() => {
    const list = [...(productAnalytics || [])];
    list.sort((a, b) => (b.review_count || 0) - (a.review_count || 0));
    return list.slice(0, 8);
  }, [productAnalytics]);

  const generatedAt = useMemo(() => new Date().toLocaleString(), []);

  useEffect(() => {
    // Auto-open print dialog so user can "Save as PDF"
    const t = window.setTimeout(() => window.print(), 600);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="report-page">
      <div className="report-toolbar">
        <button className="report-btn" onClick={() => window.print()}>
          <span className="material-symbols-outlined">print</span>
          Download PDF
        </button>
      </div>

      <div className="report-sheet">
        <header className="report-header">
          <div className="report-brand">
            <img className="report-logo" src={LogoWithName} alt="RevuMax" />
            <div className="report-meta">
              <div className="report-title">Detailed Review Intelligence Report</div>
              <div className="report-subtitle">
                Date range: <span className="mono">{range.label}</span> • Generated: <span className="mono">{generatedAt}</span>
              </div>
            </div>
          </div>
          <div className="report-badge">
            <div className="badge-top">RevuMax</div>
            <div className="badge-bottom">Premium Export</div>
          </div>
        </header>

        <section className="report-grid">
          <div className="report-card">
            <h3>Executive Summary</h3>
            <p className="muted">
              This report summarizes customer sentiment, emerging themes, and product-level performance for the selected period.
              Use it for weekly ops reviews, CX prioritization, and product roadmap discussions.
            </p>
            <div className="report-kpis">
              <div className="kpi">
                <div className="kpi-label">Total Reviews</div>
                <div className="kpi-value mono">{summary ? summary.total_reviews : 0}</div>
              </div>
              <div className="kpi">
                <div className="kpi-label">Positive</div>
                <div className="kpi-value mono">{summary ? `${summary.positive_percentage}%` : '—'}</div>
              </div>
              <div className="kpi">
                <div className="kpi-label">Negative</div>
                <div className="kpi-value mono">{summary ? `${summary.negative_percentage}%` : '—'}</div>
              </div>
            </div>
          </div>

          <div className="report-card">
            <h3>Sentiment Breakdown</h3>
            <div className="bar">
              <div className="bar-pos" style={{ width: `${summary?.positive_percentage ?? 0}%` }} />
              <div className="bar-neg" style={{ width: `${summary?.negative_percentage ?? 0}%` }} />
              <div className="bar-neu" style={{ width: `${Math.max(0, 100 - (summary?.positive_percentage ?? 0) - (summary?.negative_percentage ?? 0))}%` }} />
            </div>
            <div className="bar-legend">
              <span><span className="dot pos" /> {summary?.positive_percentage ?? 0}% Positive</span>
              <span><span className="dot neg" /> {summary?.negative_percentage ?? 0}% Negative</span>
              <span><span className="dot neu" /> {Math.max(0, 100 - (summary?.positive_percentage ?? 0) - (summary?.negative_percentage ?? 0))}% Neutral</span>
            </div>
            <div className="report-split">
              <div>
                <h4>Top Positive Themes</h4>
                <ul className="chips">
                  {(summary?.top_positive_topics || []).slice(0, 6).map(t => (
                    <li key={`pos-${t.topic}`} className="chip chip-pos">{t.topic}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4>Top Negative Themes</h4>
                <ul className="chips">
                  {(summary?.top_negative_topics || []).slice(0, 6).map(t => (
                    <li key={`neg-${t.topic}`} className="chip chip-neg">{t.topic}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="report-card report-card-wide">
            <h3>Sentiment Trend (Daily)</h3>
            {trend.length > 0 ? (
              <div className="trend-mini">
                <svg viewBox="0 0 1000 220" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#135bec" stopOpacity="0.45" />
                      <stop offset="100%" stopColor="#135bec" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* grid */}
                  {[0, 25, 50, 75, 100].map(v => (
                    <g key={v}>
                      <line x1="0" y1={220 - (v / 100) * 200} x2="1000" y2={220 - (v / 100) * 200} stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
                      <text x="8" y={224 - (v / 100) * 200} fontSize="12" fill="rgba(0,0,0,0.55)">{v}</text>
                    </g>
                  ))}
                  {/* line */}
                  {(() => {
                    const pts = trend.map((d, i) => {
                      const x = (i / Math.max(1, trend.length - 1)) * 1000;
                      const y = 220 - (d.sentimentScore / 100) * 200;
                      return { x, y };
                    });
                    const d0 = pts[0];
                    let dPath = `M ${d0.x} ${d0.y}`;
                    for (let i = 1; i < pts.length; i++) {
                      const prev = pts[i - 1];
                      const cur = pts[i];
                      const cp1x = prev.x + (cur.x - prev.x) / 3;
                      const cp1y = prev.y;
                      const cp2x = cur.x - (cur.x - prev.x) / 3;
                      const cp2y = cur.y;
                      dPath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${cur.x} ${cur.y}`;
                    }
                    const area = `${dPath} L 1000 220 L 0 220 Z`;
                    return (
                      <>
                        <path d={area} fill="url(#lineGrad)" />
                        <path d={dPath} fill="none" stroke="#135bec" strokeWidth="6" strokeLinecap="round" />
                      </>
                    );
                  })()}
                </svg>
              </div>
            ) : (
              <p className="muted">No trend data available for the selected range.</p>
            )}
          </div>

          <div className="report-card report-card-wide">
            <h3>Top Products (by review volume)</h3>
            <div className="table">
              <div className="tr th">
                <div>Product</div>
                <div className="right">Reviews</div>
                <div className="right">Avg Rating</div>
                <div className="right">Positive%</div>
              </div>
              {topProducts.length > 0 ? (
                topProducts.map((p) => (
                  <div key={`${p.product_id ?? p.product_title}`} className="tr">
                    <div className="truncate">{p.product_title}</div>
                    <div className="right mono">{p.review_count}</div>
                    <div className="right mono">{p.average_rating ?? '—'}</div>
                    <div className="right mono">{Math.round(p.positive_percentage)}%</div>
                  </div>
                ))
              ) : (
                <div className="tr">
                  <div className="muted">No product analytics available.</div>
                  <div />
                  <div />
                  <div />
                </div>
              )}
            </div>
          </div>

          <div className="report-card report-card-wide">
            <h3>Recent Reviews (sample)</h3>
            {filtered.length > 0 ? (
              <div className="review-sample">
                {filtered.slice(0, 10).map((r, idx) => (
                  <div key={`${r.id ?? idx}`} className="review-row">
                    <div className="review-head">
                      <span className="reviewer">{r.reviewer_name || 'Anonymous'}</span>
                      <span className="muted mono">{(r.created_at || '').slice(0, 10)}</span>
                      <span className="muted truncate">{r.product_title || ''}</span>
                      <span className="rating mono">{r.rating ? `${r.rating}/5` : '—'}</span>
                    </div>
                    <div className="review-body">
                      {(r.body || '').slice(0, 280)}
                      {(r.body || '').length > 280 ? '…' : ''}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">No reviews found in the selected date range.</p>
            )}
          </div>
        </section>

        <footer className="report-footer">
          <div className="muted">Generated by RevuMax • Data source: Shopify / Judge.me</div>
          <div className="muted">Products loaded: {products?.length ?? 0} • Reviews in range: {filtered?.length ?? 0}</div>
        </footer>
      </div>
    </div>
  );
}


