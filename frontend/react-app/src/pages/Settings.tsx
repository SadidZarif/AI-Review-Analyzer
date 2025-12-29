// ============ SETTINGS PAGE ============
// Settings page - Profile, Integrations, Notifications, AI Configuration

import { useState } from 'react';
import '../styles/Settings.css';

// ============ TYPE DEFINITIONS ============

// User profile data structure
interface UserProfile {
  name: string;
  email: string;
  avatar: string;
  plan: string;
  memberSince: string;
  apiKey: string;
}

// Integration platform এর data
interface Integration {
  id: string;
  name: string;
  icon: string;
  iconColor: string;
  status: 'connected' | 'inactive' | 'coming_soon';
  lastSynced?: string;
  description?: string;
}

// Notification settings
interface NotificationSetting {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
}

// AI configuration settings
interface AIConfig {
  sensitivity: number;
  replyTone: 'professional' | 'friendly' | 'empathetic';
  blockedKeywords: string;
}

// ============ MOCK DATA ============

// User profile - পরে API থেকে আসবে
const mockUserProfile: UserProfile = {
  name: 'Alex Johnson',
  email: 'alex.j@reviewai.com',
  avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAlSe6-XBy7vaBcx11K3Xpnxu8SGxNWDAXPO7hWZYf4BqcSwgJdD-onRqjB-6dkjMO6GK0pcWEa5ij9yXV2yEvRF-OoHA0dgg8JDLWrknHnEZgETM151SM4dflONYGhqO7EQeyVCeXdZ6uloefrz_Hn2XoS5atMArwLjZ4zSIS_4iHwL4rXCvu7F5MavfQekpzZEGYzyAKsy6PTJDeofGZQQq3MUVR6DMAS-LQMiu4gfQwOcYfAh-QbRlAEYzv9LDrvL85F57m9SQ',
  plan: 'Pro Plan Active',
  memberSince: '2023',
  apiKey: 'sk_live_51M...xYz9'
};

// Integrations list
const mockIntegrations: Integration[] = [
  {
    id: 'amazon',
    name: 'Amazon Store',
    icon: 'A',
    iconColor: 'orange',
    status: 'connected',
    lastSynced: '2 mins ago'
  },
  {
    id: 'shopify',
    name: 'Shopify Store',
    icon: 'S',
    iconColor: 'green',
    status: 'inactive',
    description: 'Connect your store to import reviews.'
  },
  {
    id: 'etsy',
    name: 'Etsy Shop',
    icon: 'E',
    iconColor: 'red',
    status: 'coming_soon',
    description: 'Integration coming soon for Pro users.'
  }
];

// Initial notification settings
const initialNotifications: NotificationSetting[] = [
  {
    id: 'critical_alerts',
    title: 'Critical Alerts',
    description: 'Notify when 1-star reviews are detected.',
    enabled: true
  },
  {
    id: 'weekly_digest',
    title: 'Weekly Digest',
    description: 'Email summary of sentiment analysis.',
    enabled: false
  },
  {
    id: 'auto_reply',
    title: 'Auto-Reply Confirmation',
    description: 'Ask before posting AI generated replies.',
    enabled: true
  }
];

// Initial AI config
const initialAIConfig: AIConfig = {
  sensitivity: 75,
  replyTone: 'professional',
  blockedKeywords: ''
};

// ============ COMPONENT ============

