import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Sparkles, FileSearch, Combine, DatabaseZap } from 'lucide-react';
import { NavItem } from '../types';

const navItems: NavItem[] = [
  { path: '/', name: 'Home', icon: <Home size={20} /> },
  { path: '/demo', name: 'Demo Workspace', icon: <Sparkles size={20} /> },
  { path: '/analyze', name: 'Analyze File', icon: <FileSearch size={20} /> },
  { path: '/engineer', name: 'Engineer & Join', icon: <Combine size={20} /> },
  { path: '/enterprise-db', name: 'Enterprise DB', icon: <DatabaseZap size={20} /> },
];

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const linkClasses = "flex items-center px-4 py-2.5 text-sm font-medium rounded-md transition-all duration-200 group";
  const activeClasses = "bg-primary text-primary-foreground font-semibold shadow-sm";
  const inactiveClasses = "text-text-secondary hover:bg-black/5 hover:text-text";

  const sidebarContent = (
    <>
      <div className="h-16 flex items-center px-4 shrink-0">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center text-white shadow-md">
            <svg width="20" height="20" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M24 16H32V20H28V44H32V48H24C21.7909 48 20 46.2091 20 44V20C20 17.7909 21.7909 16 24 16Z" fill="white"/>
              <path d="M40 16H48C50.2091 16 52 17.7909 52 20V44C52 46.2091 50.2091 48 48 48H40V16Z" fill="white" fillOpacity="0.7"/>
            </svg>
        </div>
        <span className="ml-3 text-lg font-semibold tracking-wide text-text">ClaroDB</span>
      </div>
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `${linkClasses} ${isActive ? activeClasses : inactiveClasses}`}
            >
              <div className={`transition-transform duration-200 ${item.path === '/demo' ? 'group-hover:rotate-12' : ''}`}>{item.icon}</div>
              <span className="ml-4">{item.name}</span>
            </NavLink>
        ))}
      </nav>
      <div className="p-4 text-xs text-center text-text-secondary">
        One workspace. Pure focus.
      </div>
    </>
  );

  return (
    <>
       {/* Overlay for mobile */}
       <div
        className={`fixed inset-0 bg-black/20 z-40 transition-opacity duration-300 lg:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />
      <aside className={`w-64 bg-card/80 backdrop-blur-xl border-r border-white/20 flex flex-col flex-shrink-0 transition-transform duration-300 ease-in-out z-50
        lg:translate-x-0 lg:static lg:h-auto
        ${isOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full'}
        fixed h-full
      `}>
        {sidebarContent}
      </aside>
    </>
  );
};

export default Sidebar;
