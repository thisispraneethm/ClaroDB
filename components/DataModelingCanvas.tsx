
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { TableSchema, Join, Point, ConversationTurn } from '../types';
import { Loader2, AlertTriangle, Bot, MessageSquare, User } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import ConversationTurnDisplay from './ConversationTurnDisplay';
import InteractiveSchemaCard from './InteractiveSchemaCard';
import JoinLines from './JoinLines';
import CanvasToolbar from './CanvasToolbar';
import ChatInput from './ChatInput';
import { useAppContext } from '../contexts/AppContext';

interface DataModelingCanvasProps {
    isLoading: boolean;
    loadingText: string;
    pageError?: string | null;
    schemas: TableSchema | null;
    tableNameMap: Record<string, string>;
    cardPositions: Record<string, Point>;
    setCardPositions: React.Dispatch<React.SetStateAction<Record<string, Point>>>;
    joins: Join[];
    onOpenJoinModal: (details: Omit<Join, 'id' | 'joinType'>) => void;
    conversation: ConversationTurn[];
    onExecuteSql: (turnId: string, sql: string) => void;
    onGenerateInsights: (turnId: string) => void;
    onGenerateChart: (turnId: string) => void;
    question: string;
    setQuestion: (q: string) => void;
    onSend: () => void;
    isChatDisabled: boolean;
    placeholder: string;
    children: React.ReactNode; // For the left sidebar content
}

