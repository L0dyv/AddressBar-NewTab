/**
 * 国际化模块 (i18n)
 * 支持中英双语，根据浏览器语言自动选择，并提供手动切换
 */

export type Locale = 'zh-CN' | 'en';

// 消息定义
const messages: Record<Locale, Record<string, string>> = {
    'zh-CN': {
        // 通用
        'common.search': '搜索',
        'common.settings': '设置',
        'common.add': '添加',
        'common.cancel': '取消',
        'common.save': '保存',
        'common.delete': '删除',
        'common.confirm': '确认',
        'common.close': '关闭',
        'common.edit': '编辑',
        'common.loading': '加载中...',
        'common.AI': 'AI',

        // Index 页面
        'index.welcome': '欢迎回来',
        'index.whatToDo': '你想要做什么？',
        'index.placeholder': '输入网址或搜索...',
        'index.kagiPlaceholder': '向 Kagi Assistant 提问...',
        'index.ask': '提问',
        'index.openSettings': '打开设置',
        'index.openExtensions': '打开扩展程序页面',

        // Popup 页面
        'popup.addPage': '收藏当前页面',
        'popup.added': '已添加',
        'popup.exists': '已存在',

        // 设置相关
        'settings.searchEngines': '搜索引擎设置',
        'settings.quickLinks': '快速链接设置',
        'settings.importExport': '导入/导出设置',
        'settings.dialog': '设置对话框',
        'settings.unsavedConfirm': '仍有未保存修改，确定关闭？',
        'settings.language': '语言',

        // 快速链接配置
        'quickLinks.title': '快速链接配置',
        'quickLinks.addNew': '添加新快速链接',
        'quickLinks.name': '名称(可选)',
        'quickLinks.namePlaceholder': '留空将自动获取',
        'quickLinks.url': '网址',
        'quickLinks.urlPlaceholder': 'https://example.com',
        'quickLinks.fetchingTitle': '获取中...',
        'quickLinks.dragHint': '💡 提示：拖拽左侧图标可调整快速链接顺序',
        'quickLinks.confirmDelete': '确认删除这个快速链接？',
        'quickLinks.deleteWarning': '删除后无法恢复。',
        'quickLinks.skipConfirm': '下次不再提示',
        'quickLinks.confirmDeleteBtn': '确认删除',

        // 搜索引擎配置
        'searchEngines.title': '搜索引擎配置',
        'searchEngines.addNew': '添加新搜索引擎',
        'searchEngines.name': '名称',
        'searchEngines.url': '搜索URL',
        'searchEngines.urlHint': '使用 %s 作为搜索词占位符',
        'searchEngines.setDefault': '设为默认',
        'searchEngines.isDefault': '默认',
        'searchEngines.custom': '自定义',
        'searchEngines.builtin': '内置',
        'searchEngines.confirmDelete': '确认删除这个搜索引擎？',

        // 导入导出
        'importExport.title': '导入/导出设置',
        'importExport.export': '导出设置',
        'importExport.import': '导入设置',
        'importExport.exportSuccess': '导出成功',
        'importExport.importSuccess': '导入成功',
        'importExport.importError': '导入失败：无效的配置文件',

        // 主题
        'theme.light': '浅色',
        'theme.dark': '深色',
        'theme.system': '跟随系统',
    },
    'en': {
        // Common
        'common.search': 'Search',
        'common.settings': 'Settings',
        'common.add': 'Add',
        'common.cancel': 'Cancel',
        'common.save': 'Save',
        'common.delete': 'Delete',
        'common.confirm': 'Confirm',
        'common.close': 'Close',
        'common.edit': 'Edit',
        'common.loading': 'Loading...',
        'common.AI': 'AI',

        // Index page
        'index.welcome': 'Welcome back',
        'index.whatToDo': 'What would you like to do?',
        'index.placeholder': 'Enter URL or search...',
        'index.kagiPlaceholder': 'Ask Kagi Assistant...',
        'index.ask': 'Ask',
        'index.openSettings': 'Open Settings',
        'index.openExtensions': 'Open Extensions Page',

        // Popup page
        'popup.addPage': 'Save Current Page',
        'popup.added': 'Added',
        'popup.exists': 'Already exists',

        // Settings related
        'settings.searchEngines': 'Search Engine Settings',
        'settings.quickLinks': 'Quick Links Settings',
        'settings.importExport': 'Import/Export Settings',
        'settings.dialog': 'Settings Dialog',
        'settings.unsavedConfirm': 'You have unsaved changes. Are you sure you want to close?',
        'settings.language': 'Language',

        // Quick links config
        'quickLinks.title': 'Quick Links Configuration',
        'quickLinks.addNew': 'Add New Quick Link',
        'quickLinks.name': 'Name (optional)',
        'quickLinks.namePlaceholder': 'Leave empty to auto-fetch',
        'quickLinks.url': 'URL',
        'quickLinks.urlPlaceholder': 'https://example.com',
        'quickLinks.fetchingTitle': 'Fetching...',
        'quickLinks.dragHint': '💡 Tip: Drag the left icon to reorder quick links',
        'quickLinks.confirmDelete': 'Confirm delete this quick link?',
        'quickLinks.deleteWarning': 'This action cannot be undone.',
        'quickLinks.skipConfirm': "Don't ask again",
        'quickLinks.confirmDeleteBtn': 'Confirm Delete',

        // Search engines config
        'searchEngines.title': 'Search Engine Configuration',
        'searchEngines.addNew': 'Add New Search Engine',
        'searchEngines.name': 'Name',
        'searchEngines.url': 'Search URL',
        'searchEngines.urlHint': 'Use %s as placeholder for search term',
        'searchEngines.setDefault': 'Set as Default',
        'searchEngines.isDefault': 'Default',
        'searchEngines.custom': 'Custom',
        'searchEngines.builtin': 'Built-in',
        'searchEngines.confirmDelete': 'Confirm delete this search engine?',

        // Import/Export
        'importExport.title': 'Import/Export Settings',
        'importExport.export': 'Export Settings',
        'importExport.import': 'Import Settings',
        'importExport.exportSuccess': 'Export successful',
        'importExport.importSuccess': 'Import successful',
        'importExport.importError': 'Import failed: Invalid configuration file',

        // Theme
        'theme.light': 'Light',
        'theme.dark': 'Dark',
        'theme.system': 'System',
    },
};

