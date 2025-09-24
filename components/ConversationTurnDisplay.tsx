import React from 'react';
import { ConversationTurn } from '../types';
import { Loader2, AlertTriangle } from 'lucide-react';
import SQLApproval from './SQLApproval';
import ResultsDisplay from './ResultsDisplay';

const ThinkingIndicator = () => (
  <div className="flex items-center space-x-2 p-4">
    <div className="w-2.5 h-2.5 bg-primary/40 rounded-full animate-pulse" style={{ animationDelay: '0s', animationDuration: '1s' }}></div>
    <div className="w-2.5 h-2.5 bg-primary/40 rounded-full animate-pulse" style={{ animationDelay: '0.2s', animationDuration: '1s' }}></div>
    <div className="w-2.5 h-2.5 bg-primary/40 rounded-full animate-pulse" style={{ animationDelay: '0.4s', animationDuration: '1s' }}></div>
  </div>
);

const ConversationTurnDisplay: React.FC<{
  turn: ConversationTurn;
  onExecute: (turnId: string, sql: string) => void;
  onGenerateInsights: (turnId: string) => void;
  onGenerateChart: (turnId: string) => void;
}> = ({
  turn,
  onExecute,
  onGenerateInsights,
  onGenerateChart
}) => {
  switch (turn.state) {
    case 'sql_generating':
    case 'executing':
      return (
        <div className="bg-card/90 backdrop-blur-xl border border-border rounded-xl shadow-medium inline-flex items-center">
          <ThinkingIndicator />
          <span className="ml-0 mr-4 text-text-secondary text-sm font-medium">
            {turn.state === 'sql_generating' ? 'Thinking...' : 'Executing...'}
          </span>
        </div>
      );
    case 'sql_ready':
      return turn.sqlResult ? (
        <SQLApproval
          sqlResult={turn.sqlResult}
          onExecute={(sql) => onExecute(turn.id, sql)}
        />
      ) : null;
    case 'complete':
      return turn.analysisResult ? (
        <ResultsDisplay
          turn={turn}
          onGenerateInsights={onGenerateInsights}
          onGenerateChart={onGenerateChart}
        />
      ) : null;
    case 'error':
      return (
        <div className="flex items-start text-danger bg-danger/10 p-4 rounded-lg border border-danger/20">
          <AlertTriangle size={20} className="mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold">An Error Occurred</h4>
            <p className="text-sm mt-1">{turn.error}</p>
          </div>
        </div>
      );
    default:
      return null;
  }
};

export default ConversationTurnDisplay;