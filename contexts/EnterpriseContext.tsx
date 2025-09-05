import React, { createContext, useContext, ReactNode, useState } from 'react';
import { ConversationTurn, TableSchema, Join, Point } from '../types';
import { Chat } from '@google/genai';

interface EnterpriseContextType {
  conversation: ConversationTurn[];
  setConversation: React.Dispatch<React.SetStateAction<ConversationTurn[]>>;
  chatSession: Chat | null;
  setChatSession: React.Dispatch<React.SetStateAction<Chat | null>>;
  isConnected: boolean;
  setIsConnected: React.Dispatch<React.SetStateAction<boolean>>;
  schemas: TableSchema | null;
  setSchemas: React.Dispatch<React.SetStateAction<TableSchema | null>>;
  previewData: Record<string, Record<string, any>[]>;
  setPreviewData: React.Dispatch<React.SetStateAction<Record<string, Record<string, any>[]>>>;
  joins: Join[];
  setJoins: React.Dispatch<React.SetStateAction<Join[]>>;
  cardPositions: Record<string, Point>;
  setCardPositions: React.Dispatch<React.SetStateAction<Record<string, Point>>>;
}

const EnterpriseContext = createContext<EnterpriseContextType | undefined>(undefined);

export const EnterpriseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [schemas, setSchemas] = useState<TableSchema | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, Record<string, any>[]>>({});
  const [joins, setJoins] = useState<Join[]>([]);
  const [cardPositions, setCardPositions] = useState<Record<string, Point>>({});

  const value = {
    conversation, setConversation, chatSession, setChatSession,
    isConnected, setIsConnected, schemas, setSchemas,
    previewData, setPreviewData, joins, setJoins,
    cardPositions, setCardPositions,
  };

  return <EnterpriseContext.Provider value={value}>{children}</EnterpriseContext.Provider>;
};

export const useEnterpriseContext = (): EnterpriseContextType => {
  const context = useContext(EnterpriseContext);
  if (context === undefined) {
    throw new Error('useEnterpriseContext must be used within an EnterpriseProvider');
  }
  return context;
};