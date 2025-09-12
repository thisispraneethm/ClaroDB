import React, { useState, useCallback } from 'react';
import Container from '../components/Container';
import { Join, Point } from '../types';
import { Loader2, AlertTriangle, X, MousePointer2, FileUp } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { useAnalysis } from '../hooks/useAnalysis';
import MultiFileUpload from '../components/MultiFileUpload';
import { v4 as uuidv4 } from 'uuid';
import JoinCreationModal from '../components/JoinCreationModal';
import EmptyState from '../components/EmptyState';
import DataModelingCanvas from '../components/DataModelingCanvas';

const EngineerJoinPage: React.FC = () => {
  const { 
    llmProvider, 
    engineerHandler: handler, 
    engineerConversation, 
    setEngineerConversation,
    engineerHistory,
    setEngineerHistory,
    engineerFiles: files,
    setEngineerFiles: setFiles,
    engineerSchemas: schemas,
    setEngineerSchemas: setSchemas,
    engineerPreviewData: previewData,
    setEngineerPreviewData: setPreviewData,
    engineerTableNameMap: tableNameMap,
    setEngineerTableNameMap: setTableNameMap,
    engineerJoins: joins,
    setEngineerJoins: setJoins,
    engineerCardPositions: cardPositions,
    setEngineerCardPositions: setCardPositions
  } = useAppContext();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [question, setQuestion] = useState('');

  const [modalState, setModalState] = useState<{isOpen: boolean, details: Omit<Join, 'id' | 'joinType'> | null}>({isOpen: false, details: null});
  
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
      setConversation: setEngineerConversation,
      history: engineerHistory,
      setHistory: setEngineerHistory
  });

  const sanitizeTableName = (filename: string) => {
      let sanitized = filename.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_]/g, '_');
      if (/^\d/.test(sanitized)) sanitized = `_${sanitized}`;
      return sanitized || 'unnamed_table';
  }
  
  const resetWorkspace = () => {
    setFiles([]);
    setSchemas(null);
    setPreviewData({});
    setTableNameMap({});
    setJoins([]);
    setCardPositions({});
    resetConversation();
  };

  const handleFilesChange = useCallback(async (newFiles: File[]) => {
    resetWorkspace();
    setFiles(newFiles);

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
            while (Object.prototype.hasOwnProperty.call(nameCounts, finalName) || Object.keys(nameCounts).includes(finalName)) {
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

        const initialPositions: Record<string, Point> = {};
        Object.keys(s).forEach((tableName, i) => {
            initialPositions[tableName] = { x: (i % 3) * 340 + 60, y: Math.floor(i / 3) * 320 + 60 };
        });
        setCardPositions(initialPositions);
        
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
  }, [handler, resetConversation, setFiles, setSchemas, setPreviewData, setTableNameMap, setJoins, setCardPositions]);

    const handleOpenJoinModal = useCallback((details: Omit<Join, 'id' | 'joinType'>) => {
      setModalState({ isOpen: true, details });
    }, []);
    
    const handleConfirmJoin = (joinType: Join['joinType']) => {
        if (!modalState.details) return;
        setJoins(prev => [...prev, { ...modalState.details!, id: uuidv4(), joinType }]);
        setModalState({ isOpen: false, details: null });
    };

    const handleRemoveJoin = (id: string) => setJoins(prev => prev.filter(j => j.id !== id));
  
    const handleSend = () => {
        if (!question.trim() || !schemas) return;
        askQuestion(question, schemas, joins);
        setQuestion('');
    };
  
    const getPlaceholder = () => {
        if (files.length === 0) return "Please upload files to begin";
        if (isProcessing) return "Processing files...";
        if (files.length > 1 && joins.length === 0) return "Define a join by dragging between columns";
        return "Ask a question about your joined data...";
    };

    const canAskQuestion = (!!schemas && files.length === 1) || (!!schemas && files.length > 1 && joins.length > 0);
    const isChatDisabled = isProcessing || isAnalysisLoading || !canAskQuestion;

    if (!schemas && !isProcessing) {
        return (
            <div className="h-full flex justify-center items-center p-4">
                <Container className="max-w-xl w-full">
                    <EmptyState
                        icon={<FileUp size={24} className="text-primary" />}
                        title="Upload files to model and join"
                        description="Add two or more datasets to visualize them on the canvas and define relationships."
                    >
                        <MultiFileUpload files={files} onFilesChange={handleFilesChange} disabled={isProcessing} />
                    </EmptyState>
                </Container>
            </div>
        );
    }

  return (
    <>
        <DataModelingCanvas
            isLoading={isProcessing}
            loadingText="Processing files..."
            pageError={pageError}
            schemas={schemas}
            cardPositions={cardPositions}
            setCardPositions={setCardPositions}
            joins={joins}
            onOpenJoinModal={handleOpenJoinModal}
            conversation={engineerConversation}
            onExecuteSql={executeApprovedSql}
            onGenerateInsights={generateInsightsForTurn}
            onGenerateChart={generateChartForTurn}
            question={question}
            setQuestion={setQuestion}
            onSend={handleSend}
            isChatDisabled={isChatDisabled}
            placeholder={getPlaceholder()}
            tableNameMap={tableNameMap}
        >
            {/* Left sidebar content */}
            <div className="p-4 space-y-4 overflow-y-auto">
                <Container title="1. Upload Datasets">
                    <MultiFileUpload files={files} onFilesChange={handleFilesChange} disabled={isProcessing} />
                </Container>

                {schemas && Object.keys(schemas).length > 1 && (
                    <Container title="2. Active Joins">
                        {joins.length > 0 ? (
                        <div className="space-y-2">
                            {joins.map(join => (
                            <div 
                                key={join.id} 
                                className="flex items-center justify-between p-2 bg-background/70 rounded-md border border-border text-xs transition-all"
                            >
                                <div className="flex items-center gap-1.5 text-text-secondary flex-wrap">
                                <span className="font-semibold text-text truncate" title={tableNameMap[join.table1]}>{tableNameMap[join.table1]}</span>.<span className="font-mono">{join.column1}</span>
                                <span className="font-bold text-primary">{`(${join.joinType.charAt(0).toUpperCase()})`}</span>
                                <span className="font-semibold text-text truncate" title={tableNameMap[join.table2]}>{tableNameMap[join.table2]}</span>.<span className="font-mono">{join.column2}</span>
                                </div>
                                <button onClick={() => handleRemoveJoin(join.id)} className="p-1 text-text-secondary hover:text-danger rounded-full ml-2 flex-shrink-0"><X size={14} /></button>
                            </div>
                            ))}
                        </div>
                        ) : (
                            <div className="flex items-center text-sm text-text-secondary p-2 bg-background/70 rounded-md">
                                <MousePointer2 size={16} className="mr-2 flex-shrink-0" />
                                <p>Drag between columns on the canvas to create a join.</p>
                            </div>
                        )}
                    </Container>
                )}
            </div>
        </DataModelingCanvas>
      
      <JoinCreationModal 
        isOpen={modalState.isOpen}
        onClose={() => setModalState({isOpen: false, details: null})}
        onConfirm={handleConfirmJoin}
        details={modalState.details}
        tableNameMap={tableNameMap}
      />
    </>
  );
};

export default EngineerJoinPage;