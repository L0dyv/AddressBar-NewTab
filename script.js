// 预定义的搜索引擎
const defaultSearchEngines = [
    {
        name: '必应',
        url: 'https://www.bing.com/search?q=%s',
        icon: 'icons/bing.svg'
    },
    {
        name: 'Google',
        url: 'https://www.google.com/search?q=%s',
        icon: 'icons/google.svg'
    },
    {
        name: 'DuckDuckGo',
        url: 'https://duckduckgo.com/?q=%s',
        icon: 'icons/duckduckgo.svg'
    }
];

// 当前选中的搜索引擎
let currentSearchEngine = null;
// 默认搜索引擎
let defaultSearchEngine = null;

// DOM 元素
const searchEngineBtn = document.getElementById('searchEngineBtn');
const searchEngineMenu = document.getElementById('searchEngineMenu');
const searchEngineList = document.getElementById('searchEngineList');
const searchEngineIcon = document.getElementById('searchEngineIcon');
const urlBar = document.getElementById('urlBar');
const goButton = document.getElementById('goButton');
const customEngineName = document.getElementById('customEngineName');
const customEngineUrl = document.getElementById('customEngineUrl');
const addCustomEngine = document.getElementById('addCustomEngine');
const searchPrefix = document.getElementById('searchPrefix');
const searchEngineName = document.getElementById('searchEngineName');
const historyAutocomplete = document.getElementById('historyAutocomplete');

// 从localStorage加载自定义搜索引擎和默认搜索引擎
let customSearchEngines = JSON.parse(localStorage.getItem('customSearchEngines') || '[]');
const defaultEngineIndex = localStorage.getItem('defaultSearchEngineIndex');

// 监听来自background.js的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'focusAddressBar') {
        if (urlBar) {
            urlBar.focus();
            urlBar.select(); // 选中所有文本
        }
        // 发送响应表示成功接收
        if (sendResponse) {
            sendResponse({ success: true });
        }
    }
});

// 监听系统主题变化
function setupThemeDetection() {
    // 检查浏览器是否支持主题偏好媒体查询
    if (window.matchMedia) {
        const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        // 在页面加载时应用当前主题
        applyTheme(darkModeMediaQuery.matches);

        // 监听系统主题变化并响应
        try {
            // Chrome 92+ 和其他现代浏览器支持 addEventListener
            darkModeMediaQuery.addEventListener('change', (e) => {
                applyTheme(e.matches);
            });
        } catch (error) {
            // 兼容旧版浏览器
            try {
                darkModeMediaQuery.addListener((e) => {
                    applyTheme(e.matches);
                });
            } catch (err) {
                console.error('浏览器不支持主题变化事件监听', err);
            }
        }
    }
}

// 应用主题
function applyTheme(isDarkMode) {
    console.log('应用主题:', isDarkMode ? '深色模式' : '浅色模式');
    // 这里可以添加任何需要的额外主题切换逻辑
    // CSS 变量通过媒体查询自动处理
}

// 初始化搜索引擎列表
function initializeSearchEngines() {
    // 清空现有列表
    searchEngineList.innerHTML = '';

    // 确定默认搜索引擎
    const savedDefaultIndex = localStorage.getItem('defaultSearchEngineIndex');
    if (savedDefaultIndex !== null) {
        const index = parseInt(savedDefaultIndex);
        if (index < defaultSearchEngines.length) {
            defaultSearchEngine = defaultSearchEngines[index];
        } else {
            const customIndex = index - defaultSearchEngines.length;
            if (customIndex < customSearchEngines.length) {
                defaultSearchEngine = customSearchEngines[customIndex];
            }
        }
    }

    // 如果没有设置默认搜索引擎，使用第一个搜索引擎作为默认
    if (!defaultSearchEngine) {
        defaultSearchEngine = defaultSearchEngines[0];
        localStorage.setItem('defaultSearchEngineIndex', '0');
    }

    // 设置当前搜索引擎为默认搜索引擎
    currentSearchEngine = defaultSearchEngine;
    searchEngineIcon.src = currentSearchEngine.icon;

    // 添加默认搜索引擎
    defaultSearchEngines.forEach((engine, index) => {
        addSearchEngineToList(engine, index);
    });

    // 添加自定义搜索引擎
    customSearchEngines.forEach((engine, index) => {
        addSearchEngineToList(engine, index + defaultSearchEngines.length);
    });

    // 更新UI
    updateSearchUI();
}

