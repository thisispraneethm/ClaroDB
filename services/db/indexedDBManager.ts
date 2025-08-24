export class IndexedDBManager {
    private db: IDBDatabase | null = null;
    private dbName: string;

    constructor(dbName: string) {
        this.dbName = dbName;
    }
    
    public open(storeNames: string[]): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.db) {
                // If the stores haven't changed, we don't need to re-open/upgrade.
                const existingStores = Array.from(this.db.objectStoreNames);
                const sameStores = storeNames.length === existingStores.length && storeNames.every(s => existingStores.includes(s));
                if (sameStores) {
                    return resolve();
                }
                this.db.close(); // Close before upgrading
            }

            const newVersion = Date.now(); // Use timestamp for a unique, always-increasing version
            const request = indexedDB.open(this.dbName, newVersion);

            request.onerror = () => reject(new Error("Failed to open IndexedDB."));
            
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                const existingStores = Array.from(db.objectStoreNames);

                // Delete stores that are no longer needed
                existingStores.forEach(storeName => {
                    if (!storeNames.includes(storeName)) {
                        db.deleteObjectStore(storeName);
                    }
                });

                // Create new stores
                storeNames.forEach(storeName => {
                    if (!db.objectStoreNames.contains(storeName)) {
                        db.createObjectStore(storeName, { autoIncrement: true });
                    }
                });
            };

            request.onsuccess = (event) => {
                this.db = (event.target as IDBOpenDBRequest).result;
                resolve();
            };
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
                // This can happen if other tabs have the DB open. For this app's lifecycle,
                // we can often resolve by just accepting it.
                console.warn("IndexedDB deletion blocked. This might happen if another tab is open.");
                resolve();
            };
        });
    }
}
