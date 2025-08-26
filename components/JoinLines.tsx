import React, { useLayoutEffect, useState } from 'react';
import { Join, Point } from '../types';

interface JoinLinesProps {
  joins: Join[];
  drawingLine: { start: Point; end: Point } | null;
  hoveredJoinId: string | null;
}

interface LinePosition {
  id: string;
  p1: Point;
  p2: Point;
}

const JoinLines: React.FC<JoinLinesProps> = ({ joins, drawingLine, hoveredJoinId }) => {
  const [linePositions, setLinePositions] = useState<LinePosition[]>([]);

  useLayoutEffect(() => {
    const calculatePositions = () => {
      const newPositions: LinePosition[] = [];
      joins.forEach(join => {
        const el1 = document.getElementById(`col-${join.table1}-${join.column1}`);
        const el2 = document.getElementById(`col-${join.table2}-${join.column2}`);
        const canvas = el1?.closest('div[class*="overflow-auto"]');
        
        if (el1 && el2 && canvas) {
          const canvasRect = canvas.getBoundingClientRect();
          const rect1 = el1.getBoundingClientRect();
          const rect2 = el2.getBoundingClientRect();
          
          const p1 = {
            x: rect1.left + rect1.width - canvasRect.left + canvas.scrollLeft,
            y: rect1.top + rect1.height / 2 - canvasRect.top + canvas.scrollTop,
          };
          const p2 = {
            x: rect2.left - canvasRect.left + canvas.scrollLeft,
            y: rect2.top + rect2.height / 2 - canvasRect.top + canvas.scrollTop,
          };
          newPositions.push({ id: join.id, p1, p2 });
        }
      });
      setLinePositions(newPositions);
    };

    calculatePositions();

    const canvasEl = document.querySelector('div[class*="overflow-auto"]');
    if (canvasEl) {
      const observer = new MutationObserver(calculatePositions);
      observer.observe(canvasEl, { attributes: true, childList: true, subtree: true });
      window.addEventListener('resize', calculatePositions);
      canvasEl.addEventListener('scroll', calculatePositions);

      return () => {
        observer.disconnect();
        window.removeEventListener('resize', calculatePositions);
        canvasEl.removeEventListener('scroll', calculatePositions);
      };
    }
  }, [joins]);

  return (
    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      
      {linePositions.map(({ id, p1, p2 }) => {
        const isHovered = id === hoveredJoinId;
        return (
          <g key={id} style={{ filter: isHovered ? 'url(#glow)' : 'none', transition: 'filter 0.2s ease-in-out' }}>
            <path
              d={`M ${p1.x} ${p1.y} C ${p1.x + 50} ${p1.y}, ${p2.x - 50} ${p2.y}, ${p2.x} ${p2.y}`}
              stroke="#007AFF"
              strokeWidth={isHovered ? "4" : "2.5"}
              fill="none"
              className="animate-fade-in-line"
              style={{
                strokeOpacity: isHovered ? 1 : 0.7,
                transition: 'stroke-width 0.2s ease-in-out, stroke-opacity 0.2s ease-in-out'
              }}
            />
          </g>
        );
      })}
      
      {drawingLine && (
        <path
          d={`M ${drawingLine.start.x} ${drawingLine.start.y} C ${drawingLine.start.x + 20} ${drawingLine.start.y}, ${drawingLine.end.x - 20} ${drawingLine.end.y}, ${drawingLine.end.x} ${drawingLine.end.y}`}
          stroke="#5856d6"
          strokeWidth="2"
          strokeDasharray="5 5"
          fill="none"
        />
      )}
    </svg>
  );
};

export default JoinLines;