// 添加搜索引擎到列表
function addSearchEngineToList(engine, index) {
    const item = document.createElement('div');
    item.className = 'search-engine-item';

    // 如果当前引擎是默认引擎，添加default类
    if (engine === defaultSearchEngine) {
        item.classList.add('default');
    }

    item.innerHTML = `
        <img src="${engine.icon}" alt="${engine.name}">
        <span>${engine.name}</span>
        <span class="set-default">${engine === defaultSearchEngine ? '默认' : '设为默认'}</span>
    `;

    // 点击选择引擎
    item.addEventListener('click', (e) => {
        // 检查是否点击了"设为默认"按钮
        if (e.target.classList.contains('set-default')) {
            e.stopPropagation();
            setDefaultSearchEngine(engine, index);
            return;
        }

        // 设置当前搜索引擎
        currentSearchEngine = engine;
        updateSearchUI();
        searchEngineMenu.classList.remove('active');
    });

    searchEngineList.appendChild(item);
}

// 设置默认搜索引擎
function setDefaultSearchEngine(engine, index) {
    defaultSearchEngine = engine;
    localStorage.setItem('defaultSearchEngineIndex', index.toString());

    // 更新类
    const items = searchEngineList.querySelectorAll('.search-engine-item');
    items.forEach(item => {
        item.classList.remove('default');
        item.querySelector('.set-default').textContent = '设为默认';
    });

    items[index].classList.add('default');
    items[index].querySelector('.set-default').textContent = '默认';

    // 如果当前选中的引擎是默认引擎，更新UI
    if (currentSearchEngine === engine) {
        updateSearchUI();
    }
}

// 更新搜索UI
function updateSearchUI() {
    // 更新图标
    searchEngineIcon.src = defaultSearchEngine.icon;

    // 如果当前搜索引擎不是默认搜索引擎，显示搜索前缀
    if (currentSearchEngine !== defaultSearchEngine) {
        searchPrefix.classList.add('active');
        searchEngineName.textContent = `使用 ${currentSearchEngine.name} 搜索`;
    } else {
        searchPrefix.classList.remove('active');
    }
}

// 处理搜索
function handleSearch() {
    const input = urlBar.value.trim();

    if (!input) return;

    // 私有协议和常见协议列表
    const knownProtocols = ['http:', 'https:', 'ftp:', 'file:', 'about:',
        'data:', 'view-source:', 'chrome-extension:', 'moz-extension:',
        'ws:', 'wss:', 'mailto:', 'tel:', 'sms:', 'news:', 'nntp:'];
    // 检查是否以协议开头
    const hasProtocol = input.includes('://') || knownProtocols.some(protocol => input.startsWith(protocol));

    // 检查是否是特殊的Chrome URL
    if (input.startsWith('chrome://')) {
        // 对于chrome://newtab/，使用我们的扩展页面
        if (input === 'chrome://newtab/' || input === 'chrome://newtab') {
            chrome.tabs.create({ url: chrome.runtime.getURL("newtab.html") });
            return;
        }
    }

    // 检查是否是URL
    if (hasProtocol ||
        (input.includes('.') && !input.includes(' ')) ||
        input === 'localhost' ||
        input.startsWith('localhost:') ||
        /^[a-zA-Z0-9-]+:\/\//.test(input) ||
        /^(localhost|127\.0\.0\.1|\[::1\])(\:[0-9]+)?(\/.*)?$/.test(input)) {

        let url = input;

        // 如果没有明确的协议，添加默认协议
        if (!hasProtocol) {
            // 对于localhost和IP地址特殊处理
            if (url === 'localhost' || url.startsWith('localhost:') ||
                url === '127.0.0.1' || url.startsWith('127.0.0.1:') ||
                url === '[::1]' || url.startsWith('[::1]:')) {
                url = 'http://' + url;
            } else {
                url = 'https://' + url;
            }
        }

        window.location.href = url;
    } else {
        // 使用当前搜索引擎进行搜索
        const searchUrl = currentSearchEngine.url.replace('%s', encodeURIComponent(input));
        window.location.href = searchUrl;
    }
}

