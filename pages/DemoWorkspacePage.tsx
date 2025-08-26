import React, { useState, useEffect, useRef } from 'react';
import { TableSchema } from '../types';
import { Loader2, Bot } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { useAnalysis } from '../hooks/useAnalysis';
import ChatInput from '../components/ChatInput';
import WelcomeMessage from '../components/WelcomeMessage';
import ConversationTurnDisplay from '../components/ConversationTurnDisplay';

const DemoWorkspacePage: React.FC = () => {
  const { 
    demoHandler: handler, 
    llmProvider, 
    demoConversation, 
    setDemoConversation,
    demoHistory,
    setDemoHistory
  } = useAppContext();

  const [schemas, setSchemas] = useState<TableSchema | null>(null);
  const [isLoadingSchema, setIsLoadingSchema] = useState(true);
  const [question, setQuestion] = useState('');

  const {
    askQuestion,
    executeApprovedSql,
    isProcessing,
    generateInsightsForTurn,
    generateChartForTurn,
  } = useAnalysis({
      handler,
      llmProvider,
      conversation: demoConversation,
      setConversation: setDemoConversation,
      history: demoHistory,
      setHistory: setDemoHistory
  });

  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
  }, [demoConversation, isProcessing]);

  useEffect(() => {
    const fetchSchema = async () => {
      setIsLoadingSchema(true);
      try {
        const s = await handler.getSchemas();
        setSchemas(s);
      } catch (e) {
        console.error("Failed to fetch demo schema", e);
      } finally {
        setIsLoadingSchema(false);
      }
    };
    fetchSchema();
  }, [handler]);

  const handleExampleQuery = (query: string) => {
    setQuestion(query);
  };

  const exampleQueries = [
    { text: "What are the total sales per region?", onSelect: handleExampleQuery },
    { text: "Which product category generated the most revenue?", onSelect: handleExampleQuery },
    { text: "Show the top 5 products by sales amount.", onSelect: handleExampleQuery },
  ];

  const handleSend = () => {
    if (!question.trim() || !schemas) return;
    askQuestion(question, schemas);
    setQuestion('');
  };

  return (
    <div className="flex flex-col h-full bg-secondary-background">
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10 space-y-8">
        {isLoadingSchema ? (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="animate-spin text-primary" size={32} />
                <span className="ml-4 text-text-secondary">Loading demo schema...</span>
            </div>
        ) : (
            demoConversation.length === 0 && (
                <WelcomeMessage
                  title="🚀 Demo Workspace"
                  description="This workspace is pre-loaded with a sample sales dataset. Ask a question or click an example to get started!"
                  schemas={schemas}
                  exampleQueries={exampleQueries}
                />
            )
        )}
        
        {demoConversation.map((turn) => (
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
                <ConversationTurnDisplay
                    turn={turn}
                    onExecute={executeApprovedSql}
                    onGenerateInsights={generateInsightsForTurn}
                    onGenerateChart={generateChartForTurn}
                />
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
