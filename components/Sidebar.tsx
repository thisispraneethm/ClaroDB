
import React from 'react';
import { NavLink } from 'react-router-dom';
import { Info, Sparkles, FileSearch, Combine, DatabaseZap } from 'lucide-react';
import { NavItem } from '../types';

const navItems: NavItem[] = [
  { path: '/', name: 'About', icon: <Info size={20} /> },
  { path: '/demo', name: 'Demo Workspace', icon: <Sparkles size={20} /> },
  { path: '/analyze', name: 'Analyze File', icon: <FileSearch size={20} /> },
  { path: '/engineer', name: 'Engineer & Join', icon: <Combine size={20} /> },
  { path: '/enterprise-db', name: 'Enterprise DB', icon: <DatabaseZap size={20} /> },
];

const Sidebar: React.FC = () => {
  const linkClasses = "flex items-center px-4 py-2.5 text-sm font-medium rounded-md transition-colors";
  const activeClasses = "bg-primary/10 text-primary font-semibold";
  const inactiveClasses = "text-text-secondary hover:bg-black/5 hover:text-text";

  return (
    <aside className="w-64 bg-background/90 backdrop-blur-lg flex-shrink-0 border-r border-border/50 flex flex-col">
      <div className="h-16 border-b border-border/50 flex items-center px-4">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center text-white shadow-md">
            <DatabaseZap size={20} />
        </div>
        <span className="ml-3 text-lg font-semibold tracking-wide text-text">ClaroDB</span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `${linkClasses} ${isActive ? activeClasses : inactiveClasses}`}
            >
              <div className="w-5">{item.icon}</div>
              <span className="ml-3">{item.name}</span>
            </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-border/50 text-xs text-center text-text-secondary">
        One workspace. Pure focus.
      </div>
    </aside>
  );
};

export default Sidebar;
