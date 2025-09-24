import React, { useRef, useLayoutEffect, useCallback, useEffect } from 'react';
import { Send, Loader2, ArrowUp } from 'lucide-react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
  placeholder?: string;
  disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ value, onChange, onSend, isLoading, placeholder, disabled = false }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const updateHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(250, Math.max(52, textarea.scrollHeight));
      textarea.style.height = `${newHeight}px`;
    }
  }, []);

  useLayoutEffect(updateHeight, [value, updateHeight]);

  useEffect(() => {
    window.addEventListener('resize', updateHeight);
    return () => {
      window.removeEventListener('resize', updateHeight);
    };
  }, [updateHeight]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && !disabled) {
        onSend();
      }
    }
  };

  return (
    <div className="bg-gradient-to-t from-background via-background/95 to-transparent pt-4 pb-2 px-4">
      <div className="relative max-w-4xl mx-auto">
        <div className="absolute inset-0 bg-card/80 backdrop-blur-xl border border-border rounded-xl shadow-large"></div>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Ask a follow-up question..."}
          className="relative w-full p-3.5 pr-14 border-none rounded-xl focus:ring-2 focus:ring-primary/80 focus:ring-offset-2 focus:ring-offset-background focus:outline-none transition-all duration-200 resize-none bg-transparent disabled:bg-secondary-background/50 text-text placeholder-text-secondary"
          rows={1}
          style={{ minHeight: '52px', maxHeight: '250px' }}
          disabled={isLoading || disabled}
        />
        <button
          onClick={onSend}
          disabled={isLoading || disabled || !value.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-large shadow-primary/30 hover:scale-105 active:scale-95"
          aria-label="Send message"
        >
          {isLoading ? <Loader2 className="animate-spin" size={20} /> : <ArrowUp size={20} />}
        </button>
      </div>
    </div>
  );
};

export default ChatInput;