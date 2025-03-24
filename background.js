// 用于存储新标签页的tabId
let newTabId = null;

// 监听快捷键命令
chrome.commands.onCommand.addListener((command) => {
    if (command === 'focus-address-bar') {
        focusOrCreateNewTab();
    }
});

// 监听content.js发来的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'openNewTabAndFocus') {
        // 先检查当前是否已经是新标签页
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                const activeTab = tabs[0];
                if (activeTab.url === 'chrome://newtab/' || activeTab.pendingUrl === 'chrome://newtab/') {
                    // 已经在新标签页，直接聚焦到地址栏
                    chrome.tabs.sendMessage(activeTab.id, { action: 'focusAddressBar' });
                } else {
                    // 不是新标签页，创建新标签页
                    createNewTab();
                }
            }
        });
    }
});

// 创建新标签页并在加载完成后聚焦到地址栏
function createNewTab() {
    chrome.tabs.create({ url: 'chrome://newtab/' }, (tab) => {
        newTabId = tab.id;
        
        // 监听新标签页加载并聚焦地址栏
        waitForTabLoadAndFocus(newTabId);
    });
}

// 等待标签页加载并聚焦地址栏
function waitForTabLoadAndFocus(tabId) {
    chrome.tabs.onUpdated.addListener(function listener(updatedTabId, changeInfo) {
        if (updatedTabId === tabId && changeInfo.status === 'complete') {
            // 移除监听器
            chrome.tabs.onUpdated.removeListener(listener);

            // 延迟一点时间确保DOM已经完全加载
            setTimeout(() => {
                chrome.tabs.sendMessage(tabId, { action: 'focusAddressBar' });
            }, 200);
        }
    });
}

// 聚焦到新标签页的地址栏，如果没有则创建
function focusOrCreateNewTab() {
    chrome.tabs.query({ url: 'chrome://newtab/' }, (tabs) => {
        if (tabs.length > 0) {
            // 激活新标签页
            chrome.tabs.update(tabs[0].id, { active: true }, () => {
                // 发送消息聚焦到地址栏
                chrome.tabs.sendMessage(tabs[0].id, { action: 'focusAddressBar' });
            });
        } else {
            // 没有找到新标签页，创建一个
            createNewTab();
        }
    });
}