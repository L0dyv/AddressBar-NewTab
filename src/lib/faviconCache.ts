/**
 * Favicon 内存缓存管理模块
 * 
 * 在页面加载时一次性从 chrome.storage.local 读取整个 faviconsCache，
 * 存到内存中，后续组件直接从内存同步读取，实现秒开。
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const chrome: any;

interface FaviconCacheEntry {
    src?: string;
    data?: string;
}

type FaviconCacheData = Record<string, FaviconCacheEntry | string>;

// 内存缓存
let memoryCache: FaviconCacheData = {};
let cacheLoaded = false;
let cacheLoadPromise: Promise<void> | null = null;

const STORAGE_KEY = 'faviconsCache';

/**
 * 初始化缓存：一次性从 chrome.storage.local 读取整个缓存到内存
 * 应在应用启动时调用一次
 */
export async function initFaviconCache(): Promise<void> {
    // 如果已经加载过，直接返回
    if (cacheLoaded) return;

    // 如果正在加载，等待加载完成
    if (cacheLoadPromise) {
        await cacheLoadPromise;
        return;
    }

    // 开始加载
    cacheLoadPromise = (async () => {
        try {
            if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
                const data = await chrome.storage.local.get(STORAGE_KEY);
                memoryCache = data[STORAGE_KEY] || {};
            }
        } catch (e) {
            console.warn('[FaviconCache] Failed to load from storage:', e);
            memoryCache = {};
        }
        cacheLoaded = true;
    })();

    await cacheLoadPromise;
}

/**
 * 同步获取缓存的 favicon（从内存）
 * @param url 页面 URL
 * @returns 缓存的 data URL 或 src，如果未找到返回 null
 */
export function getCachedFavicon(url: string): string | null {
    const cached = memoryCache[url];
    if (!cached) return null;

    if (typeof cached === 'string') {
        return cached;
    }

    // 优先返回 data URL，其次是 src
    return cached.data || cached.src || null;
}

/**
 * 更新内存缓存（当 background 返回新的 favicon 时调用）
 * @param url 页面 URL
 * @param src favicon 源
 */
export function updateMemoryCache(url: string, src: string): void {
    memoryCache[url] = src;
}

/**
 * 检查缓存是否已加载完成
 */
export function isCacheLoaded(): boolean {
    return cacheLoaded;
}

/**
 * 获取缓存加载的 Promise（用于等待缓存加载完成）
 */
export function getCacheLoadPromise(): Promise<void> | null {
    return cacheLoadPromise;
}
