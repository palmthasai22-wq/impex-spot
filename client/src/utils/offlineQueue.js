class EventEmitter {
  constructor() {
    this.events = {};
  }
  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }
  off(event, listener) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(l => l !== listener);
  }
  emit(event, ...args) {
    if (!this.events[event]) return;
    this.events[event].forEach(listener => listener(...args));
  }
}

class OfflineQueueManager extends EventEmitter {
  constructor() {
    super();
    this.dbName = 'ImpExSpotDB';
    this.storeName = 'offlineQueue';
    this.version = 1;
    this.db = null;
    this.initPromise = this._init();
  }

  async _init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        this.emit('status-change');
        resolve();
      };

      request.onerror = (event) => {
        console.error('IndexedDB error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  async enqueue(action) {
    await this.initPromise;
    const item = {
      ...action,
      createdAt: new Date().toISOString(),
      retryCount: 0
    };
    
    // Simple deduplication (same URL, method, and body)
    const existing = await this.getAll();
    const bodyStr = item.body ? JSON.stringify(item.body) : '';
    const isDup = existing.some(ex => 
      ex.url === item.url && 
      ex.method === item.method && 
      (ex.body ? JSON.stringify(ex.body) : '') === bodyStr
    );

    if (isDup) return null;

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.add(item);
      
      request.onsuccess = () => {
        this.emit('status-change');
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async dequeue(id) {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.delete(id);
      
      request.onsuccess = () => {
        this.emit('status-change');
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async updateItem(item) {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAll() {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getCount() {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.count();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clear() {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.clear();
      
      request.onsuccess = () => {
        this.emit('status-change');
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  isOnline() {
    return navigator.onLine;
  }

  async syncAll() {
    if (!this.isOnline()) return { synced: 0, failed: 0 };
    
    this.emit('sync-start');
    const items = await this.getAll();
    if (items.length === 0) {
      this.emit('sync-complete', { synced: 0, failed: 0 });
      return { synced: 0, failed: 0 };
    }

    let synced = 0;
    let failed = 0;

    for (const item of items) {
      try {
        const response = await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body ? JSON.stringify(item.body) : undefined,
        });

        // CRITICAL: Only report success if server confirms (200/201)
        if (response.ok || response.status === 200 || response.status === 201) {
          await this.dequeue(item.id);
          synced++;
        } else {
          throw new Error(`Server returned ${response.status}`);
        }
      } catch (err) {
        failed++;
        item.retryCount = (item.retryCount || 0) + 1;
        if (item.retryCount >= 5) {
          await this.dequeue(item.id); // Give up after 5 retries
        } else {
          await this.updateItem(item);
        }
      }
    }

    const result = { synced, failed };
    if (failed > 0) {
      this.emit('sync-error', result);
    } else {
      this.emit('sync-complete', result);
    }
    
    this.emit('status-change');
    return result;
  }
}

export const offlineQueue = new OfflineQueueManager();
