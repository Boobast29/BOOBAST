// Stockage : IndexedDB (gros volumes, photos/logos) avec repli sur localStorage
const Store = {
  db: null,
  open() {
    return new Promise(res => {
      try {
        const r = indexedDB.open('manager-foot', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('kv');
        r.onsuccess = () => { this.db = r.result; res(true); };
        r.onerror = () => res(false);
        r.onblocked = () => res(false);
      } catch { res(false); }
    });
  },
  get(k) {
    if (!this.db) { try { const s = localStorage.getItem(k); return Promise.resolve(s ? JSON.parse(s) : null); } catch { return Promise.resolve(null); } }
    return new Promise(res => {
      try {
        const q = this.db.transaction('kv').objectStore('kv').get(k);
        q.onsuccess = () => res(q.result ?? null); q.onerror = () => res(null);
      } catch { res(null); }
    });
  },
  set(k, v) {
    if (!this.db) { try { localStorage.setItem(k, JSON.stringify(v)); return Promise.resolve(); } catch (e) { return Promise.reject(e); } }
    return new Promise((res, rej) => {
      try {
        const tx = this.db.transaction('kv', 'readwrite');
        tx.objectStore('kv').put(v, k);
        tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error);
      } catch (e) { rej(e); }
    });
  },
  del(k) {
    if (!this.db) { try { localStorage.removeItem(k); } catch { } return Promise.resolve(); }
    return new Promise(res => {
      try { const tx = this.db.transaction('kv', 'readwrite'); tx.objectStore('kv').delete(k); tx.oncomplete = () => res(); tx.onerror = () => res(); } catch { res(); }
    });
  }
};
