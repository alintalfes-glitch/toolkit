const DB_NAME = 'forensics-toolkit';
const DB_VERSION = 1;

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('files')) {
                db.createObjectStore('files', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('events')) {
                db.createObjectStore('events', { keyPath: 'id', autoIncrement: true });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function saveFileToIndexedDB(file, metadata) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('files', 'readwrite');
        const store = tx.objectStore('files');
        const record = {
            id: Date.now().toString(),
            name: file.name,
            type: file.type,
            size: file.size,
            lastModified: file.lastModified,
            metadata: metadata || {}
        };
        store.put(record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}