import React, { useState, useCallback, useRef } from 'react';
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

const InteractiveSchemaCard: React.FC<InteractiveSchemaCardProps> = ({
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
  const dragStartOffset = useRef<Point>({ x: 0, y: 0 });
  const animationFrameRef = useRef<number | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onDragStart?.(tableName);
    setIsDragging(true);
    dragStartOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = requestAnimationFrame(() => {
        onDrag(tableName, {
          x: moveEvent.clientX - dragStartOffset.current.x,
          y: moveEvent.clientY - dragStartOffset.current.y,
        });
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      onDragEnd?.();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [position.x, position.y, onDrag, tableName, onDragStart, onDragEnd]);
  

  return (
    <div
      className={`absolute bg-card/80 backdrop-blur-xl border border-white/20 rounded-xl shadow-lg w-72 flex flex-col transition-all duration-200 hover:shadow-xl hover:scale-[1.02] select-none`}
      style={{
        left: position.x,
        top: position.y,
        cursor: isDragging ? 'grabbing' : 'default',
        zIndex: isDragging ? 20 : 10,
        boxShadow: activeJoinColumns.size > 0 ? '0 0 20px 5px rgba(0, 122, 255, 0.25)' : undefined
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
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onColumnMouseDown(tableName, col.name); }}
              onMouseUp={() => onColumnMouseUp(tableName, col.name)}
              onMouseEnter={() => onColumnEnter({ table: tableName, column: col.name })}
              onMouseLeave={onColumnLeave}
              style={{ cursor: 'crosshair' }}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                  <DataTypeIcon type={col.type} />
                  <span className="text-text font-medium truncate pr-2">{col.name}</span>
              </div>
              <div className="w-2.5 h-2.5 bg-white border-2 border-primary/50 rounded-full right-2 absolute opacity-0 group-hover:opacity-100 transition-opacity"></div>
              {isCompatible && <div className="absolute inset-0 rounded-md animate-pulse-glow pointer-events-none"></div>}
            </div>
          );
        })}
        {schema.length === 0 && <span className="text-xs text-text-secondary p-2">No columns found.</span>}
      </div>
    </div>
  );
};

export default React.memo(InteractiveSchemaCard);