// ============ SETTINGS: BILLING PAGE ============
// UI + usage statistics real data (reviews analyzed) থেকে compute
// NOTE: নতুন code এ বাংলা কমেন্ট রাখা হলো

import { useMemo } from 'react';
import '../../styles/SettingsBilling.css';

import { useReviews } from '../../context/ReviewContext';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function formatK(num: number): string {
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return String(num);
}

function Billing() {
  const { reviews } = useReviews();

  // Usage stats: only real counts we actually have
  const usage = useMemo(() => {
    const analyzed = reviews.length;

    return {
      analyzed,
      limit: null as number | null
    };
  }, [reviews]);

  return (
    <div className="setbill">
      <header className="setbill-header">
        <div>
          <h1>Billing & Plans</h1>
          <p>Manage your subscription, usage limits, and payment methods.</p>
        </div>
        <div className="setbill-actions">
          <button className="btn-ghost" disabled title="Based on the available data, this cannot be determined.">
            <span className="material-symbols-outlined">download</span>
            Export History
          </button>
        </div>
      </header>

      <div className="setbill-grid">
        <div className="left">
          {/* Plan + Usage */}
          <section className="glass-panel plan">
            <div className="plan-left">
              <div>
                <span className="pill-active">
                  <span className="dot" /> Active
                </span>
                <h2>Billing not connected</h2>
                <p>Connect billing to view your plan and invoices.</p>
              </div>

              <div className="price">
                <div className="amount">
                  <span className="big">—</span>
                  <span className="per">plan</span>
                </div>
                <p className="renew">Renews automatically on <b>—</b></p>
              </div>

              <button className="btn-light" disabled>Change Plan</button>
            </div>

            <div className="plan-right">
              <h3><span className="material-symbols-outlined primary">bar_chart</span> Usage Statistics</h3>

              <div className="usage">
                <div className="u-head">
                  <span>Reviews Analyzed</span>
                  <b>{formatK(usage.analyzed)}</b>
                </div>
                <div className="bar">
                  <div className="fill blue" style={{ width: `${clamp(usage.analyzed ? 100 : 0, 0, 100)}%` }} />
                </div>
              </div>
              <p style={{ marginTop: 12, color: 'var(--text-secondary)', fontSize: 12 }}>
                Billing limits, invoices, payment methods, and seat usage will appear here once billing is connected.
              </p>
            </div>
          </section>

          <section className="glass-panel invoices">
            <div className="inv-head">
              <h2><span className="material-symbols-outlined">history</span> Invoice History</h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              No invoices available. Connect billing to view invoice history.
            </p>
          </section>
        </div>

        <div className="right">
          <section className="glass-panel pay">
            <div className="pay-head">
              <h2>Payment Method</h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              No payment method on file. Connect billing to manage payment methods.
            </p>
          </section>

          <section className="glass-panel info">
            <h2>Billing Information</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              Billing information will appear here once billing is connected.
            </p>
          </section>

          {/* Enterprise CTA (disabled - no billing backend yet) */}
          <section className="enterprise" aria-disabled="true">
            <div className="ent-ic"><span className="material-symbols-outlined">rocket_launch</span></div>
            <h3>Upgrade to Enterprise</h3>
            <p>Unlimited tokens, priority support, and custom model fine-tuning.</p>
            <span className="ent-link">
              View Enterprise Plans <span className="material-symbols-outlined">arrow_forward</span>
            </span>
          </section>
        </div>
      </div>
    </div>
  );
}

export default Billing;


