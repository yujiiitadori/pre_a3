// background.js
const DEFAULT_SETTINGS = {
  voiceName: "Google हिन्दी",
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["settings"], (res) => {
    if (!res.settings) chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "SPEAK") {
    chrome.storage.local.get(["settings"], (res) => {
      const settings = res.settings || DEFAULT_SETTINGS;
      const opts = {
        rate: settings.rate ?? 1.0,
        pitch: settings.pitch ?? 1.0,
        volume: settings.volume ?? 1.0
      };
      if (settings.voiceName) opts.voiceName = settings.voiceName;
      try {
        chrome.tts.speak(msg.text, opts);
      } catch (e) {
        console.error("TTS error:", e);
      }
    });
  } else if (msg.action === "GET_SETTINGS") {
    chrome.storage.local.get(["settings"], (res) => {
      sendResponse(res.settings || DEFAULT_SETTINGS);
    });
    return true;
  } else if (msg.action === "SET_SETTINGS") {
    chrome.storage.local.set({ settings: msg.settings }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }
});
