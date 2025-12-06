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
    const [showShortcutHints, setShowShortcutHints] = useState(false);

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

    // 在当前标签页导航，避免再创建新标签
    const navigateInCurrentTab = (url: string) => {
        if (typeof window !== "undefined" && (window as any).chrome?.tabs) {
            (window as any).chrome.tabs.update({ url });
            window.close();
        } else {
            window.location.href = url;
        }
    };

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
        navigateInCurrentTab(url);
    };

    // 处理搜索提交
    const handleSubmit = (value: string) => {
        if (!value.trim()) return;

        if (isURL(value)) {
            const url = value.startsWith('http') ? value : `https://${value}`;
            navigateInCurrentTab(url);
        } else {
            const engine = searchEngines.find(e => e.id === searchEngine);
            if (engine) {
                if (engine.id === 'kagi-assistant') {
                    handleKagiSearch(value);
                } else {
                    const searchUrl = engine.url + encodeURIComponent(value);
                    navigateInCurrentTab(searchUrl);
                }
            }
        }
    };

    // 打开快速链接
    const handleQuickLinkClick = (url: string) => {
        navigateInCurrentTab(url);
    };

    // 打开设置（当前标签页）
    const handleOpenSettings = () => {
        navigateInCurrentTab("chrome://newtab");
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

    // 键盘快捷键：Alt + 数字 切换已启用的搜索引擎
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const key = e.key;
            if (!/^[1-9]$/.test(key)) return;
            // 仅响应 Alt + 数字
            if (!e.altKey) return;

            const enabled = searchEngines.filter(s => s.enabled !== false);
            if (enabled.length === 0) return;

            const idx = Math.min(parseInt(key, 10) - 1, enabled.length - 1);
            const target = enabled[idx];
            if (target && target.id !== searchEngine) {
                e.preventDefault();
                handleSearchEngineChange(target.id);
            }
        };

        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [searchEngines, searchEngine]);

    // 按住 Alt 键 400ms 后显示快捷键提示
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | null = null;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Alt' && !timer) {
                timer = setTimeout(() => setShowShortcutHints(true), 400);
            }
        };

        const onKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Alt') {
                if (timer) {
                    clearTimeout(timer);
                    timer = null;
                }
                setShowShortcutHints(false);
            }
        };

        const onBlur = () => {
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
            setShowShortcutHints(false);
        };

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('blur', onBlur);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('blur', onBlur);
            if (timer) clearTimeout(timer);
        };
    }, []);

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
                        {searchEngines.filter(e => e.enabled !== false).map((engine, index) => (
                            <button
                                key={engine.id}
                                type="button"
                                className={`relative inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 cursor-pointer select-none border-0 outline-none focus:outline-none ${searchEngine === engine.id
                                    ? "bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900 shadow-sm"
                                    : "text-stone-600 dark:text-stone-400 hover:bg-stone-200/50 dark:hover:bg-stone-800/50 hover:text-stone-800 dark:hover:text-stone-200 bg-transparent"
                                    }`}
                                onClick={() => handleSearchEngineChange(engine.id)}
                                onMouseDown={(e) => e.preventDefault()}
                            >
                                {/* 快捷键数字提示 */}
                                {showShortcutHints && index < 9 && (
                                    <span className="absolute -top-1.5 -right-0.5 flex items-center justify-center w-3.5 h-3.5 text-[9px] font-bold rounded-full bg-stone-600 dark:bg-stone-400 text-white dark:text-stone-900 shadow-sm animate-in fade-in zoom-in-50 duration-150">
                                        {index + 1}
                                    </span>
                                )}
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