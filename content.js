// 监听来自background.js的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'focusAddressBar') {
        // 获取地址栏输入框
        const urlBar = document.getElementById('urlBar');
        if (urlBar) {
            urlBar.focus();
            urlBar.select(); // 选中所有文本
        }
        
        // 发送响应表示成功接收
        if (sendResponse) {
            sendResponse({ success: true });
        }
        
        // 返回true表示将异步发送响应
        return true;
    }
});