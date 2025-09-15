
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
      textarea.style.height = `${textarea.scrollHeight}px`;
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
    <div className="bg-card/30 backdrop-blur-xl p-4 border-t border-white/20">
      <div className="relative max-w-4xl mx-auto">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Ask a follow-up question..."}
          className="w-full p-3.5 pr-14 border border-border rounded-xl focus:ring-2 focus:ring-ring focus:outline-none transition-all duration-200 resize-none bg-background/70 disabled:bg-secondary-background text-text placeholder-text-secondary shadow-sm overflow-y-hidden"
          rows={1}
          style={{ minHeight: '54px', maxHeight: '200px' }}
          disabled={isLoading || disabled}
        />
        <button
          onClick={onSend}
          disabled={isLoading || disabled || !value.trim()}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 w-9 h-9 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
          aria-label="Send message"
        >
          {isLoading ? <Loader2 className="animate-spin" size={20} /> : <ArrowUp size={20} />}
        </button>
      </div>
    </div>
  );
};

export default ChatInput;