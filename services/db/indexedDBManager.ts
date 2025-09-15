
export class IndexedDBManager {
    private db: IDBDatabase | null = null;
    private dbName: string;

    constructor(dbName: string) {
        this.dbName = dbName;
    }
    
    private getAllRequiredStores(storeNames: string[]): Set<string> {
        const allRequiredStores = new Set<string>();
        const createsOriginals = this.dbName.includes('_file_');
        storeNames.forEach(name => {
            allRequiredStores.add(name);
            if (createsOriginals && !name.endsWith('_original')) {
                allRequiredStores.add(`${name}_original`);
            }
        });
        return allRequiredStores;
    }

    public open(storeNames: string[]): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.db) {
                const existingStores = Array.from(this.db.objectStoreNames);
                const allRequiredStores = this.getAllRequiredStores(storeNames);
                const sameStores = existingStores.length === allRequiredStores.size && existingStores.every(s => allRequiredStores.has(s));
                if (sameStores) {
                    return resolve();
                }
                this.db.close();
                this.db = null;
            }
            
            // Open without a version first to inspect the current state
            const request = indexedDB.open(this.dbName);

            request.onerror = () => reject(new Error("Failed to open IndexedDB."));
            
            request.onsuccess = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                const existingStores = Array.from(db.objectStoreNames);
                const allRequiredStores = this.getAllRequiredStores(storeNames);
                const schemaIsCorrect = existingStores.length === allRequiredStores.size && existingStores.every(s => allRequiredStores.has(s));

                if (schemaIsCorrect) {
                    this.db = db;
                    return resolve();
                }

                // Schema mismatch, need to upgrade.
                const newVersion = db.version + 1;
                db.close();

                const upgradeRequest = indexedDB.open(this.dbName, newVersion);

                upgradeRequest.onerror = () => reject(new Error("Failed to upgrade IndexedDB."));

                upgradeRequest.onupgradeneeded = (upgradeEvent) => {
                    const upgradeDb = (upgradeEvent.target as IDBOpenDBRequest).result;
                    
                    // Delete stores that are no longer needed
                    Array.from(upgradeDb.objectStoreNames).forEach(storeName => {
                        if (!allRequiredStores.has(storeName)) {
                            upgradeDb.deleteObjectStore(storeName);
                        }
                    });

                    // Create new stores
                    allRequiredStores.forEach(storeName => {
                        if (!upgradeDb.objectStoreNames.contains(storeName)) {
                            upgradeDb.createObjectStore(storeName, { autoIncrement: true });
                        }
                    });
                };
                
                upgradeRequest.onsuccess = (upgradeSuccessEvent) => {
                    this.db = (upgradeSuccessEvent.target as IDBOpenDBRequest).result;
                    resolve();
                };

                upgradeRequest.onblocked = () => {
                    console.warn(`IndexedDB upgrade request for "${this.dbName}" is blocked.`);
                    reject(new Error("Database upgrade is blocked. Please close other tabs with this application."));
                };
            };
            
            request.onblocked = () => {
                console.warn(`IndexedDB open request for "${this.dbName}" is blocked.`);
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