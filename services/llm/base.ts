import { SQLGenerationResult, ChartGenerationWithMetadataResult, TableSchema, InsightGenerationResult, Join } from '../../types';
import { Correction } from '../handlers/base';
import { Chat } from '@google/genai';

export abstract class LLMProvider {
  abstract startChatSession(schemas: TableSchema, dialect: string, dataPreview?: Record<string, Record<string, any>[]>, joins?: Join[], corrections?: Correction[]): Chat;
  abstract continueChat(chat: Chat, prompt: string, schemas: TableSchema): Promise<SQLGenerationResult>;
  abstract generateInsights(question: string, data: Record<string, any>[]): Promise<InsightGenerationResult>;
}
