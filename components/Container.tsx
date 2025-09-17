import React from 'react';

interface ContainerProps {
  title?: string;
  caption?: string;
  children: React.ReactNode;
  className?: string;
}

const Container: React.FC<ContainerProps> = ({ title, caption, children, className = '' }) => {
  return (
    <div className={`bg-card/80 backdrop-blur-2xl border border-white/20 rounded-xl shadow-card ${className}`}>
       {(title || caption) && (
        <div className="p-4 md:p-5 border-b border-black/5">
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