import { useState, useRef, useEffect } from "react";
import { Settings } from "lucide-react";
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

interface SearchEngine {
  id: string;
  name: string;
  url: string;
  isDefault?: boolean;
  isAI?: boolean;
  enabled?: boolean;
}

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

  // 默认搜索引擎（包含Kagi Assistant）
  const defaultSearchEngines: SearchEngine[] = [
    { id: "google", name: "Google", url: "https://www.google.com/search?q=", isDefault: true },
    { id: "bing", name: "Bing", url: "https://www.bing.com/search?q=" },
    { id: "baidu", name: "百度", url: "https://www.baidu.com/s?wd=" },
    { id: "duckduckgo", name: "DuckDuckGo", url: "https://duckduckgo.com/?q=" },
    { id: "kagi-assistant", name: "Kagi Assistant", url: "https://kagi.com/assistant", isAI: true }
  ];

  // 从 localStorage 加载搜索引擎配置
  const [searchEngines, setSearchEngines] = useState<SearchEngine[]>(() => {
    try {
      const saved = localStorage.getItem('searchEngines');
      if (saved) {
        const parsed = JSON.parse(saved);
        // 确保 Kagi Assistant 存在
        const hasKagiAssistant = parsed.some((engine: SearchEngine) => engine.id === 'kagi-assistant');
        if (!hasKagiAssistant) {
          const kagiAssistant = defaultSearchEngines.find(e => e.id === 'kagi-assistant');
          if (kagiAssistant) {
            parsed.push(kagiAssistant);
          }
        }
        return parsed;
      }
      return defaultSearchEngines;
    } catch {
      return defaultSearchEngines;
    }
  });

  // 从 localStorage 加载快速链接配置
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>(() => {
    try {
      const saved = localStorage.getItem('quickLinks');
      return saved ? JSON.parse(saved) : [];
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

  // 保存搜索引擎配置到 localStorage
  useEffect(() => {
    localStorage.setItem('searchEngines', JSON.stringify(searchEngines));
  }, [searchEngines]);

  // 保存快速链接配置到 localStorage
  useEffect(() => {
    localStorage.setItem('quickLinks', JSON.stringify(quickLinks));
  }, [quickLinks]);

  // 保存当前选中的搜索引擎到 localStorage
  useEffect(() => {
    localStorage.setItem('currentSearchEngine', searchEngine);
  }, [searchEngine]);

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
    window.location.href = url;
  };

  // 处理搜索/导航
  const handleSubmit = (value: string) => {
    if (!value.trim()) return;

    console.log('Submitting search with engine:', searchEngine, 'value:', value);

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
  };

  // 修复搜索引擎切换 - 移除问题的useEffect
  const handleSearchEngineChange = (engineId: string) => {
    console.log('Changing search engine to:', engineId);
    setSearchEngine(engineId);
  };

  const isKagiSelected = searchEngine === 'kagi-assistant';

  useEffect(() => {
    const def = searchEngines.find(e => e.isDefault);
    if (def && def.id !== searchEngine) setSearchEngine(def.id);
  }, [searchEngines]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center justify-center p-4 transition-colors">
      {/* 设置和主题切换按钮 */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
              <Settings className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white dark:bg-gray-800 z-50">
            <DropdownMenuItem onClick={() => setShowSettings(true)}>
              搜索引擎设置
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowQuickLinksConfig(true)}>
              快速链接设置
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 主搜索区域 */}
      <div className="w-full max-w-3xl mx-auto flex flex-col items-center">
        {/* 大搜索栏 */}
        <div className="w-full mb-8">
          <div className="relative">
            <AutoComplete
              value={query}
              onChange={setQuery}
              onSubmit={handleSubmit}
              placeholder={isKagiSelected ? "向 Kagi Assistant 提问..." : "输入网址或搜索关键词..."}
              className="w-full h-16 text-xl px-8 pr-32 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:border-blue-500 focus:outline-none transition-all duration-300 shadow-xl hover:shadow-2xl focus:shadow-2xl"
            />

            {/* 搜索按钮在输入框内 */}
            <Button
              onClick={() => handleSubmit(query)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 h-10 px-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isKagiSelected ? "提问" : "搜索"}
            </Button>
          </div>

          {/* 搜索引擎选择 - 使用原生按钮确保点击工作 */}
          <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
            {searchEngines.filter(e => e.enabled !== false).map((engine) => (
              <button
                key={engine.id}
                type="button"
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 cursor-pointer select-none border-0 outline-none focus:outline-none ${searchEngine === engine.id
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 bg-transparent"
                  }`}
                onClick={() => handleSearchEngineChange(engine.id)}
                onMouseDown={(e) => e.preventDefault()}
              >
                {engine.name}
                {engine.isAI && (
                  <span className="ml-1 text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded">AI</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 快速链接区域 */}
        {quickLinks.filter(l => l.enabled !== false).length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
            {quickLinks.filter(l => l.enabled !== false).map((link) => (
              <Button
                key={link.id}
                variant="ghost"
                className="h-16 rounded-xl bg-gray-100/50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                onClick={() => window.location.href = link.url}
              >
                <div className="text-center">
                  {link.icon && <div className="text-2xl mb-1">{link.icon}</div>}
                  <div className="text-sm font-medium">{link.name}</div>
                </div>
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* 设置弹窗 */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-1 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <SearchEngineConfig
              engines={searchEngines}
              onEnginesChange={setSearchEngines}
              onClose={() => setShowSettings(false)}
            />
          </div>
        </div>
      )}

      {/* 快速链接配置弹窗 */}
      {showQuickLinksConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-1 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <QuickLinksConfig
              links={quickLinks}
              onLinksChange={setQuickLinks}
              onClose={() => setShowQuickLinksConfig(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
