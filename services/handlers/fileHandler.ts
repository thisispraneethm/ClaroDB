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
    private alaDb: any | null = null;

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

    /**
     * Sanitizes data by identifying columns that contain numeric-like strings
     * (e.g., "$1,234.56") and converting them to actual numbers.
     * This is crucial for ensuring SQL aggregations work correctly.
     */
    private _sanitizeData(data: Record<string, any>[]): Record<string, any>[] {
        if (data.length === 0) return data;

        const columns = Object.keys(data[0]);
        const columnsToSanitize: Set<string> = new Set();

        for (const col of columns) {
            let numericLikeCount = 0;
            let nonNumericCount = 0;
            const sampleSize = Math.min(data.length, 50);

            for (let i = 0; i < sampleSize; i++) {
                const value = data[i][col];
                if (value === null || String(value).trim() === '') continue;

                // Check if the string, after removing common symbols, is a number.
                const cleanedValue = String(value).replace(/[\$,]/g, '');
                if (cleanedValue.trim() !== '' && !isNaN(Number(cleanedValue))) {
                    numericLikeCount++;
                } else {
                    nonNumericCount++;
                }
            }

            // Heuristic: If over 80% of sampled, non-empty values are numeric-like,
            // we'll attempt to sanitize the entire column.
            if (numericLikeCount > 0 && numericLikeCount / (numericLikeCount + nonNumericCount) > 0.8) {
                columnsToSanitize.add(col);
            }
        }

        if (columnsToSanitize.size === 0) {
            return data; // No sanitization needed
        }

        // Apply the transformation to the entire dataset
        return data.map(row => {
            const newRow = { ...row };
            for (const col of columnsToSanitize) {
                const value = newRow[col];
                if (value === null || value === undefined) {
                    newRow[col] = null;
                    continue;
                }
                
                const cleanedValue = String(value).replace(/[\$,]/g, '');
                if (cleanedValue.trim() === '' || isNaN(Number(cleanedValue))) {
                    newRow[col] = null; // Set values that can't be parsed to null
                } else {
                    newRow[col] = Number(cleanedValue);
                }
            }
            return newRow;
        });
    }

    async loadFiles(sources: FileSource[]): Promise<void> {
        this.checkDbManager();
        this.tableNames = [];
        this.alaDb = null; // Reset AlaSQL instance on new file load

        try {
            if (sources.length === 0) {
                 await this.dbManager.open([]); // Open with no stores to effectively clear it
                 return;
            }
            
            this.alaDb = new alasql.Database();
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
                    if (data === null && extension === 'csv') {
                        throw new DataProcessingError(`Failed to parse CSV file '${source.file.name}'. Please ensure it has a header row and uses a standard delimiter (like comma or tab).`);
                    }
                    if (data === null) {
                        const lines = fileContent.replace(/\r\n/g, '\n').split('\n').filter(l => l.trim() !== '');
                        data = lines.map(line => ({ "text_line": line }));
                    }
                }
                
                if (!data || data.length === 0) {
                    throw new DataProcessingError(`Could not extract any data from '${source.file.name}'. The file may be empty or in an unsupported format.`);
                }
                
                const sanitizedData = this._sanitizeData(data);

                await this.dbManager.addData(`${source.name}_original`, sanitizedData);
                await this.dbManager.addData(source.name, sanitizedData);
                this.tableNames.push(source.name);
                
                this.alaDb.exec(`CREATE TABLE [${source.name}]`);
                (this.alaDb.tables[source.name] as any).data = sanitizedData;
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
            const shuffled = [...original]; 
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
        if (this.alaDb && this.alaDb.tables[tableName]) {
            (this.alaDb.tables[tableName] as any).data = sampledData;
        }
        return true; // Sampled
    }

    async getSchemas(): Promise<TableSchema> {
        this.checkDbManager();
        const schemas: TableSchema = {};
    
        for (const tableName of this.tableNames) {
            const sample = await this.dbManager.getPreview(tableName, 50);
            if (sample.length > 0) {
                const columnTypes: Record<string, 'NUMBER' | 'TEXT'> = {};
                const columns = Object.keys(sample[0]);
    
                for (const col of columns) {
                    columnTypes[col] = 'NUMBER';
                    for (const row of sample) {
                        const value = row[col];
                        if (typeof value !== 'number' && value !== null) {
                             columnTypes[col] = 'TEXT';
                             break;
                        }
                    }
                }
    
                schemas[tableName] = columns.map(col => ({
                    name: col,
                    type: columnTypes[col],
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

    async executeQuery(query: string): Promise<Record<string, any>[]> {
        this.checkDbManager();
        if (!this.alaDb) {
            throw new QueryExecutionError("In-memory database not ready. Please load files first.");
        }
        try {
            return this.alaDb.exec(query);
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
            this.alaDb = null;
        }
    }

    async addCorrection(correction: Correction): Promise<void> {
        this.checkDbManager();
        await this.dbManager.appendData(CORRECTIONS_STORE_NAME, correction);
    }

    async getCorrections(limit: number): Promise<Correction[]> {
        this.checkDbManager();
        const allCorrections = await this.dbManager.getData(CORRECTIONS_STORE_NAME) as Correction[];
        return allCorrections.slice(-limit);
    }
}