import { DataHandler } from './base';
import { TableSchema, ColumnSchema } from '../../types';
import { DataProcessingError, QueryExecutionError } from '../../utils/exceptions';
// @ts-ignore
import alasql from 'alasql';
import { v4 as uuidv4 } from 'uuid';
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

export class DemoDataHandler extends DataHandler {
    private dbManager: IndexedDBManager | null = null;
    private dbName: string;

    constructor() {
        super();
        this.dbName = `clarodb_demo_${uuidv4().replace(/-/g, '')}`;
    }

    async connect(): Promise<void> {
        if (this.dbManager) return;

        try {
            this.dbManager = new IndexedDBManager(this.dbName);
            await this.dbManager.open([DEMO_TABLE_NAME]);
            await this.dbManager.addData(DEMO_TABLE_NAME, demoSalesData);
        } catch (e: any) {
            throw new DataProcessingError(`Failed to initialize IndexedDB for demo: ${e.message}`);
        }
    }

    private checkDbManager() {
        if (!this.dbManager) {
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
            
            // If the query doesn't reference any known tables (e.g., "SELECT 1"), run it directly.
            if (!tablesInQuery.has(DEMO_TABLE_NAME)) {
                return alasql(query);
            }

            // Hybrid approach: Use IndexedDB for storage, and a temporary in-memory AlaSQL DB for querying.
            const tempDb = new alasql.Database();
            const data = await this.dbManager.getData(DEMO_TABLE_NAME);
            
            // Use the most reliable method to load data into the temporary AlaSQL instance.
            tempDb.exec(`CREATE TABLE ${DEMO_TABLE_NAME}`);
            (tempDb.tables[DEMO_TABLE_NAME] as any).data = data;
            
            return tempDb.exec(query);

        } catch (e: any) {
            throw new QueryExecutionError(`Failed to execute query on demo data: ${e.message}`);
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
    }
}
