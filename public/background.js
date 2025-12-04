
// Background script for Chrome extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Quick Tab Navigator extension installed');
});

// Handle tab creation
chrome.tabs.onCreated.addListener((tab) => {
  if (tab.url === 'chrome://newtab/') {
    // The extension will automatically override the new tab page
  }
});
