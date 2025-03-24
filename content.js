// 全局键盘事件监听
document.addEventListener('keydown', function (e) {
    // 如果单独按下了"/"键（不在输入框中）
    if (e.key === '/' &&
        !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) &&
        !document.activeElement.isContentEditable) {

        e.preventDefault(); // 阻止"/"被输入到页面

        // 打开新标签页并聚焦
        chrome.runtime.sendMessage({ action: 'openNewTabAndFocus' });
    }
});

// 监听来自background.js的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'focusAddressBar') {
        // 获取地址栏输入框
        const urlBar = document.getElementById('urlBar');
        if (urlBar) {
            urlBar.focus();
            urlBar.select(); // 选中所有文本
        }
    }
}); 