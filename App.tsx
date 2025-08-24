
import React from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import AboutPage from './pages/AboutPage';
import AnalyzePage from './pages/AnalyzePage';
import EngineerJoinPage from './pages/EngineerJoinPage';
import EnterpriseDBPage from './pages/EnterpriseDBPage';
import { AppProvider } from './contexts/AppContext';
import DemoWorkspacePage from './pages/DemoWorkspacePage';

const App: React.FC = () => {
  return (
    <AppProvider>
      <HashRouter>
        <div className="flex h-screen font-sans bg-background text-text">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <main className="flex-1 overflow-hidden">
              <Routes>
                <Route path="/" element={<div className="h-full overflow-y-auto p-6 md:p-8 lg:p-10"><AboutPage /></div>} />
                <Route path="/demo" element={<DemoWorkspacePage />} />
                <Route path="/analyze" element={<AnalyzePage />} />
                <Route path="/engineer" element={<EngineerJoinPage />} />
                <Route path="/enterprise-db" element={<div className="h-full overflow-y-auto p-6 md:p-8 lg:p-10"><EnterpriseDBPage /></div>} />
              </Routes>
            </main>
          </div>
        </div>
      </HashRouter>
    </AppProvider>
  );
};

export default App;
