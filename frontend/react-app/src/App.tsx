// ============ APP.TSX ============
// Main application component
// এখানে routing এবং navigation setup আছে

import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

// Pages import (temporarily commented - files এ code হলে uncomment করবে)
// import Dashboard from './pages/Dashboard';
// import Inventory from './pages/Inventory';
// import Settings from './pages/Settings';
// import ReviewDetails from './pages/ReviewDetails';

// Global styles
import './index.css';


// ============ TEMPORARY PLACEHOLDER COMPONENTS ============
// যখন actual pages তৈরি হবে, এগুলো delete করে উপরের imports uncomment করবে

function Dashboard() {
  return <div><h1>Dashboard</h1><p>Coming soon...</p></div>;
}

function Inventory() {
  return <div><h1>Inventory</h1><p>Coming soon...</p></div>;
}

function Settings() {
  return <div><h1>Settings</h1><p>Coming soon...</p></div>;
}

function ReviewDetails() {
  return <div><h1>Review Details</h1><p>Coming soon...</p></div>;
}


// ============ NAVIGATION COMPONENT ============
// সব pages এ common navigation bar

function Navigation() {
  return (
    <nav className="navbar">
      {/* Logo / Brand */}
      <div className="nav-brand">
        <Link to="/">🔍 AI Review Analyzer</Link>
      </div>
      
      {/* Navigation Links */}
      <ul className="nav-links">
        <li>
          <Link to="/">Dashboard</Link>
        </li>
        <li>
          <Link to="/inventory">Inventory</Link>
        </li>
        <li>
          <Link to="/settings">Settings</Link>
        </li>
      </ul> 
    </nav>
  );
}


// ============ MAIN APP COMPONENT ============

function App() {
  return (
    // Router wrap করছে পুরো app কে
    // এটা URL based navigation enable করে
    <Router>
      <div className="app">
        {/* Navigation bar - সব pages এ দেখাবে */}
        <Navigation />
        
        {/* Main content area */}
        <main className="main-content">
          {/* Routes define করছে কোন URL এ কোন page দেখাবে */}
          <Routes>
            {/* "/" = home page = Dashboard */}
            <Route path="/" element={<Dashboard />} />
            
            {/* "/inventory" = Inventory page */}
            <Route path="/inventory" element={<Inventory />} />
            
            {/* "/settings" = Settings page */}
            <Route path="/settings" element={<Settings />} />
            
            {/* "/review/:id" = Review details page */}
            {/* :id মানে dynamic parameter - যেকোনো id হতে পারে */}
            <Route path="/review/:id" element={<ReviewDetails />} />
          </Routes>
        </main>
        
        {/* Footer */}
        <footer className="footer">
          <p>AI Review Analyzer © 2024</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
