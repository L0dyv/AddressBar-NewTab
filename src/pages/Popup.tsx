import { useEffect, useState } from "react";
import { Settings, Search } from "lucide-react";
import AutoComplete from "@/components/AutoComplete";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { SearchEngine, defaultSearchEngines, mergeBuiltinEngines } from "@/lib/defaultSearchEngines";

interface QuickLink {
    id: string;
    name: string;
    url: string;
    icon?: string;
    enabled?: boolean;
}

export default function Popup() {
    const [query, setQuery] = useState("");
    const { theme } = useTheme();
    const [showQuickLinks, setShowQuickLinks] = useState(false);

    // 从 localStorage 加载搜索引擎配置（与主页共享），使用方案B自动补齐
    const [searchEngines, setSearchEngines] = useState<SearchEngine[]>(() => {
        try {
            const saved = localStorage.getItem('searchEngines');
            if (saved) {
                const parsed = JSON.parse(saved);
                // 方案B：自动补齐所有内置引擎
                return mergeBuiltinEngines(parsed);
            }
            return defaultSearchEngines;
        } catch {
            return defaultSearchEngines;
        }
    });

    // 从 localStorage 加载快速链接
    const [quickLinks, setQuickLinks] = useState<QuickLink[]>(() => {
        try {
            const saved = localStorage.getItem('quickLinks');
            if (saved) {
                const parsed = JSON.parse(saved);
                return parsed.filter((link: QuickLink) => link.enabled !== false);
            }
            return [];
        } catch {
            return [];
        }
    });

    // 从 localStorage 加载当前选中的搜索引擎
    const [searchEngine, setSearchEngine] = useState(() => {
        try {
            const saved = localStorage.getItem('currentSearchEngine');
            if (saved) {
                return saved;
            }
            const defaultEngine = searchEngines.find(e => e.isDefault);
            return defaultEngine ? defaultEngine.id : "google";
        } catch {
            const defaultEngine = searchEngines.find(e => e.isDefault);
            return defaultEngine ? defaultEngine.id : "google";
        }
    });

    // 根据快速链接数量决定是否显示
    useEffect(() => {
        setShowQuickLinks(quickLinks.length > 0 && quickLinks.length <= 4);
    }, [quickLinks]);

    // 保存当前选中的搜索引擎
    const handleSearchEngineChange = (engineId: string) => {
        setSearchEngine(engineId);
        localStorage.setItem('currentSearchEngine', engineId);
    };

    // 判断是否为URL
    const isURL = (text: string) => {
        try {
            new URL(text.startsWith('http') ? text : `http://${text}`);
            return text.includes('.') && !text.includes(' ');
        } catch {
            return false;
        }
    };

    // 处理Kagi Assistant搜索
    const handleKagiSearch = (query: string) => {
        const params = new URLSearchParams({
            q: query,
            internet: 'true'
        });
        const url = `https://kagi.com/assistant?${params.toString()}`;

        if (typeof window !== "undefined" && (window as any).chrome?.tabs) {
            (window as any).chrome.tabs.create({ url });
            window.close();
        }
    };

    // 处理搜索提交
    const handleSubmit = (value: string) => {
        if (!value.trim()) return;

        if (isURL(value)) {
            const url = value.startsWith('http') ? value : `https://${value}`;
            if (typeof window !== "undefined" && (window as any).chrome?.tabs) {
                (window as any).chrome.tabs.create({ url });
                window.close();
            }
        } else {
            const engine = searchEngines.find(e => e.id === searchEngine);
            if (engine) {
                if (engine.id === 'kagi-assistant') {
                    handleKagiSearch(value);
                } else {
                    const searchUrl = engine.url + encodeURIComponent(value);
                    if (typeof window !== "undefined" && (window as any).chrome?.tabs) {
                        (window as any).chrome.tabs.create({ url: searchUrl });
                        window.close();
                    }
                }
            }
        }
    };

    // 打开快速链接
    const handleQuickLinkClick = (url: string) => {
        if (typeof window !== "undefined" && (window as any).chrome?.tabs) {
            (window as any).chrome.tabs.create({ url });
            window.close();
        }
    };

    // 打开设置（新标签页）
    const handleOpenSettings = () => {
        if (typeof window !== "undefined" && (window as any).chrome?.tabs) {
            (window as any).chrome.tabs.create({ url: "chrome://newtab" });
            window.close();
        }
    };

    const isKagiSelected = searchEngine === 'kagi-assistant';

    // 同步主题设置
    useEffect(() => {
        if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    // 动态计算高度
    const popupHeight = showQuickLinks ? "280px" : "200px";

    return (
        <div
            className="bg-stone-50 dark:bg-stone-950 rounded-xl shadow-2xl overflow-hidden"
            style={{ width: "400px", height: popupHeight }}
        >
            <div className="p-4 h-full flex flex-col">
                {/* 设置按钮 */}
                <div className="absolute top-3 right-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-stone-500 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
                        onClick={handleOpenSettings}
                    >
                        <Settings className="h-4 w-4" />
                    </Button>
                </div>

                {/* 搜索框区域 */}
                <div className="flex-1 flex flex-col justify-center">
                    <div className="relative mb-3">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-stone-600 pointer-events-none z-10" />
                        <AutoComplete
                            value={query}
                            onChange={setQuery}
                            onSubmit={handleSubmit}
                            placeholder={isKagiSelected ? "向 Kagi Assistant 提问..." : "输入网址或搜索..."}
                            className="w-full h-11 text-sm px-10 pr-20 rounded-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:ring-1 focus:ring-stone-300 dark:focus:ring-stone-700 focus:border-transparent focus:outline-none transition-all duration-200"
                        />

                        {/* 搜索按钮 - V0 风格 */}
                        <Button
                            onClick={() => handleSubmit(query)}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-7 px-3 rounded-full bg-stone-800 dark:bg-stone-100 hover:bg-stone-900 dark:hover:bg-white text-white dark:text-stone-900 text-xs font-medium shadow-sm hover:shadow-md transition-all duration-200"
                        >
                            {isKagiSelected ? "提问" : "搜索"}
                        </Button>
                    </div>

                    {/* 搜索引擎选择 - V0 风格紧凑布局 */}
                    <div className="flex items-center justify-center gap-1.5 flex-wrap mb-3">
                        {searchEngines.filter(e => e.enabled !== false).map((engine) => (
                            <button
                                key={engine.id}
                                type="button"
                                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 cursor-pointer select-none border-0 outline-none focus:outline-none ${searchEngine === engine.id
                                    ? "bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900 shadow-sm"
                                    : "text-stone-600 dark:text-stone-400 hover:bg-stone-200/50 dark:hover:bg-stone-800/50 hover:text-stone-800 dark:hover:text-stone-200 bg-transparent"
                                    }`}
                                onClick={() => handleSearchEngineChange(engine.id)}
                                onMouseDown={(e) => e.preventDefault()}
                            >
                                {engine.name}
                                {engine.isAI && (
                                    <span className="ml-0.5 text-[10px] bg-stone-600 dark:bg-stone-700 text-white dark:text-stone-300 px-1 py-0.5 rounded">AI</span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* 快速链接 - V0 风格仅图标 */}
                    {showQuickLinks && (
                        <div className="grid grid-cols-4 gap-3 mt-auto">
                            {quickLinks.slice(0, 4).map((link) => (
                                <div
                                    key={link.id}
                                    className="flex items-center justify-center py-3 rounded-lg hover:bg-stone-200/30 dark:hover:bg-stone-800/20 transition-colors duration-200 group cursor-pointer"
                                    onClick={() => handleQuickLinkClick(link.url)}
                                    title={link.name}
                                >
                                    {link.icon ? (
                                        <div className="text-2xl group-hover:scale-110 transition-transform duration-200">{link.icon}</div>
                                    ) : (
                                        <img
                                            src={`https://icons.duckduckgo.com/ip3/${(() => { try { return new URL(link.url).hostname; } catch { return link.url; } })()}.ico`}
                                            alt={link.name}
                                            className="w-8 h-8 object-contain group-hover:scale-110 transition-transform duration-200"
                                            onError={(e) => {
                                                e.currentTarget.src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(link.url)}&sz=32`;
                                            }}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
} 