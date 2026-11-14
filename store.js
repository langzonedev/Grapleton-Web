function normaliseCellar(saved = {}) {
  const { rows = 3, columns = 6, bottles = {}, revision = 0 } = saved;
  return {
    racks: saved.racks ?? [{ id: 'main', name: 'Main rack', rows, columns, bottles }],
    revision,
  };
}

const database = new Promise((resolve, reject) => {
  const request = indexedDB.open('grapleton', 1);
  request.onupgradeneeded = () => request.result.createObjectStore('cellar');
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
  request.onblocked = () => reject(new Error('Close other Grapleton tabs and reload.'));
});

export async function readCellar() {
  const db = await database;
  return new Promise((resolve, reject) => {
    const request = db.transaction('cellar').objectStore('cellar').get('current');
    request.onsuccess = () => resolve(normaliseCellar(request.result));
    request.onerror = () => reject(request.error);
  });
}

export async function saveCellar(next, revision) {
  const db = await database;
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('cellar', 'readwrite');
    const store = transaction.objectStore('cellar');
    const request = store.get('current');
    let conflict = false;
    const saved = { ...next, revision: revision + 1 };
    transaction.oncomplete = () => resolve(saved);
    transaction.onabort = () => reject(conflict
      ? new Error('The cellar changed in another tab. Close this form and try again with the latest cellar.')
      : new Error('Could not save. Check the available storage and try again.'));
    request.onsuccess = () => {
      if ((request.result?.revision ?? 0) !== revision) {
        conflict = true;
        transaction.abort();
        return;
      }
      store.put(saved, 'current');
    };
  });
}
