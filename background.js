// 用于存储新标签页的tabId
let newTabId = null;

// 监听快捷键命令
chrome.commands.onCommand.addListener((command) => {
    if (command === 'focus-address-bar') {
        // 直接创建一个新标签页，不尝试查找现有的新标签页
        createNewTab();
    }
});

// 监听content.js发来的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'openNewTabAndFocus') {
        // 直接创建一个新标签页
        createNewTab();
    }
});

// 创建新标签页并在加载完成后聚焦到地址栏
function createNewTab() {
    // 使用空白页面而不是chrome://newtab/
    chrome.tabs.create({ url: chrome.runtime.getURL("newtab.html") }, (tab) => {
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
                // 直接执行脚本来聚焦地址栏，而不是发送消息
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    function: focusAddressBarFunction
                }).catch(err => console.error("执行脚本失败:", err));
            }, 500); // 增加延迟时间，确保页面完全加载
        }
    });
}

// 在目标页面中执行的函数
function focusAddressBarFunction() {
    const urlBar = document.getElementById('urlBar');
    if (urlBar) {
        urlBar.focus();
        urlBar.select(); // 选中所有文本
    }
}

// 聚焦到新标签页的地址栏，如果没有则创建
function focusOrCreateNewTab() {
    chrome.tabs.query({ url: 'chrome://newtab/' }, (tabs) => {
        if (tabs.length > 0) {
            // 激活新标签页
            chrome.tabs.update(tabs[0].id, { active: true }, () => {
                // 发送消息聚焦到地址栏
                tryFocusAddressBar(tabs[0].id);
            });
        } else {
            // 没有找到新标签页，创建一个
            createNewTab();
        }
    });
}

// 尝试聚焦地址栏，添加错误处理
function tryFocusAddressBar(tabId) {
    try {
        chrome.tabs.sendMessage(tabId, { action: 'focusAddressBar' }, (response) => {
            // 检查是否有错误
            if (chrome.runtime.lastError) {
                console.log('无法发送消息到标签页，可能页面尚未完全加载: ', chrome.runtime.lastError.message);
                
                // 如果发生错误，尝试再次发送（最多重试3次）
                retryFocusAddressBar(tabId, 1);
            }
        });
    } catch (e) {
        console.error('发送消息时出错: ', e);
    }
}

// 重试聚焦地址栏
function retryFocusAddressBar(tabId, retryCount) {
    if (retryCount > 3) return; // 最多重试3次
    
    setTimeout(() => {
        try {
            chrome.tabs.sendMessage(tabId, { action: 'focusAddressBar' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.log(`重试 ${retryCount} 失败，再次尝试...`);
                    retryFocusAddressBar(tabId, retryCount + 1);
                }
            });
        } catch (e) {
            console.error('重试发送消息时出错: ', e);
        }
    }, 300 * retryCount); // 逐渐增加重试间隔
}