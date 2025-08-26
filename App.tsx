import React from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import HomePage from './pages/HomePage';
import AnalyzePage from './pages/AnalyzePage';
import EngineerJoinPage from './pages/EngineerJoinPage';
import EnterpriseDBPage from './pages/EnterpriseDBPage';
import { AppProvider } from './contexts/AppContext';
import DemoWorkspacePage from './pages/DemoWorkspacePage';
import Footer from './components/Footer';

const App: React.FC = () => {
  return (
    <AppProvider>
      <HashRouter>
        <div className="flex h-screen font-sans bg-background text-text">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <main className="flex-1 overflow-hidden">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/demo" element={<DemoWorkspacePage />} />
                <Route path="/analyze" element={<AnalyzePage />} />
                <Route path="/engineer" element={<EngineerJoinPage />} />
                <Route path="/enterprise-db" element={<EnterpriseDBPage />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </div>
      </HashRouter>
    </AppProvider>
  );
};

export default App;