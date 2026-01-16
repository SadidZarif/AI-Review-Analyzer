// ============ SIDEBAR NAVIGATION COMPONENT ============
// Collapsible sidebar navigation - logo, nav links এবং user profile সহ

import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import '../styles/Sidebar.css';

import LogoIcon from '../assets/Logo.png';
import LogoWithName from '../assets/Logo_with_name.png';
import { useReviews } from '../context/ReviewContext';
import { generateInitials } from '../utils/helpers';

// Navigation item এর structure
interface NavItem {
  label: string;      // Display text
  icon: string;       // Material Symbols icon name
  path: string;       // Route path
  badge?: boolean;    // Badge indicator দেখাবে কিনা
}

// Navigation items এর list - Material Symbols icons ব্যবহার করছি
const navItems: NavItem[] = [
  { label: 'Dashboard', icon: 'dashboard', path: '/' },
  { label: 'Products', icon: 'inventory_2', path: '/inventory' },
  { label: 'Reviews', icon: 'reviews', path: '/reviews' },
  { label: 'Analysis', icon: 'analytics', path: '/analysis', badge: true },
  { label: 'Campaigns', icon: 'campaign', path: '/campaigns' },
];

function Sidebar() {
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(true);
  const { storeConfig } = useReviews();
  
  // Check করে current path active কিনা
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <aside className={`sidebar ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="sidebar-content">
        {/* Logo Section */}
        <div className="sidebar-logo">
          {isExpanded ? (
            <div className="logo-with-name">
              <img className="logo-name-img" src={LogoWithName} alt="RevuMax" />
            </div>
          ) : (
            <div className="logo-icon" aria-hidden="true">
              <img className="logo-img" src={LogoIcon} alt="RevuMax" />
            </div>
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
                <span className="nav-icon material-symbols-outlined">{item.icon}</span>
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
            <span className="nav-icon material-symbols-outlined">settings</span>
            {isExpanded && <span className="nav-label">Settings</span>}
          </div>
        </Link>
        
        {/* User Profile */}
        {isExpanded && (
          <div className="user-profile">
            <div className="user-avatar">
              {generateInitials(storeConfig?.store_domain || 'Store')}
            </div>
            <div className="user-info">
              <p className="user-name">{storeConfig?.store_domain || 'No store connected'}</p>
              <p className="user-role">{storeConfig ? 'Connected' : 'Not connected'}</p>
            </div>
          </div>
        )}
        
        {/* Toggle Button - sidebar collapse/expand করতে */}
        <button 
          className="sidebar-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <span className="material-symbols-outlined">
            {isExpanded ? 'chevron_left' : 'chevron_right'}
          </span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
