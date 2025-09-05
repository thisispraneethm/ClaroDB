import React, { ReactNode } from 'react';
import { ServiceProvider } from './ServiceContext';
import { DemoProvider } from './DemoContext';
import { AnalyzeProvider } from './AnalyzeContext';
import { EngineerProvider } from './EngineerContext';
import { EnterpriseProvider } from './EnterpriseContext';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <ServiceProvider>
      <DemoProvider>
        <AnalyzeProvider>
          <EngineerProvider>
            <EnterpriseProvider>
              {children}
            </EnterpriseProvider>
          </EngineerProvider>
        </AnalyzeProvider>
      </DemoProvider>
    </ServiceProvider>
  );
};