import { ReactNode } from "react";

export interface ColumnSchema {
  name: string;
  type: string;
}

export interface TableSchema {
  [tableName: string]: ColumnSchema[];
}

export interface SQLGenerationResult {
  sql: string;
  model: string;
  cost: number;
  prompt_tokens: number;
  completion_tokens: number;
}

export interface InsightGenerationResult {
  insights: string;
  model: string;
  cost: number;
  prompt_tokens: number;
  completion_tokens: number;
}

export interface ChartGenerationResult {
  chartType: 'bar' | 'line' | 'pie' | 'scatter';
  dataKey: string;
  nameKey: string;
  title: string;
}

export interface ChartGenerationWithMetadataResult {
  chartConfig: ChartGenerationResult | null;
  model: string;
  cost: number;
  prompt_tokens: number;
  completion_tokens: number;
}


export interface NavItem {
  path: string;
  name: string;
  icon: ReactNode;
  comingSoon?: boolean;
}

export interface AnalysisResult {
    sqlResult: SQLGenerationResult;
    data: Record<string, any>[];
}

export type TurnState = 'sql_generating' | 'sql_ready' | 'executing' | 'complete' | 'error';

export interface ConversationTurn {
    id: string;
    question: string;
    state: TurnState;
    sqlResult?: SQLGenerationResult;
    analysisResult?: AnalysisResult;
    insightsResult?: InsightGenerationResult;
    chartResult?: ChartGenerationWithMetadataResult;
    insightsLoading?: boolean;
    chartLoading?: boolean;
    error?: string;
}

export interface DataProfile {
  column: string;
  type: string;
  filled: number;
  missing: string;
}

export interface Join {
  id: string;
  table1: string;
  column1: string;
  table2: string;
  column2: string;
  joinType: 'inner' | 'left' | 'right' | 'outer';
}