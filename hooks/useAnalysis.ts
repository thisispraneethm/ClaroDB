import { v4 as uuidv4 } from 'uuid';
import { TableSchema, ConversationTurn, InsightGenerationResult, ChartGenerationWithMetadataResult, Join, ChartGenerationResult } from '../types';
import { DataHandler } from '../services/handlers/base';
import { LLMProvider } from '../services/llm/base';
import { Chat } from '@google/genai';
import { useToast } from '../contexts/ToastContext';

interface UseAnalysisProps {
    handler: DataHandler;
    llmProvider: LLMProvider;
    conversation: ConversationTurn[];
    setConversation: React.Dispatch<React.SetStateAction<ConversationTurn[]>>;
    chatSession: Chat | null;
    setChatSession: React.Dispatch<React.SetStateAction<Chat | null>>;
}

/**
 * REFACTOR: This helper function efficiently classifies columns into numeric and
 * categorical types in a single pass over the data.
 * @param data The array of data records from the SQL query.
 * @returns An object containing arrays of numeric and categorical column names.
 */
const classifyColumns = (data: Record<string, any>[]) => {
    if (!data || data.length === 0) {
        return { numeric: [], categorical: [] };
    }

    const headers = Object.keys(data[0]);
    const columnIsNumeric: Record<string, boolean> = headers.reduce((acc, h) => ({ ...acc, [h]: true }), {});

    const isNonNumeric = (val: any) => {
        if (val === null || val === undefined || String(val).trim() === '') return false;
        return isNaN(Number(val));
    };

    for (const row of data) {
        for (const header of headers) {
            if (columnIsNumeric[header] && isNonNumeric(row[header])) {
                columnIsNumeric[header] = false;
            }
        }
    }

    const numeric: string[] = [];
    const categorical: string[] = [];
    for (const header of headers) {
        if (columnIsNumeric[header]) {
            numeric.push(header);
        } else {
            categorical.push(header);
        }
    }
    return { numeric, categorical };
};

export const useAnalysis = ({ handler, llmProvider, conversation, setConversation, chatSession, setChatSession }: UseAnalysisProps) => {
  const toast = useToast();

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
      let currentChat = chatSession;
      if (!currentChat) {
          const previewData: Record<string, Record<string, any>[]> = {};
          for (const tableName of Object.keys(schemas)) {
              try {
                  previewData[tableName] = await handler.getPreview(tableName, 3);
              } catch (e) {
                  console.warn(`Could not fetch preview for table ${tableName}:`, e);
              }
          }
          const corrections = await handler.getCorrections(5);
          currentChat = llmProvider.startChatSession(schemas, handler.getDialect(), previewData, joins, corrections);
          setChatSession(currentChat);
      }
      
      const sqlResult = await llmProvider.continueChat(currentChat, currentQuestion, schemas);

      setConversation(prev => prev.map(t => 
        t.id === turnId ? { ...t, state: 'sql_ready', sqlResult } : t
      ));
    } catch (e: any) {
      setConversation(prev => prev.map(t => 
        t.id === turnId ? { ...t, state: 'error', error: e.message } : t
      ));
    }
  };
  
  const executeApprovedSql = async (turnId: string, sqlToExecute: string) => {
    const turn = conversation.find(t => t.id === turnId);
    if (!turn || !turn.sqlResult) return;

    const isCorrection = turn.sqlResult.sql.trim() !== sqlToExecute.trim();

    setConversation(prev => prev.map(t => 
      t.id === turnId ? { ...t, state: 'executing' } : t
    ));

    try {
      const data = await handler.executeQuery(sqlToExecute);
      const analysisResult = { sqlResult: { ...turn.sqlResult, sql: sqlToExecute }, data };

      setConversation(prev => prev.map(t => 
        t.id === turnId ? { ...t, state: 'complete', analysisResult } : t
      ));
      
      if (isCorrection) {
        await handler.addCorrection({ question: turn.question, sql: sqlToExecute });
        setChatSession(null); // Reset chat session as its context may be outdated
      }
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
        toast.add("Failed to generate insights.", "error");
    }
  };

  const generateChartForTurn = async (turnId: string) => {
    const turn = conversation.find(t => t.id === turnId);
    if (!turn?.analysisResult?.data || turn.analysisResult.data.length === 0) {
        toast.add("No data available to create a chart.", "error");
        return;
    }
    
    setConversation(prev => prev.map(t => t.id === turnId ? { ...t, chartLoading: true } : t));
    
    try {
        const { numeric, categorical } = classifyColumns(turn.analysisResult.data);

        if (numeric.length === 0 || categorical.length === 0) {
            throw new Error("A bar chart requires at least one numeric and one categorical column.");
        }
        
        // Programmatically create the chart config
        const chartConfig: ChartGenerationResult = {
            chartType: 'bar',
            dataKeys: [numeric[0]], // Use the first numeric column for Y-axis
            nameKey: categorical[0], // Use the first categorical column for X-axis
            title: `${numeric[0]} by ${categorical[0]}`, // Generate a simple title
        };

        const chartResult: ChartGenerationWithMetadataResult = {
            chartConfig,
            model: 'local', // Indicate it's not from the LLM
            cost: 0,
            prompt_tokens: 0,
            completion_tokens: 0,
        };
        
        // Use a small timeout to simulate generation and allow UI to update
        await new Promise(resolve => setTimeout(resolve, 300));

        setConversation(prev => prev.map(t => t.id === turnId ? { ...t, chartResult, chartLoading: false } : t));
    } catch (e: any) {
        console.error("Chart generation failed:", e instanceof Error ? e.message : String(e));
        const errorResult: ChartGenerationWithMetadataResult = {
            chartConfig: null, model: 'N/A', cost: 0, prompt_tokens: 0, completion_tokens: 0
        };
        setConversation(prev => prev.map(t => t.id === turnId ? { ...t, chartResult: errorResult, chartLoading: false } : t));
        toast.add(e.message || "Failed to generate chart.", "error");
    }
  };

  const resetConversation = () => {
    setConversation([]);
    setChatSession(null);
  };

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