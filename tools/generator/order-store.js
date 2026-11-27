/* Заказ, возврат и ключ повтора хранятся одной записью в IndexedDB. */
const be101OrderStore = (() => {
  const storeName = 'orders-demo';

  function open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('be101-order-practice', 1);
      request.onupgradeneeded = () => request.result.createObjectStore(storeName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function exchange(scope, request, headers) {
    const database = await open();
    try {
      return await new Promise((resolve, reject) => {
        const writable = request.action === 'cancel' || request.action === 'reset';
        const transaction = database.transaction(storeName, writable ? 'readwrite' : 'readonly');
        const records = transaction.objectStore(storeName);
        const read = records.get(scope);
        let reply;

        read.onsuccess = () => {
          const state = read.result ?? be101OrderDemo.initialState();
          const effect = be101OrderDemo.execute(state, request, headers);
          if (effect.state !== state) records.put(effect.state, scope);
          reply = effect.response;
        };
        transaction.oncomplete = () => resolve(reply);
        transaction.onabort = () => reject(transaction.error);
      });
    } finally {
      database.close();
    }
  }

  return { exchange };
})();
