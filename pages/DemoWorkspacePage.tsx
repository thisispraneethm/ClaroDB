
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ResultsDisplay from '../components/ResultsDisplay';
import SQLApproval from '../components/SQLApproval';
import { TableSchema, ConversationTurn } from '../types';
import { Loader2, AlertTriangle, Bot } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { useAnalysis } from '../hooks/useAnalysis';
import ChatInput from '../components/ChatInput';
import WelcomeMessage from '../components/WelcomeMessage';

const DemoWorkspacePage: React.FC = () => {
  const { demoHandler: handler, llmProvider } = useAppContext();
  const [schemas, setSchemas] = useState<TableSchema | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [question, setQuestion] = useState('');

  // The Demo workspace manages its own conversation state
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);

  const {
    askQuestion,
    executeApprovedSql,
    isProcessing,
    generateInsightsForTurn,
    generateChartForTurn,
  } = useAnalysis({
      handler,
      llmProvider,
      conversation,
      setConversation,
  });

  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
  }, [conversation, isProcessing]);

  const initialize = useCallback(async () => {
    setIsInitializing(true);
    setInitError(null);
    try {
      await handler.connect();
      const s = await handler.getSchemas();
      setSchemas(s);
    } catch (e: any) {
      setInitError(`Initialization failed: ${e.message}`);
    } finally {
      setIsInitializing(false);
    }
  }, [handler]);

  useEffect(() => {
    initialize();
    // Demo handler is a singleton, so no terminate on unmount.
  }, [initialize]);

  const handleSend = () => {
    if (!question.trim() || !schemas) return;
    askQuestion(question, schemas);
    setQuestion('');
  };

  const renderTurn = (turn: ConversationTurn) => {
    switch (turn.state) {
      case 'sql_generating':
      case 'executing':
        return (
          <div className="flex items-center mt-2">
            <Loader2 className="animate-spin text-primary" size={24} />
            <span className="ml-3 text-text-secondary">
              {turn.state === 'sql_generating' ? 'Generating SQL...' : 'Executing query...'}
            </span>
          </div>
        );
      case 'sql_ready':
        return turn.sqlResult ? (
          <SQLApproval
            sqlResult={turn.sqlResult}
            onExecute={() => executeApprovedSql(turn.id)}
          />
        ) : null;
      case 'complete':
        return turn.analysisResult ? (
          <ResultsDisplay
            turn={turn}
            onGenerateInsights={generateInsightsForTurn}
            onGenerateChart={generateChartForTurn}
          />
        ) : null;
      case 'error':
        return (
          <div className="flex items-center text-danger bg-danger/10 p-4 rounded-lg">
            <AlertTriangle size={20} className="mr-3" /> {turn.error}
          </div>
        );
      default:
        return null;
    }
  };

  if (isInitializing) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="animate-spin text-primary" size={32} />
        <span className="ml-4 text-text-secondary">Setting up demo workspace...</span>
      </div>
    );
  }

  if (initError && !schemas) {
    return (
      <div className="flex justify-center items-center h-full p-4">
        <div className="flex items-center text-danger bg-danger/10 p-4 rounded-lg">
          <AlertTriangle size={20} className="mr-3" /> {initError}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-8">
        <WelcomeMessage
          title="🚀 Demo Workspace"
          description="This workspace is pre-loaded with a sample sales dataset. Ask a question to get started!"
          schemas={schemas}
        />
        
        {conversation.map((turn) => (
          <React.Fragment key={turn.id}>
            <div className="flex justify-end max-w-4xl mx-auto">
              <div className="bg-primary text-primary-foreground rounded-lg p-3 max-w-2xl shadow-card">
                <p>{turn.question}</p>
              </div>
            </div>
            <div className="flex items-start space-x-4 max-w-4xl mx-auto">
              <div className="bg-card p-2 rounded-full flex-shrink-0 border border-border">
                <Bot size={20} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                {renderTurn(turn)}
              </div>
            </div>
          </React.Fragment>
        ))}

      </div>

      <div className="flex-shrink-0">
        <ChatInput
          value={question}
          onChange={setQuestion}
          onSend={handleSend}
          isLoading={isProcessing}
          placeholder="e.g., What are the total sales per product category?"
        />
      </div>
    </div>
  );
};

export default DemoWorkspacePage;
