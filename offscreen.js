chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "playSound") {
    let audioSelect = Math.floor(Math.random() * 3);
    const audio = new Audio(chrome.runtime.getURL('lobotomy' + audioSelect + '.wav'));
    if (Math.random() > 0.4) {
        audio.playbackRate = Math.random() * (2 - 0.75) + 0.75; //maps range 0.75 to 3
        audio.volume = 0.1;
        audio.play();
        sendResponse({});
    }
  }
});