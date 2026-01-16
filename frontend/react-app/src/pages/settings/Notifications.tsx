// ============ SETTINGS: NOTIFICATIONS PAGE ============
// UI + localStorage based preferences (functional) + future backend hook ready
// NOTE: নতুন code এ বাংলা কমেন্ট রাখা হলো

import { useEffect, useMemo, useState } from 'react';
import '../../styles/SettingsNotifications.css';

type Frequency = 'realtime' | 'daily' | 'weekly';

interface NotificationPrefs {
  emailDigest: boolean;
  browserPush: boolean;
  slackEnabled: boolean;
  slackChannel: string;
  smsProEnabled: boolean;

  starThresholds: { 1: boolean; 2: boolean; 3: boolean; 4: boolean; 5: boolean };
  smartDrop10: boolean;
  smartCompetitor: boolean;

  frequency: Frequency;
  quietHoursEnabled: boolean;
  quietFrom: string; // HH:mm
  quietTo: string;   // HH:mm
}

const LS_KEY = 'reviewai.notification_prefs.v1';

function loadPrefs(): NotificationPrefs {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {
    emailDigest: true,
    browserPush: true,
    slackEnabled: false,
    slackChannel: '#customer-reviews',
    smsProEnabled: false,
    starThresholds: { 1: true, 2: true, 3: false, 4: false, 5: false },
    smartDrop10: true,
    smartCompetitor: false,
    frequency: 'realtime',
    quietHoursEnabled: true,
    quietFrom: '22:00',
    quietTo: '08:00'
  };
}

function savePrefs(p: NotificationPrefs) {
  localStorage.setItem(LS_KEY, JSON.stringify(p));
}

