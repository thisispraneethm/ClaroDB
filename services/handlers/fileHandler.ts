import { DataHandler, Correction } from './base';
import { TableSchema } from '../../types';
import { DataProcessingError, QueryExecutionError } from '../../utils/exceptions';
// @ts-ignore
import alasql from 'alasql';
import { IndexedDBManager } from '../db/indexedDBManager';

export interface FileSource {
    name: string;
    file: File;
}
const CORRECTIONS_STORE_NAME = 'corrections';

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
            
            const workingStoreNames = sources.map(s => s.name);
            const originalStoreNames = sources.map(s => `${s.name}_original`);
            const storeNames = [...workingStoreNames, ...originalStoreNames, CORRECTIONS_STORE_NAME];
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
                
                if (fileContent.trim() === '') {
                    throw new DataProcessingError(`File '${source.file.name}' appears to be empty.`);
                }
                
                let data: Record<string, any>[] | null = null;
                
                if (extension === 'json') {
                    try {
                        const parsedJson = JSON.parse(fileContent);
                        data = Array.isArray(parsedJson) ? parsedJson : [parsedJson];
                    } catch (e: any) {
                        throw new DataProcessingError(`Failed to parse JSON file '${source.file.name}'. Please ensure it contains valid JSON. Error: ${e.message}`);
                    }
                } else {
                    data = tryParseStructured(fileContent);
                    // If it's a CSV and parsing fails, it's an error. Don't fall back to unstructured text.
                    if (data === null && extension === 'csv') {
                        throw new DataProcessingError(`Failed to parse CSV file '${source.file.name}'. Please ensure it has a header row and uses a standard delimiter (like comma or tab).`);
                    }
                    // For other file types (like .txt), if parsing fails, fall back to unstructured.
                    if (data === null) {
                        const lines = fileContent.replace(/\r\n/g, '\n').split('\n').filter(l => l.trim() !== '');
                        data = lines.map(line => ({ "text_line": line }));
                    }
                }
                
                if (!data || data.length === 0) {
                    throw new DataProcessingError(`Could not extract any data from '${source.file.name}'. The file may be empty or in an unsupported format.`);
                }
                
                // Store both the original data and the working copy. Sampling will affect the working copy only.
                await this.dbManager.addData(`${source.name}_original`, data);
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

    async applySampling(tableName: string, method: 'random' | 'stratified', size: number, stratifyColumn?: string): Promise<boolean> {
        this.checkDbManager();
        
        const original = await this.dbManager.getData(`${tableName}_original`);
        if (!original) {
            throw new DataProcessingError(`Original data for table ${tableName} not found.`);
        }

        const totalRows = original.length;
        if (size >= totalRows) {
            await this.dbManager.addData(tableName, original); // Restore full original data
            return false; // Not sampled
        }

        let sampledData: Record<string, any>[];

        if (method === 'random') {
            // AlaSQL's TABLESAMPLE is not supported. Implement random sampling using Fisher-Yates shuffle.
            const shuffled = [...original]; // Create a shallow copy
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            sampledData = shuffled.slice(0, size);
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
        return true; // Sampled
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
            let friendlyMessage = e.message;
            if (typeof friendlyMessage === 'string') {
                if (friendlyMessage.toLowerCase().includes("table does not exist")) {
                    const missingTable = friendlyMessage.match(/table does not exist\s*:\s*(\w+)/i);
                    friendlyMessage = `I tried to query a table named '${missingTable ? missingTable[1] : 'unknown'}' which doesn't seem to exist. Please check the schema and try again.`;
                } else if (friendlyMessage.toLowerCase().includes("column does not exist")) {
                    friendlyMessage = `I tried to use a column that doesn't exist. Please check the schema and try rephrasing your question.`;
                } else if (friendlyMessage.toLowerCase().includes("syntax error")) {
                    friendlyMessage = `I generated a query with invalid syntax. This may be a bug. Could you try asking in a different way?`;
                }
            } else {
                friendlyMessage = "An unexpected error occurred while running the query.";
            }
            throw new QueryExecutionError(friendlyMessage);
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

    async addCorrection(correction: Correction): Promise<void> {
        this.checkDbManager();
        await this.dbManager.appendData(CORRECTIONS_STORE_NAME, correction);
    }

    async getCorrections(limit: number): Promise<Correction[]> {
        this.checkDbManager();
        // FIX: Cast the result from getData to Correction[] as we know the data shape for this store.
        const allCorrections = await this.dbManager.getData(CORRECTIONS_STORE_NAME) as Correction[];
        return allCorrections.slice(-limit);
    }
}