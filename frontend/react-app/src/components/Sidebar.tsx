// ============ SIDEBAR NAVIGATION COMPONENT ============
// Collapsible sidebar navigation - logo, nav links এবং user profile সহ

import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import '../styles/Sidebar.css';

// Navigation item এর structure
interface NavItem {
  label: string;      // Display text
  icon: string;       // Emoji icon
  path: string;       // Route path
  badge?: boolean;    // Badge indicator দেখাবে কিনা
}

// Navigation items এর list
const navItems: NavItem[] = [
  { label: 'Dashboard', icon: '📊', path: '/' },
  { label: 'Products', icon: '📦', path: '/inventory' },
  { label: 'Reviews', icon: '⭐', path: '/reviews' },
  { label: 'Analysis', icon: '🧠', path: '/analysis', badge: true },
  { label: 'Campaigns', icon: '📢', path: '/campaigns' },
];

function Sidebar() {
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Check করে current path active কিনা
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <aside className={`sidebar ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="sidebar-content">
        {/* Logo Section */}
        <div className="sidebar-logo">
          <div className="logo-icon">
            📊
          </div>
          {isExpanded && (
            <h1 className="logo-text">ReviewAI</h1>
          )}
        </div>
        
        {/* Navigation Links */}
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
              title={!isExpanded ? item.label : ''}
            >
              <div className="nav-item-inner">
                <span className="nav-icon">{item.icon}</span>
                {isExpanded && (
                  <>
                    <span className="nav-label">{item.label}</span>
                    {item.badge && (
                      <span className="nav-badge"></span>
                    )}
                  </>
                )}
              </div>
            </Link>
          ))}
        </nav>
      </div>
      
      {/* Bottom Section */}
      <div className="sidebar-bottom">
        {/* Settings Link */}
        <Link
          to="/settings"
          className={`nav-item ${isActive('/settings') ? 'active' : ''}`}
          title={!isExpanded ? 'Settings' : ''}
        >
          <div className="nav-item-inner">
            <span className="nav-icon">⚙️</span>
            {isExpanded && <span className="nav-label">Settings</span>}
          </div>
        </Link>
        
        {/* User Profile */}
        {isExpanded && (
          <div className="user-profile">
            <div className="user-avatar">
              ES
            </div>
            <div className="user-info">
              <p className="user-name">ElectroStore</p>
              <p className="user-role">Admin</p>
            </div>
          </div>
        )}
        
        {/* Toggle Button - sidebar collapse/expand করতে */}
        <button 
          className="sidebar-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isExpanded ? '◀' : '▶'}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
