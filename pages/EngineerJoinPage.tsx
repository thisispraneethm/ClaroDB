
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Container from '../components/Container';
import { TableSchema, ConversationTurn, Join } from '../types';
import { Loader2, AlertTriangle, Bot, X, Layers } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { useAnalysis } from '../hooks/useAnalysis';
import ChatInput from '../components/ChatInput';
import ResultsDisplay from '../components/ResultsDisplay';
import SQLApproval from '../components/SQLApproval';
import MultiFileUpload from '../components/MultiFileUpload';
import { v4 as uuidv4 } from 'uuid';
import DataPreview from '../components/DataPreview';
import JoinBuilder from '../components/JoinBuilder';
import DataSampling from '../components/DataSampling';

const EngineerJoinPage: React.FC = () => {
  const { llmProvider, engineerHandler: handler, engineerConversation, setEngineerConversation } = useAppContext();
  
  const [files, setFiles] = useState<File[]>([]);
  const [schemas, setSchemas] = useState<TableSchema | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, Record<string, any>[]>>({});
  const [tableNameMap, setTableNameMap] = useState<Record<string, string>>({});
  const [joins, setJoins] = useState<Join[]>([]);
  const [sampledTables, setSampledTables] = useState<Set<string>>(new Set());
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
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
      conversation: engineerConversation,
      setConversation: setEngineerConversation
  });

  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
  }, [engineerConversation, isAnalysisLoading]);

  useEffect(() => {
    const initializeHandler = async () => {
      try {
        await handler.connect();
        setIsInitialized(true);
      } catch (e: any) {
        setPageError(e.message);
      }
    };
    initializeHandler();
    // Handler is a singleton, so no terminate on unmount.
  }, [handler]);

  const sanitizeTableName = (filename: string) => {
      let sanitized = filename.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_]/g, '_');
      if (/^\d/.test(sanitized)) {
          sanitized = `_${sanitized}`;
      }
      return sanitized || 'unnamed_table';
  }

  const handleFilesChange = useCallback(async (newFiles: File[]) => {
    setFiles(newFiles);
    setSchemas(null);
    setPreviewData({});
    setTableNameMap({});
    setJoins([]);
    setSampledTables(new Set());
    resetConversation();

    if (newFiles.length === 0) {
        await handler.loadFiles([]);
        return;
    }

    setIsProcessing(true);
    setPageError(null);
    try {
        const nameCounts: Record<string, number> = {};
        const sources = newFiles.map(file => {
            const baseName = sanitizeTableName(file.name);
            let finalName = baseName;
            let i = 1;
            while (Object.prototype.hasOwnProperty.call(nameCounts, finalName)) {
                finalName = `${baseName}_${i++}`;
            }
            nameCounts[finalName] = 1;
            return { name: finalName, file };
        });

        const newTableNameMap = sources.reduce((acc, source) => ({ ...acc, [source.name]: source.file.name }), {});
        setTableNameMap(newTableNameMap);

        await handler.loadFiles(sources);
        const s = await handler.getSchemas();
        setSchemas(s);
        
        const newPreviewData: Record<string, Record<string, any>[]> = {};
        for(const tableName of Object.keys(s)) {
            newPreviewData[tableName] = await handler.getPreview(tableName, 5);
        }
        setPreviewData(newPreviewData);

    } catch (e: any) {
        setPageError(`File processing failed: ${e.message}`);
        setSchemas(null);
        setTableNameMap({});
        setPreviewData({});
    } finally {
        setIsProcessing(false);
    }
  }, [handler, resetConversation]);
  
  const handleApplySampling = async (tableName: string, method: 'random' | 'stratified', size: number, column?: string) => {
    setIsProcessing(true);
    try {
        await handler.applySampling(tableName, method, size, column);
        const newPreview = await handler.getPreview(tableName, 5);
        setPreviewData(prev => ({ ...prev, [tableName]: newPreview }));
        setSampledTables(prev => new Set(prev).add(tableName));
    } catch (e: any) {
        setPageError(`Sampling failed for table ${tableName}: ${e.message}`);
    } finally {
        setIsProcessing(false);
    }
  }

  const handleAddJoin = (newJoin: Omit<Join, 'id'>) => {
    setJoins(prev => [...prev, { ...newJoin, id: uuidv4() }]);
  };

  const handleRemoveJoin = (id: string) => {
    setJoins(prev => prev.filter(j => j.id !== id));
  };
  
  const handleSend = () => {
    if (!question.trim() || !schemas) return;
    askQuestion(question, schemas, joins);
    setQuestion('');
  };

  const renderTurn = (turn: ConversationTurn) => {
    switch (turn.state) {
      case 'sql_generating': case 'executing':
        return <div className="flex items-center mt-2"><Loader2 className="animate-spin text-primary" size={24} /><span className="ml-3 text-text-secondary">{turn.state === 'sql_generating' ? 'Generating SQL...' : 'Executing query...'}</span></div>;
      case 'sql_ready':
        return turn.sqlResult ? <SQLApproval sqlResult={turn.sqlResult} onExecute={() => executeApprovedSql(turn.id)} /> : null;
      case 'complete':
        return turn.analysisResult ? <ResultsDisplay turn={turn} onGenerateInsights={generateInsightsForTurn} onGenerateChart={generateChartForTurn} /> : null;
      case 'error':
        return <div className="flex items-center text-danger bg-danger/10 p-4 rounded-lg"><AlertTriangle size={20} className="mr-3" /> {turn.error}</div>;
      default: return null;
    }
  };
  
  const getPlaceholder = () => {
    if (!isInitialized) return "Initializing...";
    if (files.length === 0) return "Please upload files to begin";
    if (isProcessing) return "Processing files...";
    if (files.length > 1 && joins.length === 0) return "Define a join to enable querying across tables";
    return "Ask a question about your data...";
  };

  const canAskQuestion =
    (!!schemas && files.length === 1) ||
    (!!schemas && files.length > 1 && joins.length > 0);

  const isChatDisabled = isProcessing || isAnalysisLoading || !canAskQuestion;

  return (
    <div className="flex flex-col h-full bg-secondary-background">
      <div className="flex-1 overflow-y-auto" ref={chatContainerRef}>
        <div className="p-6 md:p-8 lg:p-10 space-y-6 max-w-7xl mx-auto">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-text">Engineer & Join</h1>
              <p className="text-text-secondary">Upload multiple files, define relationships, and query the combined data.</p>
            </div>
            <Container title="1. Upload Datasets">
              <MultiFileUpload files={files} onFilesChange={handleFilesChange} disabled={!isInitialized || isProcessing} />
            </Container>

            {isProcessing && <div className="flex justify-center items-center py-4"><Loader2 className="animate-spin text-primary" size={24} /><span className="ml-2 text-text-secondary">Processing files...</span></div>}
            {pageError && <div className="flex items-center text-danger bg-danger/10 p-4 rounded-lg"><AlertTriangle size={20} className="mr-3" /> {pageError}</div>}
            
            {schemas && (
              <>
                <Container title="2. Data Sampling (Optional)">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
                    {Object.entries(schemas).map(([tableName]) => (
                      <div key={tableName}>
                        <h4 className="font-semibold mb-2 text-text truncate" title={tableNameMap[tableName]}>{tableNameMap[tableName]}</h4>
                        <DataSampling 
                           schemas={{[tableName]: schemas[tableName]}}
                           onApplySampling={(m, s, c) => handleApplySampling(tableName, m, s, c)}
                           disabled={isProcessing}
                        />
                        {sampledTables.has(tableName) && (
                           <div className="flex items-center text-info-text bg-info-background/70 p-2 rounded-md border border-info-border mt-3">
                                <Layers size={16} className="mr-2 flex-shrink-0" />
                                <p className="text-xs font-medium">This table is using a sampled subset of its data.</p>
                            </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Container>
              
                <Container title="3. Data Previews">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {Object.entries(schemas).map(([tableName]) => (
                      <div key={tableName}>
                        <h4 className="font-semibold mb-2 text-text truncate" title={tableNameMap[tableName]}>{tableNameMap[tableName]}</h4>
                        <DataPreview data={previewData[tableName] || []} />
                      </div>
                    ))}
                  </div>
                </Container>

                {files.length > 1 && (
                  <Container title="4. Define Joins">
                    <div className="flex flex-col lg:flex-row gap-8">
                        <div className="flex-grow">
                          <JoinBuilder schemas={schemas} onAddJoin={handleAddJoin} tableNameMap={tableNameMap} />
                        </div>
                        {joins.length > 0 && (
                          <div className="lg:w-2/5 flex-shrink-0">
                            <h4 className="font-semibold mb-3 text-text">Active Joins</h4>
                             <div className="space-y-2">
                              {joins.map(join => (
                                <div key={join.id} className="flex items-center justify-between p-2 bg-secondary-background rounded-md border border-border text-xs">
                                  <div className="flex items-center gap-1.5 text-text-secondary flex-wrap">
                                    <span className="font-semibold text-text truncate" title={tableNameMap[join.table1]}>{tableNameMap[join.table1]}</span>.<span className="font-mono">{join.column1}</span>
                                    <span className="font-bold text-primary">{`(${join.joinType.charAt(0).toUpperCase()})`}</span>
                                    <span className="font-semibold text-text truncate" title={tableNameMap[join.table2]}>{tableNameMap[join.table2]}</span>.<span className="font-mono">{join.column2}</span>
                                  </div>
                                  <button onClick={() => handleRemoveJoin(join.id)} className="p-1 text-text-secondary hover:text-danger rounded-full ml-2 flex-shrink-0"><X size={14} /></button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  </Container>
                )}
              </>
            )}
          </div>
          
          {engineerConversation.length > 0 && (
            <div className="space-y-8 pt-6 border-t border-border">
              {engineerConversation.map((turn) => (
                <React.Fragment key={turn.id}>
                  <div className="flex justify-end"><div className="bg-primary text-primary-foreground rounded-lg p-3 max-w-3xl shadow-card"><p>{turn.question}</p></div></div>
                  <div className="flex items-start space-x-4">
                    <div className="bg-card p-2 rounded-full flex-shrink-0 border border-border"><Bot size={20} className="text-primary" /></div>
                    <div className="flex-1 min-w-0">{renderTurn(turn)}</div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex-shrink-0">
        <ChatInput
          value={question}
          onChange={setQuestion}
          onSend={handleSend}
          isLoading={isAnalysisLoading}
          placeholder={getPlaceholder()}
          disabled={isChatDisabled}
        />
      </div>
    </div>
  );
};

export default EngineerJoinPage;
