import React, { useState, useEffect } from 'react';
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import HomePage from './pages/HomePage';
import AnalyzePage from './pages/AnalyzePage';
import EngineerJoinPage from './pages/EngineerJoinPage';
import EnterpriseDBPage from './pages/EnterpriseDBPage';
import { AppProvider } from './contexts/AppContext';
import DemoWorkspacePage from './pages/DemoWorkspacePage';
import Footer from './components/Footer';
import { Menu, X } from 'lucide-react';
import AboutPage from './pages/AboutPage';

const AppContent: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Close sidebar on navigation change on mobile
    setIsSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-screen font-sans text-text overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-hidden relative">
          <button
            className="lg:hidden absolute top-4 right-4 z-40 p-2 rounded-full bg-card/80 backdrop-blur-md border border-border"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            aria-label={isSidebarOpen ? "Close menu" : "Open menu"}
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/demo" element={<DemoWorkspacePage />} />
            <Route path="/analyze" element={<AnalyzePage />} />
            <Route path="/engineer" element={<EngineerJoinPage />} />
            <Route path="/enterprise-db" element={<EnterpriseDBPage />} />
            <Route path="/about" element={<AboutPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <HashRouter>
        <AppContent />
      </HashRouter>
    </AppProvider>
  );
};

export default App;