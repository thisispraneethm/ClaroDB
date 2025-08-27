import React from 'react';
import { Sparkles } from 'lucide-react';
import Container from './Container';
import SchemaDisplay from './SchemaDisplay';
import { TableSchema } from '../types';

interface WelcomeMessageProps {
  title: string;
  description: string;
  schemas: TableSchema | null;
  caption?: string;
  tableNameMap?: Record<string, string>;
  exampleQueries?: { text: string, onSelect: (query: string) => void }[];
}

const WelcomeMessage: React.FC<WelcomeMessageProps> = ({ title, description, schemas, caption, tableNameMap, exampleQueries }) => {
  return (
    <div className="animate-fade-in-up">
      <div className="flex items-start space-x-4">
        <div className="bg-primary/10 p-2.5 rounded-full flex-shrink-0 mt-1 shadow-sm">
          <Sparkles size={24} className="text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-text">{title}</h1>
          <p className="text-text-secondary mt-1">{description}</p>
        </div>
      </div>
      <div className="space-y-6 mt-6">
        {schemas && (
          <Container title="Data Model" caption={caption || "Here are the tables you can query."}>
            <SchemaDisplay schemas={schemas} tableNameMap={tableNameMap} />
          </Container>
        )}
        {exampleQueries && exampleQueries.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3 px-1">Try these examples:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {exampleQueries.map(ex => (
                <button
                  key={ex.text}
                  onClick={() => ex.onSelect(ex.text)}
                  className="text-left p-3.5 bg-card border border-border rounded-lg hover:bg-secondary-background hover:border-primary/50 transition-all duration-200 text-sm text-text hover:scale-[1.02] active:scale-[0.98] shadow-card"
                >
                  "{ex.text}"
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WelcomeMessage;