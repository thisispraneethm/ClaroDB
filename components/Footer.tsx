import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="w-full text-center p-3 border-t border-border/50 bg-background/80 backdrop-blur-sm text-xs text-text-secondary flex-shrink-0 z-10">
      Beta release. Queries processed securely in your browser.
    </footer>
  );
};

export default Footer;