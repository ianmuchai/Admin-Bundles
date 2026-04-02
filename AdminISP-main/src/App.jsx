import { useState, useEffect, Component } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'monospace', background: '#fff1f0', minHeight: '100vh' }}>
          <h2 style={{ color: '#c00', marginBottom: '1rem' }}>Something went wrong</h2>
          <pre style={{ color: '#333', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {this.state.error?.toString()}
            {'\n\n'}
            {this.state.error?.stack}
          </pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}>
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard"

import ActiveUsers from "./pages/ActiveUsers.jsx";
import Clients from "./pages/Client.jsx";
import Tickets from "./pages/Tickets.jsx";
import Packages from "./pages/Packages.jsx";
import Vouchers from "./pages/Vouchers.jsx";
import Payments from "./pages/Payments.jsx";
import Sites from "./pages/Sites.jsx";
import Leads from "./pages/Leads.jsx";
import Expenses from "./pages/Expenses.jsx";
import Messages from "./pages/Messages.jsx";
import Emails from "./pages/Emails.jsx";
import Campaigns from "./pages/Campaigns.jsx";
import Login from "./pages/Login.jsx";

function AppContent({ isAuthenticated, isLoading, handleLogin, handleLogout, isCollapsed, setIsCollapsed }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only redirect to dashboard on login (when moving from unauthenticated to authenticated)
    if (isAuthenticated && location.pathname === '/login') {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, location.pathname, navigate]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden transition-colors duration-300">
      
      {/* 1. Navbar: Stays at the top end-to-end */}
      <Navbar
        onToggle={() => setIsCollapsed(!isCollapsed)}
        onLogout={handleLogout}
      />

      <div className="flex flex-1 overflow-hidden">
        
        {/* 2. Sidebar: Controlled by isCollapsed on all screen sizes */}
        <Sidebar
          isCollapsed={isCollapsed}
        />

        {/* 3. Main Content Area: Switches based on URL */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-zeta-dark transition-colors duration-300">
          <Routes>
            {/* Redirect root "/" to "/dashboard" */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            <Route path="/dashboard" element={<Dashboard />} />
            
            {/* Routes for sidebar buttons */}
            <Route path="/active-users" element={<ActiveUsers />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/tickets" element={<Tickets />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/packages" element={<Packages />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/vouchers" element={<Vouchers />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/emails" element={<Emails />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/sites" element={<Sites />} />
            
            {/* 404 Page */}
            <Route path="*" element={<div className="p-10 text-center">Page Not Found</div>} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already authenticated on app load
  useEffect(() => {
    const authToken = localStorage.getItem("authToken");
    if (authToken) {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (email) => {
    // Token is already stored in localStorage by Login.jsx — just update auth state
    localStorage.setItem("userEmail", email);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("adminUser");
    setIsAuthenticated(false);
  };

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppContent 
          isAuthenticated={isAuthenticated}
          isLoading={isLoading}
          handleLogin={handleLogin}
          handleLogout={handleLogout}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
        />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

// Simple placeholder component to test the routing before you build the actual pages
function PlaceholderPage({ title }) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-[#000a40] dark:text-white">{title}</h1>
      <p className="text-gray-500 mt-2">This page is under construction...</p>
    </div>
  );
}