function Settings() {
  // ============ STATE ============
  const [profile] = useState<UserProfile>(mockUserProfile);
  const [integrations] = useState<Integration[]>(mockIntegrations);
  const [notifications, setNotifications] = useState<NotificationSetting[]>(initialNotifications);
  const [aiConfig, setAIConfig] = useState<AIConfig>(initialAIConfig);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'account' | 'integrations' | 'notifications' | 'ai'>('account');
  
  // ============ HANDLERS ============
  
  // Notification toggle করা
  const toggleNotification = (id: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, enabled: !notif.enabled } : notif
      )
    );
  };
  
  // AI sensitivity change করা
  const handleSensitivityChange = (value: number) => {
    setAIConfig(prev => ({ ...prev, sensitivity: value }));
  };
  
  // Reply tone change করা
  const handleToneChange = (tone: AIConfig['replyTone']) => {
    setAIConfig(prev => ({ ...prev, replyTone: tone }));
  };
  
  // Blocked keywords change করা
  const handleKeywordsChange = (value: string) => {
    setAIConfig(prev => ({ ...prev, blockedKeywords: value }));
  };
  
  // API key copy করা
  const copyApiKey = () => {
    navigator.clipboard.writeText(profile.apiKey);
    alert('API Key copied to clipboard!');
  };
  
  // Save settings করা
  const handleSave = () => {
    console.log('Saving settings:', { notifications, aiConfig });
    alert('Settings saved successfully!');
  };
  
  // Sensitivity level text
  const getSensitivityLabel = (value: number): string => {
    if (value <= 33) return 'Low';
    if (value <= 66) return 'Medium';
    return 'High';
  };
  
  // ============ RENDER ============
  
  return (
    <div className="settings-page">
      {/* Decorative Background Glows */}
      <div className="settings-bg-glow settings-bg-glow-1"></div>
      <div className="settings-bg-glow settings-bg-glow-2"></div>
      
      {/* Settings Sidebar */}
      <aside className="settings-sidebar glass-sidebar">
        <div className="sidebar-content">
          {/* Logo */}
          <div className="sidebar-logo">
            <div className="logo-icon">
              <span className="material-symbols-outlined">view_in_ar</span>
            </div>
            <div className="logo-text">
              <h1>ReviewAI</h1>
              <p>Pro Workspace</p>
            </div>
          </div>
          
          {/* Navigation Links */}
          <nav className="sidebar-nav">
            <button 
              className={`nav-item ${activeSettingsTab === 'account' ? 'active' : ''}`}
              onClick={() => setActiveSettingsTab('account')}
            >
              <span className="material-symbols-outlined">person</span>
              <span className="nav-label">Account</span>
            </button>
            <button 
              className={`nav-item ${activeSettingsTab === 'integrations' ? 'active' : ''}`}
              onClick={() => setActiveSettingsTab('integrations')}
            >
              <span className="material-symbols-outlined">extension</span>
              <span className="nav-label">Integrations</span>
            </button>
            <button 
              className={`nav-item ${activeSettingsTab === 'notifications' ? 'active' : ''}`}
              onClick={() => setActiveSettingsTab('notifications')}
            >
              <span className="material-symbols-outlined">notifications</span>
              <span className="nav-label">Notifications</span>
            </button>
            <button 
              className={`nav-item ${activeSettingsTab === 'ai' ? 'active' : ''}`}
              onClick={() => setActiveSettingsTab('ai')}
            >
              <span className="material-symbols-outlined">tune</span>
              <span className="nav-label">AI Models</span>
            </button>
          </nav>
          
          {/* Credits Used */}
          <div className="credits-card">
            <div className="credits-header">
              <span>Credits Used</span>
              <span className="credits-value">85%</span>
            </div>
            <div className="credits-bar">
              <div className="credits-bar-fill" style={{ width: '85%' }}></div>
            </div>
            <button className="upgrade-btn">Upgrade Plan</button>
          </div>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="settings-main">
        <div className="settings-content">
          {/* Page Header */}
          <header className="page-header">
            <div className="header-text">
              <h1 className="page-title">Settings</h1>
              <p className="page-subtitle">Manage your profile, connections, and AI preferences.</p>
            </div>
            <div className="header-actions">
              <button className="btn-cancel">Cancel</button>
              <button className="btn-save" onClick={handleSave}>Save Changes</button>
            </div>
          </header>
          
          {/* Profile Card */}
          <section className="profile-card glass-panel">
            <div className="profile-shine"></div>
            <div className="profile-content">
              {/* Avatar */}
              <div className="profile-avatar-wrapper">
                <div className="profile-avatar-ring">
                  <div 
                    className="profile-avatar"
                    style={{ backgroundImage: `url(${profile.avatar})` }}
                  ></div>
                </div>
                <button className="avatar-edit-btn">
                  <span className="material-symbols-outlined">edit</span>
                </button>
              </div>
              
              {/* Profile Info */}
              <div className="profile-info">
                <h2 className="profile-name">{profile.name}</h2>
                <p className="profile-email">{profile.email}</p>
                <div className="profile-badges">
                  <span className="badge badge-pro">{profile.plan}</span>
                  <span className="badge badge-member">Member since {profile.memberSince}</span>
                </div>
              </div>
              
              {/* API Key */}
              <div className="api-key-section">
                <label className="api-key-label">API Key</label>
                <div className="api-key-box">
                  <code className="api-key-value">{profile.apiKey}</code>
                  <button className="api-key-copy" onClick={copyApiKey}>
                    <span className="material-symbols-outlined">content_copy</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
          
          {/* Integrations Section */}
          <section className="integrations-section">
            <div className="section-header">
              <h2 className="section-title">
                <span className="material-symbols-outlined">hub</span>
                Platform Integrations
              </h2>
              <button className="view-all-btn">View All</button>
            </div>
            
            <div className="integrations-grid">
              {integrations.map((integration) => (
                <div 
                  key={integration.id} 
                  className={`integration-card glass-panel ${integration.status === 'coming_soon' ? 'coming-soon' : ''}`}
                >
                  <div className="card-shine"></div>
                  
                  <div className="integration-header">
                    <div className={`integration-icon ${integration.iconColor}`}>
                      {integration.icon}
                    </div>
                    {integration.status === 'connected' && (
                      <span className="status-indicator connected">
                        <span className="ping"></span>
                        <span className="dot"></span>
                      </span>
                    )}
                    {integration.status === 'inactive' && (
                      <span className="status-badge inactive">Inactive</span>
                    )}
                    {integration.status === 'coming_soon' && (
                      <span className="status-badge beta">Beta</span>
                    )}
                  </div>
                  
                  <div className="integration-info">
                    <h3>{integration.name}</h3>
                    <p>
                      {integration.status === 'connected' 
                        ? `Last synced: ${integration.lastSynced}` 
                        : integration.description}
                    </p>
                  </div>
                  
                  <div className="integration-actions">
                    {integration.status === 'connected' && (
                      <>
                        <button className="btn-configure">Configure</button>
                        <button className="btn-sync">
                          <span className="material-symbols-outlined">sync</span>
                        </button>
                      </>
                    )}
                    {integration.status === 'inactive' && (
                      <button className="btn-connect">Connect Store</button>
                    )}
                    {integration.status === 'coming_soon' && (
                      <button className="btn-disabled" disabled>Coming Soon</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
          
          {/* Settings Split Grid */}
          <div className="settings-grid">
            {/* Notification Preferences */}
            <section className="settings-card glass-panel">
              <h2 className="card-title">
                <span className="material-symbols-outlined purple">notifications_active</span>
                Notification Controls
              </h2>
              
              <div className="notification-list">
                {notifications.map((notif) => (
                  <div key={notif.id} className="notification-item">
                    <div className="notification-info">
                      <span className="notification-title">{notif.title}</span>
                      <span className="notification-desc">{notif.description}</span>
                    </div>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={notif.enabled}
                        onChange={() => toggleNotification(notif.id)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                ))}
              </div>
            </section>
            
            {/* AI Configuration */}
            <section className="settings-card glass-panel">
              <h2 className="card-title">
                <span className="material-symbols-outlined blue">psychology</span>
                AI Configuration
              </h2>
              
              {/* Sensitivity Slider */}
              <div className="config-item">
                <div className="config-header">
                  <label>Sentiment Sensitivity</label>
                  <span className="config-value-badge">{getSensitivityLabel(aiConfig.sensitivity)}</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="100" 
                  value={aiConfig.sensitivity}
                  onChange={(e) => handleSensitivityChange(parseInt(e.target.value))}
                  className="sensitivity-slider"
                />
                <div className="slider-labels">
                  <span>Forgiving</span>
                  <span>Strict</span>
                </div>
              </div>
              
              {/* Reply Tone */}
              <div className="config-item">
                <label>Default Reply Tone</label>
                <div className="tone-buttons">
                  <button 
                    className={aiConfig.replyTone === 'professional' ? 'active' : ''}
                    onClick={() => handleToneChange('professional')}
                  >
                    Pro
                  </button>
                  <button 
                    className={aiConfig.replyTone === 'friendly' ? 'active' : ''}
                    onClick={() => handleToneChange('friendly')}
                  >
                    Friendly
                  </button>
                  <button 
                    className={aiConfig.replyTone === 'empathetic' ? 'active' : ''}
                    onClick={() => handleToneChange('empathetic')}
                  >
                    Empathetic
                  </button>
                </div>
              </div>
              
              {/* Blocked Keywords */}
              <div className="config-item">
                <label>Blocked Keywords</label>
                <input 
                  type="text" 
                  className="keywords-input"
                  placeholder="Add keywords separated by comma..."
                  value={aiConfig.blockedKeywords}
                  onChange={(e) => handleKeywordsChange(e.target.value)}
                />
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Settings;
