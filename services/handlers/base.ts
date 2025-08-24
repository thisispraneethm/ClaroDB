
import { TableSchema } from '../../types';

export abstract class DataHandler {
  abstract connect(): Promise<void>;
  abstract getSchemas(): Promise<TableSchema>;
  abstract executeQuery(query: string): Promise<Record<string, any>[]>;
  abstract getDialect(): string;
  abstract terminate(): Promise<void>;
  abstract getPreview(tableName: string, rowCount: number): Promise<Record<string, any>[]>;
}