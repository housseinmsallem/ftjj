interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const memoryStore = new Map<string, string>();

function resolveStorage(): StorageLike {
  try {
    if (typeof window !== "undefined" && window.localStorage)
      return window.localStorage;
  } catch {
    // Embedded browsers can expose the app without persistent storage.
  }

  return {
    getItem(key: string): string | null {
      return memoryStore.has(key) ? memoryStore.get(key)! : null;
    },
    setItem(key: string, value: string): void {
      memoryStore.set(key, String(value));
    },
    removeItem(key: string): void {
      memoryStore.delete(key);
    },
  };
}

const storage = {
  get(key: string): string | null {
    try {
      return resolveStorage().getItem(key);
    } catch {
      return memoryStore.has(key) ? memoryStore.get(key)! : null;
    }
  },
  set(key: string, value: string): void {
    try {
      resolveStorage().setItem(key, value);
    } catch {
      memoryStore.set(key, String(value));
    }
  },
  remove(key: string): void {
    try {
      resolveStorage().removeItem(key);
    } catch {
      memoryStore.delete(key);
    }
  },
};

export default storage;
