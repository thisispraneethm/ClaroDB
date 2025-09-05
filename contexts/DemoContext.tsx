import React, { createContext, useContext, ReactNode, useState } from 'react';
import { ConversationTurn } from '../types';
import { Chat } from '@google/genai';

interface DemoContextType {
  conversation: ConversationTurn[];
  setConversation: React.Dispatch<React.SetStateAction<ConversationTurn[]>>;
  chatSession: Chat | null;
  setChatSession: React.Dispatch<React.SetStateAction<Chat | null>>;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export const DemoProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  
  const value = {
    conversation, setConversation, chatSession, setChatSession,
  };

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
};

export const useDemoContext = (): DemoContextType => {
  const context = useContext(DemoContext);
  if (context === undefined) {
    throw new Error('useDemoContext must be used within a DemoProvider');
  }
  return context;
};