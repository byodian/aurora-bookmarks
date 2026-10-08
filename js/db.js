/**
 * Aurora Bookmarks - IndexedDB Storage Engine & Visit Tracking
 * Author: BAI YONGJIAN
 */

export class BookmarkDB {
  constructor() {
    this.dbName = 'AuroraBookmarksDB';
    this.dbVersion = 1;
    this.db = null;
    this.fallbackKey = 'aurora_bookmarks_fallback_data';
  }

  async init() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        console.warn('IndexedDB not available, falling back to memory/localStorage');
        resolve(null);
        return;
      }

      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('bookmarks')) {
          const store = db.createObjectStore('bookmarks', { keyPath: 'id' });
          store.createIndex('category', 'category', { unique: false });
          store.createIndex('visitCount', 'visitCount', { unique: false });
          store.createIndex('lastVisited', 'lastVisited', { unique: false });
          store.createIndex('isFavorite', 'isFavorite', { unique: false });
          store.createIndex('addDate', 'addDate', { unique: false });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('IndexedDB open error:', event.target.error);
        resolve(null);
      };
    });
  }

  // --- Core CRUD ---

  async getAllBookmarks() {
    await this.init();
    if (!this.db) {
      return this._getFallbackBookmarks();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['bookmarks'], 'readonly');
      const store = transaction.objectStore('bookmarks');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async saveBookmark(bookmark) {
    await this.init();
    if (!bookmark.id) {
      bookmark.id = 'bm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    }
    if (bookmark.visitCount === undefined) bookmark.visitCount = 0;
    if (bookmark.lastVisited === undefined) bookmark.lastVisited = null;
    if (bookmark.isFavorite === undefined) bookmark.isFavorite = false;
    if (!bookmark.addDate) bookmark.addDate = Date.now();

    if (!this.db) {
      const list = this._getFallbackBookmarks();
      const idx = list.findIndex(b => b.id === bookmark.id);
      if (idx >= 0) list[idx] = bookmark;
      else list.unshift(bookmark);
      this._saveFallbackBookmarks(list);
      return bookmark;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['bookmarks'], 'readwrite');
      const store = transaction.objectStore('bookmarks');
      const request = store.put(bookmark);

      request.onsuccess = () => resolve(bookmark);
      request.onerror = () => reject(request.error);
    });
  }

  async saveBookmarksBulk(bookmarks) {
    await this.init();
    if (!this.db) {
      this._saveFallbackBookmarks(bookmarks);
      return bookmarks.length;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['bookmarks'], 'readwrite');
      const store = transaction.objectStore('bookmarks');

      for (const item of bookmarks) {
        if (!item.id) {
          item.id = 'bm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        }
        if (item.visitCount === undefined) item.visitCount = 0;
        if (item.lastVisited === undefined) item.lastVisited = null;
        if (item.isFavorite === undefined) item.isFavorite = false;
        store.put(item);
      }

      transaction.oncomplete = () => resolve(bookmarks.length);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async deleteBookmark(id) {
    await this.init();
    if (!this.db) {
      const list = this._getFallbackBookmarks().filter(b => b.id !== id);
      this._saveFallbackBookmarks(list);
      return true;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['bookmarks'], 'readwrite');
      const store = transaction.objectStore('bookmarks');
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteBookmarksBulk(ids) {
    await this.init();
    const idSet = new Set(ids);
    if (!this.db) {
      const list = this._getFallbackBookmarks().filter(b => !idSet.has(b.id));
      this._saveFallbackBookmarks(list);
      return true;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['bookmarks'], 'readwrite');
      const store = transaction.objectStore('bookmarks');

      for (const id of ids) {
        store.delete(id);
      }

      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async updateBookmark(id, updates) {
    await this.init();
    if (!this.db) {
      const list = this._getFallbackBookmarks();
      const idx = list.findIndex(b => b.id === id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...updates };
        this._saveFallbackBookmarks(list);
        return list[idx];
      }
      return null;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['bookmarks'], 'readwrite');
      const store = transaction.objectStore('bookmarks');
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const data = getReq.result;
        if (!data) {
          resolve(null);
          return;
        }
        const updated = { ...data, ...updates };
        const putReq = store.put(updated);
        putReq.onsuccess = () => resolve(updated);
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  }

  // --- Visit Tracking (最近常访问) ---

  async recordVisit(id) {
    await this.init();
    const all = await this.getAllBookmarks();
    const item = all.find(b => b.id === id);
    if (!item) return null;

    const newCount = (item.visitCount || 0) + 1;
    const now = Date.now();
    return await this.updateBookmark(id, {
      visitCount: newCount,
      lastVisited: now
    });
  }

  async toggleFavorite(id) {
    const all = await this.getAllBookmarks();
    const item = all.find(b => b.id === id);
    if (!item) return null;

    return await this.updateBookmark(id, {
      isFavorite: !item.isFavorite
    });
  }

  async getFrequent(limit = 8) {
    const all = await this.getAllBookmarks();
    // Sort bookmarks by visitCount desc, then by addDate
    return all
      .filter(b => (b.visitCount || 0) > 0)
      .sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0))
      .slice(0, limit);
  }

  async getRecent(limit = 8) {
    const all = await this.getAllBookmarks();
    // Sort bookmarks by lastVisited desc
    return all
      .filter(b => b.lastVisited != null)
      .sort((a, b) => b.lastVisited - a.lastVisited)
      .slice(0, limit);
  }

  async getCategories() {
    const all = await this.getAllBookmarks();
    const map = new Map();

    for (const b of all) {
      const cat = b.category || '未分类';
      if (!map.has(cat)) {
        map.set(cat, { name: cat, count: 0, path: b.categoryPath || cat });
      }
      map.get(cat).count++;
    }

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }

  async clearAll() {
    await this.init();
    if (!this.db) {
      localStorage.removeItem(this.fallbackKey);
      return true;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['bookmarks'], 'readwrite');
      const store = transaction.objectStore('bookmarks');
      const request = store.clear();

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // --- Settings Store ---

  async getSetting(key, defaultValue = null) {
    await this.init();
    if (!this.db) {
      const val = localStorage.getItem('aurora_setting_' + key);
      return val ? JSON.parse(val) : defaultValue;
    }

    return new Promise((resolve) => {
      try {
        const transaction = this.db.transaction(['settings'], 'readonly');
        const store = transaction.objectStore('settings');
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result ? request.result.value : defaultValue);
        request.onerror = () => resolve(defaultValue);
      } catch (e) {
        resolve(defaultValue);
      }
    });
  }

  async saveSetting(key, value) {
    await this.init();
    if (!this.db) {
      localStorage.setItem('aurora_setting_' + key, JSON.stringify(value));
      return;
    }

    return new Promise((resolve) => {
      try {
        const transaction = this.db.transaction(['settings'], 'readwrite');
        const store = transaction.objectStore('settings');
        store.put({ key, value });
        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  }

  // --- Fallback Helpers ---

  _getFallbackBookmarks() {
    try {
      const raw = localStorage.getItem(this.fallbackKey);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  _saveFallbackBookmarks(list) {
    try {
      localStorage.setItem(this.fallbackKey, JSON.stringify(list));
    } catch (e) {
      console.error('Storage quota exceeded in fallback:', e);
    }
  }
}

export const db = new BookmarkDB();
