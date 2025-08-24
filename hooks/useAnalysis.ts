
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { TableSchema, ConversationTurn, InsightGenerationResult, ChartGenerationWithMetadataResult, Join } from '../types';
import { DataHandler } from '../services/handlers/base';
import { LLMProvider } from '../services/llm/base';

interface UseAnalysisProps {
    handler: DataHandler;
    llmProvider: LLMProvider;
    conversation: ConversationTurn[];
    setConversation: React.Dispatch<React.SetStateAction<ConversationTurn[]>>;
}

export const useAnalysis = ({ handler, llmProvider, conversation, setConversation }: UseAnalysisProps) => {
  const [history, setHistory] = useState<{ role: string, content: string }[]>([]);

  const askQuestion = async (currentQuestion: string, schemas: TableSchema, joins?: Join[]) => {
    if (!currentQuestion.trim()) return;

    const turnId = uuidv4();
    const newTurn: ConversationTurn = {
      id: turnId,
      question: currentQuestion,
      state: 'sql_generating',
    };
    setConversation(prev => [...prev, newTurn]);

    try {
      const previewData: Record<string, Record<string, any>[]> = {};
      for (const tableName of Object.keys(schemas)) {
        try {
          previewData[tableName] = await handler.getPreview(tableName, 3);
        } catch (e) {
          console.warn(`Could not fetch preview for table ${tableName}:`, e);
        }
      }

      const sqlResult = await llmProvider.generateSQL(currentQuestion, schemas, handler.getDialect(), history, previewData, joins);
      setConversation(prev => prev.map(t => 
        t.id === turnId ? { ...t, state: 'sql_ready', sqlResult } : t
      ));
    } catch (e: any) {
      setConversation(prev => prev.map(t => 
        t.id === turnId ? { ...t, state: 'error', error: e.message } : t
      ));
    }
  };
  
  const executeApprovedSql = async (turnId: string) => {
    const turn = conversation.find(t => t.id === turnId);
    if (!turn || !turn.sqlResult) return;

    setConversation(prev => prev.map(t => 
      t.id === turnId ? { ...t, state: 'executing' } : t
    ));

    try {
      const data = await handler.executeQuery(turn.sqlResult.sql);
      const analysisResult = { sqlResult: turn.sqlResult, data };

      setConversation(prev => prev.map(t => 
        t.id === turnId ? { ...t, state: 'complete', analysisResult } : t
      ));

      setHistory(prev => [...prev, { role: 'user', content: turn.question }, { role: 'assistant', content: turn.sqlResult!.sql }]);

    } catch (e: any) {
      setConversation(prev => prev.map(t => 
        t.id === turnId ? { ...t, state: 'error', error: e.message } : t
      ));
    }
  };

  const generateInsightsForTurn = async (turnId: string) => {
    const turn = conversation.find(t => t.id === turnId);
    if (!turn?.analysisResult) return;

    setConversation(prev => prev.map(t => t.id === turnId ? { ...t, insightsLoading: true } : t));
    try {
        const insightsResult = await llmProvider.generateInsights(turn.question, turn.analysisResult.data);
        setConversation(prev => prev.map(t => t.id === turnId ? { ...t, insightsResult, insightsLoading: false } : t));
    } catch (e: any) {
        const errorResult: InsightGenerationResult = {
            insights: `*Error generating insights: ${e.message}*`,
            model: 'N/A', cost: 0, prompt_tokens: 0, completion_tokens: 0
        };
        setConversation(prev => prev.map(t => t.id === turnId ? { ...t, insightsResult: errorResult, insightsLoading: false } : t));
    }
  };

  const generateChartForTurn = async (turnId: string) => {
    const turn = conversation.find(t => t.id === turnId);
    if (!turn?.analysisResult) return;
    
    setConversation(prev => prev.map(t => t.id === turnId ? { ...t, chartLoading: true } : t));
    try {
        const chartResult = await llmProvider.generateChart(turn.question, turn.analysisResult.data);
        setConversation(prev => prev.map(t => t.id === turnId ? { ...t, chartResult, chartLoading: false } : t));
    } catch (e: any) {
        console.error("Chart generation failed:", e.message);
        const errorResult: ChartGenerationWithMetadataResult = {
            chartConfig: null, model: 'N/A', cost: 0, prompt_tokens: 0, completion_tokens: 0
        };
        setConversation(prev => prev.map(t => t.id === turnId ? { ...t, chartResult: errorResult, chartLoading: false } : t));
    }
  };

  const resetConversation = () => {
    setConversation([]);
    setHistory([]);
  }

  const isProcessing = conversation.some(t => t.state === 'sql_generating' || t.state === 'executing');

  return {
    askQuestion,
    executeApprovedSql,
    generateInsightsForTurn,
    generateChartForTurn,
    resetConversation,
    isProcessing
  };
};
