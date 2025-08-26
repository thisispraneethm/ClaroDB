import React from 'react';
import { NavLink } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, children }) => {
  return (
    <div className="text-center p-8">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-text">{title}</h3>
      <p className="mt-1 text-sm text-text-secondary">{description}</p>
      <div className="mt-6">{children}</div>
      <div className="mt-8 border-t border-border pt-6">
        <p className="text-sm text-text-secondary">Not sure where to start?</p>
        <NavLink
          to="/demo"
          className="mt-2 inline-flex items-center text-sm font-semibold text-primary hover:text-primary-hover"
        >
          <Sparkles size={16} className="mr-2" />
          Try the Demo Workspace
        </NavLink>
      </div>
    </div>
  );
};

export default EmptyState;
