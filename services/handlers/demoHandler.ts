import { DataHandler, Correction } from './base';
import { TableSchema } from '../../types';
import { DataProcessingError, QueryExecutionError } from '../../utils/exceptions';
// @ts-ignore
import alasql from 'alasql';
import { IndexedDBManager } from '../db/indexedDBManager';

const demoSalesData = [
    { order_id: 'CA-2021-152156', order_date: '2021-11-08', product_category: 'Office Supplies', product: 'Staples', sales_amount: 22.36, region: 'South' },
    { order_id: 'CA-2021-138688', order_date: '2021-06-12', product_category: 'Office Supplies', product: 'Paper', sales_amount: 71.32, region: 'West' },
    { order_id: 'US-2022-108966', order_date: '2022-10-11', product_category: 'Furniture', product: 'Tables', sales_amount: 957.57, region: 'South' },
    { order_id: 'CA-2023-115812', order_date: '2023-06-09', product_category: 'Furniture', product: 'Bookcases', sales_amount: 173.94, region: 'Central' },
    { order_id: 'CA-2023-115812', order_date: '2023-06-09', product_category: 'Office Supplies', product: 'Appliances', sales_amount: 48.86, region: 'Central' },
    { order_id: 'CA-2022-161389', order_date: '2022-12-05', product_category: 'Technology', product: 'Phones', sales_amount: 90.93, region: 'East' },
    { order_id: 'US-2021-118983', order_date: '2021-11-22', product_category: 'Technology', product: 'Accessories', sales_amount: 23.64, region: 'East' },
    { order_id: 'CA-2023-106320', order_date: '2023-09-25', product_category: 'Office Supplies', product: 'Art', sales_amount: 7.28, region: 'West' },
    { order_id: 'CA-2022-121755', order_date: '2022-01-16', product_category: 'Technology', product: 'Phones', sales_amount: 907.15, region: 'West' },
    { order_id: 'CA-2022-121755', order_date: '2022-01-16', product_category: 'Office Supplies', product: 'Binders', sales_amount: 18.50, region: 'West' },
    { order_id: 'CA-2023-139619', order_date: '2023-09-19', product_category: 'Furniture', product: 'Chairs', sales_amount: 731.94, region: 'Central' },
    { order_id: 'US-2023-156909', order_date: '2023-07-16', product_category: 'Office Supplies', product: 'Labels', sales_amount: 14.62, region: 'Central' }
];

const DEMO_TABLE_NAME = 'sales_data';
const CORRECTIONS_STORE_NAME = 'corrections';
const DEMO_DB_NAME = 'clarodb_demo_stable'; // Use a static name to prevent DB leaks

export class DemoDataHandler extends DataHandler {
    private dbManager: IndexedDBManager | null = null;
    private alaDb: any | null = null;

    constructor() {
        super();
    }

    async connect(): Promise<void> {
        if (this.dbManager && this.alaDb) return;

        try {
            this.dbManager = new IndexedDBManager(DEMO_DB_NAME);
            await this.dbManager.open([DEMO_TABLE_NAME, CORRECTIONS_STORE_NAME]);
            
            // Only add data if the store is empty to prevent re-writes on every load
            const existingData = await this.dbManager.getPreview(DEMO_TABLE_NAME, 1);
            if (existingData.length === 0) {
              await this.dbManager.addData(DEMO_TABLE_NAME, demoSalesData);
            }
            
            // Initialize in-memory AlaSQL database
            this.alaDb = new alasql.Database();
            const data = await this.dbManager.getData(DEMO_TABLE_NAME);
            this.alaDb.exec(`CREATE TABLE ${DEMO_TABLE_NAME}`);
            (this.alaDb.tables[DEMO_TABLE_NAME] as any).data = data;

        } catch (e: any) {
            throw new DataProcessingError(`Failed to initialize IndexedDB for demo: ${e.message}`);
        }
    }

    private checkDbManager() {
        if (!this.dbManager || !this.alaDb) {
            throw new Error("Database not initialized. Call connect() first.");
        }
    }

    async getSchemas(): Promise<TableSchema> {
        this.checkDbManager();
        const schemas: TableSchema = {};
        const firstRecord = await this.dbManager.getPreview(DEMO_TABLE_NAME, 1);
        
        if (firstRecord.length > 0) {
            schemas[DEMO_TABLE_NAME] = Object.keys(firstRecord[0]).map(key => ({
                name: key,
                // Basic type inference from the first record
                type: typeof firstRecord[0][key] === 'number' ? 'NUMBER' : 'TEXT',
            }));
        } else {
            schemas[DEMO_TABLE_NAME] = [];
        }
        return schemas;
    }
    
    async executeQuery(query: string): Promise<Record<string, any>[]> {
        this.checkDbManager();
        
        try {
            return this.alaDb.exec(query);
        } catch (e: any) {
            let friendlyMessage = e.message;
            if (typeof friendlyMessage === 'string') {
                if (friendlyMessage.toLowerCase().includes("table does not exist")) {
                    const missingTable = friendlyMessage.match(/table does not exist\s*:\s*(\w+)/i);
                    friendlyMessage = `I tried to query a table named '${missingTable ? missingTable[1] : 'unknown'}' which doesn't seem to exist. The only available table is 'sales_data'.`;
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

    async getPreview(tableName: string, rowCount: number = 5): Promise<Record<string, any>[]> {
        this.checkDbManager();
        if (tableName !== DEMO_TABLE_NAME) {
            throw new Error(`Table '${tableName}' does not exist in the demo workspace.`);
        }
        return this.dbManager.getPreview(tableName, rowCount);
    }

    getDialect(): string {
        return "alasql";
    }
    
    async terminate(): Promise<void> {
        if (this.dbManager) {
            await this.dbManager.deleteDatabase();
            this.dbManager = null;
        }
        this.alaDb = null;
    }

    async addCorrection(correction: Correction): Promise<void> {
        this.checkDbManager();
        await this.dbManager.appendData(CORRECTIONS_STORE_NAME, correction);
    }

    async getCorrections(limit: number): Promise<Correction[]> {
        this.checkDbManager();
        const allCorrections = await this.dbManager.getData(CORRECTIONS_STORE_NAME) as Correction[];
        // Return the most recent 'limit' corrections
        return allCorrections.slice(-limit);
    }
}