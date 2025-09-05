import React, { createContext, useContext, ReactNode, useState } from 'react';
import { ConversationTurn, TableSchema, Join, Point } from '../types';
import { Chat } from '@google/genai';

interface EngineerContextType {
  conversation: ConversationTurn[];
  setConversation: React.Dispatch<React.SetStateAction<ConversationTurn[]>>;
  chatSession: Chat | null;
  setChatSession: React.Dispatch<React.SetStateAction<Chat | null>>;
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  schemas: TableSchema | null;
  setSchemas: React.Dispatch<React.SetStateAction<TableSchema | null>>;
  previewData: Record<string, Record<string, any>[]>;
  setPreviewData: React.Dispatch<React.SetStateAction<Record<string, Record<string, any>[]>>>;
  tableNameMap: Record<string, string>;
  setTableNameMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  joins: Join[];
  setJoins: React.Dispatch<React.SetStateAction<Join[]>>;
  cardPositions: Record<string, Point>;
  setCardPositions: React.Dispatch<React.SetStateAction<Record<string, Point>>>;
}

const EngineerContext = createContext<EngineerContextType | undefined>(undefined);

export const EngineerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [schemas, setSchemas] = useState<TableSchema | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, Record<string, any>[]>>({});
  const [tableNameMap, setTableNameMap] = useState<Record<string, string>>({});
  const [joins, setJoins] = useState<Join[]>([]);
  const [cardPositions, setCardPositions] = useState<Record<string, Point>>({});

  const value = {
    conversation, setConversation, chatSession, setChatSession,
    files, setFiles, schemas, setSchemas,
    previewData, setPreviewData, tableNameMap, setTableNameMap,
    joins, setJoins, cardPositions, setCardPositions,
  };

  return <EngineerContext.Provider value={value}>{children}</EngineerContext.Provider>;
};

export const useEngineerContext = (): EngineerContextType => {
  const context = useContext(EngineerContext);
  if (context === undefined) {
    throw new Error('useEngineerContext must be used within an EngineerProvider');
  }
  return context;
};