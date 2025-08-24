
import React from 'react';
import { Send, Loader2 } from 'lucide-react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
  placeholder?: string;
  disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ value, onChange, onSend, isLoading, placeholder, disabled = false }) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && !disabled) {
        onSend();
      }
    }
  };

  return (
    <div className="bg-card/50 backdrop-blur-lg p-4 border-t border-border/50">
      <div className="relative max-w-4xl mx-auto">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Ask a follow-up question..."}
          className="w-full p-3 pr-14 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:outline-none transition resize-none bg-background/70 disabled:bg-secondary-background text-text placeholder-text-secondary"
          rows={2}
          disabled={isLoading || disabled}
        />
        <button
          onClick={onSend}
          disabled={isLoading || disabled || !value.trim()}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          aria-label="Send message"
        >
          {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
        </button>
      </div>
    </div>
  );
};

export default ChatInput;