import { useMemo, useState, useEffect } from "react";
import { getCachedFavicon, updateMemoryCache } from "@/lib/faviconCache";

interface QuickLinkIconProps {
    name: string;
    url: string;
    icon?: string;
    size?: number;
    className?: string;
}

const QuickLinkIcon = ({ name, url, icon, size = 32, className = "" }: QuickLinkIconProps) => {
    const [loadFailed, setLoadFailed] = useState(false);
    const [stage, setStage] = useState(0);
    const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);

    const hostname = useMemo(() => {
        try {
            return new URL(url).hostname;
        } catch {
            return url;
        }
    }, [url]);

    const label = useMemo(() => {
        const source = (name || hostname || "?").trim();
        return source ? source.charAt(0).toUpperCase() : "?";
    }, [name, hostname]);

    const isExtension = typeof chrome !== "undefined";
    const pageUrl = useMemo(() => {
        try {
            const u = url.startsWith("http") ? url : `https://${url}`;
            return new URL(u).toString();
        } catch {
            return url;
        }
    }, [url]);

    const sources = useMemo(() => {
        const list: (string | undefined)[] = [];
        if (isExtension) {
            list.push(`chrome://favicon/${pageUrl}`);
        }
        list.push(`https://${hostname}/favicon.ico`);
        list.push(`https://icons.duckduckgo.com/ip3/${hostname}.ico`);
        list.push(`https://favicon.yandex.net/favicon/${hostname}`);
        list.push(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`);
        list.push(`http://${hostname}/favicon.ico`);
        return list.filter(Boolean) as string[];
    }, [isExtension, pageUrl, hostname]);

    useEffect(() => {
        setStage(0);
        setLoadFailed(false);
        setResolvedSrc(null);
    }, [url]);

    // 首先尝试从内存缓存同步获取
    useEffect(() => {
        // 先检查内存缓存
        const cached = getCachedFavicon(pageUrl);
        if (cached) {
            setResolvedSrc(cached);
            return;
        }

        // 内存缓存没有，才发消息给 background
        if (isExtension && chrome?.runtime?.sendMessage) {
            try {
                chrome.runtime.sendMessage({ type: 'RESOLVE_FAVICON', url: pageUrl }, (res) => {
                    if (res && (res as { success?: boolean; src?: string }).success && (res as { src?: string }).src) {
                        const src = (res as { src?: string }).src || null;
                        if (src) {
                            // 更新内存缓存
                            updateMemoryCache(pageUrl, src);
                            setResolvedSrc(src);
                        }
                    }
                });
            } catch {
                setResolvedSrc(null);
            }
        }
    }, [isExtension, pageUrl]);

    if (icon) {
        return (
            <div
                className={className}
                style={{ width: size, height: size, fontSize: size * 0.75, lineHeight: 1 }}
            >
                {icon}
            </div>
        );
    }

    return (
        <div
            className={`relative flex items-center justify-center rounded-md ${className}`}
            style={{ width: size, height: size }}
        >
            {!loadFailed && (
                <img
                    src={resolvedSrc ?? sources[stage]}
                    alt={name}
                    className="w-full h-full object-contain"
                    onError={() => {
                        if (stage < sources.length - 1) {
                            setStage(stage + 1);
                        } else {
                            setLoadFailed(true);
                        }
                    }}
                />
            )}
            {loadFailed && (
                <div
                    className="w-full h-full rounded-md bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-200 font-semibold flex items-center justify-center"
                    style={{ fontSize: size * 0.5 }}
                >
                    {label}
                </div>
            )}
        </div>
    );
};

export default QuickLinkIcon;
