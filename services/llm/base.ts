
import { SQLGenerationResult, ChartGenerationWithMetadataResult, TableSchema, InsightGenerationResult, Join, Correction } from '../../types';

export abstract class LLMProvider {
  abstract generateSQL(prompt: string, schemas: TableSchema, dialect: string, history: { role: string, content: string }[], dataPreview?: Record<string, Record<string, any>[]>, joins?: Join[], corrections?: Correction[]): Promise<SQLGenerationResult>;
  abstract generateInsights(question: string, data: Record<string, any>[]): Promise<InsightGenerationResult>;
  abstract generateChart(question: string, data: Record<string, any>[]): Promise<ChartGenerationWithMetadataResult>;
}
