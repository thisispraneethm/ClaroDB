import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ColumnSchema, Point } from '../types';
import { Table2, GripVertical } from 'lucide-react';
import DataTypeIcon from './DataTypeIcon';

interface InteractiveSchemaCardProps {
  tableName: string;
  displayName: string;
  schema: ColumnSchema[];
  position: Point;
  onDrag: (tableName: string, newPosition: Point) => void;
  onDragStart?: (tableName: string) => void;
  onDragEnd?: () => void;
  onColumnMouseDown: (tableName: string, columnName: string) => void;
  onColumnMouseUp: (tableName: string, columnName: string) => void;
  onColumnEnter: (target: { table: string, column: string } | null) => void;
  onColumnLeave: () => void;
  isSource: boolean;
  sourceColumn: string | null;
  compatibleTargets: Set<string>;
  activeJoinColumns: Set<string>;
}

const InteractiveSchemaCard: React.FC<InteractiveSchemaCardProps> = React.memo(({
  tableName,
  displayName,
  schema,
  position,
  onDrag,
  onDragStart,
  onDragEnd,
  onColumnMouseDown,
  onColumnMouseUp,
  onColumnEnter,
  onColumnLeave,
  isSource,
  sourceColumn,
  compatibleTargets,
  activeJoinColumns,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef<Point>({ x: 0, y: 0 });
  const offsetRef = useRef<Point>({ x: 0, y: 0 });
  
  // Refs to hold current listeners so we can remove them in cleanup
  const mouseMoveListenerRef = useRef<((e: MouseEvent) => void) | null>(null);
  const mouseUpListenerRef = useRef<((e: MouseEvent) => void) | null>(null);

  const cleanupListeners = useCallback(() => {
    if (mouseMoveListenerRef.current) {
      window.removeEventListener('mousemove', mouseMoveListenerRef.current);
      mouseMoveListenerRef.current = null;
    }
    if (mouseUpListenerRef.current) {
      window.removeEventListener('mouseup', mouseUpListenerRef.current);
      mouseUpListenerRef.current = null;
    }
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onDragStart?.(tableName);
    dragStartPos.current = {
      x: e.clientX,
      y: e.clientY,
    };
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      setIsDragging(true);
      offsetRef.current = {
          x: moveEvent.clientX - dragStartPos.current.x,
          y: moveEvent.clientY - dragStartPos.current.y,
      };
      // Force render for smooth drag
      setIsDragging(prev => prev); 
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      const finalPosition = {
        x: position.x + (upEvent.clientX - dragStartPos.current.x),
        y: position.y + (upEvent.clientY - dragStartPos.current.y),
      };
      onDrag(tableName, finalPosition);

      setIsDragging(false);
      offsetRef.current = { x: 0, y: 0 };
      cleanupListeners();
      onDragEnd?.();
    };

    mouseMoveListenerRef.current = handleMouseMove;
    mouseUpListenerRef.current = handleMouseUp;

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [position, onDrag, tableName, onDragStart, onDragEnd, cleanupListeners]);

  // Clean up listeners if component unmounts while dragging
  useEffect(() => {
      return () => {
          cleanupListeners();
      }
  }, [cleanupListeners]);
  
  const currentPosition = {
    left: position.x + (isDragging ? offsetRef.current.x : 0),
    top: position.y + (isDragging ? offsetRef.current.y : 0),
  };

  return (
    <div
      className={`absolute bg-card/80 backdrop-blur-xl border border-white/20 rounded-xl shadow-lg w-72 flex flex-col transition-shadow duration-200 hover:shadow-xl hover:scale-[1.02] select-none`}
      style={{
        left: currentPosition.left,
        top: currentPosition.top,
        cursor: isDragging ? 'grabbing' : 'default',
        zIndex: isDragging ? 50 : (activeJoinColumns.size > 0 ? 40 : 10),
        boxShadow: activeJoinColumns.size > 0 ? '0 0 20px 5px rgba(0, 122, 255, 0.25)' : undefined,
        transition: isDragging ? 'none' : 'all 0.2s',
      }}
    >
      <div
        className="flex items-center gap-2 p-3 border-b border-black/5"
        onMouseDown={handleMouseDown}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <GripVertical size={18} className="text-text-secondary/50" />
        <Table2 size={16} className="text-text" />
        <h3 className="font-semibold text-md text-text truncate flex-1" title={displayName}>
          {displayName}
        </h3>
      </div>
      <div className="space-y-1 p-2 flex-1 overflow-y-auto max-h-[220px]">
        {schema.map((col) => {
          const isCompatible = compatibleTargets.has(`${tableName}-${col.name}`);
          const isActiveJoin = activeJoinColumns.has(`${tableName}-${col.name}`);
          const isSourceCol = isSource && sourceColumn === col.name;
          
          return (
            <div
              key={col.name}
              id={`col-${tableName}-${col.name}`}
              className={`flex justify-between items-center text-sm p-1.5 rounded-md transition-all duration-150 relative group ${
                isSourceCol ? 'bg-primary/20' : ''
              } ${
                isActiveJoin ? 'bg-primary/20 font-semibold' : ''
              }`}
              onMouseDown={(e) => {
                  // Only allow starting a join drag from the right edge of the column item
                  if (e.currentTarget.clientWidth - e.nativeEvent.offsetX < 30) {
                      e.preventDefault(); 
                      e.stopPropagation(); 
                      onColumnMouseDown(tableName, col.name);
                  }
              }}
              onMouseUp={() => onColumnMouseUp(tableName, col.name)}
              onMouseEnter={() => onColumnEnter({ table: tableName, column: col.name })}
              onMouseLeave={onColumnLeave}
            >
              <div className="flex items-center gap-2 overflow-hidden pointer-events-none">
                  <DataTypeIcon type={col.type} />
                  <span className="text-text font-medium truncate pr-2">{col.name}</span>
              </div>
              <div 
                className="w-3 h-3 bg-secondary-background border-2 border-primary/50 rounded-full right-2 absolute opacity-0 group-hover:opacity-100 transition-opacity hover:scale-125 hover:bg-primary hover:border-white cursor-crosshair"
                title="Drag to connect"
              ></div>
              {isCompatible && <div className="absolute inset-0 rounded-md animate-pulse-glow pointer-events-none border border-primary/50"></div>}
            </div>
          );
        })}
        {schema.length === 0 && <span className="text-xs text-text-secondary p-2">No columns found.</span>}
      </div>
    </div>
  );
});

export default InteractiveSchemaCard;