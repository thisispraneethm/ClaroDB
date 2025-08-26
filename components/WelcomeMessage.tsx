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
    <div className="flex items-start space-x-4 max-w-4xl mx-auto">
      <div className="bg-primary/10 p-2 rounded-full flex-shrink-0 mt-1">
        <Sparkles size={24} className="text-primary" />
      </div>
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-text">{title}</h1>
        <p className="text-text-secondary mt-1">{description}</p>
        {schemas && (
          <div className="mt-6">
            <Container title="Data Model" caption={caption || "Here are the tables you can query."}>
              <SchemaDisplay schemas={schemas} tableNameMap={tableNameMap} />
            </Container>
          </div>
        )}
        {exampleQueries && exampleQueries.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Try these examples:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {exampleQueries.map(ex => (
                <button
                  key={ex.text}
                  onClick={() => ex.onSelect(ex.text)}
                  className="text-left p-3 bg-card border border-border rounded-lg hover:bg-secondary-background hover:border-primary/50 transition-all text-sm text-text"
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
