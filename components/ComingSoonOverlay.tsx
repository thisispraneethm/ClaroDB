
import React from 'react';
import { Wrench } from 'lucide-react';

const ComingSoonOverlay: React.FC = () => {
  return (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-xl">
      <div className="text-center p-8">
        <Wrench size={48} className="text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-text mb-2">Coming Soon</h2>
        <p className="text-text-secondary max-w-sm">
          This feature is currently under development. We're working hard to bring you a secure and powerful way to connect to your enterprise databases.
        </p>
      </div>
    </div>
  );
};

export default ComingSoonOverlay;
