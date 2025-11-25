// popup.js
function sendToActiveTab(msg, callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    chrome.tabs.sendMessage(tabs[0].id, msg, callback);
  });
}

document.getElementById('start').addEventListener('click', () => sendToActiveTab({ action: "START" }));
document.getElementById('stop').addEventListener('click', () => sendToActiveTab({ action: "STOP" }));


document.getElementById('toggleContrast').addEventListener('click', () => {
  sendToActiveTab({ action: "TOGGLE_CONTRAST" });
});

document.getElementById('headingMap').addEventListener('click', () => {
  sendToActiveTab({ action: "TOGGLE_HEADING_MAP" });
});

const voiceRate = document.getElementById('voiceRate');
voiceRate.addEventListener('input', () => {
  chrome.runtime.sendMessage({ action: "GET_SETTINGS" }, (settings) => {
    const s = settings || {};
    s.rate = parseFloat(voiceRate.value);
    chrome.runtime.sendMessage({ action: "SET_SETTINGS", settings: s }, () => {});
  });
});

document.getElementById('voiceName').addEventListener('change', (e) => {
  const name = e.target.value;
  chrome.runtime.sendMessage({ action: "GET_SETTINGS" }, (settings) => {
    const s = settings || {};
    s.voiceName = name;
    chrome.runtime.sendMessage({ action: "SET_SETTINGS", settings: s }, () => {});
  });
});

document.getElementById("magnifierBtn").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { action: "toggleMagnifier" });
});


// Populate saved settings when popup opens
document.addEventListener('DOMContentLoaded', () => {
  chrome.runtime.sendMessage({ action: "GET_SETTINGS" }, (settings) => {
    if (!settings) return;
    if (settings.rate) document.getElementById('voiceRate').value = settings.rate;
    if (settings.voiceName) document.getElementById('voiceName').value = settings.voiceName;
  });
});
