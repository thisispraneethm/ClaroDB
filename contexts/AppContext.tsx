
import React, { createContext, useContext, ReactNode, useState } from 'react';
import { GeminiProvider } from '../services/llm/geminiProvider';
import { LLMProvider } from '../services/llm/base';
import { DemoDataHandler } from '../services/handlers/demoHandler';
import { FileDataHandler } from '../services/handlers/fileHandler';
import { ConversationTurn } from '../types';

interface AppContextType {
  llmProvider: LLMProvider;
  demoHandler: DemoDataHandler;
  analyzeHandler: FileDataHandler;
  engineerHandler: FileDataHandler;
  
  analyzeConversation: ConversationTurn[];
  setAnalyzeConversation: React.Dispatch<React.SetStateAction<ConversationTurn[]>>;
  engineerConversation: ConversationTurn[];
  setEngineerConversation: React.Dispatch<React.SetStateAction<ConversationTurn[]>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Singleton services that persist for the entire app lifecycle
const llmProvider = new GeminiProvider();
const demoHandler = new DemoDataHandler();
const analyzeHandler = new FileDataHandler('analyze');
const engineerHandler = new FileDataHandler('engineer');

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [analyzeConversation, setAnalyzeConversation] = useState<ConversationTurn[]>([]);
  const [engineerConversation, setEngineerConversation] = useState<ConversationTurn[]>([]);

  const value = {
    llmProvider,
    demoHandler,
    analyzeHandler,
    engineerHandler,
    analyzeConversation,
    setAnalyzeConversation,
    engineerConversation,
    setEngineerConversation,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
