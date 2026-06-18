const memoryStore = new Map();

function resolveStorage() {
  try {
    if (typeof window !== "undefined" && window.localStorage)
      return window.localStorage;
  } catch {
    // Embedded browsers can expose the app without persistent storage.
  }

  return {
    getItem(key) {
      return memoryStore.has(key) ? memoryStore.get(key) : null;
    },
    setItem(key, value) {
      memoryStore.set(key, String(value));
    },
    removeItem(key) {
      memoryStore.delete(key);
    },
  };
}

const storage = {
  get(key) {
    try {
      return resolveStorage().getItem(key);
    } catch {
      return memoryStore.has(key) ? memoryStore.get(key) : null;
    }
  },
  set(key, value) {
    try {
      resolveStorage().setItem(key, value);
    } catch {
      memoryStore.set(key, String(value));
    }
  },
  remove(key) {
    try {
      resolveStorage().removeItem(key);
    } catch {
      memoryStore.delete(key);
    }
  },
};

export default storage;
