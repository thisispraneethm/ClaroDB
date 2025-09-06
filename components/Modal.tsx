import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in-up" style={{ animationName: 'fade-in' }}>
      <style>{`@keyframes fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }`}</style>
      <div ref={modalRef} className="bg-card/80 backdrop-blur-2xl rounded-xl shadow-xl w-full max-w-lg border border-white/20 animate-scale-in">
        <div className="flex items-center justify-between p-4 border-b border-black/5">
          <h2 className="text-lg font-semibold text-text flex items-center">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-full text-text-secondary hover:bg-black/5 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
        {footer && (
          <div className="flex justify-end p-4 bg-secondary-background/50 border-t border-black/5 rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;