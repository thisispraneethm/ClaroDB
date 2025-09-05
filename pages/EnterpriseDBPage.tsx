import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Container from '../components/Container';
import { TableSchema, Join, Point } from '../types';
import { Loader2, Bot, X, Layers, MousePointer2, DatabaseZap, CheckCircle, User, MessageSquare } from 'lucide-react';
import { useEnterpriseContext } from '../contexts/EnterpriseContext';
import { useServiceContext } from '../contexts/ServiceContext';
import { useAnalysis } from '../hooks/useAnalysis';
import ChatInput from '../components/ChatInput';
import { v4 as uuidv4 } from 'uuid';
import ConversationTurnDisplay from '../components/ConversationTurnDisplay';
import InteractiveSchemaCard from '../components/InteractiveSchemaCard';
import JoinLines from '../components/JoinLines';
import JoinCreationModal from '../components/JoinCreationModal';
import CanvasToolbar from '../components/CanvasToolbar';

const EnterpriseDBPage: React.FC = () => {
  const { 
    llmProvider, 
    enterpriseHandler: handler, 
  } = useServiceContext();
  
  const {
    conversation, 
    setConversation,
    chatSession,
    setChatSession,
    isConnected,
    setIsConnected,
    schemas,
    setSchemas,
    previewData,
    setPreviewData,
    joins,
    setJoins,
    cardPositions,
    setCardPositions
  } = useEnterpriseContext();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [question, setQuestion] = useState('');

  const [joinSource, setJoinSource] = useState<{table: string, column: string} | null>(null);
  const [joinTarget, setJoinTarget] = useState<{table: string, column: string} | null>(null);
  const [drawingLine, setDrawingLine] = useState<{start: Point, end: Point} | null>(null);
  const [modalState, setModalState] = useState<{isOpen: boolean, details: Omit<Join, 'id' | 'joinType'> | null}>({isOpen: false, details: null});
  const [hoveredJoin, setHoveredJoin] = useState<string | null>(null);
  const [draggedTable, setDraggedTable] = useState<string | null>(null);
  
  const [resultsWidth, setResultsWidth] = useState(600);
  const isResizing = useRef(false);
  // FIX: Initialize useRef with null to avoid "Expected 1 arguments, but got 0" error.
  const animationFrameRef = useRef<number | null>(null);

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
    generateInsightsForTurn,
    generateChartForTurn,
  } = useAnalysis({
      handler,
      llmProvider,
      conversation,
      setConversation,
      chatSession,
      setChatSession
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
  }, [conversation, isAnalysisLoading]);

  const handleConnect = async () => {
    setIsProcessing(true);
    try {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network latency
        await handler.connect();
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
        setIsConnected(true);
    } catch (e: any) {
        console.error("Connection failed", e);
    } finally {
        setIsProcessing(false);
    }
  };

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
    }, [handleMouseMove]);

    const handleColumnMouseDown = useCallback((table: string, column: string) => {
        setJoinSource({ table, column });
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }, [handleMouseMove, handleMouseUp]);
    
    const handleColumnMouseUp = useCallback(() => {}, []);
    const handleColumnLeave = useCallback(() => setJoinTarget(null), []);
    
    const handleConfirmJoin = (joinType: Join['joinType']) => {
        if (!modalState.details) return;
        setJoins(prev => [...prev, { ...modalState.details!, id: uuidv4(), joinType }]);
        setModalState({ isOpen: false, details: null });
        setChatSession(null); // Reset chat session as schema/joins changed
    };

    const handleCardDrag = useCallback((tableName: string, newPosition: Point) => {
      setCardPositions(prev => ({ ...prev, [tableName]: newPosition }));
    }, []);

    const handleDragEnd = useCallback(() => setDraggedTable(null), []);

    const handleAutoLayout = () => {
        if (!schemas || Object.keys(schemas).length === 0) return;

        const tableNames = Object.keys(schemas);
        const cardWidth = 288; // from w-72 class
        const cardHeight = 280; // Estimated average height
        const padding = 60;
        const canvasWidth = canvasRef.current?.clientWidth || 1000;

        // 1. Build adjacency list for the graph
        const adjList = new Map<string, string[]>();
        tableNames.forEach(name => adjList.set(name, []));
        joins.forEach(join => {
            if (!adjList.has(join.table1)) adjList.set(join.table1, []);
            if (!adjList.has(join.table2)) adjList.set(join.table2, []);
            adjList.get(join.table1)!.push(join.table2);
            adjList.get(join.table2)!.push(join.table1);
        });

        // 2. Find connected components using BFS
        const components: string[][] = [];
        const visited = new Set<string>();

        tableNames.forEach(tableName => {
            if (!visited.has(tableName)) {
                const component: string[] = [];
                const queue: string[] = [tableName];
                visited.add(tableName);
                
                let head = 0;
                while (head < queue.length) {
                    const u = queue[head++];
                    component.push(u);
                    
                    adjList.get(u)?.forEach(v => {
                        if (!visited.has(v)) {
                            visited.add(v);
                            queue.push(v);
                        }
                    });
                }
                components.push(component);
            }
        });
        
        components.sort((a, b) => b.length - a.length);

        const newPositions: Record<string, Point> = {};
        let cursorX = padding;
        let cursorY = padding;
        let maxRowHeight = 0;

        // 3. Layout each component
        components.forEach(component => {
            const componentCols = Math.ceil(Math.sqrt(component.length));
            const componentWidth = componentCols * (cardWidth + padding);
            const componentRows = Math.ceil(component.length / componentCols);
            const componentHeight = componentRows * (cardHeight + padding);

            if (cursorX + componentWidth > canvasWidth && cursorX > padding) {
                cursorX = padding;
                cursorY += maxRowHeight;
                maxRowHeight = 0;
            }

            component.forEach((tableName, i) => {
                const row = Math.floor(i / componentCols);
                const col = i % componentCols;
                
                newPositions[tableName] = {
                    x: cursorX + col * (cardWidth + padding),
                    y: cursorY + row * (cardHeight + padding),
                };
            });
            
            cursorX += componentWidth;
            if (componentHeight > maxRowHeight) {
                maxRowHeight = componentHeight;
            }
        });

        setCardPositions(newPositions);
    };

  const handleRemoveJoin = (id: string) => {
    setJoins(prev => prev.filter(j => j.id !== id));
    setChatSession(null); // Reset chat session as schema/joins changed
  }
  
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

    const handleResizeMouseMove = useCallback((e: MouseEvent) => {
      if (!isResizing.current) return;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = requestAnimationFrame(() => {
        const newWidth = window.innerWidth - e.clientX;
        if (newWidth > 400 && newWidth < 1200) {
            setResultsWidth(newWidth);
        }
      });
  }, []);

  const handleResizeMouseUp = useCallback(() => {
      isResizing.current = false;
      document.removeEventListener('mousemove', handleResizeMouseMove);
      document.removeEventListener('mouseup', handleResizeMouseUp);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
  }, [handleResizeMouseMove]);
  
  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      isResizing.current = true;
      document.addEventListener('mousemove', handleResizeMouseMove);
      document.addEventListener('mouseup', handleResizeMouseUp);
  }, [handleResizeMouseMove, handleResizeMouseUp]);

  if (!isConnected) {
    const inputClasses = "w-full p-2.5 border border-input rounded-md focus:ring-2 focus:ring-ring focus:outline-none transition bg-card";
    const labelClasses = "block text-sm font-medium text-text-secondary mb-1";
    return (
      <div className="h-full overflow-y-auto p-6 md:p-8 lg:p-10 flex items-center justify-center animate-fade-in-up">
        <div className="max-w-md w-full">
            <Container>
                <div className="text-center mb-6">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                        <DatabaseZap size={24} />
                    </div>
                    <h1 className="text-xl font-bold text-text">Connect to Database</h1>
                    <p className="text-text-secondary text-sm">This is a simulated connection for demonstration purposes.</p>
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
                        className="w-full px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-md hover:bg-primary-hover disabled:opacity-50 flex items-center justify-center transition-all duration-200 hover:scale-105"
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
    <div className="flex flex-col h-full bg-transparent overflow-hidden">
        <div className="flex-1 flex overflow-hidden">
            <aside className="w-96 flex-shrink-0 bg-secondary-background/50 border-r border-border p-4 space-y-4 overflow-y-auto">
                <Container title="1. Connection Status">
                <div className="flex items-center text-success bg-success/10 p-3 rounded-lg border border-success/20">
                        <CheckCircle size={20} className="mr-3 flex-shrink-0" />
                        <div>
                            <h4 className="font-semibold">Connected</h4>
                            <p className="text-sm">sales_db @ demo-rds.clarodb.com</p>
                        </div>
                </div>
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
                                <span className="font-semibold text-text truncate" title={join.table1}>{join.table1}</span>.<span className="font-mono">{join.column1}</span>
                                <span className="font-bold text-primary">{`(${join.joinType.charAt(0).toUpperCase()})`}</span>
                                <span className="font-semibold text-text truncate" title={join.table2}>{join.table2}</span>.<span className="font-mono">{join.column2}</span>
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
            <main className="flex-1 relative overflow-hidden">
                <div ref={canvasRef} className="h-full w-full overflow-auto relative bg-dot-grid">
                {schemas && (
                    <>
                    <JoinLines
                        joins={joins}
                        drawingLine={drawingLine}
                        hoveredJoinId={hoveredJoin}
                        cardPositions={cardPositions}
                        draggedTable={draggedTable}
                    />
                    {Object.keys(schemas).map((tableName) => (
                        <InteractiveSchemaCard
                            key={tableName}
                            tableName={tableName}
                            displayName={tableName}
                            schema={schemas[tableName]}
                            position={cardPositions[tableName]}
                            onDrag={handleCardDrag}
                            onDragStart={setDraggedTable}
                            onDragEnd={handleDragEnd}
                            onColumnMouseDown={handleColumnMouseDown}
                            onColumnMouseUp={handleColumnMouseUp}
                            onColumnEnter={setJoinTarget}
                            onColumnLeave={handleColumnLeave}
                            isSource={joinSource?.table === tableName}
                            sourceColumn={joinSource?.column}
                            compatibleTargets={compatibleTargets}
                            activeJoinColumns={
                                new Set<string>(joins.flatMap(j => 
                                    (j.id === hoveredJoin || j.table1 === draggedTable || j.table2 === draggedTable) 
                                    ? [`${j.table1}-${j.column1}`, `${j.table2}-${j.column2}`] 
                                    : []
                                ))
                            }
                        />
                    ))}
                    <CanvasToolbar onAutoLayout={handleAutoLayout} />
                    </>
                )}
                </div>
            </main>
            
            {conversation.length > 0 && (
                <aside className="flex-shrink-0 flex animate-scale-in" style={{ width: `${resultsWidth}px` }}>
                    <div onMouseDown={handleResizeMouseDown} className="w-1.5 h-full cursor-col-resize bg-border/50 hover:bg-primary transition-colors duration-200"></div>
                    <div className="flex flex-col flex-1 bg-secondary-background/50 border-l border-border overflow-hidden">
                        <div className="p-4 border-b border-border">
                            <h2 className="text-lg font-semibold text-text flex items-center"><MessageSquare size={18} className="mr-2 text-primary" /> Query Results</h2>
                        </div>
                        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                            <div className="space-y-8">
                                {conversation.map((turn) => (
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
        tableNameMap={{}}
      />
    </div>
  );
};

export default EnterpriseDBPage;