import { useEffect, useState } from "react";
import { Settings } from "lucide-react";
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
            className="bg-background rounded-xl shadow-2xl overflow-hidden"
            style={{ width: "400px", height: popupHeight }}
        >
            <div className="p-4 h-full flex flex-col">
                {/* 设置按钮 */}
                <div className="absolute top-3 right-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-500 dark:text-muted-foreground hover:text-gray-700 dark:hover:text-foreground"
                        onClick={handleOpenSettings}
                    >
                        <Settings className="h-4 w-4" />
                    </Button>
                </div>

                {/* 搜索框区域 */}
                <div className="flex-1 flex flex-col justify-center">
                    <div className="relative mb-3">
                        <AutoComplete
                            value={query}
                            onChange={setQuery}
                            onSubmit={handleSubmit}
                            placeholder={isKagiSelected ? "向 Kagi Assistant 提问..." : "输入网址或搜索关键词..."}
                            className="w-full h-12 text-base px-6 pr-20 rounded-full bg-white dark:bg-card border-2 border-gray-300 dark:border-border text-gray-900 dark:text-foreground placeholder:text-gray-500 dark:placeholder:text-muted-foreground focus:border-blue-500 dark:focus:border-ring focus:outline-none transition-all duration-200 shadow-lg hover:shadow-xl"
                        />

                        {/* 搜索按钮 */}
                        <Button
                            onClick={() => handleSubmit(query)}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 px-4 rounded-full bg-blue-600 dark:bg-foreground hover:bg-blue-700 dark:hover:bg-foreground/90 text-white dark:text-background text-sm font-medium shadow-sm hover:shadow-md transition-all duration-200"
                        >
                            {isKagiSelected ? "提问" : "搜索"}
                        </Button>
                    </div>

                    {/* 搜索引擎选择 - 紧凑布局 */}
                    <div className="flex items-center justify-center gap-1.5 flex-wrap mb-3">
                        {searchEngines.filter(e => e.enabled !== false).map((engine) => (
                            <button
                                key={engine.id}
                                type="button"
                                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 cursor-pointer select-none border-0 outline-none focus:outline-none ${searchEngine === engine.id
                                    ? "bg-blue-600 dark:bg-accent text-white dark:text-accent-foreground shadow-sm"
                                    : "text-gray-600 dark:text-muted-foreground hover:bg-gray-100 dark:hover:bg-accent hover:text-gray-800 dark:hover:text-accent-foreground bg-transparent"
                                    }`}
                                onClick={() => handleSearchEngineChange(engine.id)}
                                onMouseDown={(e) => e.preventDefault()}
                            >
                                {engine.name}
                                {engine.isAI && (
                                    <span className="ml-0.5 text-[10px] bg-blue-500 dark:bg-muted text-white dark:text-muted-foreground px-1 py-0.5 rounded">AI</span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* 快速链接 - 只显示前4个 */}
                    {showQuickLinks && (
                        <div className="grid grid-cols-4 gap-2 mt-auto">
                            {quickLinks.slice(0, 4).map((link) => (
                                <div
                                    key={link.id}
                                    className="group cursor-pointer"
                                    onClick={() => handleQuickLinkClick(link.url)}
                                >
                                    <div className="flex flex-col items-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-accent transition-all duration-200">
                                        <div className="w-10 h-10 rounded-lg bg-white dark:bg-muted shadow-sm group-hover:shadow-md transition-all duration-200 flex items-center justify-center mb-1 overflow-hidden">
                                            {link.icon ? (
                                                <div className="text-xl">{link.icon}</div>
                                            ) : (
                                                <img
                                                    src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(link.url)}&sz=32`}
                                                    alt={link.name}
                                                    className="w-6 h-6 object-contain"
                                                    onError={(e) => {
                                                        e.currentTarget.src = '/placeholder.svg';
                                                    }}
                                                />
                                            )}
                                        </div>
                                        <span className="text-[10px] text-gray-600 dark:text-muted-foreground truncate max-w-full">
                                            {link.name}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
} 