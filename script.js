document.addEventListener('DOMContentLoaded', function () {
    const urlBar = document.getElementById('urlBar');
    const goButton = document.getElementById('goButton');

    // 处理输入框中的Enter键
    urlBar.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
            navigateToUrl();
        }
    });

    // 处理按钮点击
    goButton.addEventListener('click', navigateToUrl);

    // 输入框获得焦点
    urlBar.focus();

    // 导航到输入的URL
    function navigateToUrl() {
        let url = urlBar.value.trim();

        // 如果输入为空，不执行任何操作
        if (!url) return;

        // 检查URL格式，如果没有协议前缀，则添加https://
        if (!/^https?:\/\//i.test(url)) {
            // 如果输入看起来像域名格式，添加https://
            if (/^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(\/.*)*/i.test(url)) {
                url = 'https://' + url;
            }
            // 如果不是域名格式，假设是搜索内容，重定向到百度搜索
            else {
                url = 'https://www.baidu.com/s?wd=' + encodeURIComponent(url);
            }
        }

        // 跳转到URL
        window.location.href = url;
    }
}); 