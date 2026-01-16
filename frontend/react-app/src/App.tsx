// ============ APP.TSX ============
// Main application component - Sidebar layout এবং routing setup

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Components
import Sidebar from './components/Sidebar';

// Context Provider - Global state management
import { ReviewProvider } from './context/ReviewContext';

// Pages import
import Dashboard from './pages/Dashboard';
import ReviewDetails from './pages/ReviewDetails';
import Inventory from './pages/Inventory';
import { Navigate } from 'react-router-dom';
import SettingsLayout from './pages/settings/SettingsLayout';
import Account from './pages/settings/Account';
import Integrations from './pages/settings/Integrations';
import Notifications from './pages/settings/Notifications';
import AIModels from './pages/settings/AIModels';
import Billing from './pages/settings/Billing';
import Reviews from './pages/Reviews';
import Analysis from './pages/Analysis';
import Campaigns from './pages/Campaigns';
import DetailedReport from './pages/DetailedReport';
import AIChatPage from './pages/AIChatPage';
import ProductInsights from './pages/ProductInsights';
import ProductFixIssues from './pages/ProductFixIssues';
import AnalysisDetailed from './pages/AnalysisDetailed';
import TopicClusters from './pages/TopicClusters';

// Global styles
import './index.css';


// ============ MAIN APP COMPONENT ============

function App() {
  return (
    <Router>
      {/* ReviewProvider - সব pages এ shared state access দেবে */}
      <ReviewProvider>
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
            <Route path="/product/:id/insights" element={<ProductInsights />} />
            <Route path="/product/:id/fix-issues" element={<ProductFixIssues />} />
            
            {/* All Reviews */}
            <Route path="/reviews" element={<Reviews />} />
            
            {/* Analysis */}
            <Route path="/analysis" element={<Analysis />} />
            <Route path="/analysis/detailed" element={<AnalysisDetailed />} />
            <Route path="/analysis/clusters" element={<TopicClusters />} />
            
            {/* Campaigns */}
            <Route path="/campaigns" element={<Campaigns />} />
            
            {/* Printable detailed report (Export Report) */}
            <Route path="/reports/detailed" element={<DetailedReport />} />

            {/* AI Deep Dive chat page (Dashboard -> View Deep Dive) */}
            <Route path="/ai-chat" element={<AIChatPage />} />

            {/* Settings (5 pages) */}
            <Route path="/settings" element={<SettingsLayout />}>
              <Route index element={<Navigate to="/settings/account" replace />} />
              <Route path="account" element={<Account />} />
              <Route path="integrations" element={<Integrations />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="ai-models" element={<AIModels />} />
              <Route path="billing" element={<Billing />} />
            </Route>
            
            {/* Review Details - Dynamic route */}
            <Route path="/review/:id" element={<ReviewDetails />} />
          </Routes>
        </main>
      </div>
      </ReviewProvider>
    </Router>
  );
}

export default App;