function Notifications() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(() => loadPrefs());
  const [dirty, setDirty] = useState(false);

  // Persist when saved
  const onSave = () => {
    savePrefs(prefs);
    setDirty(false);
    alert('Preferences saved!');
  };

  const onDiscard = () => {
    setPrefs(loadPrefs());
    setDirty(false);
  };

  // Toggle helper
  const toggle = (key: keyof NotificationPrefs) => {
    setPrefs((p) => {
      const next = { ...p, [key]: !(p as any)[key] } as NotificationPrefs;
      return next;
    });
    setDirty(true);
  };

  // Star thresholds toggle
  const toggleStar = (s: 1 | 2 | 3 | 4 | 5) => {
    setPrefs((p) => ({
      ...p,
      starThresholds: { ...p.starThresholds, [s]: !p.starThresholds[s] }
    }));
    setDirty(true);
  };

  // Frequency set
  const setFrequency = (f: Frequency) => {
    setPrefs((p) => ({ ...p, frequency: f }));
    setDirty(true);
  };

  // Derived
  const activeStars = useMemo(() => {
    const st = prefs.starThresholds;
    return [1, 2, 3, 4, 5].filter((n) => (st as any)[n]).join(', ') || 'None';
  }, [prefs.starThresholds]);

  useEffect(() => {
    // auto-save optional (future); এখন manual save রাখছি
  }, []);

  return (
    <div className="setnot">
      <header className="setnot-header">
        <div>
          <h1>Notifications</h1>
          <p>Control how and when you receive alerts about your store reviews.</p>
        </div>
        <div className="setnot-actions">
          <button className="btn-ghost" onClick={onDiscard} disabled={!dirty}>Discard</button>
          <button className="btn-primary" onClick={onSave} disabled={!dirty}>Save Preferences</button>
        </div>
      </header>

      <div className="setnot-grid">
        <div className="left">
          {/* Delivery Channels */}
          <section className="glass-panel card">
            <div className="card-head">
              <div className="head-ic blue"><span className="material-symbols-outlined">send</span></div>
              <h2>Delivery Channels</h2>
            </div>

            <div className="row">
              <div className="row-left">
                <div className="row-ic"><span className="material-symbols-outlined">mail</span></div>
                <div>
                  <div className="row-title">
                    Email Digest
                  </div>
                  <div className="row-sub">Sent to your configured email address.</div>
                </div>
              </div>
              <label className="switch">
                <input type="checkbox" checked={prefs.emailDigest} onChange={() => toggle('emailDigest')} />
                <span className="slider" />
              </label>
            </div>

            <div className="row">
              <div className="row-left">
                <div className="row-ic"><span className="material-symbols-outlined">notifications_active</span></div>
                <div>
                  <div className="row-title">Browser Push</div>
                  <div className="row-sub">Real-time alerts on your desktop.</div>
                </div>
              </div>
              <label className="switch">
                <input type="checkbox" checked={prefs.browserPush} onChange={() => toggle('browserPush')} />
                <span className="slider" />
              </label>
            </div>

            <div className="row">
              <div className="row-left">
                <div className="row-ic slack"><span className="material-symbols-outlined">tag</span></div>
                <div>
                  <div className="row-title">Slack Integration</div>
                  <div className="row-sub">Post to {prefs.slackChannel}</div>
                </div>
              </div>
              <div className="row-right">
                <button className="link" disabled title="Not available yet">Configure</button>
                <label className="switch">
                  <input type="checkbox" checked={prefs.slackEnabled} onChange={() => toggle('slackEnabled')} />
                  <span className="slider" />
                </label>
              </div>
            </div>

            <div className="row muted">
              <div className="row-left">
                <div className="row-ic"><span className="material-symbols-outlined">sms</span></div>
                <div>
                  <div className="row-title">
                    SMS Alerts <span className="tiny-badge pro">Pro</span>
                  </div>
                  <div className="row-sub">Get texts for critical issues.</div>
                </div>
              </div>
              <button className="btn-mini" disabled title="Not available yet">
                Enable
              </button>
            </div>
          </section>

          {/* Alert Triggers */}
          <section className="glass-panel card">
            <div className="card-head">
              <div className="head-ic purple"><span className="material-symbols-outlined">bolt</span></div>
              <h2>Alert Triggers</h2>
            </div>

            <div className="block">
              <div className="block-top">
                <label>Star Rating Thresholds</label>
                <span className="hint">Active: {activeStars}</span>
              </div>
              <div className="star-grid">
                {[1, 2, 3, 4, 5].map((n) => {
                  const on = (prefs.starThresholds as any)[n] as boolean;
                  const cls = on ? (n <= 2 ? 'danger' : 'on') : 'off';
                  return (
                    <button key={n} className={`star-btn ${cls}`} onClick={() => toggleStar(n as any)}>
                      <span className="material-symbols-outlined">star</span>
                      <span>{n} Star</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="smart-box">
              <div className="smart-head">
                <span className="smart-title">Smart AI Alerts</span>
                <span className="tiny-badge beta">BETA</span>
              </div>
              <div className="smart-row">
                <span>Alert when sentiment drops by &gt; 10% in a week</span>
                <label className="switch small">
                  <input type="checkbox" checked={prefs.smartDrop10} onChange={() => toggle('smartDrop10')} />
                  <span className="slider" />
                </label>
              </div>
              <div className="smart-row">
                <span>Alert on competitor mention in reviews</span>
                <label className="switch small">
                  <input type="checkbox" checked={prefs.smartCompetitor} onChange={() => toggle('smartCompetitor')} />
                  <span className="slider" />
                </label>
              </div>
            </div>
          </section>
        </div>

        <div className="right">
          {/* Frequency */}
          <section className="glass-panel card">
            <div className="card-head">
              <div className="head-ic green"><span className="material-symbols-outlined">history</span></div>
              <h2>Frequency</h2>
            </div>
            <div className="radio-list">
              <label className={`radio ${prefs.frequency === 'realtime' ? 'active' : ''}`}>
                <input type="radio" name="freq" checked={prefs.frequency === 'realtime'} onChange={() => setFrequency('realtime')} />
                <div>
                  <b>Real-time</b>
                  <small>Instant alerts as they happen</small>
                </div>
              </label>
              <label className={`radio ${prefs.frequency === 'daily' ? 'active' : ''}`}>
                <input type="radio" name="freq" checked={prefs.frequency === 'daily'} onChange={() => setFrequency('daily')} />
                <div>
                  <b>Daily Digest</b>
                  <small>Summary every morning at 9AM</small>
                </div>
              </label>
              <label className={`radio ${prefs.frequency === 'weekly' ? 'active' : ''}`}>
                <input type="radio" name="freq" checked={prefs.frequency === 'weekly'} onChange={() => setFrequency('weekly')} />
                <div>
                  <b>Weekly Report</b>
                  <small>Detailed analysis every Monday</small>
                </div>
              </label>
            </div>
          </section>

          {/* Quiet Hours */}
          <section className="glass-panel card">
            <div className="card-head">
              <div className="head-ic orange"><span className="material-symbols-outlined">bedtime</span></div>
              <h2>Quiet Hours</h2>
            </div>
            <div className="qh">
              <div className="qh-top">
                <span>Pause notifications</span>
                <label className="switch">
                  <input type="checkbox" checked={prefs.quietHoursEnabled} onChange={() => toggle('quietHoursEnabled')} />
                  <span className="slider" />
                </label>
              </div>
              <div className="qh-times">
                <div className="timebox">
                  <span>From</span>
                  <input type="time" value={prefs.quietFrom} onChange={(e) => { setPrefs(p => ({ ...p, quietFrom: e.target.value })); setDirty(true); }} />
                </div>
                <span className="dash">-</span>
                <div className="timebox">
                  <span>To</span>
                  <input type="time" value={prefs.quietTo} onChange={(e) => { setPrefs(p => ({ ...p, quietTo: e.target.value })); setDirty(true); }} />
                </div>
              </div>
              <div className="tz">Timezone: <b>Local</b></div>
            </div>
          </section>

          {/* Pause all */}
          <section className="pause-all">
            <div>
              <h3>Pause All Notifications</h3>
              <p>Stop all incoming alerts temporarily.</p>
            </div>
            <button disabled title="Not available yet">
              <span className="material-symbols-outlined">pause</span>
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

export default Notifications;


