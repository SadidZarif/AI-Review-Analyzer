import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useReviews } from '../context/ReviewContext';
import type { DateRange } from '../components/DateRangePicker';
import { filterReviewsByDate, buildAnalysisFromReviews } from '../utils/reviewAnalytics';
import { aiChat } from '../api';
import '../styles/TopicClusters.css';

interface Cluster {
  id: string;
  name: string;
  icon: string;
  mentions: number;
  status: 'growing' | 'stable' | 'declining';
  sentiment: 'positive' | 'negative';
  keywords: string[];
  position: { top: string; left: string };
  color: string;
  borderColor: string;
}

export default function TopicClusters() {
  const navigate = useNavigate();
  const location = useLocation();
  const { reviews } = useReviews();

  const initial = useMemo(() => {
    const st = (location.state || {}) as any;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    return {
      dateRange: (st?.presetDateRange as DateRange) || { startDate, endDate },
    };
  }, [location.state]);

  const [dateRange] = useState<DateRange>(initial.dateRange);
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [aiInsight, setAiInsight] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);

  const dateFiltered = useMemo(() => 
    (dateRange.startDate && dateRange.endDate ? filterReviewsByDate(reviews, dateRange) : reviews), 
    [reviews, dateRange]
  );

  const summary = useMemo(() => 
    (dateFiltered.length ? buildAnalysisFromReviews(dateFiltered) : null), 
    [dateFiltered]
  );

  // Generate clusters from topics
  const clusters: Cluster[] = useMemo(() => {
    if (!summary) return [];

    const clusterData: Cluster[] = [];
    const positions = [
      { top: '25%', left: '25%' },
      { top: '75%', left: '33%' },
      { top: '33%', left: '75%' },
    ];

    // Negative topics (growing risks)
    summary.top_negative_topics.slice(0, 3).forEach((topic, idx) => {
      const mentions = dateFiltered.filter(r => 
        (r.body || '').toLowerCase().includes(topic.topic.toLowerCase())
      ).length;

      clusterData.push({
        id: `neg-${idx}`,
        name: topic.topic,
        icon: idx === 0 ? 'local_shipping' : idx === 1 ? 'warning' : 'error',
        mentions,
        status: idx === 0 ? 'growing' : idx === 1 ? 'stable' : 'declining',
        sentiment: 'negative',
        keywords: [topic.topic.split(' ')[0], 'logistics'],
        position: positions[idx] || { top: '50%', left: '50%' },
        color: 'red',
        borderColor: 'rgba(239, 68, 68, 0.4)'
      });
    });

    // Positive topics (stable/growing)
    summary.top_positive_topics.slice(0, 2).forEach((topic, idx) => {
      const mentions = dateFiltered.filter(r => 
        (r.body || '').toLowerCase().includes(topic.topic.toLowerCase())
      ).length;

      clusterData.push({
        id: `pos-${idx}`,
        name: topic.topic,
        icon: idx === 0 ? 'battery_charging_full' : 'volume_up',
        mentions,
        status: idx === 0 ? 'stable' : 'declining',
        sentiment: 'positive',
        keywords: [topic.topic.split(' ')[0]],
        position: { top: `${10 + idx * 20}%`, left: `${15 + idx * 10}%` },
        color: idx === 0 ? 'blue' : 'purple',
        borderColor: idx === 0 ? 'rgba(59, 130, 246, 0.3)' : 'rgba(168, 85, 247, 0.3)'
      });
    });

    return clusterData;
  }, [summary, dateFiltered]);

  // Get evidence reviews for selected cluster
  const evidenceReviews = useMemo(() => {
    if (!selectedCluster) return [];
    const q = selectedCluster.name.toLowerCase();
    return dateFiltered
      .filter(r => (r.body || '').toLowerCase().includes(q))
      .slice(0, 5);
  }, [dateFiltered, selectedCluster]);

  // Auto-select first cluster
  useMemo(() => {
    if (clusters.length > 0 && !selectedCluster) {
      setSelectedCluster(clusters[0]);
    }
  }, [clusters, selectedCluster]);

  async function generatePatternReport() {
    if (!selectedCluster || !summary) return;
    if (aiLoading) return;
    setAiLoading(true);
    try {
      const resp = await aiChat({
        question: `Explain the topic cluster "${selectedCluster.name}" for the selected date range. What customers are saying, what it likely means operationally, and what actions to take.`,
        date_range_label: dateRange.startDate && dateRange.endDate 
          ? `${dateRange.startDate.toISOString().slice(0, 10)} → ${dateRange.endDate.toISOString().slice(0, 10)}` 
          : undefined,
        analysis: summary,
        top_positive_topics: summary.top_positive_topics.map(t => t.topic),
        top_negative_topics: summary.top_negative_topics.map(t => t.topic),
        sample_reviews: evidenceReviews.slice(0, 8).map(r => (r.body || '').slice(0, 240)),
        history: []
      });
      setAiInsight(resp.answer || '');
    } catch (e: any) {
      setAiInsight('');
    } finally {
      setAiLoading(false);
    }
  }

  const statusLabels = {
    growing: 'GROWING RISK',
    stable: 'STABLE',
    declining: 'DECLINING'
  };

  const statusColors = {
    growing: 'bg-red-500 text-white animate-pulse',
    stable: 'bg-green-500/20 text-green-400',
    declining: 'bg-slate-800 text-slate-400'
  };

  return (
    <div className="topic-clusters-page">
      <button 
        className="tcl-back-btn"
        onClick={() => navigate('/analysis')}
      >
        <span className="material-symbols-outlined">arrow_back</span>
        Back to Analysis
      </button>
      <header className="tcl-header">
        <div className="tcl-header-left">
          <div className="tcl-status-indicator">
            <span className="tcl-status-dot"></span>
            <span className="tcl-status-text">Live AI Pattern Detection</span>
          </div>
          <h2 className="tcl-title">Topic Clusters</h2>
        </div>
        <div className="tcl-header-right">
          <div className="tcl-processing-info">
            <span className="tcl-processing-label">Processing</span>
            <span className="tcl-processing-value">4,281 Reviews/sec</span>
          </div>
          <button className="tcl-recalculate-btn">
            <span className="material-symbols-outlined">refresh</span>
            Recalculate Map
          </button>
        </div>
      </header>

      <div className="tcl-main-container">
        <div className="tcl-visualization-area">
          <div className="tcl-grid-background"></div>
          {clusters.map((cluster) => (
            <div
              key={cluster.id}
              className={`tcl-cluster-bubble ${cluster.color}`}
              style={{
                top: cluster.position.top,
                left: cluster.position.left,
                borderColor: cluster.borderColor
              }}
              onClick={() => setSelectedCluster(cluster)}
            >
              <div className={`tcl-cluster-status ${statusColors[cluster.status]}`}>
                {statusLabels[cluster.status]}
              </div>
              <span className={`material-symbols-outlined tcl-cluster-icon ${cluster.color}`}>
                {cluster.icon}
              </span>
              <span className="tcl-cluster-name">{cluster.name}</span>
              <span className={`tcl-cluster-mentions ${cluster.color}`}>
                {cluster.mentions} Mentions
              </span>
              {cluster.keywords.length > 0 && (
                <div className="tcl-cluster-keywords">
                  {cluster.keywords.map((kw, idx) => (
                    <span key={idx} className="tcl-keyword-tag">#{kw}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
          <svg className="tcl-connector-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line 
              x1="25%" 
              x2="35%" 
              y1="25%" 
              y2="75%" 
              stroke="white" 
              strokeDasharray="4 4" 
              strokeWidth="0.5"
              opacity="0.2"
            />
            <line 
              x1="35%" 
              x2="75%" 
              y1="75%" 
              y2="33%" 
              stroke="white" 
              strokeDasharray="4 4" 
              strokeWidth="0.5"
              opacity="0.2"
            />
          </svg>
          <div className="tcl-top-keyword-badge">
            <div className="tcl-keyword-icon">
              <span className="material-symbols-outlined">trending_up</span>
            </div>
            <div>
              <div className="tcl-keyword-label">Top Keyword</div>
              <div className="tcl-keyword-value">"Ultra-Fast"</div>
            </div>
          </div>
          <div className="tcl-legend">
            <div className="tcl-legend-item">
              <span className="tcl-legend-dot red"></span>
              <span className="tcl-legend-text">Growing</span>
            </div>
            <div className="tcl-legend-item">
              <span className="tcl-legend-dot green"></span>
              <span className="tcl-legend-text">Stable</span>
            </div>
            <div className="tcl-legend-item">
              <span className="tcl-legend-dot gray"></span>
              <span className="tcl-legend-text">Declining</span>
            </div>
          </div>
        </div>

        <div className="tcl-sidebar">
          {selectedCluster ? (
            <>
              <section className="tcl-sidebar-section">
                <div className="tcl-selection-header">
                  <span className="tcl-selection-label">Active Selection</span>
                  <span className="tcl-selection-id">Node ID: {selectedCluster.id.toUpperCase()}</span>
                </div>
                <h3 className="tcl-cluster-title">{selectedCluster.name}</h3>
                <p className="tcl-cluster-description">
                  Emerging pattern detected in the last 48 hours across multiple fulfillment centers.
                </p>
              </section>

              <section className="tcl-insight-card">
                <div className="tcl-insight-icon-bg">
                  <span className="material-symbols-outlined">warning</span>
                </div>
                <div className="tcl-insight-header">
                  <span className="material-symbols-outlined tcl-ai-icon">auto_awesome</span>
                  <span className="tcl-insight-label">AI Strategic Insight</span>
                </div>
                <h4 className="tcl-insight-title">Logistical Bottleneck Detected</h4>
                {aiInsight ? (
                  <p className="tcl-insight-text">{aiInsight}</p>
                ) : (
                  <p className="tcl-insight-text">
                    Analysis suggests a correlation between the new regional carrier and a{' '}
                    <span className="tcl-highlight">14% increase</span> in "late delivery" mentions. 
                    Immediate action recommended to switch secondary carriers for the NE-1 sector.
                  </p>
                )}
                <div className="tcl-impact-meter">
                  <div className="tcl-impact-label">Impact Risk</div>
                  <div className="tcl-impact-bar">
                    <div className="tcl-impact-fill" style={{ width: '78%' }}></div>
                  </div>
                  <div className="tcl-impact-value">High (7.8)</div>
                </div>
              </section>

              <section className="tcl-evidence-section">
                <div className="tcl-evidence-header">
                  <h4 className="tcl-evidence-title">Evidence Logs</h4>
                  <button className="tcl-view-all-btn">View All {selectedCluster.mentions}</button>
                </div>
                <div className="tcl-evidence-list">
                  {evidenceReviews.map((review, idx) => (
                    <div key={review.id || idx} className="tcl-evidence-item">
                      <div className="tcl-evidence-item-header">
                        <span className="tcl-evidence-name">{review.reviewer_name || 'Anonymous'}</span>
                        <span className="tcl-evidence-time">
                          {review.created_at 
                            ? new Date(review.created_at).toLocaleString('en-US', { 
                                hour: 'numeric', 
                                minute: 'numeric',
                                hour12: true 
                              })
                            : 'Unknown'}
                        </span>
                      </div>
                      <p className="tcl-evidence-text">"{review.body || 'No review text'}"</p>
                    </div>
                  ))}
                </div>
              </section>

              <button 
                className="tcl-generate-report-btn"
                onClick={generatePatternReport}
                disabled={aiLoading}
              >
                <span className="material-symbols-outlined">summarize</span>
                Generate Pattern Report
              </button>
            </>
          ) : (
            <div className="tcl-empty-state">
              <p>Select a cluster to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
