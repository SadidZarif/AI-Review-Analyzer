// ============ APP.TSX ============
// Main application component - Sidebar layout এবং routing setup

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Components
import Sidebar from './components/Sidebar';

// Pages import
import Dashboard from './pages/Dashboard';
import ReviewDetails from './pages/ReviewDetails';
import Inventory from './pages/Inventory';
import Settings from './pages/Settings';

// Global styles
import './index.css';


// ============ PLACEHOLDER COMPONENTS ============
// এগুলো পরে implement করা হবে

function Analysis() {
  return (
    <div style={{
      padding: '2rem',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      textAlign: 'center'
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: '4rem', marginBottom: '1rem', color: 'var(--primary)' }}>analytics</span>
      <h1 style={{ marginBottom: '0.5rem' }}>Analysis</h1>
      <p style={{ color: 'var(--text-secondary)' }}>Coming soon...</p>
    </div>
  );
}

function Campaigns() {
  return (
    <div style={{
      padding: '2rem',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      textAlign: 'center'
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: '4rem', marginBottom: '1rem', color: 'var(--primary)' }}>campaign</span>
      <h1 style={{ marginBottom: '0.5rem' }}>Campaigns</h1>
      <p style={{ color: 'var(--text-secondary)' }}>Coming soon...</p>
    </div>
  );
}


// ============ MAIN APP COMPONENT ============

function App() {
  return (
    <Router>
      {/* App Container - Sidebar + Main Content */}
      <div className="app">
        {/* Decorative Background Glows */}
        <div className="bg-glow bg-glow-primary"></div>
        <div className="bg-glow bg-glow-secondary"></div>
        
        {/* Sidebar Navigation */}
        <Sidebar />
        
        {/* Main Content Area */}
        <main className="main-content">
          {/* Routes - URL এ কোন page দেখাবে */}
          <Routes>
            {/* Dashboard - Home page */}
            <Route path="/" element={<Dashboard />} />
            
            {/* Products/Inventory */}
            <Route path="/inventory" element={<Inventory />} />
            
            {/* All Reviews - ReviewDetails page render হবে */}
            <Route path="/reviews" element={<ReviewDetails />} />
            
            {/* Analysis */}
            <Route path="/analysis" element={<Analysis />} />
            
            {/* Campaigns */}
            <Route path="/campaigns" element={<Campaigns />} />
            
            {/* Settings */}
            <Route path="/settings" element={<Settings />} />
            
            {/* Review Details - Dynamic route */}
            <Route path="/review/:id" element={<ReviewDetails />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
