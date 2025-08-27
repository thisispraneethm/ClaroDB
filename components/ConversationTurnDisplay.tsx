import React from 'react';
import { ConversationTurn } from '../types';
import { Loader2, AlertTriangle } from 'lucide-react';
import SQLApproval from './SQLApproval';
import ResultsDisplay from './ResultsDisplay';

interface ConversationTurnDisplayProps {
  turn: ConversationTurn;
  onExecute: (turnId: string, sql: string) => void;
  onGenerateInsights: (turnId: string) => void;
  onGenerateChart: (turnId: string) => void;
}

const ConversationTurnDisplay: React.FC<ConversationTurnDisplayProps> = ({
  turn,
  onExecute,
  onGenerateInsights,
  onGenerateChart
}) => {
  switch (turn.state) {
    case 'sql_generating':
    case 'executing':
      return (
        <div className="flex items-center p-4 bg-card/80 backdrop-blur-xl border border-white/20 rounded-xl shadow-card">
          <Loader2 className="animate-spin text-primary" size={20} />
          <span className="ml-3 text-text-secondary text-sm font-medium">
            {turn.state === 'sql_generating' ? 'Generating SQL...' : 'Executing query...'}
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