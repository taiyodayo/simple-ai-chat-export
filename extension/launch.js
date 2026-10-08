// Event-driven only. No polling, page monitoring or conversation data here.
chrome.action.onClicked.addListener((tab) => {
  if (!Number.isInteger(tab.id)) return;
  chrome.windows.create({
    url: chrome.runtime.getURL(`popup.html?tab=${tab.id}`),
    type: "popup",
    width: 440,
    height: 760,
  });
});
