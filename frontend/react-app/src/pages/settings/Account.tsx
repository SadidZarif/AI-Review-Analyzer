// ============ SETTINGS: ACCOUNT PAGE ============
// আগের Settings.tsx এর account অংশ এখানেই থাকবে
// NOTE: নতুন code এ বাংলা কমেন্ট রাখা হলো

import '../../styles/SettingsAccount.css';
import { useReviews } from '../../context/ReviewContext';
import { generateInitials } from '../../utils/helpers';

// ============ TYPES ============
interface UserProfile {
  workspaceName: string;
  storeDomain: string;
}

function Account() {
  const { storeConfig } = useReviews();

  const profile: UserProfile | null = storeConfig
    ? {
        workspaceName: 'RevuMax',
        storeDomain: storeConfig.store_domain
      }
    : null;

  return (
    <div className="setacc">
      <header className="setacc-header">
        <div>
          <h1>Account</h1>
          <p>Manage your profile and workspace settings.</p>
        </div>
        <div className="setacc-actions">
          <button className="btn-ghost" disabled>Cancel</button>
          <button className="btn-primary" disabled>Save Changes</button>
        </div>
      </header>

      <section className="setacc-profile glass-panel">
        {profile ? (
          <>
            <div className="avatar-wrap">
              <div className="avatar-ring">
                <div className="avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontWeight: 800, color: 'white' }}>{generateInitials(profile.workspaceName)}</span>
                </div>
              </div>
            </div>

            <div className="profile-info">
              <h2>{profile.workspaceName}</h2>
              <p className="email">{profile.storeDomain}</p>
              <div className="badges">
                <span className="badge badge-member">Store connected</span>
              </div>
            </div>
          </>
        ) : (
          <div className="profile-info">
            <h2>No store connected</h2>
            <p className="email">Connect your Shopify store in Integrations to view account details.</p>
          </div>
        )}
      </section>

      <section className="setacc-note glass-panel">
        <h3>Note</h3>
        <p>
          Integrations / Notifications / AI Models / Billing আলাদা settings pages এ আছে।
          Sidebar থেকে যে কোনো page এ যান।
        </p>
      </section>
    </div>
  );
}

export default Account;