const DataModelingCanvas: React.FC<DataModelingCanvasProps> = ({
    isLoading,
    loadingText,
    pageError,
    schemas,
    tableNameMap,
    cardPositions,
    setCardPositions,
    joins,
    onOpenJoinModal,
    conversation,
    onExecuteSql,
    onGenerateInsights,
    onGenerateChart,
    question,
    setQuestion,
    onSend,
    isChatDisabled,
    placeholder,
    children,
}) => {
    const { resultsPanelWidth, setResultsPanelWidth } = useAppContext();
    const [joinSource, setJoinSource] = useState<{table: string, column: string} | null>(null);
    const [joinTarget, setJoinTarget] = useState<{table: string, column: string} | null>(null);
    const [drawingLine, setDrawingLine] = useState<{start: Point, end: Point} | null>(null);
    const [hoveredJoin, setHoveredJoin] = useState<string | null>(null);
    const [draggedTable, setDraggedTable] = useState<string | null>(null);
    
    const isResizing = useRef(false);

    const canvasRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    
    // Use refs to hold the latest values for join source/target to avoid stale closures in event listeners
    const joinSourceRef = useRef(joinSource);
    useEffect(() => { joinSourceRef.current = joinSource; }, [joinSource]);
    const joinTargetRef = useRef(joinTarget);
    useEffect(() => { joinTargetRef.current = joinTarget; }, [joinTarget]);

    const compatibleTargets = useMemo(() => {
        if (!joinSource) return new Set<string>();
        const targets = new Set<string>();
        if (schemas) {
            Object.entries(schemas).forEach(([tableName, columns]) => {
                if (tableName !== joinSource.table) {
                    columns.forEach(col => targets.add(`${tableName}-${col.name}`));
                }
            });
        }
        return targets;
    }, [joinSource, schemas]);

    useEffect(() => {
        chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
    }, [conversation]);

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
                onOpenJoinModal({
                    table1: joinSourceRef.current.table,
                    column1: joinSourceRef.current.column,
                    table2: joinTargetRef.current.table,
                    column2: joinTargetRef.current.column,
                });
            }
        }
        setJoinSource(null);
        setDrawingLine(null);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    }, [onOpenJoinModal]);

    const handleColumnMouseDown = useCallback((table: string, column: string) => {
        setJoinSource({ table, column });
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }, [handleMouseMove, handleMouseUp]);

    const handleCardDrag = (tableName: string, newPosition: Point) => {
      setCardPositions(prev => ({ ...prev, [tableName]: newPosition }));
    };

    const handleAutoLayout = () => {
        if (!schemas || Object.keys(schemas).length === 0) return;

        const tableNames = Object.keys(schemas);
        const cardWidth = 288;
        const cardHeight = 280;
        const padding = 60;
        const canvasWidth = canvasRef.current?.clientWidth || 1000;

        const adjList = new Map<string, string[]>();
        tableNames.forEach(name => adjList.set(name, []));
        joins.forEach(join => {
            adjList.get(join.table1)?.push(join.table2);
            adjList.get(join.table2)?.push(join.table1);
        });

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
            if (componentHeight > maxRowHeight) maxRowHeight = componentHeight;
        });

        setCardPositions(newPositions);
    };

    const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isResizing.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', handleResizeMouseMove);
        document.addEventListener('mouseup', handleResizeMouseUp);
    }, []);

    const handleResizeMouseMove = useCallback((e: MouseEvent) => {
        if (!isResizing.current) return;
        const newWidth = window.innerWidth - e.clientX;
        if (newWidth > 400 && newWidth < 1200) {
            setResultsPanelWidth(newWidth);
        }
    }, [setResultsPanelWidth]);

    const handleResizeMouseUp = useCallback(() => {
        isResizing.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', handleResizeMouseMove);
        document.removeEventListener('mouseup', handleResizeMouseUp);
    }, []);

    return (
        <div className="flex flex-col h-full bg-transparent overflow-hidden">
            <div className="flex-1 flex overflow-hidden">
                <aside className="w-96 flex-shrink-0 bg-secondary-background/50 border-r border-border flex flex-col">
                    {children}
                </aside>

                <main className="flex-1 relative overflow-hidden">
                    <div ref={canvasRef} className="h-full w-full overflow-auto relative bg-dot-grid">
                        {isLoading && <div className="absolute inset-0 z-30 bg-white/50 flex justify-center items-center"><Loader2 className="animate-spin text-primary" size={24} /><span className="ml-2 text-text-secondary">{loadingText}</span></div>}
                        {pageError && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-full max-w-md p-4">
                                <div className="flex items-start text-danger bg-danger/10 p-4 rounded-lg border border-danger/20 shadow-lg">
                                    <AlertTriangle size={20} className="mr-3 flex-shrink-0 mt-0.5" />
                                    <div><h4 className="font-semibold">Error</h4><p className="text-sm mt-1">{pageError}</p></div>
                                </div>
                            </div>
                        )}
                        
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
                                        displayName={tableNameMap[tableName] || tableName}
                                        schema={schemas[tableName]}
                                        position={cardPositions[tableName]}
                                        onDrag={handleCardDrag}
                                        onDragStart={setDraggedTable}
                                        onDragEnd={() => setDraggedTable(null)}
                                        onColumnMouseDown={handleColumnMouseDown}
                                        onColumnMouseUp={() => {}}
                                        onColumnEnter={setJoinTarget}
                                        onColumnLeave={() => setJoinTarget(null)}
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
                    <aside className="flex-shrink-0 flex animate-scale-in" style={{ width: `${resultsPanelWidth}px` }}>
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
                                            <div className="flex items-start group"><div className="w-10 h-10 rounded-full bg-background text-primary border border-border flex items-center justify-center mr-3 flex-shrink-0"><Bot size={20} /></div><div className="flex-1 min-w-0"><ConversationTurnDisplay turn={turn} onExecute={onExecuteSql} onGenerateInsights={onGenerateInsights} onGenerateChart={onGenerateChart} /></div></div>
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </aside>
                )}
            </div>

            <div className="flex-shrink-0">
                <ChatInput value={question} onChange={setQuestion} onSend={onSend} isLoading={isChatDisabled} placeholder={placeholder} disabled={isChatDisabled}/>
            </div>
        </div>
    );
};

export default DataModelingCanvas;