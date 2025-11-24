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
  const [dragState, setDragState] = useState<{ isDragging: boolean; offset: Point }>({ isDragging: false, offset: { x: 0, y: 0 } });
  const dragStartPos = useRef<Point>({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onDragStart?.(tableName);
    dragStartPos.current = {
      x: e.clientX,
      y: e.clientY,
    };
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      setDragState({
        isDragging: true,
        offset: {
          x: moveEvent.clientX - dragStartPos.current.x,
          y: moveEvent.clientY - dragStartPos.current.y,
        }
      });
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      const finalPosition = {
        x: position.x + (upEvent.clientX - dragStartPos.current.x),
        y: position.y + (upEvent.clientY - dragStartPos.current.y),
      };
      onDrag(tableName, finalPosition);

      setDragState({ isDragging: false, offset: { x: 0, y: 0 } });
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      onDragEnd?.();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [position, onDrag, tableName, onDragStart, onDragEnd]);

  // Clean up listeners if component unmounts while dragging
  useEffect(() => {
      return () => {
          // Note: We can't easily remove specific anonymous listeners created in handleMouseDown 
          // without storing them in refs, but standard browser behavior will GC them when the 
          // DOM nodes they are attached to are removed, or when the window unloads. 
          // Since we attach to window, explicit cleanup is safer if we extracted the handlers, 
          // but for this interaction model, checking the dragging state is a reasonable safeguard.
          if (dragState.isDragging) {
              onDragEnd?.();
          }
      }
  }, [dragState.isDragging, onDragEnd]);
  
  const currentPosition = {
    left: position.x + dragState.offset.x,
    top: position.y + dragState.offset.y,
  };

  return (
    <div
      className={`absolute bg-card/80 backdrop-blur-xl border border-white/20 rounded-xl shadow-lg w-72 flex flex-col transition-shadow duration-200 hover:shadow-xl hover:scale-[1.02] select-none`}
      style={{
        left: currentPosition.left,
        top: currentPosition.top,
        cursor: dragState.isDragging ? 'grabbing' : 'default',
        zIndex: dragState.isDragging ? 50 : (activeJoinColumns.size > 0 ? 40 : 10),
        boxShadow: activeJoinColumns.size > 0 ? '0 0 20px 5px rgba(0, 122, 255, 0.25)' : undefined,
        transition: dragState.isDragging ? 'none' : 'all 0.2s',
      }}
    >
      <div
        className="flex items-center gap-2 p-3 border-b border-black/5"
        onMouseDown={handleMouseDown}
        style={{ cursor: dragState.isDragging ? 'grabbing' : 'grab' }}
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
                  if (e.currentTarget.clientWidth - e.nativeEvent.offsetX < 15) {
                    return;
                  }
                  e.preventDefault(); 
                  e.stopPropagation(); 
                  onColumnMouseDown(tableName, col.name);
              }}
              onMouseUp={() => onColumnMouseUp(tableName, col.name)}
              onMouseEnter={() => onColumnEnter({ table: tableName, column: col.name })}
              onMouseLeave={onColumnLeave}
              style={{ cursor: 'crosshair' }}
            >
              <div className="flex items-center gap-2 overflow-hidden pointer-events-none">
                  <DataTypeIcon type={col.type} />
                  <span className="text-text font-medium truncate pr-2">{col.name}</span>
              </div>
              <div className="w-2.5 h-2.5 bg-white border-2 border-primary/50 rounded-full right-2 absolute opacity-0 group-hover:opacity-100 transition-opacity"></div>
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