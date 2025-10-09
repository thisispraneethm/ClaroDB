import { DataHandler, Correction } from './base';
import { TableSchema } from '../../types';
import { DataProcessingError, QueryExecutionError } from '../../utils/exceptions';
// @ts-ignore
import alasql from 'alasql';
import { IndexedDBManager } from '../db/indexedDBManager';

const mockData = {
    users: [
        { id: 1, name: 'Alice', email: 'alice@example.com', created_at: '2023-01-15' },
        { id: 2, name: 'Bob', email: 'bob@example.com', created_at: '2023-02-20' },
        { id: 3, name: 'Charlie', email: 'charlie@example.com', created_at: '2023-03-10' },
    ],
    orders: [
        { order_id: 101, user_id: 1, amount: 150.50, order_date: '2023-04-01' },
        { order_id: 102, user_id: 2, amount: 75.00, order_date: '2023-04-03' },
        { order_id: 103, user_id: 1, amount: 200.00, order_date: '2023-04-05' },
        { order_id: 104, user_id: 3, amount: 300.25, order_date: '2023-04-06' },
    ],
    products: [
        { product_id: 1, order_id: 101, name: 'Laptop', price: 120.00 },
        { product_id: 2, order_id: 101, name: 'Mouse', price: 30.50 },
        { product_id: 3, order_id: 102, name: 'Keyboard', price: 75.00 },
        { product_id: 4, order_id: 103, name: 'Monitor', price: 200.00 },
        { product_id: 5, order_id: 104, name: 'Webcam', price: 50.25 },
        { product_id: 6, order_id: 104, name: 'Docking Station', price: 250.00 },
    ]
};
const CORRECTIONS_STORE_NAME = 'corrections_enterprise';

// Type guard to validate the structure of Correction objects at runtime.
function isCorrection(obj: any): obj is Correction {
  return obj && typeof obj.question === 'string' && typeof obj.sql === 'string';
}

function isCorrectionArray(obj: any): obj is Correction[] {
    return Array.isArray(obj) && obj.every(isCorrection);
}

export class EnterpriseDataHandler extends DataHandler {
    private dbManager: IndexedDBManager | null = null;
    private dbName = 'clarodb_enterprise';
    private tempAlaSqlDb: any | null = null;

    constructor() {
        super();
    }

    async connect(): Promise<void> {
        // This simulates connecting to a remote DB and loading data into the browser for querying
        if (this.tempAlaSqlDb) return;
        
        this.dbManager = new IndexedDBManager(this.dbName);
        await this.dbManager.open([CORRECTIONS_STORE_NAME]);

        this.tempAlaSqlDb = new alasql.Database();
        for (const tableName in mockData) {
            this.tempAlaSqlDb.exec(`CREATE TABLE ${tableName}`);
            (this.tempAlaSqlDb.tables[tableName] as any).data = (mockData as any)[tableName];
        }
    }

    private checkDb() {
        if (!this.tempAlaSqlDb) {
            throw new Error("Database not initialized. Call connect() first.");
        }
    }

    async getSchemas(): Promise<TableSchema> {
        this.checkDb();
        const schemas: TableSchema = {};
        for (const tableName in mockData) {
            const firstRecord = (mockData as any)[tableName][0];
            if (firstRecord) {
                schemas[tableName] = Object.keys(firstRecord).map(key => ({
                    name: key,
                    type: typeof firstRecord[key] === 'number' ? 'NUMBER' : 'TEXT',
                }));
            } else {
                schemas[tableName] = [];
            }
        }
        return schemas;
    }

    async executeQuery(query: string): Promise<Record<string, any>[]> {
        this.checkDb();
        try {
            return this.tempAlaSqlDb.exec(query);
        } catch (e: any) {
            throw new QueryExecutionError(`Failed to execute query: ${e.message}`);
        }
    }

    async getPreview(tableName: string, rowCount: number = 5): Promise<Record<string, any>[]> {
        this.checkDb();
        const data = (mockData as any)[tableName];
        if (!data) {
            throw new Error(`Table '${tableName}' does not exist.`);
        }
        return data.slice(0, rowCount);
    }

    getDialect(): string {
        return "alasql";
    }
    
    async terminate(): Promise<void> {
        if (this.dbManager) {
            await this.dbManager.deleteDatabase();
            this.dbManager = null;
        }
        this.tempAlaSqlDb = null;
    }

    async addCorrection(correction: Correction): Promise<void> {
        if (!this.dbManager) throw new Error("DB Manager not ready for corrections.");
        await this.dbManager.appendData(CORRECTIONS_STORE_NAME, correction);
    }

    async getCorrections(limit: number): Promise<Correction[]> {
        if (!this.dbManager) throw new Error("DB Manager not ready for corrections.");
        const allCorrections = await this.dbManager.getData(CORRECTIONS_STORE_NAME);
        if (!isCorrectionArray(allCorrections)) {
            console.warn("Invalid data found in corrections store. Returning empty array.");
            return [];
        }
        return allCorrections.slice(-limit);
    }
}