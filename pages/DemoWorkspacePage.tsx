import React, { useState, useEffect, useRef } from 'react';
import { TableSchema } from '../types';
import { Loader2, User, Bot } from 'lucide-react';
import { useDemoContext } from '../contexts/DemoContext';
import { useServiceContext } from '../contexts/ServiceContext';
import { useAnalysis } from '../hooks/useAnalysis';
import ChatInput from '../components/ChatInput';
import WelcomeMessage from '../components/WelcomeMessage';
import ConversationTurnDisplay from '../components/ConversationTurnDisplay';

const DemoWorkspacePage: React.FC = () => {
  const { 
    demoHandler: handler, 
    llmProvider, 
    isInitialized,
  } = useServiceContext();

  const {
    conversation, 
    setConversation,
    chatSession,
    setChatSession
  } = useDemoContext();

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
      conversation,
      setConversation,
      chatSession,
      setChatSession,
  });

  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
  }, [conversation, isProcessing]);

  useEffect(() => {
    if (isInitialized) {
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
    }
  }, [isInitialized, handler]);

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
    <div className="flex flex-col h-full bg-transparent">
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10">
        <div className="max-w-4xl mx-auto space-y-8">
          {isLoadingSchema ? (
              <div className="flex justify-center items-center h-full">
                  <Loader2 className="animate-spin text-primary" size={32} />
                  <span className="ml-4 text-text-secondary">Loading demo workspace...</span>
              </div>
          ) : (
              conversation.length === 0 && (
                  <WelcomeMessage
                    title="🚀 Demo Workspace"
                    description="This workspace is pre-loaded with a sample sales dataset. Ask a question or click an example to get started!"
                    schemas={schemas}
                    exampleQueries={exampleQueries}
                  />
              )
          )}
          
          {conversation.map((turn) => (
            <React.Fragment key={turn.id}>
              <div className="flex items-start justify-end group animate-fade-in-up">
                <div className="bg-primary text-primary-foreground rounded-xl rounded-br-none p-4 max-w-2xl shadow-md">
                  <p>{turn.question}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center ml-3 flex-shrink-0">
                  <User size={20} />
                </div>
              </div>
              <div className="flex items-start group animate-fade-in-up">
                <div className="w-10 h-10 rounded-full bg-secondary-background text-primary border border-border flex items-center justify-center mr-3 flex-shrink-0">
                  <Bot size={20} />
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
