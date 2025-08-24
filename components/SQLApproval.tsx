import React, { useState } from 'react';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { sql } from 'react-syntax-highlighter/dist/esm/languages/hljs';
import { atomOneLight } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { SQLGenerationResult } from '../types';
import { Copy, Check, AlertTriangle } from 'lucide-react';

interface SQLApprovalProps {
  sqlResult: SQLGenerationResult;
  onExecute: () => void;
}

const SQLApproval: React.FC<SQLApprovalProps> = ({ sqlResult, onExecute }) => {
  const [copied, setCopied] = useState(false);

  const copySqlToClipboard = () => {
    if (sqlResult?.sql) {
      navigator.clipboard.writeText(sqlResult.sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const totalTokens = (sqlResult.prompt_tokens || 0) + (sqlResult.completion_tokens || 0);

  return (
    <div className="bg-card/70 backdrop-blur-lg border border-white/40 rounded-xl shadow-card overflow-hidden">
      <div className="p-4 md:p-6 space-y-4">
        <div className="bg-background rounded-md border border-border">
          <div className="px-4 py-2 flex justify-between items-center border-b border-border flex-wrap gap-2">
            <h3 className="text-sm font-semibold text-text">Generated SQL</h3>
            <div className="text-right text-xs text-text-secondary space-x-3 flex items-center">
              <span>Model: <b className="text-text">{sqlResult.model}</b></span>
              <span>Tokens: <b className="text-text">{totalTokens.toLocaleString()}</b></span>
              <span>Cost: <b className="text-text">${sqlResult.cost.toFixed(6)}</b></span>
              <button onClick={copySqlToClipboard} className="text-xs flex items-center text-text-secondary hover:text-primary transition-colors">
                {copied ? <span className="text-success flex items-center"><Check size={14} className="mr-1" /> Copied!</span> : <><Copy size={12} className="mr-1" /> Copy</>}
              </button>
            </div>
          </div>
          <SyntaxHighlighter language="sql" style={atomOneLight} customStyle={{ background: 'transparent', padding: '1rem', margin: 0, fontSize: '0.8rem' }} wrapLines={true}>
            {sqlResult.sql}
          </SyntaxHighlighter>
        </div>
        <div className="flex items-start bg-info-background border border-info-border text-info-text p-3 rounded-md">
            <AlertTriangle size={20} className="mr-3 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
                <p><strong>Review the SQL.</strong> This query will be run against the data. Ensure it matches your intent before proceeding.</p>
            </div>
        </div>
      </div>
      <div className="p-4 bg-background/50 border-t border-border flex justify-end">
        <button
          onClick={onExecute}
          className="px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-md hover:bg-primary-hover flex items-center transition-colors"
        >
          <Check size={16} className="mr-2" />
          Run Query
        </button>
      </div>
    </div>
  );
};

export default SQLApproval;
