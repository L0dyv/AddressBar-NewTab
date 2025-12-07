// Lightweight wrapper for storage with chrome.storage.sync + localStorage fallback.
// Mirrors writes to both so localStorage remains a fast cache for synchronous callers.

type ChromeStorageSync = {
    get: (keys: string | string[]) => Promise<Record<string, unknown>>;
    set: (items: Record<string, unknown>) => Promise<void>;
    remove: (keys: string | string[]) => Promise<void>;
};

const getChromeSync = (): ChromeStorageSync | undefined => {
    try {
        const sync = (typeof chrome !== 'undefined'
            ? (chrome as unknown as { storage?: { sync?: ChromeStorageSync } })?.storage?.sync
            : undefined);
        return sync;
    } catch {
        return undefined;
    }
};

const isChromeStorageSyncAvailable = () => !!getChromeSync();

const setLocalValue = (key: string, value: unknown) => {
    try {
        if (typeof value === 'string') {
            localStorage.setItem(key, value);
        } else {
            localStorage.setItem(key, JSON.stringify(value));
        }
    } catch {
        /* ignore quota or serialization errors */
    }
};

const readLocalValue = <T>(key: string, fallback: T): { value: T; found: boolean } => {
    try {
        const raw = localStorage.getItem(key);
        if (raw === null || raw === undefined) return { value: fallback, found: false };

        try {
            return { value: JSON.parse(raw) as T, found: true };
        } catch {
            return { value: raw as unknown as T, found: true };
        }
    } catch {
        return { value: fallback, found: false };
    }
};

export async function setStoredValue<T>(key: string, value: T): Promise<void> {
    setLocalValue(key, value);

    const sync = getChromeSync();
    if (!sync) return;

    try {
        await sync.set({ [key]: value });
    } catch {
        // 如果同步失败，至少本地已有缓存
    }
}

export async function getStoredValue<T>(key: string, fallback: T): Promise<T> {
    const { value: localValue, found } = readLocalValue<T>(key, fallback);

    // 如果本地已有值，直接信任本地，避免旧的 sync 覆盖刚导入的新配置
    if (found) return localValue;

    const sync = getChromeSync();
    if (!sync) return localValue;

    try {
        const result = await sync.get(key);
        if (result && Object.prototype.hasOwnProperty.call(result, key)) {
            const value = result[key] as T;
            // 保持本地缓存最新
            setLocalValue(key, value);
            return value;
        }
        return localValue;
    } catch {
        return localValue;
    }
}

export async function removeStoredValue(key: string): Promise<void> {
    try {
        localStorage.removeItem(key);
    } catch {
        /* ignore */
    }

    const sync = getChromeSync();
    if (!sync) return;

    try {
        await sync.remove(key);
    } catch {
        /* ignore */
    }
}

/**
 * 将现有 localStorage 数据迁移到 chrome.storage.sync（如果 sync 中不存在）。
 */
export async function migrateLocalStorageToSync(keys: string[]): Promise<void> {
    const sync = getChromeSync();
    if (!sync) return;

    try {
        const existing = await sync.get(keys);

        for (const key of keys) {
            if (Object.prototype.hasOwnProperty.call(existing, key)) continue;

            const raw = localStorage.getItem(key);
            if (raw === null || raw === undefined) continue;

            let value: unknown = raw;
            try {
                value = JSON.parse(raw);
            } catch {
                // raw 是纯字符串
            }

            try {
                await sync.set({ [key]: value });
            } catch {
                // ignore individual set failure
            }
        }
    } catch {
        // ignore migration failure entirely
    }
}
