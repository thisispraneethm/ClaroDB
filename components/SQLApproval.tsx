
import React, { useState, useEffect, useRef } from 'react';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { sql } from 'react-syntax-highlighter/dist/esm/languages/hljs';
import { atomOneLight } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { SQLGenerationResult } from '../types';
import { Copy, Check, AlertTriangle, Pencil, BrainCircuit } from 'lucide-react';

interface SQLApprovalProps {
  sqlResult: SQLGenerationResult;
  onExecute: (sql: string) => void;
}

const SQLApproval: React.FC<SQLApprovalProps> = ({ sqlResult, onExecute }) => {
  const [editedSql, setEditedSql] = useState(sqlResult.sql);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
      setEditedSql(sqlResult.sql);
  }, [sqlResult.sql]);

  useEffect(() => {
    if (isEditing && textAreaRef.current) {
        textAreaRef.current.focus();
        // Auto-adjust height
        textAreaRef.current.style.height = 'inherit';
        textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
    }
  }, [isEditing, editedSql]);

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(editedSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isCorrected = sqlResult.sql.trim() !== editedSql.trim();
  const totalTokens = (sqlResult.prompt_tokens || 0) + (sqlResult.completion_tokens || 0);

  return (
    <div className="bg-card/70 backdrop-blur-lg border border-white/40 rounded-xl shadow-card overflow-hidden">
      <div className="p-4 md:p-6 space-y-4">
        <div className="bg-background rounded-md border border-border">
          <div className="px-4 py-2 flex justify-between items-center border-b border-border flex-wrap gap-2">
            <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-text">Generated SQL</h3>
                <button 
                  onClick={() => setIsEditing(!isEditing)} 
                  className={`text-xs flex items-center p-1 rounded-md transition-colors ${isEditing ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-black/5'}`}
                >
                    <Pencil size={12} className="mr-1" /> {isEditing ? 'Done Editing' : 'Edit'}
                </button>
            </div>
            <div className="text-right text-xs text-text-secondary space-x-3 flex items-center">
              <button onClick={copySqlToClipboard} className="text-xs flex items-center text-text-secondary hover:text-primary transition-colors">
                {copied ? <span className="text-success flex items-center"><Check size={14} className="mr-1" /> Copied!</span> : <><Copy size={12} className="mr-1" /> Copy</>}
              </button>
            </div>
          </div>
          {isEditing ? (
              <textarea
                ref={textAreaRef}
                value={editedSql}
                onChange={(e) => setEditedSql(e.target.value)}
                className="w-full p-4 font-mono text-sm bg-transparent focus:outline-none resize-none overflow-hidden"
                rows={Math.max(5, editedSql.split('\n').length)}
              />
          ) : (
            <SyntaxHighlighter language="sql" style={atomOneLight} customStyle={{ background: 'transparent', padding: '1rem', margin: 0, fontSize: '0.8rem' }} wrapLines={true}>
              {editedSql}
            </SyntaxHighlighter>
          )}
        </div>
        
        {isCorrected && (
             <div className="flex items-start bg-primary/10 border border-primary/20 text-primary p-3 rounded-md">
                <BrainCircuit size={20} className="mr-3 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                    <p><strong>Your correction will be saved.</strong> The system will use this feedback to improve future SQL generations.</p>
                </div>
            </div>
        )}

        <div className="flex items-start bg-info-background border border-info-border text-info-text p-3 rounded-md">
            <AlertTriangle size={20} className="mr-3 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
                <p><strong>Review the SQL.</strong> This query will be run against the data. Ensure it matches your intent before proceeding.</p>
            </div>
        </div>
      </div>
      <div className="p-4 bg-background/50 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
         <div className="text-right text-xs text-text-secondary space-x-3 flex items-center">
              <span>Model: <b className="text-text">{sqlResult.model}</b></span>
              <span>Tokens: <b className="text-text">{totalTokens.toLocaleString()}</b></span>
              <span>Cost: <b className="text-text">${sqlResult.cost.toFixed(6)}</b></span>
        </div>
        <button
          onClick={() => onExecute(editedSql)}
          className="px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-md hover:bg-primary-hover flex items-center justify-center transition-colors"
        >
          <Check size={16} className="mr-2" />
          {isCorrected ? 'Run Corrected Query' : 'Run Query'}
        </button>
      </div>
    </div>
  );
};

export default SQLApproval;
