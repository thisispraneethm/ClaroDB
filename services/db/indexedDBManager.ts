export class IndexedDBManager {
    private db: IDBDatabase | null = null;
    private dbName: string;

    constructor(dbName: string) {
        this.dbName = dbName;
    }
    
    public open(storeNames: string[]): Promise<void> {
        return new Promise((resolve, reject) => {
            const newVersion = (this.db?.version || 0) + 1;
            const createsOriginals = this.dbName.includes('_file_');

            if (this.db) {
                const existingStores = Array.from(this.db.objectStoreNames);
                const allRequiredStores = new Set<string>();
                storeNames.forEach(name => {
                    allRequiredStores.add(name);
                    // Also account for original data stores in file handlers
                    if (createsOriginals && !name.endsWith('_original')) {
                        allRequiredStores.add(`${name}_original`);
                    }
                });
                
                const sameStores = existingStores.length === allRequiredStores.size && existingStores.every(s => allRequiredStores.has(s));
                
                if (sameStores) {
                    return resolve();
                }
                this.db.close(); // Close before upgrading
            }

            const request = indexedDB.open(this.dbName, newVersion);

            request.onerror = () => reject(new Error("Failed to open IndexedDB."));
            
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                const transaction = (event.target as IDBOpenDBRequest).transaction;
                if (!transaction) return;

                const allRequiredStores = new Set<string>();
                storeNames.forEach(name => {
                    allRequiredStores.add(name);
                     if (createsOriginals && !name.endsWith('_original')) {
                        allRequiredStores.add(`${name}_original`);
                    }
                });
                
                // Delete stores that are no longer needed
                Array.from(db.objectStoreNames).forEach(storeName => {
                    if (!allRequiredStores.has(storeName)) {
                        db.deleteObjectStore(storeName);
                    }
                });

                // Create new stores
                allRequiredStores.forEach(storeName => {
                    if (!db.objectStoreNames.contains(storeName)) {
                        db.createObjectStore(storeName, { autoIncrement: true });
                    }
                });
            };

            request.onsuccess = (event) => {
                this.db = (event.target as IDBOpenDBRequest).result;
                resolve();
            };
            
            request.onblocked = () => {
                console.warn(`IndexedDB open request for "${this.dbName}" is blocked. This can happen if another tab has the database open with an older version.`);
                reject(new Error("Database connection is blocked. Please close other tabs with this application and refresh."));
            }
        });
    }

    private getDb(): IDBDatabase {
        if (!this.db) {
            throw new Error("IndexedDB is not open.");
        }
        return this.db;
    }

    public addData(storeName: string, data: Record<string, any>[]): Promise<void> {
        return new Promise((resolve, reject) => {
            const db = this.getDb();
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            
            store.clear(); // Clear existing data before adding new data

            data.forEach(item => {
                store.add(item);
            });

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(new Error(`Failed to add data to ${storeName}.`));
        });
    }
    
    public appendData(storeName: string, item: Record<string, any>): Promise<void> {
        return new Promise((resolve, reject) => {
            const db = this.getDb();
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(item);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error(`Failed to append data to ${storeName}.`));
        });
    }

    public getData(storeName: string): Promise<Record<string, any>[]> {
        return new Promise((resolve, reject) => {
            const db = this.getDb();
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error(`Failed to get data from ${storeName}.`));
        });
    }

    public getPreview(storeName: string, limit: number): Promise<Record<string, any>[]> {
        return new Promise((resolve, reject) => {
            const db = this.getDb();
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const cursorRequest = store.openCursor();
            const results: Record<string, any>[] = [];
            
            cursorRequest.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
                if (cursor && results.length < limit) {
                    results.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };
            cursorRequest.onerror = () => reject(new Error(`Failed to get preview from ${storeName}.`));
        });
    }

    public deleteDatabase(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close();
                this.db = null;
            }
            const deleteRequest = indexedDB.deleteDatabase(this.dbName);
            deleteRequest.onsuccess = () => resolve();
            deleteRequest.onerror = () => reject(new Error("Failed to delete IndexedDB."));
            deleteRequest.onblocked = () => {
                console.warn("IndexedDB deletion blocked. This might happen if another tab is open.");
                resolve();
            };
        });
    }
}