// 当前语言
let currentLocale: Locale = 'zh-CN';

// 语言变化监听器
const listeners: Set<() => void> = new Set();

/**
 * 检测浏览器语言并返回合适的 Locale
 */
const detectBrowserLocale = (): Locale => {
    if (typeof navigator === 'undefined') return 'zh-CN';
    const lang = navigator.language || (navigator as { userLanguage?: string }).userLanguage || 'zh-CN';
    return lang.startsWith('zh') ? 'zh-CN' : 'en';
};

/**
 * 初始化语言设置
 * 优先使用用户保存的设置，否则使用浏览器语言
 */
export const initLocale = (): Locale => {
    try {
        const saved = localStorage.getItem('locale');
        if (saved && (saved === 'zh-CN' || saved === 'en')) {
            currentLocale = saved;
        } else {
            currentLocale = detectBrowserLocale();
        }
    } catch {
        currentLocale = detectBrowserLocale();
    }
    return currentLocale;
};

/**
 * 获取当前语言
 */
export const getLocale = (): Locale => currentLocale;

/**
 * 设置语言
 */
export const setLocale = (locale: Locale): void => {
    if (locale !== currentLocale) {
        currentLocale = locale;
        try {
            localStorage.setItem('locale', locale);
        } catch {
            // ignore
        }
        // 通知所有监听器
        listeners.forEach(listener => listener());
    }
};

/**
 * 获取翻译文本
 * @param key 翻译键
 * @param fallback 默认值（当键不存在时）
 */
export const t = (key: string, fallback?: string): string => {
    const msg = messages[currentLocale]?.[key];
    if (msg !== undefined) return msg;
    // 尝试英文
    const enMsg = messages['en']?.[key];
    if (enMsg !== undefined) return enMsg;
    return fallback ?? key;
};

/**
 * 添加语言变化监听器
 */
export const addLocaleListener = (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

/**
 * 获取所有支持的语言
 */
export const getSupportedLocales = (): { value: Locale; label: string }[] => [
    { value: 'zh-CN', label: '简体中文' },
    { value: 'en', label: 'English' },
];

// 初始化
initLocale();
