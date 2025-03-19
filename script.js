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

// 从localStorage加载自定义搜索引擎和默认搜索引擎
let customSearchEngines = JSON.parse(localStorage.getItem('customSearchEngines') || '[]');
const defaultEngineIndex = localStorage.getItem('defaultSearchEngineIndex');

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

// 切换搜索引擎菜单
searchEngineBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    searchEngineMenu.classList.toggle('active');
});

// 点击其他地方关闭菜单
document.addEventListener('click', () => {
    searchEngineMenu.classList.remove('active');
});

// 阻止菜单内部点击事件冒泡
searchEngineMenu.addEventListener('click', (e) => {
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

// 处理搜索/导航
function handleSearch() {
    const input = urlBar.value.trim();

    if (!input) return;

    // 检查是否是URL
    if (input.includes('.') && !input.includes(' ')) {
        let url = input;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }
        window.location.href = url;
    } else {
        // 使用当前搜索引擎进行搜索
        const searchUrl = currentSearchEngine.url.replace('%s', encodeURIComponent(input));
        window.location.href = searchUrl;
    }
}

// 绑定搜索事件
goButton.addEventListener('click', handleSearch);
urlBar.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleSearch();
    }
});

// 初始化
initializeSearchEngines(); 