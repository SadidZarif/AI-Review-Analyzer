import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { aiChat, type AnalysisResponse } from '../api';
import { useReviews } from '../context/ReviewContext';

import LogoWithName from '../assets/Logo_with_name.png';
import '../styles/AIChatPage.css';

type Role = 'user' | 'assistant';

type NavItem = {
  title: string;
  icon: string;
  active?: boolean;
  section: 'today' | 'week';
};

type ChatState = {
  dateRangeLabel?: string;
  analysis?: AnalysisResponse | null;
  topPositiveTopics?: string[];
  topNegativeTopics?: string[];
  sampleReviews?: string[];
};

function useChatState(): ChatState {
  const location = useLocation();
  const st = (location.state || {}) as ChatState;
  return st;
}

function safeTrim(s: string, max = 1200) {
  const t = (s || '').trim();
  return t.length > max ? t.slice(0, max) + '…' : t;
}

export default function AIChatPage() {
  const navigate = useNavigate();
  const state = useChatState();
  const { storeConfig, productAnalytics, reviews } = useReviews();

  const [messages, setMessages] = useState<Array<{ role: Role; text: string; ts: number }>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Quick reply chips
  const quickReplies = [
    'Total reviews koyta?',
    'Top negative issues',
    'Last 7 days er stats',
    'Screenshot er jonno UI',
    'Export CSV kivabe',
  ];

  const navItems: NavItem[] = useMemo(() => ([
    { section: 'today', title: 'Current Deep Dive', icon: 'chat_bubble', active: true },
  ]), []);

  const headerMeta = useMemo(() => {
    const dr = state.dateRangeLabel || 'selected range';
    const total = state.analysis?.total_reviews ?? 0;
    return `Range: ${dr} • Reviews: ${total}`;
  }, [state.dateRangeLabel, state.analysis?.total_reviews]);

  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        ts: Date.now(),
        text:
          "I've loaded your dashboard context for the selected range. Ask me things like: total reviews, positive vs negative, top issues, or what to fix first.",
      },
    ]);
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  async function handleSend() {
    const q = safeTrim(input, 700);
    if (!q || loading) return;
    setInput('');
    const userMsg = { role: 'user' as const, ts: Date.now(), text: q };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    try {
      const history = [...messages, userMsg]
        .slice(-10)
        .map(m => ({ role: m.role, content: m.text }));

      // Prepare date range for backend
      const dateRange = state.dateRangeLabel 
        ? (() => {
            // Try to parse date range from label (format: "YYYY-MM-DD → YYYY-MM-DD")
            const match = state.dateRangeLabel.match(/(\d{4}-\d{2}-\d{2})\s*[→-]\s*(\d{4}-\d{2}-\d{2})/);
            if (match) {
              return { start: match[1], end: match[2] };
            }
            return undefined;
          })()
        : undefined;

      // Debug: Log reviews count and date range
      const allReviews = reviews || [];
      console.log(`[AI Chat] Total reviews in context: ${allReviews.length}`);
      if (allReviews.length > 0) {
        const dates = allReviews
          .map(r => r.created_at)
          .filter((d): d is string => typeof d === 'string' && d.trim().length > 0)
          .map((d) => new Date(d))
          .filter(d => !isNaN(d.getTime()));
        if (dates.length > 0) {
          const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
          const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
          console.log(`[AI Chat] Reviews date range: ${minDate.toISOString().slice(0, 10)} to ${maxDate.toISOString().slice(0, 10)}`);
         }
      }
      
      const reviewsToSend = allReviews.map(r => ({
        id: r.id,
        body: r.body || '',
        text: r.body || '',
        rating: r.rating || null,
        created_at: r.created_at || null,
        reviewer_name: r.reviewer_name || null,
        product_title: r.product_title || null,
        product_id: r.product_id || null,
        sentiment_label: r.rating ? (r.rating >= 4 ? 'positive' : r.rating <= 2 ? 'negative' : 'neutral') : undefined,
      }));
      console.log(`[AI Chat] Sending ${reviewsToSend.length} reviews to backend`);
      
      const resp = await aiChat({
        question: q,
        date_range_label: state.dateRangeLabel,
        date_range: dateRange,
        analysis: state.analysis ?? undefined,
        reviews: reviewsToSend,
        // Let backend fetch full history if frontend has too few cached reviews
        shopify: storeConfig
          ? {
              store_domain: storeConfig.store_domain,
              access_token: storeConfig.access_token,
              limit: 10000,
              review_app: storeConfig.review_app || "judge_me",
              ...(storeConfig.review_app_token ? { review_app_token: storeConfig.review_app_token } : {}),
            }
          : undefined,
        top_positive_topics: state.topPositiveTopics ?? [],
        top_negative_topics: state.topNegativeTopics ?? [],
        sample_reviews: state.sampleReviews ?? [],
        history,
        product_analytics: (productAnalytics || []).slice(0, 50) as any,
      });
      setMessages((prev) => [...prev, { role: 'assistant', ts: Date.now(), text: resp.answer || 'No response received' }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to get AI response';
      console.error('AI Chat Error:', e);
      setMessages((prev) => [...prev, { 
        role: 'assistant', 
        ts: Date.now(), 
        text: `Sorry—${msg}. Please check your connection and try again.` 
      }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ai-chat-page">
      <aside className="ai-chat-aside">
        <div className="ai-aside-top">
          <div className="ai-aside-brand">
            <div className="ai-aside-logo">
              <span className="material-symbols-outlined">analytics</span>
            </div>
            <div>
              <img src={LogoWithName} alt="RevuMax" className="ai-aside-name" />
              <div className="ai-aside-sub">AI Deep Dive</div>
            </div>
          </div>

          <button className="ai-aside-primary" disabled title="Not available yet">
            <span className="material-symbols-outlined">add</span>
            <span>New Analysis</span>
          </button>
        </div>

        <div className="ai-aside-list">
          <div className="ai-aside-section">
            <div className="ai-aside-section-title">Today</div>
            {navItems.filter(n => n.section === 'today').map((n) => (
              <button key={n.title} className={`ai-aside-item ${n.active ? 'active' : ''}`}>
                <span className="material-symbols-outlined">{n.icon}</span>
                <span className="ai-aside-item-title">{n.title}</span>
                {n.active && <span className="ai-dot" />}
              </button>
            ))}
          </div>

          <div className="ai-aside-section">
            <div className="ai-aside-section-title">Previous 7 Days</div>
            {navItems.filter(n => n.section === 'week').map((n) => (
              <button key={n.title} className="ai-aside-item">
                <span className="material-symbols-outlined">{n.icon}</span>
                <span className="ai-aside-item-title">{n.title}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="ai-aside-bottom">
          <div className="ai-profile">
            <div className="ai-profile-avatar">RM</div>
            <div className="ai-profile-meta">
              <div className="ai-profile-name">RevuMax</div>
              <div className="ai-profile-plan">{storeConfig?.store_domain ? `Connected: ${storeConfig.store_domain}` : 'Not connected'}</div>
            </div>
            <span className="material-symbols-outlined">settings</span>
          </div>
        </div>
      </aside>

      <main className="ai-chat-main">
        <div className="ai-main-top-glow" />

        <header className="ai-main-header glass-panel">
          <div className="ai-main-title">
            <button className="ai-back" onClick={() => navigate('/')}>
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div className="ai-main-title-text">
              <div className="ai-main-h2">
                RevuMax Deep Dive
                <span className="ai-pill-active">Active</span>
              </div>
              <div className="ai-main-sub">Last updated from dashboard context</div>
            </div>
          </div>

          <div className="ai-main-right">
            <div className="ai-model-pill">
              <span className="ai-live-dot" />
              <span>Live Assistant</span>
            </div>
            <button className="ai-more">
              <span className="material-symbols-outlined">more_vert</span>
            </button>
          </div>
        </header>

        <div className="ai-scroll" ref={listRef}>
          <div className="ai-center-date">
            <span>{new Date().toLocaleString()}</span>
          </div>

          {messages.map((m) => (
            <div key={m.ts} className={`ai-row ${m.role}`}>
              {m.role === 'assistant' && (
                <div className="ai-bot-avatar">
                  <span className="material-symbols-outlined">smart_toy</span>
                  <span className="ai-bot-ping" />
                </div>
              )}
              <div className={`ai-bubble ${m.role}`}>
                {m.text}
              </div>
              {m.role === 'user' && (
                <div className="ai-user-avatar">U</div>
              )}
            </div>
          ))}

          {loading && (
            <div className="ai-row assistant">
              <div className="ai-bot-avatar">
                <span className="material-symbols-outlined">smart_toy</span>
                <span className="ai-bot-ping" />
              </div>
              <div className="ai-bubble assistant">Thinking…</div>
            </div>
          )}

          <div className="ai-bottom-pad" />
        </div>

        <div className="ai-input-dock">
          {messages.length <= 1 && (
            <div className="ai-quick-replies">
              {quickReplies.map((reply, idx) => (
                <button
                  key={idx}
                  className="ai-quick-reply-chip"
                  onClick={() => {
                    setInput(reply);
                    setTimeout(() => handleSend(), 100);
                  }}
                  disabled={loading}
                >
                  {reply}
                </button>
              ))}
            </div>
          )}
          <div className="ai-input-max">
            <div className="ai-input-border" />
            <div className="ai-input glass-panel">
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about reviews, sentiment, or competitors..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <div className="ai-input-actions">
                <div className="ai-left-actions">
                  <button className="ai-ic" title="Attach Data">
                    <span className="material-symbols-outlined">add_link</span>
                  </button>
                  <button className="ai-ic" title={headerMeta}>
                    <span className="material-symbols-outlined">calendar_month</span>
                  </button>
                </div>
                <div className="ai-right-actions">
                  <span className="ai-enter-hint">Press Enter to send</span>
                  <button className="ai-send" onClick={handleSend} disabled={loading || !input.trim()}>
                    <span className="material-symbols-outlined">arrow_upward</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="ai-disclaimer">AI can make mistakes. Verify critical data.</div>
          </div>
        </div>
      </main>
    </div>
  );
}


