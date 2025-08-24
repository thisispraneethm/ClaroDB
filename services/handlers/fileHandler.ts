
import { DataHandler } from './base';
import { TableSchema, DataProfile } from '../../types';
import { DataProcessingError, QueryExecutionError } from '../../utils/exceptions';
// @ts-ignore
import alasql from 'alasql';
import { v4 as uuidv4 } from 'uuid';
import { IndexedDBManager } from '../db/indexedDBManager';

export interface FileSource {
    name: string;
    file: File;
}

export class FileDataHandler extends DataHandler {
    private dbManager: IndexedDBManager | null = null;
    private dbName: string;
    private tableNames: string[] = [];
    private workspaceId: string;

    constructor(workspaceId: string) {
        super();
        this.workspaceId = workspaceId;
        this.dbName = `clarodb_file_${this.workspaceId}`;
    }

    async connect(): Promise<void> {
        if (this.dbManager) return;
        this.dbManager = new IndexedDBManager(this.dbName);
    }

    private checkDbManager() {
        if (!this.dbManager) {
            throw new Error("Database not initialized for this handler. Call connect() first.");
        }
    }

    async loadFiles(sources: FileSource[]): Promise<void> {
        this.checkDbManager();
        this.tableNames = [];

        try {
            if (sources.length === 0) {
                 await this.dbManager.open([]); // Open with no stores to effectively clear it
                 return;
            }
            
            const storeNames = sources.map(s => s.name);
            await this.dbManager.open(storeNames);
            
            const tryParseStructured = (content: string): Record<string, any>[] | null => {
                const delimiters = [',', '\t', ';', '|'];
                for (const sep of delimiters) {
                    try {
                        const options = { headers: true, separator: sep };
                        const result = (alasql as any)('SELECT * FROM CSV(?, ?)', [content, options]);
                        if (Array.isArray(result) && result.length > 0 && Object.keys(result[0]).length > 1) {
                            return result;
                        }
                    } catch (e) {}
                }
                return null;
            };

            for (const source of sources) {
                const extension = source.file.name.split('.').pop()?.toLowerCase();
                const fileContent = await source.file.text();
                
                if (fileContent.trim() === '') continue;
                
                let data: Record<string, any>[];
                let structuredData: Record<string, any>[] | null = null;
                
                if (extension === 'csv' || extension === 'txt') {
                    structuredData = tryParseStructured(fileContent);
                }

                if (structuredData) {
                    data = structuredData;
                } else if (extension === 'json') {
                    try {
                        const parsedJson = JSON.parse(fileContent);
                        data = Array.isArray(parsedJson) ? parsedJson : [parsedJson];
                    } catch (e: any) {
                        throw new DataProcessingError(`Failed to parse JSON file ${source.file.name}: ${e.message}`);
                    }
                } else {
                    const lines = fileContent.replace(/\r\n/g, '\n').split('\n').filter(l => l.trim() !== '');
                    data = lines.map(line => ({ "text_line": line }));
                }
                
                if (!data || data.length === 0) continue;
                
                await this.dbManager.addData(source.name, data);
                this.tableNames.push(source.name);
            }
        } catch (e: any) {
            await this.terminate();
            if (e instanceof DataProcessingError) throw e;
            const errorMessage = e.message || 'An unknown error occurred during file processing.';
            throw new DataProcessingError(`Failed to process file(s): ${errorMessage}`);
        }
    }

