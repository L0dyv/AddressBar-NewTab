const parseTitle = (html) => {
    const m = html.match(/<title>([^<]*)<\/title>/i);
    return m ? m[1].trim() : null;
};

const absoluteUrl = (base, href) => {
    try {
        return new URL(href, base).toString();
    } catch {
        return href;
    }
};

const parseIcons = (html, baseUrl) => {
    const links = [];
    const regex = /<link[^>]*rel=["']([^"']+)["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
    let m;
    while ((m = regex.exec(html)) !== null) {
        const rel = m[1].toLowerCase();
        const href = m[2];
        if (rel.includes("icon") || rel.includes("apple-touch-icon") || rel.includes("mask-icon")) {
            links.push(absoluteUrl(baseUrl, href));
        }
    }
    return links;
};

const tryFetchOk = async (url) => {
    try {
        const res = await fetch(url, { method: "GET", redirect: "follow" });
        if (res.ok) {
            const ct = res.headers.get("content-type") || "";
            if (ct.includes("image") || url.endsWith(".ico") || url.endsWith(".png") || url.endsWith(".jpg") || url.endsWith(".svg")) {
                return url;
            }
        }
        return null;
    } catch {
        return null;
    }
};

const blobToDataURL = (blob) => new Promise((resolve, reject) => {
    try {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("read error"));
        reader.readAsDataURL(blob);
    } catch (e) {
        reject(e);
    }
});

const fetchToDataURL = async (url) => {
    try {
        const res = await fetch(url, { method: "GET", redirect: "follow" });
        if (!res.ok) return null;
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("image") && !url.endsWith(".ico") && !url.endsWith(".png") && !url.endsWith(".jpg") && !url.endsWith(".svg")) return null;
        const blob = await res.blob();
        const dataUrl = await blobToDataURL(blob);
        return typeof dataUrl === "string" ? dataUrl : null;
    } catch {
        return null;
    }
};

const resolveFavicon = async (pageUrl) => {
    let hostname = "";
    try {
        hostname = new URL(pageUrl).hostname;
    } catch {
        hostname = pageUrl;
    }

    try {
        const htmlRes = await fetch(pageUrl, { method: "GET", redirect: "follow" });
        if (htmlRes.ok) {
            const html = await htmlRes.text();
            const icons = parseIcons(html, pageUrl);
            for (const u of icons) {
                const ok = await tryFetchOk(u);
                if (ok) return ok;
            }
        }
    } catch { }

    const candidates = [
        `https://${hostname}/favicon.ico`,
        `https://${hostname}/favicon.png`,
        `https://${hostname}/apple-touch-icon.png`,
        `https://${hostname}/apple-touch-icon-precomposed.png`,
        `http://${hostname}/favicon.ico`
    ];
    for (const u of candidates) {
        const ok = await tryFetchOk(u);
        if (ok) return ok;
    }
    return null;
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // 获取当前活动标签页信息
    if (message && message.type === "GET_CURRENT_TAB") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs[0]) {
                sendResponse({ success: true, url: tabs[0].url, title: tabs[0].title });
            } else {
                sendResponse({ success: false });
            }
        });
        return true;
    }

    // 处理打开扩展程序页面的请求
    if (message && message.type === "OPEN_EXTENSIONS_PAGE") {
        chrome.tabs.create({ url: "chrome://extensions" });
        sendResponse({ success: true });
        return false;
    }

    // 处理打开浏览器设置页面的请求
    if (message && message.type === "OPEN_BROWSER_SETTINGS") {
        chrome.tabs.create({ url: "chrome://settings" });
        sendResponse({ success: true });
        return false;
    }

    // 处理快速链接更新通知，广播到所有标签页
    if (message && message.type === "QUICK_LINKS_UPDATED") {
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                if (tab.id && tab.id !== sender.tab?.id) {
                    chrome.tabs.sendMessage(tab.id, { type: 'QUICK_LINKS_UPDATED' }).catch(() => {
                        // 忽略无法接收消息的标签页
                    });
                }
            });
        });
        sendResponse({ success: true });
        return false;
    }

    if (message && message.type === "FETCH_PAGE_TITLE" && message.url) {
        (async () => {
            try {
                const res = await fetch(message.url, { method: "GET", redirect: "follow" });
                if (res.ok) {
                    const html = await res.text();
                    const title = parseTitle(html);
                    sendResponse({ success: true, title: title || null });
                } else {
                    sendResponse({ success: false });
                }
            } catch {
                sendResponse({ success: false });
            }
        })();
        return true;
    }

    if (message && message.type === "RESOLVE_FAVICON" && message.url) {
        (async () => {
            try {
                const key = "faviconsCache";
                const data = await chrome.storage.local.get(key);
                const cache = data[key] || {};
                const cacheKey = message.url;
                const cached = cache[cacheKey];

                // 检查缓存
                if (cached) {
                    // 如果是失败缓存，检查是否过期（1小时）
                    if (cached.failed) {
                        const expireTime = 60 * 60 * 1000; // 1 hour
                        if (Date.now() - cached.timestamp < expireTime) {
                            sendResponse({ success: false });
                            return;
                        }
                        // 过期了，删除失败缓存，继续重试
                        delete cache[cacheKey];
                    } else {
                        const src = typeof cached === "string" ? cached : (cached.data || cached.src);
                        sendResponse({ success: true, src });
                        return;
                    }
                }

                const src = await resolveFavicon(message.url);
                if (src) {
                    const dataUrl = await fetchToDataURL(src);

                    // 验证是否真的是图片（防止 Cloudflare 验证页等 HTML 被缓存）
                    if (dataUrl && !dataUrl.startsWith('data:image/')) {
                        // 不是图片，缓存为失败状态
                        cache[cacheKey] = { failed: true, timestamp: Date.now() };
                        await chrome.storage.local.set({ [key]: cache });
                        sendResponse({ success: false });
                        return;
                    }

                    cache[cacheKey] = dataUrl ? { src, data: dataUrl } : { src };
                    await chrome.storage.local.set({ [key]: cache });
                    sendResponse({ success: true, src: dataUrl || src });
                } else {
                    // favicon 获取失败，缓存失败状态并设置过期时间
                    cache[cacheKey] = { failed: true, timestamp: Date.now() };
                    await chrome.storage.local.set({ [key]: cache });
                    sendResponse({ success: false });
                }
            } catch {
                sendResponse({ success: false });
            }
        })();
        return true;
    }
});
