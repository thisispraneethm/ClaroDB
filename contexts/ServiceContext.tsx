import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { GeminiProvider } from '../services/llm/geminiProvider';
import { LLMProvider } from '../services/llm/base';
import { DemoDataHandler } from '../services/handlers/demoHandler';
import { FileDataHandler } from '../services/handlers/fileHandler';
import { EnterpriseDataHandler } from '../services/handlers/enterpriseHandler';

interface ServiceContextType {
  llmProvider: LLMProvider;
  demoHandler: DemoDataHandler;
  analyzeHandler: FileDataHandler;
  engineerHandler: FileDataHandler;
  enterpriseHandler: EnterpriseDataHandler;
  isInitialized: boolean;
}

const ServiceContext = createContext<ServiceContextType | undefined>(undefined);

// Singleton services that persist for the entire app lifecycle
const llmProvider = new GeminiProvider();
const demoHandler = new DemoDataHandler();
const analyzeHandler = new FileDataHandler('analyze');
const engineerHandler = new FileDataHandler('engineer');
const enterpriseHandler = new EnterpriseDataHandler();

export const ServiceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);

  // Centralized initialization for all data handlers. This runs once per application
  // lifecycle, ensuring all database connections are established reliably.
  useEffect(() => {
    const initializeHandlers = async () => {
      try {
        await Promise.all([
          demoHandler.connect(),
          analyzeHandler.connect(),
          engineerHandler.connect(),
          enterpriseHandler.connect()
        ]);
        setIsInitialized(true);
        console.log("All data handlers initialized successfully.");
      } catch (error) {
        console.error("Failed to initialize one or more data handlers:", error);
      }
    };

    if (!isInitialized) {
      initializeHandlers();
    }
  }, [isInitialized]);

  const value = {
    llmProvider,
    demoHandler,
    analyzeHandler,
    engineerHandler,
    enterpriseHandler,
    isInitialized,
  };

  return <ServiceContext.Provider value={value}>{children}</ServiceContext.Provider>;
};

export const useServiceContext = (): ServiceContextType => {
  const context = useContext(ServiceContext);
  if (context === undefined) {
    throw new Error('useServiceContext must be used within a ServiceProvider');
  }
  return context;
};
