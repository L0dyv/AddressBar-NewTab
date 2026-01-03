import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Settings, Search, Puzzle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import SearchEngineConfig from "@/components/SearchEngineConfig";
import QuickLinksConfig from "@/components/QuickLinksConfig";
import AutoComplete from "@/components/AutoComplete";
import ThemeToggle from "@/components/ThemeToggle";
import SettingsModal from "@/components/SettingsModal";
import ImportExportSettings from "@/components/ImportExportSettings";
import { SearchEngine, defaultSearchEngines, mergeBuiltinEngines } from "@/lib/defaultSearchEngines";
import { getStoredValue, setStoredValue, migrateLocalStorageToSync } from "@/lib/storage";
import QuickLinkIcon from "@/components/QuickLinkIcon";

interface QuickLink {
  id: string;
  name: string;
  url: string;
  icon?: string;
  enabled?: boolean;
}

const Index = () => {
  const [query, setQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showQuickLinksConfig, setShowQuickLinksConfig] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const [showShortcutHints, setShowShortcutHints] = useState(false);

  // Initialize state without localStorage access (will be loaded from chrome.storage.sync)
  const [searchEngines, setSearchEngines] = useState<SearchEngine[]>(defaultSearchEngines);
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>([]);
  const [searchEngine, setSearchEngine] = useState(() => {
    const def = defaultSearchEngines.find(e => e.isDefault);
    return def ? def.id : "google";
  });

  // Load settings once on mount and listen for updates
  useEffect(() => {
    let mounted = true;

    const loadSettings = async () => {
      await migrateLocalStorageToSync([
        'searchEngines',
        'quickLinks',
        'currentSearchEngine',
        'deletedBuiltinIds',
        'theme',
      ]);

      const fallbackEngineId = defaultSearchEngines.find(e => e.isDefault)?.id || "google";
      const [storedEngines, storedLinks, storedEngineId] = await Promise.all([
        getStoredValue<SearchEngine[]>('searchEngines', defaultSearchEngines),
        getStoredValue<QuickLink[]>('quickLinks', []),
        getStoredValue<string>('currentSearchEngine', fallbackEngineId),
      ]);

      if (!mounted) return;

      const mergedEngines = mergeBuiltinEngines(storedEngines);
      setSearchEngines(mergedEngines);

      const normalizedLinks = storedLinks.map((link) => ({
        ...link,
        enabled: link.enabled !== undefined ? link.enabled : true,
      }));
      setQuickLinks(normalizedLinks);

      if (storedEngineId) {
        setSearchEngine(storedEngineId);
      }
    };

    // Initial load
    loadSettings();

    // Listen for updates (e.g., from import/export)
    const handler = () => { loadSettings(); };
    window.addEventListener('settings:updated', handler);
    
    return () => {
      mounted = false;
      window.removeEventListener('settings:updated', handler);
    };
  }, []);

  // 保存搜索引擎配置到 localStorage
  useEffect(() => {
    setStoredValue('searchEngines', searchEngines);
  }, [searchEngines]);

  // 保存快速链接配置到 localStorage
  useEffect(() => {
    setStoredValue('quickLinks', quickLinks);
  }, [quickLinks]);

  // 保存当前选中的搜索引擎到 localStorage
  useEffect(() => {
    setStoredValue('currentSearchEngine', searchEngine);
  }, [searchEngine]);

  // 判断是否为URL
  const isURL = useCallback((text: string) => {
    // 不能包含空格
    if (text.includes(' ')) return false;

    try {
      const urlToTest = text.startsWith('http') ? text : `http://${text}`;
      new URL(urlToTest);

      // 包含 . 的域名（如 google.com）
      if (text.includes('.')) return true;

      // localhost 或 localhost:port 格式
      if (/^localhost(:\d+)?(\/.*)?$/i.test(text)) return true;

      // 带有协议前缀的 localhost
      if (/^https?:\/\/localhost(:\d+)?(\/.*)?$/i.test(text)) return true;

      // IP地址格式（如 127.0.0.1:8080）
      if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?(\/.*)?$/.test(text)) return true;

      return false;
    } catch {
      return false;
    }
  }, []);

  // 处理Kagi Assistant搜索
  const handleKagiSearch = useCallback((query: string) => {
    const params = new URLSearchParams({
      q: query,
      internet: 'true'
    });

    const url = `https://kagi.com/assistant?${params.toString()}`;
    window.location.href = url;
  }, []);

  // 处理搜索/导航
  const handleSubmit = useCallback((value: string) => {
    if (!value.trim()) return;

    if (isURL(value)) {
      const url = value.startsWith('http') ? value : `https://${value}`;
      window.location.href = url;
    } else {
      const engine = searchEngines.find(e => e.id === searchEngine);
      if (engine) {
        if (engine.id === 'kagi-assistant') {
          handleKagiSearch(value);
        } else {
          const searchUrl = engine.url + encodeURIComponent(value);
          window.location.href = searchUrl;
        }
      }
    }
  }, [isURL, searchEngines, searchEngine, handleKagiSearch]);

  // 修复搜索引擎切换
  const handleSearchEngineChange = useCallback((engineId: string) => {
    setSearchEngine(engineId);
  }, []);

  // 打开扩展程序页面
  const handleOpenExtensions = useCallback(() => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: "OPEN_EXTENSIONS_PAGE" });
    }
  }, []);

  // Memoize enabled search engines list
  const enabledSearchEngines = useMemo(() => 
    searchEngines.filter(e => e.enabled !== false),
    [searchEngines]
  );

  // Memoize enabled quick links list
  const enabledQuickLinks = useMemo(() => 
    quickLinks.filter(l => l.enabled === true),
    [quickLinks]
  );

  const isKagiSelected = searchEngine === 'kagi-assistant';

  // Update search engine when default changes
  useEffect(() => {
    const def = searchEngines.find(e => e.isDefault);
    if (def && def.id !== searchEngine) {
      setSearchEngine(def.id);
    }
  }, [searchEngines, searchEngine]);

  // 键盘快捷键：Alt + 数字 切换已启用的搜索引擎
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 检查按下的是 1-9
      const key = e.key;
      if (!/^[1-9]$/.test(key)) return;

      // 仅响应 Alt + 数字
      if (!e.altKey) return;

      if (enabledSearchEngines.length === 0) return;

      const idx = Math.min(parseInt(key, 10) - 1, enabledSearchEngines.length - 1);
      const target = enabledSearchEngines[idx];
      if (target && target.id !== searchEngine) {
        e.preventDefault();
        setSearchEngine(target.id);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabledSearchEngines, searchEngine]);

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

    // 窗口失焦时也隐藏提示
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

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col items-center justify-center p-4 transition-colors">
      {/* 设置和主题切换按钮 */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-stone-500 dark:text-stone-500 hover:text-stone-800 dark:hover:text-stone-100">
              <Settings className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 z-50">
            <DropdownMenuItem onClick={() => setShowSettings(true)}>
              搜索引擎设置
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowQuickLinksConfig(true)}>
              快速链接设置
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowImportExport(true)}>
              导入/导出设置
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 主搜索区域 */}
      <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
        {/* 欢迎标题区域 - V0 风格 */}
        <div className="text-center mb-12">
          <p className="text-xs text-stone-500 dark:text-stone-500 font-light mb-3 tracking-wider">
            {new Date().toLocaleDateString("zh-CN", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
          <h1 className="text-5xl md:text-6xl font-light text-stone-800 dark:text-stone-100 tracking-tight mb-2">
            欢迎回来
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-500">你想要做什么？</p>
        </div>

        {/* V0 风格搜索栏 */}
        <div className="w-full mb-12">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-stone-600 pointer-events-none" />
            <AutoComplete
              value={query}
              onChange={setQuery}
              onSubmit={handleSubmit}
              placeholder={isKagiSelected ? "向 Kagi Assistant 提问..." : "输入网址或搜索..."}
              className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-full pl-11 pr-24 py-3.5 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-600 focus:outline-none focus:ring-1 focus:ring-stone-300 dark:focus:ring-stone-700 focus:border-transparent transition-all text-sm"
            />

            {/* 搜索按钮在输入框内 - V0 风格 */}
            <Button
              onClick={() => handleSubmit(query)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-9 px-5 rounded-full bg-stone-800 dark:bg-stone-100 hover:bg-stone-900 dark:hover:bg-white text-white dark:text-stone-900 font-medium text-sm shadow-sm hover:shadow-md transition-all duration-200"
            >
              {isKagiSelected ? "提问" : "搜索"}
            </Button>
          </div>

          {/* 搜索引擎选择 - V0 风格圆角标签 */}
          <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
            {enabledSearchEngines.map((engine, index) => (
              <button
                key={engine.id}
                type="button"
                className={`relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 cursor-pointer select-none border-0 outline-none focus:outline-none ${searchEngine === engine.id
                  ? "bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900 shadow-sm"
                  : "text-stone-600 dark:text-stone-400 hover:bg-stone-200/50 dark:hover:bg-stone-800/50 hover:text-stone-800 dark:hover:text-stone-200 bg-transparent"
                  }`}
                onClick={() => handleSearchEngineChange(engine.id)}
                onMouseDown={(e) => e.preventDefault()}
              >
                {/* 快捷键数字提示 */}
                {showShortcutHints && index < 9 && (
                  <span className="absolute -top-2 -right-1 flex items-center justify-center w-4 h-4 text-[10px] font-bold rounded-full bg-stone-600 dark:bg-stone-400 text-white dark:text-stone-900 shadow-sm animate-in fade-in zoom-in-50 duration-150">
                    {index + 1}
                  </span>
                )}
                {engine.name}
                {engine.isAI && (
                  <span className="ml-1 text-xs bg-stone-600 dark:bg-stone-700 text-white dark:text-stone-300 px-1.5 py-0.5 rounded">AI</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 快速链接区域 - 仅图标样式（V0 风格）*/}
        {enabledQuickLinks.length > 0 && (
          <div className="grid grid-cols-4 md:grid-cols-6 gap-4 md:gap-6 w-full">
            {enabledQuickLinks.map((link) => (
              <a
                key={link.id}
                href={link.url.startsWith('http') ? link.url : `https://${link.url}`}
                className="flex items-center justify-center py-4 px-2 rounded-lg hover:bg-stone-200/30 dark:hover:bg-stone-800/20 transition-colors duration-200 group cursor-pointer"
                title={link.name}
              >
                <div className="group-hover:scale-110 transition-transform duration-200">
                  <QuickLinkIcon
                    name={link.name}
                    url={link.url}
                    icon={link.icon}
                    size={32}
                  />
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* 右下角扩展程序按钮 */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleOpenExtensions}
        className="fixed bottom-4 right-4 text-stone-400 dark:text-stone-600 hover:text-stone-600 dark:hover:text-stone-400 hover:bg-stone-200/50 dark:hover:bg-stone-800/50 transition-all duration-200"
        title="打开扩展程序页面"
      >
        <Puzzle className="h-5 w-5" />
      </Button>

      {/* 设置弹窗 */}
      <SettingsModal
        title="搜索引擎配置"
        open={showSettings}
        onOpenChange={setShowSettings}
      >
        <SearchEngineConfig
          engines={searchEngines}
          onEnginesChange={setSearchEngines}
        />
      </SettingsModal>

      {/* 快速链接配置弹窗 */}
      <SettingsModal
        title="快速链接配置"
        open={showQuickLinksConfig}
        onOpenChange={setShowQuickLinksConfig}
      >
        <QuickLinksConfig
          links={quickLinks}
          onLinksChange={setQuickLinks}
        />
      </SettingsModal>

      {/* 导入/导出设置弹窗 */}
      <SettingsModal
        title="导入/导出设置"
        open={showImportExport}
        onOpenChange={setShowImportExport}
      >
        <ImportExportSettings />
      </SettingsModal>
    </div>
  );
};

export default Index;
