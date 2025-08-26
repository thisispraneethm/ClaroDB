
import { TableSchema } from '../../types';

export interface Correction {
  question: string;
  sql: string;
}

export abstract class DataHandler {
  abstract connect(): Promise<void>;
  abstract getSchemas(): Promise<TableSchema>;
  abstract executeQuery(query: string): Promise<Record<string, any>[]>;
  abstract getDialect(): string;
  abstract terminate(): Promise<void>;
  abstract getPreview(tableName: string, rowCount: number): Promise<Record<string, any>[]>;
  abstract addCorrection(correction: Correction): Promise<void>;
  abstract getCorrections(limit: number): Promise<Correction[]>;
}
