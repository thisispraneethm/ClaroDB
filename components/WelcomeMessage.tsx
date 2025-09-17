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
        <div className="bg-primary/10 p-3 rounded-full flex-shrink-0 mt-1 shadow-sm">
          <Sparkles size={28} className="text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-text">{title}</h1>
          <p className="text-text-secondary mt-1 text-base">{description}</p>
        </div>
      </div>
      <div className="space-y-8 mt-8">
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
                  className="text-left p-4 bg-card/80 border border-white/20 rounded-lg transition-all duration-200 text-sm text-text active:scale-[0.98] shadow-card hover:shadow-card-hover hover:border-white/30 hover:-translate-y-0.5"
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