// ============ SETTINGS LAYOUT ============
// Settings section এর shared sidebar + content wrapper
// NOTE: নতুন code এ বাংলা কমেন্ট রাখা হলো

import { NavLink, Outlet } from 'react-router-dom';
import '../../styles/SettingsLayout.css';

import { useReviews } from '../../context/ReviewContext';
import LogoIcon from '../../assets/Logo.png';
import LogoWithName from '../../assets/Logo_with_name.png';

function SettingsLayout() {
  const { storeConfig, reviews, lastFetchTime } = useReviews();

  const subtitle = storeConfig?.store_domain
    ? `Store: ${storeConfig.store_domain}`
    : 'Connect Shopify to enable settings';

  const reviewsCount = reviews?.length ?? 0;
  const lastSync = lastFetchTime ? lastFetchTime.toLocaleString() : '—';

  return (
    <div className="settings2-page">
      {/* Left settings nav */}
      <aside className="settings2-sidebar glass-sidebar">
        <div className="settings2-sidebar-inner">
          <div className="settings2-brand">
            <div className="settings2-logo" aria-hidden="true">
              <img src={LogoIcon} alt="" className="settings2-logo-icon" />
            </div>
            <div className="settings2-brand-text">
              <img src={LogoWithName} alt="RevuMax" className="settings2-logo-name" />
              <p>{subtitle}</p>
            </div>
          </div>

          <nav className="settings2-nav">
            <NavLink to="/settings/account" className={({ isActive }) => `settings2-link ${isActive ? 'active' : ''}`}>
              <span className="material-symbols-outlined">person</span>
              <span className="label">Account</span>
            </NavLink>
            <NavLink to="/settings/integrations" className={({ isActive }) => `settings2-link ${isActive ? 'active' : ''}`}>
              <span className="material-symbols-outlined">extension</span>
              <span className="label">Integrations</span>
            </NavLink>
            <NavLink to="/settings/notifications" className={({ isActive }) => `settings2-link ${isActive ? 'active' : ''}`}>
              <span className="material-symbols-outlined">notifications</span>
              <span className="label">Notifications</span>
            </NavLink>
            <NavLink to="/settings/ai-models" className={({ isActive }) => `settings2-link ${isActive ? 'active' : ''}`}>
              <span className="material-symbols-outlined">tune</span>
              <span className="label">AI Models</span>
            </NavLink>
            <NavLink to="/settings/billing" className={({ isActive }) => `settings2-link ${isActive ? 'active' : ''}`}>
              <span className="material-symbols-outlined">credit_card</span>
              <span className="label">Billing</span>
            </NavLink>
          </nav>

          {/* Real status card (no mock %) */}
          <div className="settings2-credits">
            <div className="credits-head">
              <span>Data Status</span>
              <span className="value">{reviewsCount}</span>
            </div>
            <div className="credits-bar">
              <div className="credits-fill" style={{ width: reviewsCount > 0 ? '100%' : '0%' }} />
            </div>
            <div className="credits-sub">Last sync: {lastSync}</div>
          </div>
        </div>
      </aside>

      {/* Content */}
      <main className="settings2-main">
        <Outlet />
      </main>
    </div>
  );
}

export default SettingsLayout;


