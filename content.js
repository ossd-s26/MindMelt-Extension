(() => {
  console.log("[MindMelt] content script loaded");

  // ---- knobs (you can tweak these) ----
  const CONFIG = {
    // how often to trigger an effect (ms)
    baseIntervalMs: 1500,
    intervalJitterMs: 4500,

    // fade effect
    fadeToOpacity: 0,
    fadeInMs: 700,
    holdDarkMs: 800,
    fadeOutMs: 1200,

    // jump forward
    canJumpAnywhere: true,
    jumpChance: 1,
    jumpMinSec: 3,
    jumpMaxSec: 10,

    // speed wobble
    speedEnabled: true,
    speedChance: 1,
    speedMin: 0.65,
    speedMax: 1.75,
    speedRecoverToNormal: false,
    speedRecoverDelayMs: 5000,

    // sound effect
    soundEnabled: true
  };

  // ---- helpers ----
  const rand = (min, max) => Math.random() * (max - min) + min;
  const randint = (min, max) => Math.floor(rand(min, max + 1));
  const initialVolume = document.querySelector("video").volume;

  function isWatchPage() {
    return location.pathname === "/watch";
  }

  function getVideo() {
    return document.querySelector("video");
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  async function fadeOnce(video) {
  if (!document.body || !video) return;

  const startVolume = video.volume;
  const steps = 30;
  const stepTime = CONFIG.fadeInMs / steps;

  // Fade OUT
  for (let i = 1; i <= steps; i++) {
    const progress = i / steps;
    const targetOpacity = 1 - progress * (1 - CONFIG.fadeToOpacity);
    
    document.body.style.opacity = String(targetOpacity);
    video.volume = targetOpacity;
    
    await new Promise(r => setTimeout(r, stepTime));
  }

  document.body.style.opacity = String(CONFIG.fadeToOpacity);
  video.volume = CONFIG.fadeToOpacity;
  
  await new Promise((r) => setTimeout(r, CONFIG.holdDarkMs));
  
  if (CONFIG.canJumpAnywhere) {
    jumpAnywhere(video);
  } else {
    jumpForward(video);
  }
  wobbleSpeed(video);
  
  if (CONFIG.soundEnabled) {
      chrome.runtime.sendMessage({ action: "playSound" });
    }

  // Fade IN
  for (let i = 1; i <= steps; i++) {
    const progress = i / steps;
    const targetOpacity = CONFIG.fadeToOpacity + progress * (1 - CONFIG.fadeToOpacity);
    
    document.body.style.opacity = String(targetOpacity);
    video.volume = targetOpacity;
    
    await new Promise(r => setTimeout(r, stepTime));
  }
}

  function jumpForward(video) {
    if (!video || !isFinite(video.duration) || video.duration <= 0) return;

    const jumpSec = randint(CONFIG.jumpMinSec, CONFIG.jumpMaxSec);
    const newTime = clamp(video.currentTime + jumpSec, 0, Math.max(0, video.duration - 0.5));
    video.currentTime = newTime;

    console.log(`[MindMelt] jumped +${jumpSec}s -> ${newTime.toFixed(1)}s`);
  }

  function jumpAnywhere(video) {
    let newTime = rand(0, video.duration - 10); // -10 so video doesnt jump to end which causes a bug
    video.currentTime = newTime;
  }

  function wobbleSpeed(video) {
    if (!CONFIG.speedEnabled) return;
    if (!video) return;

    if (Math.random() > CONFIG.speedChance) return;

    const newRate = Number(rand(CONFIG.speedMin, CONFIG.speedMax).toFixed(2));
    video.playbackRate = newRate;
    console.log(`[MindMelt] speed -> ${newRate}x`);

    if (CONFIG.speedRecoverToNormal) {
      setTimeout(() => {
        // only restore if the video is still there
        const v = getVideo();
        if (v) v.playbackRate = 1.0;
        console.log("[MindMelt] speed -> 1.0x");
      }, CONFIG.speedRecoverDelayMs);
    }
  }

    // ---- main loop with safe retry ----
  let timerId = null;

  function scheduleNext() {
    const delay = CONFIG.baseIntervalMs + randint(0, CONFIG.intervalJitterMs);

    timerId = setTimeout(async () => {
      // If user navigated away from /watch, stop.
      if (!isWatchPage()) {
        console.log("[MindMelt] not on /watch, stopping");
        return;
      }

      const video = getVideo();
      if (!video) {
        console.log("[MindMelt] video not found, retrying");
        scheduleNext();
        return;
      }


      
      await fadeOnce(video);

      scheduleNext();
    }, delay);
  }

  // YouTube is SPA; URL can change without reload.
  // We'll start when /watch, and restart if navigating to a new video.
  function start() {
    if (timerId) clearTimeout(timerId);
    if (document.body) document.body.style.opacity = "1";
    scheduleNext();
  }

  if (isWatchPage()) start();

  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      if (isWatchPage()) {
        console.log("[MindMelt] URL changed to watch page, restarting");
        start();
      } else {
        if (timerId) clearTimeout(timerId);
        timerId = null;
        if (document.body) document.body.style.opacity = "1";
      }
    }
  }, 800);
})();