    async applySampling(tableName: string, method: 'random' | 'stratified', size: number, stratifyColumn?: string): Promise<void> {
        this.checkDbManager();
        
        const original = await this.dbManager.getData(tableName);
        if (!original) {
            throw new DataProcessingError(`Original data for table ${tableName} not found.`);
        }

        const totalRows = original.length;
        if (size >= totalRows) {
            await this.dbManager.addData(tableName, original); // Restore original if sample is larger
            return;
        }

        let sampledData: Record<string, any>[];

        // Use AlaSQL for in-memory sampling of the data fetched from IndexedDB
        if (method === 'random') {
             const tempDb = new alasql.Database();
             tempDb.exec(`CREATE TABLE temp_table`);
             (tempDb.tables['temp_table'] as any).data = original;
             const percentage = (size / totalRows) * 100;
             sampledData = tempDb.exec(`SELECT * FROM temp_table TABLESAMPLE BERNOULLI (${percentage})`);
             if (sampledData.length > size) {
                sampledData = sampledData.slice(0, size);
            }
        } else if (method === 'stratified') {
            if (!stratifyColumn) throw new DataProcessingError("A column must be specified for stratified sampling.");
            const groups: Record<string, Record<string, any>[]> = {};
            for (const row of original) {
                const key = String(row[stratifyColumn]);
                if (!groups[key]) groups[key] = [];
                groups[key].push(row);
            }
            sampledData = [];
            for (const key in groups) {
                const group = groups[key];
                const proportion = group.length / totalRows;
                const sampleSizeForGroup = Math.max(1, Math.round(proportion * size));
                const shuffled = group.sort(() => 0.5 - Math.random());
                sampledData.push(...shuffled.slice(0, sampleSizeForGroup));
            }
        } else {
            throw new DataProcessingError(`Unknown sampling method: ${method}`);
        }
        
        await this.dbManager.addData(tableName, sampledData);
    }


    async profileData(tableName: string): Promise<DataProfile[]> {
        this.checkDbManager();
        const data = await this.dbManager.getData(tableName);
        if (!data || data.length === 0) return [];
        
        const totalRows = data.length;
        const columns = Object.keys(data[0]);
        
        return columns.map(col => {
            const filled = data.filter(row => row[col] !== null && row[col] !== undefined && row[col] !== '').length;
            const missingCount = totalRows - filled;
            const missingPercentage = ((missingCount / totalRows) * 100).toFixed(1);
            const type = typeof data[0][col] === 'number' ? 'NUMBER' : 'TEXT';
            return { column: col, type, filled, missing: `${missingPercentage}%` };
        });
    }

    async getSchemas(): Promise<TableSchema> {
        this.checkDbManager();
        const schemas: TableSchema = {};
        for (const tableName of this.tableNames) {
            const firstRecord = await this.dbManager.getPreview(tableName, 1);
            if (firstRecord.length > 0) {
                 schemas[tableName] = Object.keys(firstRecord[0]).map(key => ({
                    name: key,
                    type: typeof firstRecord[0][key] === 'number' ? 'NUMBER' : 'TEXT',
                }));
            } else {
                schemas[tableName] = [];
            }
        }
        return schemas;
    }

    async getPreview(tableName: string, rowCount: number = 10): Promise<Record<string, any>[]> {
        this.checkDbManager();
        return this.dbManager.getPreview(tableName, rowCount);
    }
    
    private parseTablesFromQuery(query: string): Set<string> {
        const tableRegex = /(?:FROM|JOIN)\s+\[?(\w+)\]?/ig;
        const tablesInQuery = new Set<string>();
        let match;
        while ((match = tableRegex.exec(query)) !== null) {
            tablesInQuery.add(match[1]);
        }
        return tablesInQuery;
    }

    async executeQuery(query: string): Promise<Record<string, any>[]> {
        this.checkDbManager();
        try {
            const tablesInQuery = this.parseTablesFromQuery(query);
            if (tablesInQuery.size === 0) return alasql(query);

            const tempDb = new alasql.Database();
            for (const tableNameFromQuery of tablesInQuery) {
                // Perform a case-insensitive lookup to find the actual table name in IndexedDB.
                const actualTableName = this.tableNames.find(
                    storedName => storedName.toLowerCase() === tableNameFromQuery.toLowerCase()
                );

                if (actualTableName) {
                    const data = await this.dbManager.getData(actualTableName);
                    tempDb.exec(`CREATE TABLE [${tableNameFromQuery}]`);
                    if (data) {
                        (tempDb.tables[tableNameFromQuery] as any).data = data;
                    }
                }
            }
            
            return tempDb.exec(query);
        } catch (e: any) {
            throw new QueryExecutionError(`Failed to execute query: ${e.message}`);
        }
    }

    getDialect(): string {
        return "alasql";
    }
    
    async terminate(): Promise<void> {
        if (this.dbManager) {
            await this.dbManager.deleteDatabase();
            this.dbManager = null;
            this.tableNames = [];
        }
    }
}
