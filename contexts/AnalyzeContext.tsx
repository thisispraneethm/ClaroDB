import React, { createContext, useContext, ReactNode, useState } from 'react';
import { ConversationTurn, TableSchema } from '../types';
import { Chat } from '@google/genai';

interface AnalyzeContextType {
  conversation: ConversationTurn[];
  setConversation: React.Dispatch<React.SetStateAction<ConversationTurn[]>>;
  chatSession: Chat | null;
  setChatSession: React.Dispatch<React.SetStateAction<Chat | null>>;
  file: File | null;
  setFile: React.Dispatch<React.SetStateAction<File | null>>;
  schemas: TableSchema | null;
  setSchemas: React.Dispatch<React.SetStateAction<TableSchema | null>>;
  previewData: Record<string, any>[] | null;
  setPreviewData: React.Dispatch<React.SetStateAction<Record<string, any>[] | null>>;
  isSampled: boolean;
  setIsSampled: React.Dispatch<React.SetStateAction<boolean>>;
}

const AnalyzeContext = createContext<AnalyzeContextType | undefined>(undefined);

export const AnalyzeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [schemas, setSchemas] = useState<TableSchema | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, any>[] | null>(null);
  const [isSampled, setIsSampled] = useState(false);

  const value = {
    conversation, setConversation, chatSession, setChatSession,
    file, setFile, schemas, setSchemas,
    previewData, setPreviewData, isSampled, setIsSampled,
  };

  return <AnalyzeContext.Provider value={value}>{children}</AnalyzeContext.Provider>;
};

export const useAnalyzeContext = (): AnalyzeContextType => {
  const context = useContext(AnalyzeContext);
  if (context === undefined) {
    throw new Error('useAnalyzeContext must be used within an AnalyzeProvider');
  }
  return context;
};