import React, { useState, useEffect, useRef } from 'react';
import Container from '../components/Container';
import FileUpload from '../components/FileUpload';
import { TableSchema } from '../types';
import { Loader2, AlertTriangle, Bot, Layers, FileUp, User } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { useAnalysis } from '../hooks/useAnalysis';
import ChatInput from '../components/ChatInput';
import DataPreview from '../components/DataPreview';
import DataSampling from '../components/DataSampling';
import ConversationTurnDisplay from '../components/ConversationTurnDisplay';
import EmptyState from '../components/EmptyState';
import WelcomeMessage from '../components/WelcomeMessage';

const AnalyzePage: React.FC = () => {
  const { 
    llmProvider, 
    analyzeHandler: handler, 
    analyzeConversation, 
    setAnalyzeConversation,
    analyzeHistory,
    setAnalyzeHistory,
    analyzeFile: file,
    setAnalyzeFile: setFile,
    analyzeSchemas: schemas,
    setAnalyzeSchemas: setSchemas,
    analyzePreviewData: previewData,
    setAnalyzePreviewData: setPreviewData,
    analyzeIsSampled: isSampled,
    setAnalyzeIsSampled: setIsSampled,
  } = useAppContext();

  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [question, setQuestion] = useState('');

  const {
    askQuestion,
    executeApprovedSql,
    isProcessing: isAnalysisLoading,
    resetConversation,
    generateInsightsForTurn,
    generateChartForTurn,
  } = useAnalysis({
      handler,
      llmProvider,
      conversation: analyzeConversation,
      setConversation: setAnalyzeConversation,
      history: analyzeHistory,
      setHistory: setAnalyzeHistory
  });

  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
  }, [analyzeConversation, isAnalysisLoading]);

  const refreshDataViews = async (tableName: string) => {
      const preview = await handler.getPreview(tableName, 10);
      setPreviewData(preview);
  }

  const handleFileChange = async (selectedFiles: File[]) => {
    const selectedFile = selectedFiles[0] || null;
    
    // Reset state before processing new file or clearing
    setFile(selectedFile);
    resetConversation();
    setSchemas(null);
    setPageError(null);
    setPreviewData(null);
    setIsSampled(false);

    if (!selectedFile) {
      await handler.loadFiles([]);
      return;
    }

    setIsProcessingFile(true);
    try {
      const tableName = 'file_data';
      await handler.loadFiles([{ name: tableName, file: selectedFile }]);
      const s = await handler.getSchemas();
      setSchemas(s);
      await refreshDataViews(tableName);
    } catch (e: any) {
      setPageError(`File processing failed: ${e.message}`);
      setSchemas(null);
      setFile(null); // Go back to home screen on error
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleApplySampling = async (method: 'random' | 'stratified', size: number, column?: string) => {
      if (!file) return;
      const tableName = 'file_data';
      try {
          const wasSampled = await handler.applySampling(tableName, method, size, column);
          setIsSampled(wasSampled);
          await refreshDataViews(tableName);
      } catch (e: any)          {
          setPageError(`Sampling failed: ${e.message}`);
      }
  };

  const handleSend = () => {
    if (!question.trim() || !schemas) return;
    askQuestion(question, schemas);
    setQuestion('');
  };

  const handleExampleQuery = (query: string) => {
    setQuestion(query);
  };

  // Render home page view if no file is selected
  if (!file) {
      return (
          <div className="h-full overflow-y-auto p-6 md:p-8 lg:p-10 flex items-center justify-center animate-fade-in-up">
              <div className="max-w-xl w-full">
                  <Container>
                      <EmptyState
                          icon={<FileUp size={24} className="text-primary" />}
                          title="Analyze a Single File"
                          description="Upload a CSV, JSON, or TXT file to start an interactive conversation with your data."
                      >
                          <FileUpload 
                              file={null} 
                              onFilesChange={handleFileChange} 
                              disabled={isProcessingFile}
                          />
                      </EmptyState>
                  </Container>
              </div>
          </div>
      );
  }

  // Render workspace view
  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        <aside className="w-[450px] flex-shrink-0 bg-secondary-background/50 border-r border-border p-4 space-y-4 overflow-y-auto">
          <Container title="1. Data Source">
            <FileUpload file={file} onFilesChange={handleFileChange} disabled={isProcessingFile || isAnalysisLoading} />
          </Container>

          {isProcessingFile && (
            <div className="flex justify-center items-center p-4">
              <Loader2 className="animate-spin text-primary" size={24} />
              <span className="ml-2 text-text-secondary">Processing file...</span>
            </div>
          )}

          {pageError && (
            <div className="flex items-start text-danger bg-danger/10 p-3 rounded-lg border border-danger/20">
              <AlertTriangle size={20} className="mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm">Error</h4>
                <p className="text-xs mt-1">{pageError}</p>
              </div>
            </div>
          )}

          {schemas && !isProcessingFile && (
              <>
                <DataSampling 
                    schemas={schemas}
                    onApplySampling={handleApplySampling}
                    disabled={isProcessingFile || isAnalysisLoading}
                />
                {previewData && (
                    <Container title="3. Data Preview">
                    <DataPreview data={previewData} />
                    </Container>
                )}
              </>
          )}
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden">
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10">
            <div className="max-w-4xl mx-auto space-y-8">
              {schemas && !isProcessingFile && analyzeConversation.length === 0 && (
                <WelcomeMessage
                  title="Your Data is Ready"
                  description="The file has been processed. Now you can ask questions about its content."
                  schemas={schemas}
                  caption={isSampled ? 'Showing schema for the sampled dataset.' : 'Showing schema for the full dataset.'}
                  exampleQueries={[
                    { text: "Give me a summary of this data", onSelect: handleExampleQuery },
                    { text: "What are the key columns in this file?", onSelect: handleExampleQuery },
                    { text: "Are there any outliers or interesting patterns?", onSelect: handleExampleQuery },
                  ]}
                />
              )}

              {analyzeConversation.map((turn) => (
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
        </main>
      </div>
      <div className="flex-shrink-0">
        <ChatInput
          value={question}
          onChange={setQuestion}
          onSend={handleSend}
          isLoading={isAnalysisLoading}
          placeholder={file ? "Ask a question about your data..." : "Upload a file to begin"}
          disabled={!file || isProcessingFile || isAnalysisLoading}
        />
      </div>
    </div>
  );
};

export default AnalyzePage;