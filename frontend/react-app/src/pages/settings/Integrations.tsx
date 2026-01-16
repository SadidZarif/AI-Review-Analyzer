// ============ SETTINGS: INTEGRATIONS PAGE ============
// Provided UI অনুযায়ী integrations page (functional)
// NOTE: নতুন code এ বাংলা কমেন্ট রাখা হলো

import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { useReviews } from '../../context/ReviewContext';
import '../../styles/SettingsIntegrations.css';

function formatNumber(num: number): string {
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return String(num);
}

function Integrations() {
  const { storeConfig, setStoreConfig, fetchReviews, isLoading, error, lastFetchTime, reviews } = useReviews();

  // Search state (platform search) - only relevant if multiple real integrations exist
  const [query, setQuery] = useState('');

  // Shopify connect modal state
  const [showShopifyModal, setShowShopifyModal] = useState(false);
  const [shopifyForm, setShopifyForm] = useState({
    store_domain: storeConfig?.store_domain || '',
    access_token: storeConfig?.access_token || '',
    review_app_token: storeConfig?.review_app_token || ''
  });

  // Stats
  const stats = useMemo(() => {
    const activeStores = storeConfig ? 1 : 0;
    const reviewsImported = reviews.length;
    const lastSync = lastFetchTime ? lastFetchTime.toLocaleString() : '—';
    return { activeStores, reviewsImported, lastSync };
  }, [storeConfig, reviews.length, lastFetchTime]);

  // Connected platforms list (currently only Shopify is real)
  const connected = useMemo(() => {
    if (!storeConfig) return [];
    return [{
      id: 'shopify',
      title: 'Shopify Store',
      subtitle: storeConfig.store_domain,
      status: 'Active',
      totalReviews: reviews.length,
      autoSync: 'Manual',
      badgeColor: 'green'
    }];
  }, [storeConfig, reviews.length]);

  // Available integrations list (real only)
  const available = useMemo(() => {
    const list = [
      { id: 'shopify', name: 'Shopify', desc: 'Import product reviews directly from your Shopify store.' }
    ];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(x => x.name.toLowerCase().includes(q) || x.desc.toLowerCase().includes(q));
  }, [query]);

  // Open modal helper
  function openShopifyModal() {
    setShopifyForm({
      store_domain: storeConfig?.store_domain || '',
      access_token: storeConfig?.access_token || '',
      review_app_token: storeConfig?.review_app_token || ''
    });
    setShowShopifyModal(true);
  }

  // Save & fetch
  async function handleSaveAndFetch() {
    if (!shopifyForm.store_domain.trim()) return alert('Store domain required');
    if (!shopifyForm.access_token.trim()) return alert('Shopify Admin API token required');
    if (!shopifyForm.review_app_token.trim()) return alert('Judge.me private API token required');

    setStoreConfig({
      store_domain: shopifyForm.store_domain.trim(),
      access_token: shopifyForm.access_token.trim(),
      review_app: 'judge_me',
      review_app_token: shopifyForm.review_app_token.trim()
    });

    setShowShopifyModal(false);
    await fetchReviews();
  }

  return (
    <div className="setint">
      <header className="setint-header">
        <div>
          <h1>Integrations</h1>
          <p>Connect your stores, manage API keys, and sync review data.</p>
        </div>
        <div className="setint-actions">
          <div className="setint-search">
            <span className="material-symbols-outlined">search</span>
            <input
              placeholder="Search platforms..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button className="btn-primary" disabled title="Not available yet">
            <span className="material-symbols-outlined">add</span>
            Request Platform
          </button>
        </div>
      </header>

      {/* Error */}
      {error && (
        <div className="banner banner-error">
          <span className="material-symbols-outlined">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Stats cards */}
      <section className="setint-stats">
        <div className="glass-panel stat">
          <div className="stat-ic green"><span className="material-symbols-outlined">check_circle</span></div>
          <div>
            <div className="stat-label">Active Stores</div>
            <div className="stat-value">{stats.activeStores}</div>
          </div>
        </div>
        <div className="glass-panel stat">
          <div className="stat-ic blue"><span className="material-symbols-outlined">download</span></div>
          <div>
            <div className="stat-label">Reviews Imported</div>
            <div className="stat-value">{formatNumber(stats.reviewsImported)}</div>
          </div>
        </div>
        <div className="glass-panel stat">
          <div className="stat-ic purple"><span className="material-symbols-outlined">sync</span></div>
          <div>
            <div className="stat-label">Last Sync</div>
            <div className="stat-value small">{stats.lastSync}</div>
          </div>
        </div>
      </section>

      {/* Connected platforms */}
      <section className="setint-section">
        <h2>
          <span className="material-symbols-outlined green">link</span>
          Connected Platforms
        </h2>

        {connected.length === 0 ? (
          <div className="empty glass-panel">
            <p>No connected platforms yet. Connect Shopify to start.</p>
            <button className="btn-primary" onClick={openShopifyModal}>
              <span className="material-symbols-outlined">link</span>
              Connect Shopify
            </button>
          </div>
        ) : (
          <div className="connected-grid">
            {connected.map((c) => (
              <div key={c.id} className="glass-panel connected-card">
                <div className="brand-badge">S</div>
                <div className="connected-body">
                  <div className="connected-top">
                    <div>
                      <h3>{c.title}</h3>
                      <p>{c.subtitle}</p>
                    </div>
                    <span className="status active">
                      <span className="dot" />
                      Active
                    </span>
                  </div>
                  <div className="connected-meta">
                    <div>
                      <span>Total Reviews</span>
                      <b>{formatNumber(c.totalReviews)}</b>
                    </div>
                    <div>
                      <span>Auto-Sync</span>
                      <b>{c.autoSync}</b>
                    </div>
                  </div>
                  <div className="connected-actions">
                    <button className="btn-ghost" onClick={openShopifyModal}>Settings</button>
                    <button className="btn-icon" onClick={() => fetchReviews()} disabled={isLoading} title="Sync Now">
                      <span className="material-symbols-outlined">sync</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Available integrations */}
      <section className="setint-section">
        <h2>
          <span className="material-symbols-outlined primary">add_circle</span>
          Available Integrations
        </h2>
        <div className="available-grid">
          {available.map((a) => (
            <div key={a.id} className="glass-panel avail-card">
              <div className="avail-top">
                <div className="avail-brand shopify">S</div>
              </div>
              <div className="avail-info">
                <h3>{a.name}</h3>
                <p>{a.desc}</p>
              </div>
              <div className="avail-actions">
                <button className="btn-primary-lite" onClick={openShopifyModal}>Connect</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Custom API integration */}
      <section className="glass-panel api-card">
        <div className="api-left">
          <div className="api-ic"><span className="material-symbols-outlined">api</span></div>
          <div>
            <h3>Custom API Integration</h3>
            <p>Need to connect a custom built store? Use our API.</p>
          </div>
        </div>
        <button className="btn-ghost" disabled title="Not available yet">View API Docs</button>
      </section>

      {/* ========== SHOPIFY MODAL (PORTAL) ========== */}
      {showShopifyModal && typeof document !== 'undefined' && createPortal(
        <div className="modal-overlay" onClick={() => setShowShopifyModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Connect Shopify Store</h3>
              <button className="x" onClick={() => setShowShopifyModal(false)}>×</button>
            </div>
            <p className="modal-sub">
              Shopify domain, Shopify Admin API token, এবং Judge.me private API token দিন—তারপর data fetch হবে।
            </p>

            <label>Store Domain *</label>
            <input value={shopifyForm.store_domain} onChange={(e) => setShopifyForm(p => ({ ...p, store_domain: e.target.value }))} placeholder="crazy-dev-2.myshopify.com" />

            <label>Admin API Token *</label>
            <input type="password" value={shopifyForm.access_token} onChange={(e) => setShopifyForm(p => ({ ...p, access_token: e.target.value }))} placeholder="shpat_..." />

            <label>Judge.me Private API Token *</label>
            <input type="password" value={shopifyForm.review_app_token} onChange={(e) => setShopifyForm(p => ({ ...p, review_app_token: e.target.value }))} placeholder="yXkkzQ..." />
            <small>Judge.me → Settings → Integrations → View API token → Private API token</small>

            <button className="btn-primary wide" onClick={handleSaveAndFetch} disabled={isLoading}>
              <span className="material-symbols-outlined">{isLoading ? 'sync' : 'link'}</span>
              {isLoading ? 'Connecting...' : 'Save & Fetch Data'}
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default Integrations;


