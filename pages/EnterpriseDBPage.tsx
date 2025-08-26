import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Container from '../components/Container';
import { TableSchema, Join, Point } from '../types';
import { Loader2, Bot, X, Layers, MousePointer2, DatabaseZap, CheckCircle } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { useAnalysis } from '../hooks/useAnalysis';
import ChatInput from '../components/ChatInput';
import { v4 as uuidv4 } from 'uuid';
import DataPreview from '../components/DataPreview';
import ConversationTurnDisplay from '../components/ConversationTurnDisplay';
import InteractiveSchemaCard from '../components/InteractiveSchemaCard';
import JoinLines from '../components/JoinLines';
import JoinCreationModal from '../components/JoinCreationModal';
import CanvasToolbar from '../components/CanvasToolbar';

const EnterpriseDBPage: React.FC = () => {
  const { 
    llmProvider, 
    enterpriseHandler: handler, 
    enterpriseConversation, 
    setEnterpriseConversation,
    enterpriseHistory,
    setEnterpriseHistory
  } = useAppContext();
  
  const [schemas, setSchemas] = useState<TableSchema | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, Record<string, any>[]>>({});
  const [joins, setJoins] = useState<Join[]>([]);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [question, setQuestion] = useState('');

  const [cardPositions, setCardPositions] = useState<Record<string, Point>>({});
  const [joinSource, setJoinSource] = useState<{table: string, column: string} | null>(null);
  const [joinTarget, setJoinTarget] = useState<{table: string, column: string} | null>(null);
  const [drawingLine, setDrawingLine] = useState<{start: Point, end: Point} | null>(null);
  const [modalState, setModalState] = useState<{isOpen: boolean, details: Omit<Join, 'id' | 'joinType'> | null}>({isOpen: false, details: null});
  const [sidebarWidth, setSidebarWidth] = useState((window.innerWidth - 256) * 0.5);
  const isResizingRef = useRef(false);
  const [hoveredJoin, setHoveredJoin] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Refs to hold the latest state for event listeners, preventing stale closures.
  const joinSourceRef = useRef(joinSource);
  const joinTargetRef = useRef(joinTarget);

  useEffect(() => {
    joinSourceRef.current = joinSource;
  }, [joinSource]);

  useEffect(() => {
    joinTargetRef.current = joinTarget;
  }, [joinTarget]);

  const {
    askQuestion,
    executeApprovedSql,
    isProcessing: isAnalysisLoading,
    generateInsightsForTurn,
    generateChartForTurn,
  } = useAnalysis({
      handler,
      llmProvider,
      conversation: enterpriseConversation,
      setConversation: setEnterpriseConversation,
      history: enterpriseHistory,
      setHistory: setEnterpriseHistory
  });

  const compatibleTargets = useMemo(() => {
    // FIX: Explicitly type new Set() to avoid it being inferred as Set<unknown>.
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

  const handleResizeMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizingRef.current) return;
    const newWidth = window.innerWidth - e.clientX;
    const minWidth = 320;
    const maxWidth = 800;
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      setSidebarWidth(newWidth);
    }
  }, []);

  const handleResizeMouseUp = useCallback(() => {
    isResizingRef.current = false;
    document.removeEventListener('mousemove', handleResizeMouseMove);
    document.removeEventListener('mouseup', handleResizeMouseUp);
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
  }, [handleResizeMouseMove]);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleResizeMouseMove);
    document.addEventListener('mouseup', handleResizeMouseUp);
  }, [handleResizeMouseMove, handleResizeMouseUp]);


  useEffect(() => {
    chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
  }, [enterpriseConversation, isAnalysisLoading]);

  const handleConnect = async () => {
    setIsProcessing(true);
    try {
        await handler.connect(); // Simulate connection
        const s = await handler.getSchemas();
        setSchemas(s);

        const initialPositions: Record<string, Point> = {};
        Object.keys(s).forEach((tableName, i) => {
            initialPositions[tableName] = { x: (i % 4) * 320 + 50, y: Math.floor(i / 4) * 280 + 50 };
        });
        setCardPositions(initialPositions);
        
        const newPreviewData: Record<string, Record<string, any>[]> = {};
        for(const tableName of Object.keys(s)) {
            newPreviewData[tableName] = await handler.getPreview(tableName, 5);
        }
        setPreviewData(newPreviewData);
        setIsConnected(true);
    } catch (e: any) {
        console.error("Connection failed", e);
    } finally {
        setIsProcessing(false);
    }
  };

    // These mouse handlers are defined using useCallback with empty dependency arrays.
    // They read from refs to get the latest state, avoiding stale closure issues.
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
    }, []); // Stable function

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
    }, []); // Stable function

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
        const numTables = tableNames.length;
        const cols = Math.min(4, Math.ceil(Math.sqrt(numTables)));
        const cardWidth = 300;
        const cardHeight = 280;
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
    if (!isConnected) return "Please connect to the database to begin";
    if (isProcessing) return "Processing...";
    if (Object.keys(schemas || {}).length > 1 && joins.length === 0) return "Define a join by dragging between columns";
    return "Ask a question about your database...";
  };

  const canAskQuestion = isConnected && ( (Object.keys(schemas || {}).length === 1) || (Object.keys(schemas || {}).length > 1 && joins.length > 0) );
  const isChatDisabled = isProcessing || isAnalysisLoading || !canAskQuestion;

  if (!isConnected) {
    const inputClasses = "w-full p-2 border border-input rounded-md focus:ring-2 focus:ring-ring focus:outline-none transition bg-card";
    const labelClasses = "block text-sm font-medium text-text-secondary mb-1";
    return (
      <div className="h-full overflow-y-auto p-6 md:p-8 lg:p-10 flex items-center justify-center">
        <div className="max-w-md w-full">
            <Container>
                <div className="text-center mb-6">
                    <DatabaseZap className="mx-auto text-primary" size={32} />
                    <h1 className="text-xl font-bold text-text mt-2">Connect to Database</h1>
                    <p className="text-text-secondary text-sm">This is a simulated connection for demonstration.</p>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className={labelClasses}>Host</label>
                        <input type="text" value="demo-rds.clarodb.com" disabled className={`${inputClasses} bg-secondary-background`}/>
                    </div>
                    <div>
                        <label className={labelClasses}>Database Name</label>
                        <input type="text" value="sales_db" disabled className={`${inputClasses} bg-secondary-background`}/>
                    </div>
                </div>
                 <div className="mt-6 flex justify-end">
                    <button
                        onClick={handleConnect}
                        disabled={isProcessing}
                        className="w-full px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-md hover:bg-primary-hover disabled:opacity-50 flex items-center justify-center transition-colors"
                    >
                        {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <DatabaseZap className="mr-2" size={16} />}
                        Connect to Demo Database
                    </button>
                </div>
            </Container>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-secondary-background overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border bg-background/80 backdrop-blur-sm z-10">
                <h1 className="text-xl font-bold text-text">Database Modeling Canvas</h1>
                <p className="text-sm text-text-secondary">Drag cards to arrange your schema and drag between columns to create joins.</p>
            </div>
            <div ref={canvasRef} className="flex-1 overflow-auto relative bg-dot-grid">
              {schemas && (
                <>
                  <JoinLines joins={joins} drawingLine={drawingLine} hoveredJoinId={hoveredJoin}/>
                  {Object.keys(schemas).map((tableName) => (
                    <InteractiveSchemaCard
                        key={tableName}
                        tableName={tableName}
                        displayName={tableName}
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
        </div>
        
        <div 
          onMouseDown={handleResizeMouseDown}
          className="w-1.5 cursor-col-resize bg-border hover:bg-primary/50 active:bg-primary transition-colors flex-shrink-0"
        />
        
        <aside 
            ref={chatContainerRef}
            style={{ width: `${sidebarWidth}px` }}
            className="bg-background border-l border-border flex flex-col overflow-y-auto flex-shrink-0"
        >
             <div className="flex-1 p-4 space-y-4">
                <Container title="1. Connection Status">
                   <div className="flex items-center text-success bg-success/10 p-3 rounded-lg border border-success/20">
                        <CheckCircle size={20} className="mr-3 flex-shrink-0" />
                        <div>
                            <h4 className="font-semibold">Connected</h4>
                            <p className="text-sm">sales_db @ demo-rds.clarodb.com</p>
                        </div>
                   </div>
                </Container>

                {schemas && Object.keys(schemas).length > 0 && (
                  <>
                    <Container title="2. Active Joins">
                        {joins.length > 0 ? (
                           <div className="space-y-2">
                            {joins.map(join => (
                              <div 
                                key={join.id} 
                                className="flex items-center justify-between p-2 bg-secondary-background rounded-md border border-border text-xs transition-all"
                                onMouseEnter={() => setHoveredJoin(join.id)}
                                onMouseLeave={() => setHoveredJoin(null)}
                              >
                                <div className="flex items-center gap-1.5 text-text-secondary flex-wrap">
                                  <span className="font-semibold text-text truncate" title={join.table1}>{join.table1}</span>.<span className="font-mono">{join.column1}</span>
                                  <span className="font-bold text-primary">{`(${join.joinType.charAt(0).toUpperCase()})`}</span>
                                  <span className="font-semibold text-text truncate" title={join.table2}>{join.table2}</span>.<span className="font-mono">{join.column2}</span>
                                </div>
                                <button onClick={() => handleRemoveJoin(join.id)} className="p-1 text-text-secondary hover:text-danger rounded-full ml-2 flex-shrink-0"><X size={14} /></button>
                              </div>
                            ))}
                          </div>
                        ) : (
                            <div className="flex items-center text-sm text-text-secondary p-2 bg-secondary-background rounded-md">
                                <MousePointer2 size={16} className="mr-2 flex-shrink-0" />
                                <p>Drag between columns on the canvas to create a join.</p>
                            </div>
                        )}
                    </Container>

                    <Container title="3. Data Previews">
                         <div className="space-y-4">
                            {Object.entries(schemas).map(([tableName]) => (
                              <div key={tableName}>
                                <h4 className="font-semibold mb-2 text-text truncate" title={tableName}>{tableName}</h4>
                                <DataPreview data={previewData[tableName] || []} />
                              </div>
                            ))}
                          </div>
                    </Container>
                  </>
                )}
             </div>

            {enterpriseConversation.length > 0 && (
                <div className="flex-1 p-4 space-y-8 border-t border-border">
                {enterpriseConversation.map((turn) => (
                    <React.Fragment key={turn.id}>
                    <div className="flex justify-end"><div className="bg-primary text-primary-foreground rounded-lg p-3 max-w-3xl shadow-card"><p>{turn.question}</p></div></div>
                    <div className="flex items-start space-x-4">
                        <div className="bg-card p-2 rounded-full flex-shrink-0 border border-border"><Bot size={20} className="text-primary" /></div>
                        <div className="flex-1 min-w-0">
                            <ConversationTurnDisplay turn={turn} onExecute={executeApprovedSql} onGenerateInsights={generateInsightsForTurn} onGenerateChart={generateChartForTurn} />
                        </div>
                    </div>
                    </React.Fragment>
                ))}
                </div>
            )}
        </aside>
      </div>

      <div className="flex-shrink-0 border-t border-border">
        <ChatInput value={question} onChange={setQuestion} onSend={handleSend} isLoading={isAnalysisLoading} placeholder={getPlaceholder()} disabled={isChatDisabled}/>
      </div>
      
      <JoinCreationModal 
        isOpen={modalState.isOpen}
        onClose={() => setModalState({isOpen: false, details: null})}
        onConfirm={handleConfirmJoin}
        details={modalState.details}
        tableNameMap={{}}
      />
    </div>
  );
};

export default EnterpriseDBPage;