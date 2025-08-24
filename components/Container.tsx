
import React from 'react';

interface ContainerProps {
  title?: string;
  caption?: string;
  children: React.ReactNode;
}

const Container: React.FC<ContainerProps> = ({ title, caption, children }) => {
  return (
    <div className="bg-card/60 backdrop-blur-lg border border-white/40 rounded-xl shadow-card">
       {(title || caption) && (
        <div className="p-4 md:p-5 border-b border-border/50">
          {title && <h3 className="text-lg font-semibold text-text">{title}</h3>}
          {caption && <p className="text-sm text-text-secondary mt-1">{caption}</p>}
        </div>
      )}
      <div className="p-4 md:p-6">
        {children}
      </div>
    </div>
  );
};

export default Container;