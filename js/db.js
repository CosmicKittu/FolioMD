/**
 * FolioMD — Local Cache & Persistent Storage Engine (IndexedDB + LocalStorage Fallback)
 * Stores recently opened Markdown files and entire folders (file tree, markdown contents,
 * local image assets, and optional FileSystemHandles) for instant 1-click access.
 */
(function (global) {
  const DB_NAME = 'FolioMDCacheDB';
  const DB_VERSION = 1;
  const STORE_WORKSPACES = 'workspaces';
  const LS_META_KEY = 'foliomd_recent_meta_v1';
  const LS_FALLBACK_DATA_PREFIX = 'foliomd_ws_data_';

  class FolioCacheDB {
    constructor() {
      this.dbPromise = null;
      this.memoryCache = new Map();
    }

    init() {
      if (this.dbPromise) return this.dbPromise;

      this.dbPromise = new Promise((resolve) => {
        if (!('indexedDB' in window)) {
          resolve(null);
          return;
        }
        try {
          const req = indexedDB.open(DB_NAME, DB_VERSION);
          req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_WORKSPACES)) {
              const store = db.createObjectStore(STORE_WORKSPACES, { keyPath: 'id' });
              store.createIndex('lastOpened', 'lastOpened', { unique: false });
              store.createIndex('type', 'type', { unique: false });
            }
          };
          req.onsuccess = (e) => resolve(e.target.result);
          req.onerror = () => resolve(null);
        } catch (err) {
          resolve(null);
        }
      });

      return this.dbPromise;
    }

    /**
     * Save or update a workspace (single file or folder) in the local cache
     */
    async saveWorkspace(workspace) {
      const now = Date.now();
      const existing = await this.getWorkspace(workspace.id);

      const record = {
        id: workspace.id,
        type: workspace.type || 'file', // 'folder' | 'file'
        name: workspace.name,
        subtitle: workspace.subtitle || '',
        lastOpened: now,
        pinned: existing ? Boolean(existing.pinned) : Boolean(workspace.pinned),
        activeFilePath: workspace.activeFilePath || (existing && existing.activeFilePath) || '',
        fileCount: workspace.fileCount || Object.keys(workspace.files || {}).length,
        totalBytes: workspace.totalBytes || 0,
        files: workspace.files || {},
        handle: workspace.handle || (existing && existing.handle) || null,
        isSample: Boolean(workspace.isSample)
      };

      this.memoryCache.set(record.id, record);
      this._updateLocalStorageMeta(record);

      const db = await this.init();
      if (db) {
        await new Promise((resolve) => {
          try {
            const tx = db.transaction(STORE_WORKSPACES, 'readwrite');
            const store = tx.objectStore(STORE_WORKSPACES);
            // If handle cannot be cloned in some browser, retry without handle
            try {
              store.put(record);
            } catch (_) {
              const cloneSafe = Object.assign({}, record, { handle: null });
              store.put(cloneSafe);
            }
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
          } catch (_) {
            resolve(false);
          }
        });
      } else {
        // Fallback to localStorage for smaller workspaces
        try {
          const cloneSafe = Object.assign({}, record, { handle: null });
          localStorage.setItem(LS_FALLBACK_DATA_PREFIX + record.id, JSON.stringify(cloneSafe));
        } catch (_) {
          // Quota exceeded fallback remains in memoryCache
        }
      }

      return record;
    }

    /**
     * Update only metadata (e.g., activeFilePath, pinned, lastOpened)
     */
    async touchWorkspace(id, updates = {}) {
      const ws = await this.getWorkspace(id);
      if (!ws) return null;
      const updated = Object.assign({}, ws, updates, {
        lastOpened: updates.keepTimestamp ? ws.lastOpened : Date.now()
      });
      this.memoryCache.set(id, updated);
      this._updateLocalStorageMeta(updated);

      const db = await this.init();
      if (db) {
        await new Promise((resolve) => {
          try {
            const tx = db.transaction(STORE_WORKSPACES, 'readwrite');
            tx.objectStore(STORE_WORKSPACES).put(updated);
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
          } catch (_) {
            resolve(false);
          }
        });
      }
      return updated;
    }

    /**
     * Retrieve full cached workspace by ID
     */
    async getWorkspace(id) {
      if (this.memoryCache.has(id)) {
        return this.memoryCache.get(id);
      }

      const db = await this.init();
      if (db) {
        const result = await new Promise((resolve) => {
          try {
            const tx = db.transaction(STORE_WORKSPACES, 'readonly');
            const req = tx.objectStore(STORE_WORKSPACES).get(id);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
          } catch (_) {
            resolve(null);
          }
        });
        if (result) {
          this.memoryCache.set(id, result);
          return result;
        }
      }

      try {
        const raw = localStorage.getItem(LS_FALLBACK_DATA_PREFIX + id);
        if (raw) {
          const parsed = JSON.parse(raw);
          this.memoryCache.set(id, parsed);
          return parsed;
        }
      } catch (_) {}

      return null;
    }

    /**
     * List all recent workspaces sorted by pinned first, then lastOpened descending
     */
    async listRecent() {
      const db = await this.init();
      let items = [];

      if (db) {
        items = await new Promise((resolve) => {
          try {
            const tx = db.transaction(STORE_WORKSPACES, 'readonly');
            const req = tx.objectStore(STORE_WORKSPACES).getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
          } catch (_) {
            resolve([]);
          }
        });
      }

      if (!items || items.length === 0) {
        items = this._getLocalStorageMetaList();
      } else {
        items.forEach((item) => this.memoryCache.set(item.id, item));
      }

      return items
        .map((w) => ({
          id: w.id,
          type: w.type,
          name: w.name,
          subtitle: w.subtitle,
          lastOpened: w.lastOpened,
          pinned: Boolean(w.pinned),
          activeFilePath: w.activeFilePath,
          fileCount: w.fileCount || 1,
          totalBytes: w.totalBytes || 0,
          isSample: Boolean(w.isSample)
        }))
        .sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
          return (b.lastOpened || 0) - (a.lastOpened || 0);
        });
    }

    /**
     * Remove a workspace from cache
     */
    async removeWorkspace(id) {
      this.memoryCache.delete(id);
      this._removeLocalStorageMeta(id);
      try {
        localStorage.removeItem(LS_FALLBACK_DATA_PREFIX + id);
      } catch (_) {}

      const db = await this.init();
      if (db) {
        await new Promise((resolve) => {
          try {
            const tx = db.transaction(STORE_WORKSPACES, 'readwrite');
            tx.objectStore(STORE_WORKSPACES).delete(id);
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
          } catch (_) {
            resolve(false);
          }
        });
      }
    }

    /**
     * Clear all cached workspaces
     */
    async clearAll() {
      this.memoryCache.clear();
      try {
        localStorage.removeItem(LS_META_KEY);
      } catch (_) {}

      const db = await this.init();
      if (db) {
        await new Promise((resolve) => {
          try {
            const tx = db.transaction(STORE_WORKSPACES, 'readwrite');
            tx.objectStore(STORE_WORKSPACES).clear();
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
          } catch (_) {
            resolve(false);
          }
        });
      }
    }

    _getLocalStorageMetaList() {
      try {
        const raw = localStorage.getItem(LS_META_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch (_) {
        return [];
      }
    }

    _updateLocalStorageMeta(record) {
      try {
        const list = this._getLocalStorageMetaList().filter((i) => i.id !== record.id);
        list.unshift({
          id: record.id,
          type: record.type,
          name: record.name,
          subtitle: record.subtitle,
          lastOpened: record.lastOpened,
          pinned: Boolean(record.pinned),
          activeFilePath: record.activeFilePath,
          fileCount: record.fileCount,
          totalBytes: record.totalBytes,
          isSample: Boolean(record.isSample)
        });
        localStorage.setItem(LS_META_KEY, JSON.stringify(list.slice(0, 50)));
      } catch (_) {}
    }

    _removeLocalStorageMeta(id) {
      try {
        const list = this._getLocalStorageMetaList().filter((i) => i.id !== id);
        localStorage.setItem(LS_META_KEY, JSON.stringify(list));
      } catch (_) {}
    }

    // =========================================================================
    // DOCUMENT TAGS PERSISTENCE (Favorite, Important, Incomplete, Like)
    // =========================================================================
    _getTagsMap() {
      try {
        const raw = localStorage.getItem('foliomd_doc_tags_v2');
        return raw ? JSON.parse(raw) : {};
      } catch (_) {
        return {};
      }
    }

    _saveTagsMap(map) {
      try {
        localStorage.setItem('foliomd_doc_tags_v2', JSON.stringify(map));
      } catch (_) {}
    }

    getDocumentTags(workspaceId, filePath) {
      if (!workspaceId || !filePath) return [];
      const key = `${workspaceId}::${filePath}`;
      const map = this._getTagsMap();
      const entry = map[key];
      return entry && Array.isArray(entry.tags) ? entry.tags : [];
    }

    async setDocumentTags(workspaceId, filePath, tags = [], meta = {}) {
      if (!workspaceId || !filePath) return [];
      const key = `${workspaceId}::${filePath}`;
      const map = this._getTagsMap();
      const cleanTags = Array.from(new Set(tags.filter(Boolean)));

      if (cleanTags.length === 0) {
        delete map[key];
      } else {
        const existing = map[key] || {};
        map[key] = {
          id: key,
          workspaceId,
          workspaceName: meta.workspaceName || existing.workspaceName || workspaceId.replace(/^(folder:|file:)/, ''),
          filePath,
          fileName: meta.fileName || existing.fileName || filePath.split('/').pop(),
          title: meta.title || existing.title || filePath.split('/').pop(),
          tags: cleanTags,
          updatedAt: Date.now()
        };
      }

      this._saveTagsMap(map);

      // Also mirror tags into cached workspace object if present
      const ws = await this.getWorkspace(workspaceId);
      if (ws && ws.files && ws.files[filePath]) {
        ws.files[filePath].tags = cleanTags;
        await this.saveWorkspace(ws);
      }

      return cleanTags;
    }

    listAllTaggedDocuments(tagFilter = 'all') {
      const map = this._getTagsMap();
      const allItems = Object.values(map);

      return allItems
        .filter((item) => {
          if (!item.tags || !item.tags.length) return false;
          if (tagFilter && tagFilter !== 'all') {
            return item.tags.includes(tagFilter);
          }
          return true;
        })
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    }
  }

  global.FolioCache = new FolioCacheDB();
})(window);
