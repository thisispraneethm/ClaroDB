import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { GeminiProvider } from '../services/llm/geminiProvider';
import { LLMProvider } from '../services/llm/base';
import { DemoDataHandler } from '../services/handlers/demoHandler';
import { FileDataHandler } from '../services/handlers/fileHandler';
import { EnterpriseDataHandler } from '../services/handlers/enterpriseHandler';
import { ConversationTurn, TableSchema, Join, Point } from '../types';

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
  
  // Analyze Page State
  analyzeConversation: ConversationTurn[];
  setAnalyzeConversation: React.Dispatch<React.SetStateAction<ConversationTurn[]>>;
  analyzeHistory: { role: string, content: string }[];
  setAnalyzeHistory: React.Dispatch<React.SetStateAction<{ role: string, content: string }[]>>;
  analyzeFile: File | null;
  setAnalyzeFile: React.Dispatch<React.SetStateAction<File | null>>;
  analyzeSchemas: TableSchema | null;
  setAnalyzeSchemas: React.Dispatch<React.SetStateAction<TableSchema | null>>;
  analyzePreviewData: Record<string, any>[] | null;
  setAnalyzePreviewData: React.Dispatch<React.SetStateAction<Record<string, any>[] | null>>;
  analyzeIsSampled: boolean;
  setAnalyzeIsSampled: React.Dispatch<React.SetStateAction<boolean>>;

  // Engineer Page State
  engineerConversation: ConversationTurn[];
  setEngineerConversation: React.Dispatch<React.SetStateAction<ConversationTurn[]>>;
  engineerHistory: { role: string, content: string }[];
  setEngineerHistory: React.Dispatch<React.SetStateAction<{ role: string, content: string }[]>>;
  engineerFiles: File[];
  setEngineerFiles: React.Dispatch<React.SetStateAction<File[]>>;
  engineerSchemas: TableSchema | null;
  setEngineerSchemas: React.Dispatch<React.SetStateAction<TableSchema | null>>;
  engineerPreviewData: Record<string, Record<string, any>[]>;
  setEngineerPreviewData: React.Dispatch<React.SetStateAction<Record<string, Record<string, any>[]>>>;
  engineerTableNameMap: Record<string, string>;
  setEngineerTableNameMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  engineerJoins: Join[];
  setEngineerJoins: React.Dispatch<React.SetStateAction<Join[]>>;
  engineerCardPositions: Record<string, Point>;
  setEngineerCardPositions: React.Dispatch<React.SetStateAction<Record<string, Point>>>;
  
  // Enterprise Page State
  enterpriseConversation: ConversationTurn[];
  setEnterpriseConversation: React.Dispatch<React.SetStateAction<ConversationTurn[]>>;
  enterpriseHistory: { role: string, content: string }[];
  setEnterpriseHistory: React.Dispatch<React.SetStateAction<{ role: string, content: string }[]>>;
  enterpriseIsConnected: boolean;
  setEnterpriseIsConnected: React.Dispatch<React.SetStateAction<boolean>>;
  enterpriseSchemas: TableSchema | null;
  setEnterpriseSchemas: React.Dispatch<React.SetStateAction<TableSchema | null>>;
  enterprisePreviewData: Record<string, Record<string, any>[]>;
  setEnterprisePreviewData: React.Dispatch<React.SetStateAction<Record<string, Record<string, any>[]>>>;
  enterpriseJoins: Join[];
  setEnterpriseJoins: React.Dispatch<React.SetStateAction<Join[]>>;
  enterpriseCardPositions: Record<string, Point>;
  setEnterpriseCardPositions: React.Dispatch<React.SetStateAction<Record<string, Point>>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Singleton services that persist for the entire app lifecycle
const llmProvider = new GeminiProvider();
const demoHandler = new DemoDataHandler();
const analyzeHandler = new FileDataHandler('analyze');
const engineerHandler = new FileDataHandler('engineer');
const enterpriseHandler = new EnterpriseDataHandler();

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Demo State
  const [demoConversation, setDemoConversation] = useState<ConversationTurn[]>([]);
  const [demoHistory, setDemoHistory] = useState<{ role: string, content: string }[]>([]);
  
  // Analyze Page State
  const [analyzeConversation, setAnalyzeConversation] = useState<ConversationTurn[]>([]);
  const [analyzeHistory, setAnalyzeHistory] = useState<{ role: string, content: string }[]>([]);
  const [analyzeFile, setAnalyzeFile] = useState<File | null>(null);
  const [analyzeSchemas, setAnalyzeSchemas] = useState<TableSchema | null>(null);
  const [analyzePreviewData, setAnalyzePreviewData] = useState<Record<string, any>[] | null>(null);
  const [analyzeIsSampled, setAnalyzeIsSampled] = useState(false);

  // Engineer Page State
  const [engineerConversation, setEngineerConversation] = useState<ConversationTurn[]>([]);
  const [engineerHistory, setEngineerHistory] = useState<{ role: string, content: string }[]>([]);
  const [engineerFiles, setEngineerFiles] = useState<File[]>([]);
  const [engineerSchemas, setEngineerSchemas] = useState<TableSchema | null>(null);
  const [engineerPreviewData, setEngineerPreviewData] = useState<Record<string, Record<string, any>[]>>({});
  const [engineerTableNameMap, setEngineerTableNameMap] = useState<Record<string, string>>({});
  const [engineerJoins, setEngineerJoins] = useState<Join[]>([]);
  const [engineerCardPositions, setEngineerCardPositions] = useState<Record<string, Point>>({});

  // Enterprise Page State
  const [enterpriseConversation, setEnterpriseConversation] = useState<ConversationTurn[]>([]);
  const [enterpriseHistory, setEnterpriseHistory] = useState<{ role: string, content: string }[]>([]);
  const [enterpriseIsConnected, setEnterpriseIsConnected] = useState(false);
  const [enterpriseSchemas, setEnterpriseSchemas] = useState<TableSchema | null>(null);
  const [enterprisePreviewData, setEnterprisePreviewData] = useState<Record<string, Record<string, any>[]>>({});
  const [enterpriseJoins, setEnterpriseJoins] = useState<Join[]>([]);
  const [enterpriseCardPositions, setEnterpriseCardPositions] = useState<Record<string, Point>>({});

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
    
    // Demo
    demoConversation, setDemoConversation, demoHistory, setDemoHistory,

    // Analyze
    analyzeConversation, setAnalyzeConversation, analyzeHistory, setAnalyzeHistory,
    analyzeFile, setAnalyzeFile, analyzeSchemas, setAnalyzeSchemas,
    analyzePreviewData, setAnalyzePreviewData, analyzeIsSampled, setAnalyzeIsSampled,

    // Engineer
    engineerConversation, setEngineerConversation, engineerHistory, setEngineerHistory,
    engineerFiles, setEngineerFiles, engineerSchemas, setEngineerSchemas,
    engineerPreviewData, setEngineerPreviewData, engineerTableNameMap, setEngineerTableNameMap,
    engineerJoins, setEngineerJoins, engineerCardPositions, setEngineerCardPositions,

    // Enterprise
    enterpriseConversation, setEnterpriseConversation, enterpriseHistory, setEnterpriseHistory,
    enterpriseIsConnected, setEnterpriseIsConnected, enterpriseSchemas, setEnterpriseSchemas,
    enterprisePreviewData, setEnterprisePreviewData, enterpriseJoins, setEnterpriseJoins,
    enterpriseCardPositions, setEnterpriseCardPositions,
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
