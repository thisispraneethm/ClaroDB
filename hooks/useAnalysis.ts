
import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { TableSchema, ConversationTurn, InsightGenerationResult, ChartGenerationWithMetadataResult, Join } from '../types';
import { DataHandler } from '../services/handlers/base';
import { LLMProvider } from '../services/llm/base';

interface UseAnalysisProps {
    handler: DataHandler;
    llmProvider: LLMProvider;
    conversation: ConversationTurn[];
    setConversation: React.Dispatch<React.SetStateAction<ConversationTurn[]>>;
    history: { role: string, content: string }[];
    setHistory: React.Dispatch<React.SetStateAction<{ role: string, content: string }[]>>;
}

export const useAnalysis = ({ handler, llmProvider, conversation, setConversation, history, setHistory }: UseAnalysisProps) => {
  const abortControllers = React.useRef<Record<string, AbortController>>({});

  const askQuestion = async (currentQuestion: string, schemas: TableSchema, joins?: Join[]) => {
    if (!currentQuestion.trim()) return;

    const turnId = uuidv4();
    const newTurn: ConversationTurn = {
      id: turnId,
      question: currentQuestion,
      state: 'sql_generating',
    };
    setConversation(prev => [...prev, newTurn]);

    const controller = new AbortController();
    abortControllers.current[turnId] = controller;

    try {
      const previewData: Record<string, Record<string, any>[]> = {};
      for (const tableName of Object.keys(schemas)) {
        if (controller.signal.aborted) return;
        try {
          previewData[tableName] = await handler.getPreview(tableName, 3);
        } catch (e) {
          console.warn(`Could not fetch preview for table ${tableName}:`, e);
        }
      }

      if (controller.signal.aborted) return;

      // Fetch corrections to provide as learning examples
      const corrections = await handler.getCorrections(5);

      const sqlResult = await llmProvider.generateSQL(currentQuestion, schemas, handler.getDialect(), history, previewData, joins, corrections);
      
      if (controller.signal.aborted) return;

      setConversation(prev => prev.map(t => 
        t.id === turnId ? { ...t, state: 'sql_ready', sqlResult, correctedQuestion: sqlResult.correctedQuestion } : t
      ));
    } catch (e: any) {
      if (controller.signal.aborted) return;
      setConversation(prev => prev.map(t => 
        t.id === turnId ? { ...t, state: 'error', error: e.message } : t
      ));
    } finally {
      delete abortControllers.current[turnId];
    }
  };
  
  const executeApprovedSql = async (turnId: string, sqlToExecute: string) => {
    const turn = conversation.find(t => t.id === turnId);
    if (!turn || !turn.sqlResult) return;

    const isCorrection = turn.sqlResult.sql.trim() !== sqlToExecute.trim();

    setConversation(prev => prev.map(t => 
      t.id === turnId ? { ...t, state: 'executing' } : t
    ));

    const controller = new AbortController();
    abortControllers.current[turnId] = controller;

    try {
      const data = await handler.executeQuery(sqlToExecute);
      
      if (controller.signal.aborted) return;

      const analysisResult = { sqlResult: turn.sqlResult, data };

      setConversation(prev => prev.map(t => 
        t.id === turnId ? { ...t, state: 'complete', analysisResult } : t
      ));
      
      const questionForHistory = turn.correctedQuestion || turn.question;

      // If the user corrected the SQL, save the correction
      if (isCorrection) {
        await handler.addCorrection({ question: questionForHistory, sql: sqlToExecute });
      }

      // Add the executed query (corrected or not) to the history
      setHistory(prev => [...prev, { role: 'user', content: questionForHistory }, { role: 'assistant', content: sqlToExecute }]);

    } catch (e: any) {
      if (controller.signal.aborted) return;
      setConversation(prev => prev.map(t => 
        t.id === turnId ? { ...t, state: 'error', error: e.message } : t
      ));
    } finally {
      delete abortControllers.current[turnId];
    }
  };

  const generateInsightsForTurn = async (turnId: string) => {
    const turn = conversation.find(t => t.id === turnId);
    if (!turn?.analysisResult || turn.insightsLoading) return;

    setConversation(prev => prev.map(t => t.id === turnId ? { ...t, insightsLoading: true } : t));
    
    const controller = new AbortController();
    abortControllers.current[`insights-${turnId}`] = controller;

    try {
        const insightsResult = await llmProvider.generateInsights(turn.question, turn.analysisResult.data);
        if (controller.signal.aborted) return;
        setConversation(prev => prev.map(t => t.id === turnId ? { ...t, insightsResult, insightsLoading: false } : t));
    } catch (e: any) {
        if (controller.signal.aborted) return;
        const errorResult: InsightGenerationResult = {
            insights: `*Error generating insights: ${e.message}*`,
            model: 'N/A', cost: 0, prompt_tokens: 0, completion_tokens: 0
        };
        setConversation(prev => prev.map(t => t.id === turnId ? { ...t, insightsResult: errorResult, insightsLoading: false } : t));
    } finally {
        delete abortControllers.current[`insights-${turnId}`];
    }
  };

  const generateChartForTurn = async (turnId: string) => {
    const turn = conversation.find(t => t.id === turnId);
    if (!turn?.analysisResult || turn.chartLoading) return;
    
    setConversation(prev => prev.map(t => t.id === turnId ? { ...t, chartLoading: true } : t));

    const controller = new AbortController();
    abortControllers.current[`chart-${turnId}`] = controller;

    try {
        const chartResult = await llmProvider.generateChart(turn.question, turn.analysisResult.data);
        if (controller.signal.aborted) return;
        setConversation(prev => prev.map(t => t.id === turnId ? { ...t, chartResult, chartLoading: false } : t));
    } catch (e: any) {
        if (controller.signal.aborted) return;
        console.error("Chart generation failed:", e.message);
        const errorResult: ChartGenerationWithMetadataResult = {
            chartConfig: null, model: 'N/A', cost: 0, prompt_tokens: 0, completion_tokens: 0
        };
        setConversation(prev => prev.map(t => t.id === turnId ? { ...t, chartResult: errorResult, chartLoading: false } : t));
    } finally {
        delete abortControllers.current[`chart-${turnId}`];
    }
  };

  const resetConversation = () => {
    // Abort all pending operations
    Object.values(abortControllers.current).forEach(c => c.abort());
    abortControllers.current = {};
    
    setConversation([]);
    setHistory([]);
  }

  React.useEffect(() => {
    return () => {
        Object.values(abortControllers.current).forEach(c => c.abort());
    };
  }, []);

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