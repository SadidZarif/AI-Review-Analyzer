// ============ SETTINGS: AI MODELS PAGE ============
// Functional UI + local storage config + backend analyze endpoint দিয়ে playground test
// NOTE: নতুন code এ বাংলা কমেন্ট রাখা হলো

import { useMemo, useState } from 'react';
import '../../styles/SettingsAIModels.css';

import { analyzeReviews } from '../../api';

type ToggleMap = {
  sentimentV4: boolean;
  replyGenX: boolean;
  fraudShield: boolean;
};

interface AIModelConfig {
  temperature: number; // 0.1..1.0 (slider UI)
  confidenceThreshold: number; // 50..100
  multilingual: boolean;
  autoTagging: boolean;
  toggles: ToggleMap;
}

const LS_KEY = 'reviewai.ai_models_config.v1';

function loadConfig(): AIModelConfig {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {
    temperature: 0.7,
    confidenceThreshold: 85,
    multilingual: true,
    autoTagging: true,
    toggles: { sentimentV4: true, replyGenX: true, fraudShield: false }
  };
}

function saveConfig(cfg: AIModelConfig) {
  localStorage.setItem(LS_KEY, JSON.stringify(cfg));
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function AIModels() {
  const [cfg, setCfg] = useState<AIModelConfig>(() => loadConfig());
  const [dirty, setDirty] = useState(false);

  // Playground state
  const [sampleText, setSampleText] = useState('The product quality is great, but the shipping took forever! Not sure if I\'d order again.');
  const [playgroundLoading, setPlaygroundLoading] = useState(false);
  const [playgroundResult, setPlaygroundResult] = useState<{ sentiment: string; confidence: number; topics: string[] } | null>(null);
  const [playgroundError, setPlaygroundError] = useState<string | null>(null);

  const temperatureLabel = useMemo(() => cfg.temperature.toFixed(1), [cfg.temperature]);
  const confidenceLabel = useMemo(() => `${Math.round(cfg.confidenceThreshold)}%`, [cfg.confidenceThreshold]);

  const onSave = () => {
    saveConfig(cfg);
    setDirty(false);
    alert('AI model configuration saved!');
  };

  const onReset = () => {
    const d = loadConfig();
    setCfg(d);
    setDirty(false);
  };

  async function runPlayground() {
    if (!sampleText.trim()) return;
    setPlaygroundError(null);
    setPlaygroundResult(null);
    setPlaygroundLoading(true);
    try {
      // Backend sentiment model call (existing endpoint)
      const res = await analyzeReviews([sampleText]);
      const first = res.sample_reviews?.[0];
      const topics = [
        ...(res.top_positive_topics || []).map(t => t.topic),
        ...(res.top_negative_topics || []).map(t => t.topic)
      ].slice(0, 3);
      setPlaygroundResult({
        sentiment: first?.sentiment || 'neutral',
        confidence: first?.confidence || 0,
        topics: topics.length ? topics : []
      });
    } catch (e: any) {
      setPlaygroundError(e?.message || 'Failed to analyze sample text');
    } finally {
      setPlaygroundLoading(false);
    }
  }

  return (
    <div className="setai">
      <header className="setai-header">
        <div>
          <h1>AI Models</h1>
          <p>Manage behavior, sensitivity, and engines for your analysis.</p>
        </div>
        <div className="setai-actions">
          <button className="btn-ghost" onClick={onReset} disabled={!dirty}>Reset Defaults</button>
          <button className="btn-primary" onClick={onSave} disabled={!dirty}>Save Configuration</button>
        </div>
      </header>

      {/* Active Engines */}
      <section className="setai-section">
        <div className="setai-section-head">
          <h2><span className="material-symbols-outlined primary">memory</span> Active Analysis Engines</h2>
          <span className="status-pill">System Status: Optimal</span>
        </div>

        <div className="engine-grid">
          <div className="glass-panel engine">
            <div className="engine-top">
              <div className="engine-ic indigo"><span className="material-symbols-outlined">mood</span></div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={cfg.toggles.sentimentV4}
                  onChange={() => { setCfg(p => ({ ...p, toggles: { ...p.toggles, sentimentV4: !p.toggles.sentimentV4 } })); setDirty(true); }}
                />
                <span className="slider" />
              </label>
            </div>
            <div>
              <h3>Sentiment V4</h3>
              <div className="meta">
                <span className="ok"><span className="dot" /> 99.2% Accuracy</span>
                <span className="sep">|</span>
                <span className="muted">Core Engine</span>
              </div>
              <p>Advanced NLP model detecting nuance and mixed sentiments in reviews.</p>
            </div>
            <button className="btn-ghost wide" disabled title="Not available yet">Configure Parameters</button>
          </div>

          <div className="glass-panel engine">
            <div className="engine-top">
              <div className="engine-ic purple"><span className="material-symbols-outlined">smart_toy</span></div>
              <label className="switch purple">
                <input
                  type="checkbox"
                  checked={cfg.toggles.replyGenX}
                  onChange={() => { setCfg(p => ({ ...p, toggles: { ...p.toggles, replyGenX: !p.toggles.replyGenX } })); setDirty(true); }}
                />
                <span className="slider" />
              </label>
            </div>
            <div>
              <h3>Reply Gen-X</h3>
              <div className="meta">
                <span className="gen"><span className="dot pulse" /> Generative</span>
                <span className="sep">|</span>
                <span className="muted">Drafting</span>
              </div>
              <p>Generates context-aware responses based on review content and brand voice.</p>
            </div>
            <button className="btn-ghost wide" disabled title="Not available yet">Edit Prompt</button>
          </div>

          <div className="glass-panel engine muted">
            <div className="engine-top">
              <div className="engine-ic orange"><span className="material-symbols-outlined">gpp_maybe</span></div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={cfg.toggles.fraudShield}
                  onChange={() => { setCfg(p => ({ ...p, toggles: { ...p.toggles, fraudShield: !p.toggles.fraudShield } })); setDirty(true); }}
                />
                <span className="slider" />
              </label>
            </div>
            <div>
              <h3>Fraud Shield</h3>
              <div className="meta">
                <span className="muted"><span className="dot gray" /> {cfg.toggles.fraudShield ? 'Active' : 'Inactive'}</span>
                <span className="sep">|</span>
                <span className="muted">Protection</span>
              </div>
              <p>Identifies fake reviews, bot spam, and sabotage attempts.</p>
            </div>
            <button className="btn-ghost wide" disabled title="Not available yet">View Logs</button>
          </div>
        </div>
      </section>

      {/* Global Parameters + Playground */}
      <div className="setai-grid">
        <section className="glass-panel card">
          <h2 className="card-title"><span className="material-symbols-outlined cyan">tune</span> Global Parameters</h2>

          <div className="slider-block">
            <div className="slider-head">
              <label>Creativity (Temperature)</label>
              <span className="pill cyan">{temperatureLabel}</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={Math.round(cfg.temperature * 10)}
              onChange={(e) => {
                const v = clamp(Number(e.target.value), 1, 10) / 10;
                setCfg(p => ({ ...p, temperature: v }));
                setDirty(true);
              }}
            />
            <div className="slider-scale"><span>Precise</span><span>Creative</span></div>
          </div>

          <div className="slider-block">
            <div className="slider-head">
              <label>Analysis Confidence Threshold</label>
              <span className="pill primary">{confidenceLabel}</span>
            </div>
            <input
              type="range"
              min={50}
              max={100}
              step={1}
              value={cfg.confidenceThreshold}
              onChange={(e) => {
                setCfg(p => ({ ...p, confidenceThreshold: Number(e.target.value) }));
                setDirty(true);
              }}
            />
            <div className="slider-scale"><span>Forgiving</span><span>Strict</span></div>
          </div>

          <div className="toggles">
            <div className="toggle-row">
              <span>Multilingual Mode</span>
              <label className="switch green">
                <input type="checkbox" checked={cfg.multilingual} onChange={() => { setCfg(p => ({ ...p, multilingual: !p.multilingual })); setDirty(true); }} />
                <span className="slider" />
              </label>
            </div>
            <div className="toggle-row">
              <span>Auto-Tagging</span>
              <label className="switch">
                <input type="checkbox" checked={cfg.autoTagging} onChange={() => { setCfg(p => ({ ...p, autoTagging: !p.autoTagging })); setDirty(true); }} />
                <span className="slider" />
              </label>
            </div>
          </div>
        </section>

        <section className="glass-panel card">
          <div className="play-head">
            <h2 className="card-title"><span className="material-symbols-outlined green">science</span> Test Playground</h2>
            <button className="link" onClick={() => { setPlaygroundResult(null); setPlaygroundError(null); }}>Clear</button>
          </div>

          <div className="chat">
            <div className="msg">
              <div className="bubble user">{sampleText}</div>
            </div>
            {playgroundResult && (
              <div className="msg right">
                <div className="bubble ai">
                  <div className="chips">
                    <span className={`chip ${playgroundResult.sentiment}`}>{playgroundResult.sentiment.toUpperCase()}</span>
                    {playgroundResult.topics.map((t) => (
                      <span key={t} className="chip topic">Topic: {t}</span>
                    ))}
                  </div>
                  <p><b>confidence_score:</b> {playgroundResult.confidence.toFixed(2)}</p>
                </div>
              </div>
            )}
            {playgroundError && <div className="err">{playgroundError}</div>}
          </div>

          <div className="play-input">
            <input value={sampleText} onChange={(e) => setSampleText(e.target.value)} placeholder="Type a sample review to test..." />
            <button onClick={runPlayground} disabled={playgroundLoading || !sampleText.trim()} title="Send">
              <span className="material-symbols-outlined">{playgroundLoading ? 'sync' : 'send'}</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default AIModels;


