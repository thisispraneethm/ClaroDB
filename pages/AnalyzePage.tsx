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
    setAnalyzeIsSampled: setIsSampled
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
      setFile(null);
    } finally {
      setIsProcessingFile(false);
    }
  };
  
  const handleApplySampling = async (method: 'random' | 'stratified', size: number, column?: string) => {
    const tableName = 'file_data';
    setIsProcessingFile(true);
    try {
        const wasSampled = await handler.applySampling(tableName, method, size, column);
        await refreshDataViews(tableName);
        setIsSampled(wasSampled);
    } catch (e: any) {
        setPageError(`Sampling failed: ${e.message}`);
    } finally {
        setIsProcessingFile(false);
    }
  }

  const handleSend = () => {
    if (!question.trim() || !schemas) return;
    askQuestion(question, schemas);
    setQuestion('');
  };
  
  const renderContent = () => {
    if (!file && !isProcessingFile) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center">
            {pageError ? (
                <div className="w-full max-w-lg">
                    <Container>
                        <div className="flex items-start text-danger bg-danger/10 p-4 rounded-lg border border-danger/20">
                            <AlertTriangle size={20} className="mr-3 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-semibold">File Processing Error</h4>
                                <p className="text-sm mt-1">{pageError}</p>
                            </div>
                        </div>
                    </Container>
                </div>
            ) : (
                <Container className="w-full max-w-lg">
                    <EmptyState
                        icon={<FileUp size={24} className="text-primary" />}
                        title="Upload a file to get started"
                        description="Begin your analysis by providing a single CSV, JSON, or TXT file."
                    >
                        <div className="max-w-md mx-auto">
                        <FileUpload file={file} onFilesChange={handleFileChange} disabled={isProcessingFile} />
                        </div>
                    </EmptyState>
                </Container>
            )}
        </div>
      );
    }
    
    return (
        <div className="space-y-6">
            <Container title="1. Upload Data">
                <FileUpload file={file} onFilesChange={handleFileChange} disabled={isProcessingFile || isAnalysisLoading} />
            </Container>

            {isProcessingFile && <div className="flex justify-center items-center"><Loader2 className="animate-spin text-primary" size={24} /><span className="ml-2 text-text-secondary">Processing file...</span></div>}
            
            {schemas && previewData && (
              <>
                <DataSampling 
                  schemas={schemas}
                  onApplySampling={handleApplySampling}
                  disabled={isProcessingFile || isAnalysisLoading}
                />
                {isSampled && (
                    <div className="flex items-center text-info-text bg-info-background p-3 rounded-lg border border-info-border">
                        <Layers size={20} className="mr-3 flex-shrink-0" />
                        <p className="text-sm font-medium">You are now working with a sampled subset of your original data.</p>
                    </div>
                )}
                <Container title="2. Review Data"><DataPreview data={previewData} /></Container>
              </>
            )}
          
          {analyzeConversation.length > 0 && (
            <div className="space-y-8 pt-6 border-t border-border">
              {analyzeConversation.map((turn) => (
                <React.Fragment key={turn.id}>
                  <div className="flex items-start justify-end group">
                    <div className="bg-primary text-primary-foreground rounded-xl rounded-br-none p-4 max-w-2xl shadow-md"><p>{turn.question}</p></div>
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center ml-3 flex-shrink-0"><User size={20} /></div>
                  </div>
                  <div className="flex items-start group">
                    <div className="w-10 h-10 rounded-full bg-secondary-background text-primary border border-border flex items-center justify-center mr-3 flex-shrink-0"><Bot size={20} /></div>
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
          )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-transparent">
      <div className="p-4 sm:p-6 lg:p-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <h1 className="text-2xl font-bold text-text">Analyze File</h1>
        <p className="text-text-secondary">Upload a single CSV, JSON, or TXT file to begin your analysis.</p>
      </div>
      <div className="flex-1 overflow-y-auto" ref={chatContainerRef}>
        <div className="p-4 sm:p-6 lg:p-10 max-w-5xl mx-auto">
          {renderContent()}
        </div>
      </div>

      <div className="flex-shrink-0">
        <ChatInput
          value={question}
          onChange={setQuestion}
          onSend={handleSend}
          isLoading={isAnalysisLoading}
          placeholder={file ? "Ask a question about your data..." : "Please upload a file to begin"}
          disabled={!file || isProcessingFile || isAnalysisLoading}
        />
      </div>
    </div>
  );
};

export default AnalyzePage;
