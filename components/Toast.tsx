import React, { useEffect, useState, useContext } from 'react';
// FIX: Import ToastContext to access the full context value.
import { useToast, Toast, ToastContext } from '../contexts/ToastContext';
import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const ToastMessage: React.FC<{ toast: Toast, onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onRemove(toast.id), 300); // Wait for animation to finish
    }, 5000);

    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);
  
  const handleRemove = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  };

  const ICONS = {
    info: <Info size={20} className="text-info" />,
    success: <CheckCircle size={20} className="text-success" />,
    error: <AlertTriangle size={20} className="text-danger" />,
  };
  
  const BORDER_COLORS = {
    info: 'border-info-border',
    success: 'border-success/30',
    error: 'border-danger/30',
  }

  return (
    <div
      className={`flex items-start w-full max-w-sm p-4 bg-card/80 backdrop-blur-2xl border ${BORDER_COLORS[toast.type]} rounded-xl shadow-xl transition-all ${isExiting ? 'animate-toast-out' : 'animate-toast-in'}`}
      role="alert"
    >
      <div className="flex-shrink-0">{ICONS[toast.type]}</div>
      <div className="ml-3 mr-4 flex-1">
        <p className="text-sm font-semibold text-text">{toast.message}</p>
      </div>
      <button
        onClick={handleRemove}
        className="p-1 -m-1 rounded-full text-text-secondary hover:bg-black/5 transition-colors"
        aria-label="Close"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  // FIX: The `useToast` hook is designed to only expose `add`. The ToastContainer needs the full context, so we use `useContext` directly.
  const context = useContext(ToastContext);
  if (!context) {
    // This should not happen if ToastContainer is inside ToastProvider
    return null;
  }
  const { toasts, removeToast } = context;


  return (
    <div className="fixed bottom-0 right-0 p-4 sm:p-6 space-y-3 z-[100]">
      {toasts.map(toast => (
        <ToastMessage key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
};