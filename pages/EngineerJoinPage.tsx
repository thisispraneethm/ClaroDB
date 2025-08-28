import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Container from '../components/Container';
import { TableSchema, Join, Point } from '../types';
import { Loader2, AlertTriangle, Bot, X, Layers, MousePointer2, FileUp, User, MessageSquare } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { useAnalysis } from '../hooks/useAnalysis';
import ChatInput from '../components/ChatInput';
import MultiFileUpload from '../components/MultiFileUpload';
import { v4 as uuidv4 } from 'uuid';
import ConversationTurnDisplay from '../components/ConversationTurnDisplay';
import InteractiveSchemaCard from '../components/InteractiveSchemaCard';
import JoinLines from '../components/JoinLines';
import JoinCreationModal from '../components/JoinCreationModal';
import EmptyState from '../components/EmptyState';
import CanvasToolbar from '../components/CanvasToolbar';

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

  const [joinSource, setJoinSource] = useState<{table: string, column: string} | null>(null);
  const [joinTarget, setJoinTarget] = useState<{table: string, column: string} | null>(null);
  const [drawingLine, setDrawingLine] = useState<{start: Point, end: Point} | null>(null);
  const [modalState, setModalState] = useState<{isOpen: boolean, details: Omit<Join, 'id' | 'joinType'> | null}>({isOpen: false, details: null});
  const [hoveredJoin, setHoveredJoin] = useState<string | null>(null);
  
  const [resultsWidth, setResultsWidth] = useState(600);
  const isResizing = useRef(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const joinSourceRef = useRef(joinSource);
  const joinTargetRef = useRef(joinTarget);

  useEffect(() => { joinSourceRef.current = joinSource; }, [joinSource]);
  useEffect(() => { joinTargetRef.current = joinTarget; }, [joinTarget]);

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
  
  const compatibleTargets = useMemo(() => {
    if (!joinSource) return new Set<string>();
    const targets = new Set<string>();
    if (schemas) {
        Object.entries(schemas).forEach(([tableName, columns]) => {
            if (tableName !== joinSource.table) {
                columns.forEach(col => {
                    targets.add(`${tableName}-${col.name}`);
                });
            }
        });
    }
    return targets;
  }, [joinSource, schemas]);


  useEffect(() => {
    chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
  }, [engineerConversation, isAnalysisLoading]);

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

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!joinSourceRef.current || !canvasRef.current) return;
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const startEl = document.getElementById(`col-${joinSourceRef.current.table}-${joinSourceRef.current.column}`);
        if (!startEl) return;

        const startRect = startEl.getBoundingClientRect();
        const start = {
            x: startRect.left + startRect.width - canvasRect.left + canvasRef.current.scrollLeft,
            y: startRect.top + startRect.height / 2 - canvasRect.top + canvasRef.current.scrollTop,
        };
        const end = {
            x: e.clientX - canvasRect.left + canvasRef.current.scrollLeft,
            y: e.clientY - canvasRect.top + canvasRef.current.scrollTop,
        };
        setDrawingLine({ start, end });
    }, []);

    const handleMouseUp = useCallback(() => {
        if (joinTargetRef.current && joinSourceRef.current) {
            if (joinSourceRef.current.table !== joinTargetRef.current.table) {
                setModalState({
                    isOpen: true,
                    details: {
                        table1: joinSourceRef.current.table,
                        column1: joinSourceRef.current.column,
                        table2: joinTargetRef.current.table,
                        column2: joinTargetRef.current.column,
                    },
                });
            }
        }
        setJoinSource(null);
        setDrawingLine(null);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    }, []);

    const handleColumnMouseDown = useCallback((table: string, column: string) => {
        setJoinSource({ table, column });
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }, [handleMouseMove, handleMouseUp]);
    
    const handleConfirmJoin = (joinType: Join['joinType']) => {
        if (!modalState.details) return;
        setJoins(prev => [...prev, { ...modalState.details!, id: uuidv4(), joinType }]);
        setModalState({ isOpen: false, details: null });
    };

    const handleCardDrag = (tableName: string, newPosition: Point) => {
      setCardPositions(prev => ({ ...prev, [tableName]: newPosition }));
    };

    const handleAutoLayout = () => {
        if (!schemas) return;
        const newPositions: Record<string, Point> = {};
        const tableNames = Object.keys(schemas);
        const canvasWidth = canvasRef.current?.clientWidth || 800;
        const cols = Math.min(4, Math.floor(canvasWidth / 340));
        const cardWidth = 300;
        const cardHeight = 320;
        const padding = 40;

        tableNames.forEach((tableName, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            newPositions[tableName] = {
                x: col * (cardWidth + padding) + padding,
                y: row * (cardHeight + padding) + padding,
            };
        });
        setCardPositions(newPositions);
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

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      isResizing.current = true;
      document.addEventListener('mousemove', handleResizeMouseMove);
      document.addEventListener('mouseup', handleResizeMouseUp);
  }, []);

  const handleResizeMouseMove = useCallback((e: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 400 && newWidth < 1200) {
          setResultsWidth(newWidth);
      }
  }, []);

  const handleResizeMouseUp = useCallback(() => {
      isResizing.current = false;
      document.removeEventListener('mousemove', handleResizeMouseMove);
      document.removeEventListener('mouseup', handleResizeMouseUp);
  }, []);

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        
        {files.length > 0 && (
          <aside className="w-96 flex-shrink-0 bg-secondary-background/50 border-r border-border p-4 space-y-4 overflow-y-auto">
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
                            onMouseEnter={() => setHoveredJoin(join.id)}
                            onMouseLeave={() => setHoveredJoin(null)}
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
          </aside>
        )}

        <main className="flex-1 relative overflow-hidden">
          <div ref={canvasRef} className="h-full w-full overflow-auto relative bg-dot-grid">
            {isProcessing && <div className="absolute inset-0 z-30 bg-white/50 flex justify-center items-center"><Loader2 className="animate-spin text-primary" size={24} /><span className="ml-2 text-text-secondary">Processing files...</span></div>}
            {pageError && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-full max-w-md p-4">
                  <div className="flex items-start text-danger bg-danger/10 p-4 rounded-lg border border-danger/20 shadow-lg">
                      <AlertTriangle size={20} className="mr-3 flex-shrink-0 mt-0.5" />
                      <div><h4 className="font-semibold">File Processing Error</h4><p className="text-sm mt-1">{pageError}</p></div>
                  </div>
              </div>
            )}
            
            {!schemas && !isProcessing && (
               <div className="absolute inset-0 flex justify-center items-center p-4">
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
            )}
            
            {schemas && (
              <>
                <JoinLines joins={joins} drawingLine={drawingLine} hoveredJoinId={hoveredJoin} />
                {Object.keys(schemas).map((tableName) => (
                  <InteractiveSchemaCard
                      key={tableName}
                      tableName={tableName}
                      displayName={tableNameMap[tableName]}
                      schema={schemas[tableName]}
                      position={cardPositions[tableName]}
                      onDrag={handleCardDrag}
                      onColumnMouseDown={handleColumnMouseDown}
                      onColumnMouseUp={() => {}}
                      onColumnEnter={setJoinTarget}
                      onColumnLeave={() => setJoinTarget(null)}
                      isSource={joinSource?.table === tableName}
                      sourceColumn={joinSource?.column}
                      compatibleTargets={compatibleTargets}
                      activeJoinColumns={
                          new Set<string>(joins.filter(j => j.id === hoveredJoin).flatMap(j => [`${j.table1}-${j.column1}`, `${j.table2}-${j.column2}`]))
                      }
                  />
                ))}
                <CanvasToolbar onAutoLayout={handleAutoLayout} />
              </>
            )}
          </div>
        </main>
        
        {engineerConversation.length > 0 && (
          <aside className="flex-shrink-0 flex animate-scale-in" style={{ width: `${resultsWidth}px` }}>
              <div onMouseDown={handleResizeMouseDown} className="w-1.5 h-full cursor-col-resize bg-border/50 hover:bg-primary transition-colors duration-200"></div>
              <div className="flex flex-col flex-1 bg-secondary-background/50 border-l border-border overflow-hidden">
                  <div className="p-4 border-b border-border">
                      <h2 className="text-lg font-semibold text-text flex items-center"><MessageSquare size={18} className="mr-2 text-primary" /> Query Results</h2>
                  </div>
                  <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                      <div className="space-y-8">
                          {engineerConversation.map((turn) => (
                              <React.Fragment key={turn.id}>
                                  <div className="flex items-start justify-end group"><div className="bg-primary text-primary-foreground rounded-xl rounded-br-none p-4 max-w-2xl shadow-md"><p>{turn.question}</p></div><div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center ml-3 flex-shrink-0"><User size={20} /></div></div>
                                  <div className="flex items-start group"><div className="w-10 h-10 rounded-full bg-background text-primary border border-border flex items-center justify-center mr-3 flex-shrink-0"><Bot size={20} /></div><div className="flex-1 min-w-0"><ConversationTurnDisplay turn={turn} onExecute={executeApprovedSql} onGenerateInsights={generateInsightsForTurn} onGenerateChart={generateChartForTurn} /></div></div>
                              </React.Fragment>
                          ))}
                      </div>
                  </div>
              </div>
          </aside>
        )}
      </div>

      <div className="flex-shrink-0">
        <ChatInput value={question} onChange={setQuestion} onSend={handleSend} isLoading={isAnalysisLoading} placeholder={getPlaceholder()} disabled={isChatDisabled}/>
      </div>
      
      <JoinCreationModal 
        isOpen={modalState.isOpen}
        onClose={() => setModalState({isOpen: false, details: null})}
        onConfirm={handleConfirmJoin}
        details={modalState.details}
        tableNameMap={tableNameMap}
      />
    </div>
  );
};

export default EngineerJoinPage;
