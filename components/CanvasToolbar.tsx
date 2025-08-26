import React from 'react';
import { LayoutGrid } from 'lucide-react';

interface CanvasToolbarProps {
  onAutoLayout: () => void;
}

const CanvasToolbar: React.FC<CanvasToolbarProps> = ({ onAutoLayout }) => {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
      <div className="flex items-center gap-2 bg-card/70 backdrop-blur-lg border border-white/40 rounded-full shadow-xl p-2">
        <button
          onClick={onAutoLayout}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-text bg-white/50 hover:bg-white/80 rounded-full transition-colors"
          title="Auto-Layout"
        >
          <LayoutGrid size={16} />
          <span>Auto-Layout</span>
        </button>
      </div>
    </div>
  );
};

export default CanvasToolbar;