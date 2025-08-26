import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { GeminiProvider } from '../services/llm/geminiProvider';
import { LLMProvider } from '../services/llm/base';
import { DemoDataHandler } from '../services/handlers/demoHandler';
import { FileDataHandler } from '../services/handlers/fileHandler';
import { EnterpriseDataHandler } from '../services/handlers/enterpriseHandler';
import { ConversationTurn } from '../types';

interface AppContextType {
  llmProvider: LLMProvider;
  demoHandler: DemoDataHandler;
  analyzeHandler: FileDataHandler;
  engineerHandler: FileDataHandler;
  enterpriseHandler: EnterpriseDataHandler;
  
  demoConversation: ConversationTurn[];
  setDemoConversation: React.Dispatch<React.SetStateAction<ConversationTurn[]>>;
  demoHistory: { role: string, content: string }[];
  setDemoHistory: React.Dispatch<React.SetStateAction<{ role: string, content: string }[]>>;
  
  analyzeConversation: ConversationTurn[];
  setAnalyzeConversation: React.Dispatch<React.SetStateAction<ConversationTurn[]>>;
  analyzeHistory: { role: string, content: string }[];
  setAnalyzeHistory: React.Dispatch<React.SetStateAction<{ role: string, content: string }[]>>;

  engineerConversation: ConversationTurn[];
  setEngineerConversation: React.Dispatch<React.SetStateAction<ConversationTurn[]>>;
  engineerHistory: { role: string, content: string }[];
  setEngineerHistory: React.Dispatch<React.SetStateAction<{ role: string, content: string }[]>>;
  
  enterpriseConversation: ConversationTurn[];
  setEnterpriseConversation: React.Dispatch<React.SetStateAction<ConversationTurn[]>>;
  enterpriseHistory: { role: string, content: string }[];
  setEnterpriseHistory: React.Dispatch<React.SetStateAction<{ role: string, content: string }[]>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Singleton services that persist for the entire app lifecycle
const llmProvider = new GeminiProvider();
const demoHandler = new DemoDataHandler();
const analyzeHandler = new FileDataHandler('analyze');
const engineerHandler = new FileDataHandler('engineer');
const enterpriseHandler = new EnterpriseDataHandler();

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [demoConversation, setDemoConversation] = useState<ConversationTurn[]>([]);
  const [demoHistory, setDemoHistory] = useState<{ role: string, content: string }[]>([]);
  
  const [analyzeConversation, setAnalyzeConversation] = useState<ConversationTurn[]>([]);
  const [analyzeHistory, setAnalyzeHistory] = useState<{ role: string, content: string }[]>([]);

  const [engineerConversation, setEngineerConversation] = useState<ConversationTurn[]>([]);
  const [engineerHistory, setEngineerHistory] = useState<{ role: string, content: string }[]>([]);

  const [enterpriseConversation, setEnterpriseConversation] = useState<ConversationTurn[]>([]);
  const [enterpriseHistory, setEnterpriseHistory] = useState<{ role: string, content: string }[]>([]);

  // Centralized initialization for all data handlers. This runs once per application
  // lifecycle, ensuring all database connections are established reliably and
  // preventing race conditions or crashes during development hot reloads.
  useEffect(() => {
    const initializeHandlers = async () => {
      try {
        await demoHandler.connect();
        await analyzeHandler.connect();
        await engineerHandler.connect();
        await enterpriseHandler.connect();
        console.log("All data handlers initialized successfully.");
      } catch (error) {
        console.error("Failed to initialize one or more data handlers:", error);
      }
    };

    initializeHandlers();
  }, []);


  const value = {
    llmProvider,
    demoHandler,
    analyzeHandler,
    engineerHandler,
    enterpriseHandler,
    
    demoConversation,
    setDemoConversation,
    demoHistory,
    setDemoHistory,

    analyzeConversation,
    setAnalyzeConversation,
    analyzeHistory,
    setAnalyzeHistory,

    engineerConversation,
    setEngineerConversation,
    engineerHistory,
    setEngineerHistory,

    enterpriseConversation,
    setEnterpriseConversation,
    enterpriseHistory,
    setEnterpriseHistory,
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