// 获取历史记录
function fetchHistoryItems(query) {
    chrome.history.search({
        text: query,            // 搜索文本
        maxResults: 10,         // 最多返回10条结果
        startTime: 0            // 从最开始的历史记录中搜索
    }, function (results) {
        if (results.length === 0) {
            historyAutocomplete.classList.remove('active');
            return;
        }

        // 清空并填充历史记录列表
        historyAutocomplete.innerHTML = '';
        results.forEach((item, index) => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';

            // 提取域名作为网站图标
            const url = new URL(item.url);
            const domain = url.hostname;
            const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}`;

            historyItem.innerHTML = `
                <img class="favicon" src="${faviconUrl}" alt="">
                <div class="title">${item.title || item.url}</div>
                <div class="url">${item.url}</div>
            `;

            // 点击历史记录项
            historyItem.addEventListener('click', () => {
                urlBar.value = item.url;
                historyAutocomplete.classList.remove('active');
                handleSearch();
            });

            historyAutocomplete.appendChild(historyItem);
        });

        historyAutocomplete.classList.add('active');
    });
}

// 高亮选中项
function highlightItem(items, index) {
    items.forEach(item => item.classList.remove('selected'));
    items[index].classList.add('selected');

    // 确保选中项在视图中可见
    const selected = items[index];
    if (selected.offsetTop < historyAutocomplete.scrollTop) {
        historyAutocomplete.scrollTop = selected.offsetTop;
    } else if (selected.offsetTop + selected.offsetHeight > historyAutocomplete.scrollTop + historyAutocomplete.offsetHeight) {
        historyAutocomplete.scrollTop = selected.offsetTop + selected.offsetHeight - historyAutocomplete.offsetHeight;
    }
}

// 页面加载完成时初始化
document.addEventListener('DOMContentLoaded', () => {
    initializeSearchEngines();
    setupThemeDetection();

    // 使输入框获得焦点
    urlBar.focus();

    // 切换搜索引擎菜单
    searchEngineBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        searchEngineMenu.classList.toggle('active');
    });

    // 点击其他地方关闭菜单
    document.addEventListener('click', () => {
        searchEngineMenu.classList.remove('active');
        historyAutocomplete.classList.remove('active');
    });

    // 阻止菜单内部点击事件冒泡
    searchEngineMenu.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // 阻止自动补全内部点击事件冒泡
    historyAutocomplete.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // 添加自定义搜索引擎
    addCustomEngine.addEventListener('click', () => {
        const name = customEngineName.value.trim();
        const url = customEngineUrl.value.trim();

        if (!name || !url) {
            alert('请填写完整的搜索引擎信息');
            return;
        }

        if (!url.includes('%s')) {
            alert('URL必须包含%s作为搜索词占位符');
            return;
        }

        const newEngine = {
            name,
            url,
            icon: 'icons/search.svg' // 使用默认图标
        };

        customSearchEngines.push(newEngine);
        localStorage.setItem('customSearchEngines', JSON.stringify(customSearchEngines));

        addSearchEngineToList(newEngine, defaultSearchEngines.length + customSearchEngines.length - 1);

        // 清空输入框
        customEngineName.value = '';
        customEngineUrl.value = '';
    });

    // 输入框事件处理
    urlBar.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSearch();
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const items = historyAutocomplete.querySelectorAll('.history-item');
            if (items.length === 0) return;

            // 获取当前选中项的索引
            let selectedIndex = -1;
            for (let i = 0; i < items.length; i++) {
                if (items[i].classList.contains('selected')) {
                    selectedIndex = i;
                    break;
                }
            }

            // 计算新的索引
            if (e.key === 'ArrowDown') {
                selectedIndex = (selectedIndex + 1) % items.length;
            } else {
                selectedIndex = (selectedIndex - 1 + items.length) % items.length;
            }

            highlightItem(items, selectedIndex);
        }
    });

    // 输入内容变化时获取历史记录
    urlBar.addEventListener('input', () => {
        const query = urlBar.value.trim();
        if (query) {
            fetchHistoryItems(query);
        } else {
            historyAutocomplete.classList.remove('active');
        }
    });

    // 转到按钮点击事件
    goButton.addEventListener('click', handleSearch);
});