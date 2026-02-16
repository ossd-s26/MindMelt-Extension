let offscreenCreated = false;

async function ensureOffscreen() {
  if (offscreenCreated) return;
  
  try {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Play sound effects'
    });
    offscreenCreated = true;
  } catch (error) { }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "playSound") {
    (async () => {
      await ensureOffscreen();
      
      chrome.runtime.sendMessage({
        action: "playSoundOffscreen"
      });
      
      sendResponse({});
    })();
    return true;
  }
});