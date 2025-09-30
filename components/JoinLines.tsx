import React, { useLayoutEffect, useRef, useState, useCallback } from 'react';
import { Join, Point } from '../types';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

interface LinePosition {
  id: string;
  p1: Point;
  p2: Point;
  join: Join;
}

interface JoinLinesProps {
  joins: Join[];
  drawingLine: { start: Point; end: Point } | null;
  hoveredJoinId: string | null;
  cardPositions: Record<string, Point>;
  draggedTable: string | null;
}

const JoinLines: React.FC<JoinLinesProps> = ({ joins, drawingLine, hoveredJoinId, cardPositions, draggedTable }) => {
  const [linePositions, setLinePositions] = useState<LinePosition[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const animatedPositionsRef = useRef<Record<string, { p1: Point; p2: Point }>>({});

  const getTargetPositions = useCallback(() => {
    const canvas = svgRef.current?.parentElement;
    if (!canvas) return {};
    
    const targets: Record<string, { p1: Point; p2: Point; join: Join }> = {};
    const canvasRect = canvas.getBoundingClientRect();

    joins.forEach(join => {
      const el1 = document.getElementById(`col-${join.table1}-${join.column1}`);
      const el2 = document.getElementById(`col-${join.table2}-${join.column2}`);

      if (el1 && el2) {
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
        targets[join.id] = { p1, p2, join };
      }
    });
    return targets;
  }, [joins]);

  useLayoutEffect(() => {
    let animationFrameId: number;

    const animate = () => {
      const targets = getTargetPositions();
      const currentAnimated = animatedPositionsRef.current;

      // Initialize or update animated positions
      for (const id in targets) {
        if (!currentAnimated[id]) {
          currentAnimated[id] = { p1: targets[id].p1, p2: targets[id].p2 };
        }
        
        currentAnimated[id].p1.x = lerp(currentAnimated[id].p1.x, targets[id].p1.x, 0.2);
        currentAnimated[id].p1.y = lerp(currentAnimated[id].p1.y, targets[id].p1.y, 0.2);
        currentAnimated[id].p2.x = lerp(currentAnimated[id].p2.x, targets[id].p2.x, 0.2);
        currentAnimated[id].p2.y = lerp(currentAnimated[id].p2.y, targets[id].p2.y, 0.2);
      }
      
      // Garbage collect deleted joins
      for (const id in currentAnimated) {
          if (!targets[id]) {
              delete currentAnimated[id];
          }
      }

      // Create new positions array for rendering
      const newPositions = Object.keys(currentAnimated).map(id => {
        const points = currentAnimated[id];
        return {
            id,
            p1: points.p1,
            p2: points.p2,
            join: joins.find(j => j.id === id)!,
        };
      }).filter(p => p.join);

      setLinePositions(newPositions);

      animationFrameId = requestAnimationFrame(animate);
    };

    // Start the animation loop
    animationFrameId = requestAnimationFrame(animate);

    // Cleanup function to cancel the animation frame on component unmount or dependency change
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [joins, cardPositions, getTargetPositions]);

  return (
    <svg ref={svgRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
      <defs>
        <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#5856D6" />
          <stop offset="100%" stopColor="#007AFF" />
        </linearGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" result="coloredBlur" in="SourceGraphic" />
            <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
            </feMerge>
        </filter>
      </defs>
      
      {linePositions.map(({ id, p1, p2, join }) => {
        const isHot = id === hoveredJoinId || join.table1 === draggedTable || join.table2 === draggedTable;
        const dx = Math.abs(p2.x - p1.x) * 0.4;
        const pathData = `M ${p1.x} ${p1.y} C ${p1.x + dx} ${p1.y}, ${p2.x - dx} ${p2.y}, ${p2.x} ${p2.y}`;
        
        return (
          <g key={id} className="transition-all duration-200" style={{ filter: isHot ? 'url(#glow)' : 'none' }}>
            <path
              d={pathData}
              stroke="url(#line-gradient)"
              strokeWidth={isHot ? 3.5 : 2}
              strokeOpacity={isHot ? 1 : 0.7}
              fill="none"
              className="transition-all duration-200"
            />
            <circle cx={p1.x} cy={p1.y} r={isHot ? 5 : 4} fill="white" stroke={isHot ? "#5856D6" : "#007AFF"} strokeWidth="1.5" className="transition-all duration-200" />
            <circle cx={p2.x} cy={p2.y} r={isHot ? 5 : 4} fill="white" stroke={isHot ? "#007AFF" : "#5856D6"} strokeWidth="1.5" className="transition-all duration-200" />
          </g>
        );
      })}
      
      {drawingLine && (
        <path
          d={`M ${drawingLine.start.x} ${drawingLine.start.y} C ${drawingLine.start.x + 40} ${drawingLine.start.y}, ${drawingLine.end.x - 40} ${drawingLine.end.y}, ${drawingLine.end.x} ${drawingLine.end.y}`}
          stroke="#5856d6"
          strokeWidth="2"
          strokeDasharray="6 6"
          fill="none"
        />
      )}
    </svg>
  );
};

export default JoinLines;