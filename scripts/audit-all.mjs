import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const playwrightPath = path.resolve(root, "api/node_modules/playwright/index.mjs");
const { chromium } = await import(pathToFileURL(playwrightPath).href);

async function runAudit() {
  console.log("==========================================");
  console.log("🚀 STARTING AUTOMATED COMPREHENSIVE AUDIT");
  console.log("==========================================\n");

  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.log("   [Browser Error]", msg.text());
      consoleErrors.push(msg.text());
    }
  });

  page.on("pageerror", (err) => {
    pageErrors.push(err.message);
  });

  const report = {
    buttons: [],
    shortcuts: [],
    signWindow: [],
    offline: [],
    lowData: [],
    responsive: [],
    errors: [],
  };

  // 1. Audit Lesson Demo Page
  console.log("📍 Phase 1: Auditing Lesson Demo (concept-with-navigation.html)...");
  await page.goto("http://localhost:8080/savanna/pages/concept-with-navigation.html", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Check initial player state
  const initialState = await page.evaluate(() => {
    const player = document.querySelector("savanna-player");
    const v = player?.shadowRoot?.querySelector("video");
    const sign = document.querySelector("savanna-sign-window");
    const ad = document.querySelector("savanna-audio-description");
    const offline = document.querySelector("savanna-offline");
    return {
      hasPlayer: !!player,
      videoSrc: v?.src,
      videoDuration: v?.duration,
      isPlaying: player?.isPlaying,
      activeLang: player?.activeLang,
      hasSignWindow: !!sign,
      signSrc: sign?.src,
      hasAd: !!ad,
      hasOffline: !!offline,
      transcriptLines: player?.transcriptLines?.length,
    };
  });
  console.log("   Initial Player State:", JSON.stringify(initialState, null, 2));

  // 1.1 Test Buttons on Player Controls
  console.log("\n🔘 Testing Player Control Buttons...");

  // Test Play/Pause Button
  const playBtnState = await page.evaluate(async () => {
    const player = document.querySelector("savanna-player");
    const btn = player?.shadowRoot?.querySelector(".btn-play");
    const v = player?.shadowRoot?.querySelector("video");
    const initialPaused = v?.paused;
    btn?.click();
    await new Promise((r) => setTimeout(r, 400));
    const afterPlayPaused = v?.paused;
    btn?.click();
    await new Promise((r) => setTimeout(r, 400));
    const afterPausePaused = v?.paused;
    return { initialPaused, afterPlayPaused, afterPausePaused };
  });
  const playPassed = playBtnState.initialPaused === true && playBtnState.afterPlayPaused === false && playBtnState.afterPausePaused === true;
  report.buttons.push({ name: "Play/Pause Button (.btn-play)", passed: playPassed, details: playBtnState });
  console.log(`   - Play/Pause Button: ${playPassed ? "✅ PASS" : "❌ FAIL"}`);

  // Test Rewind 10s and Forward 10s
  const seekBtnState = await page.evaluate(async () => {
    const player = document.querySelector("savanna-player");
    const v = player?.shadowRoot?.querySelector("video");
    const backBtn = player?.shadowRoot?.querySelector(".btn-back10");
    const fwdBtn = player?.shadowRoot?.querySelector(".btn-fwd10");
    if (!v) return null;
    v.currentTime = 30;
    await new Promise((r) => setTimeout(r, 200));
    fwdBtn?.click();
    await new Promise((r) => setTimeout(r, 200));
    const afterFwd = v.currentTime;
    backBtn?.click();
    await new Promise((r) => setTimeout(r, 200));
    const afterBack = v.currentTime;
    return { initial: 30, afterFwd, afterBack };
  });
  const seekPassed = seekBtnState && seekBtnState.afterFwd >= 39 && seekBtnState.afterBack <= 31;
  report.buttons.push({ name: "Seek Buttons (.btn-fwd10 / .btn-back10)", passed: seekPassed, details: seekBtnState });
  console.log(`   - Seek Buttons (J/L): ${seekPassed ? "✅ PASS" : "❌ FAIL"}`);

  // Test Mute Button
  const muteBtnState = await page.evaluate(async () => {
    const player = document.querySelector("savanna-player");
    const v = player?.shadowRoot?.querySelector("video");
    const muteBtn = player?.shadowRoot?.querySelector(".btn-mute");
    const initialMuted = player?.isMuted;
    muteBtn?.click();
    await new Promise((r) => setTimeout(r, 200));
    const afterClickMuted = player?.isMuted;
    muteBtn?.click();
    await new Promise((r) => setTimeout(r, 200));
    const afterSecondClickMuted = player?.isMuted;
    return { initialMuted, afterClickMuted, afterSecondClickMuted };
  });
  const mutePassed = muteBtnState.initialMuted === false && muteBtnState.afterClickMuted === true && muteBtnState.afterSecondClickMuted === false;
  report.buttons.push({ name: "Mute Button (.btn-mute)", passed: mutePassed, details: muteBtnState });
  console.log(`   - Mute Button: ${mutePassed ? "✅ PASS" : "❌ FAIL"}`);

  // Test Speed Menu
  const speedBtnState = await page.evaluate(async () => {
    const player = document.querySelector("savanna-player");
    const speedBtn = player?.shadowRoot?.querySelector(".btn-speed");
    speedBtn?.click();
    await new Promise((r) => setTimeout(r, 200));
    const menuOpen = !!player?.shadowRoot?.querySelector(".speed-popover");
    const opt = player?.shadowRoot?.querySelector(".speed-opt-btn:nth-child(5)"); // 1.5x
    opt?.click();
    await new Promise((r) => setTimeout(r, 200));
    const newRate = player?.playbackRate;
    return { menuOpen, newRate };
  });
  const speedPassed = speedBtnState.menuOpen && speedBtnState.newRate === 1.5;
  report.buttons.push({ name: "Speed Menu (.btn-speed)", passed: speedPassed, details: speedBtnState });
  console.log(`   - Speed Menu: ${speedPassed ? "✅ PASS" : "❌ FAIL"}`);

  // Reset speed
  await page.evaluate(() => {
    const player = document.querySelector("savanna-player");
    player?.setPlaybackRate(1);
  });

  // Test Captions Button
  const captionsBtnState = await page.evaluate(async () => {
    const player = document.querySelector("savanna-player");
    const btn = player?.shadowRoot?.querySelector(".btn-captions");
    const initial = player?.captionsShowing;
    btn?.click();
    await new Promise((r) => setTimeout(r, 200));
    const after = player?.captionsShowing;
    btn?.click();
    await new Promise((r) => setTimeout(r, 200));
    const final = player?.captionsShowing;
    return { initial, after, final };
  });
  const captionsPassed = captionsBtnState.initial !== captionsBtnState.after && captionsBtnState.final === captionsBtnState.initial;
  report.buttons.push({ name: "Captions Button (.btn-captions)", passed: captionsPassed, details: captionsBtnState });
  console.log(`   - Captions Button: ${captionsPassed ? "✅ PASS" : "❌ FAIL"}`);

  // Test Preferences Button
  const prefsBtnState = await page.evaluate(async () => {
    const player = document.querySelector("savanna-player");
    const btn = player?.shadowRoot?.querySelector(".btn-preferences");
    btn?.click();
    await new Promise((r) => setTimeout(r, 300));
    const dialog = player?.shadowRoot?.querySelector("dialog.captions-dialog");
    const isOpen = dialog?.hasAttribute("open") || dialog?.open;
    const closeBtn = player?.shadowRoot?.querySelector(".close-captions-btn");
    closeBtn?.click();
    await new Promise((r) => setTimeout(r, 300));
    const isClosed = !dialog?.hasAttribute("open");
    return { isOpen, isClosed };
  });
  const prefsPassed = prefsBtnState.isOpen && prefsBtnState.isClosed;
  report.buttons.push({ name: "Preferences Dialog (.btn-preferences)", passed: prefsPassed, details: prefsBtnState });
  console.log(`   - Preferences Dialog: ${prefsPassed ? "✅ PASS" : "❌ FAIL"}`);

  // Test Transcript Drawer Button
  const transcriptBtnState = await page.evaluate(async () => {
    const player = document.querySelector("savanna-player");
    const btn = player?.shadowRoot?.querySelector(".btn-transcript");
    const initial = player?.isTranscriptOpen;
    btn?.click();
    await new Promise((r) => setTimeout(r, 300));
    const after = player?.isTranscriptOpen;
    btn?.click();
    await new Promise((r) => setTimeout(r, 300));
    const final = player?.isTranscriptOpen;
    return { initial, after, final };
  });
  const transcriptPassed = transcriptBtnState.initial !== transcriptBtnState.after && transcriptBtnState.final === transcriptBtnState.initial;
  report.buttons.push({ name: "Transcript Button (.btn-transcript)", passed: transcriptPassed, details: transcriptBtnState });
  console.log(`   - Transcript Drawer: ${transcriptPassed ? "✅ PASS" : "❌ FAIL"}`);

  // Test Sign Language Button
  const signBtnState = await page.evaluate(async () => {
    const player = document.querySelector("savanna-player");
    const btn = player?.shadowRoot?.querySelector(".btn-sign");
    const initial = player?.showSignWindow;
    btn?.click();
    await new Promise((r) => setTimeout(r, 200));
    const after = player?.showSignWindow;
    btn?.click();
    await new Promise((r) => setTimeout(r, 200));
    const final = player?.showSignWindow;
    return { initial, after, final };
  });
  const signPassed = signBtnState.initial !== signBtnState.after && signBtnState.final === signBtnState.initial;
  report.buttons.push({ name: "Sign Language Button (.btn-sign)", passed: signPassed, details: signBtnState });
  console.log(`   - Sign Language Button: ${signPassed ? "✅ PASS" : "❌ FAIL"}`);

  // Test Audio Description Button
  const adBtnState = await page.evaluate(async () => {
    const player = document.querySelector("savanna-player");
    const btn = player?.shadowRoot?.querySelector(".btn-ad");
    const initial = player?.audioDescriptionEnabled;
    btn?.click();
    await new Promise((r) => setTimeout(r, 200));
    const after = player?.audioDescriptionEnabled;
    btn?.click();
    await new Promise((r) => setTimeout(r, 200));
    const final = player?.audioDescriptionEnabled;
    return { initial, after, final };
  });
  const adPassed = adBtnState.initial !== adBtnState.after && adBtnState.final === adBtnState.initial;
  report.buttons.push({ name: "Audio Description Button (.btn-ad)", passed: adPassed, details: adBtnState });
  console.log(`   - Audio Description Button: ${adPassed ? "✅ PASS" : "❌ FAIL"}`);

  // Test Low-Data Mode Button
  const lowDataBtnState = await page.evaluate(async () => {
    const player = document.querySelector("savanna-player");
    const btn = player?.shadowRoot?.querySelector(".btn-low-data");
    const v = player?.shadowRoot?.querySelector("video");
    const initialLow = player?.lowData;
    const initialSrc = v?.src;
    btn?.click();
    await new Promise((r) => setTimeout(r, 300));
    const afterLow = player?.lowData;
    const afterSrc = v?.src;
    btn?.click();
    await new Promise((r) => setTimeout(r, 300));
    const finalLow = player?.lowData;
    const finalSrc = v?.src;
    return { initialLow, initialSrc, afterLow, afterSrc, finalLow, finalSrc };
  });
  const lowDataPassed = lowDataBtnState.initialLow === false && lowDataBtnState.afterLow === true && lowDataBtnState.finalLow === false && lowDataBtnState.afterSrc.includes(".opus") && lowDataBtnState.finalSrc.includes(".mp4");
  report.lowData.push({ name: "Low-Data Button (.btn-low-data)", passed: lowDataPassed, details: lowDataBtnState });
  console.log(`   - Low-Data Button: ${lowDataPassed ? "✅ PASS" : "❌ FAIL"}`);

  // 1.2 Test Keyboard Shortcuts
  console.log("\n⌨️ Testing Keyboard Shortcuts...");
  await page.evaluate(() => {
    const player = document.querySelector("savanna-player");
    player?.focus();
  });

  const shortcutsToTest = [
    { key: "k", name: "Play/Pause (k)", check: async () => {
      const before = await page.evaluate(() => document.querySelector("savanna-player")?.shadowRoot?.querySelector("video")?.paused);
      await page.keyboard.press("k");
      await page.waitForTimeout(300);
      const after = await page.evaluate(() => document.querySelector("savanna-player")?.shadowRoot?.querySelector("video")?.paused);
      await page.keyboard.press("k"); // restore
      await page.waitForTimeout(200);
      return before !== after;
    }},
    { key: "Space", name: "Play/Pause (Space)", check: async () => {
      const before = await page.evaluate(() => document.querySelector("savanna-player")?.shadowRoot?.querySelector("video")?.paused);
      await page.keyboard.press("Space");
      await page.waitForTimeout(300);
      const after = await page.evaluate(() => document.querySelector("savanna-player")?.shadowRoot?.querySelector("video")?.paused);
      await page.keyboard.press("Space"); // restore
      await page.waitForTimeout(200);
      return before !== after;
    }},
    { key: "ArrowRight", name: "Seek Forward 5s (→)", check: async () => {
      await page.evaluate(() => {
        const v = document.querySelector("savanna-player")?.shadowRoot?.querySelector("video");
        if (v) v.currentTime = 20;
      });
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(200);
      const time = await page.evaluate(() => document.querySelector("savanna-player")?.shadowRoot?.querySelector("video")?.currentTime);
      return time >= 24.5;
    }},
    { key: "ArrowLeft", name: "Seek Backward 5s (←)", check: async () => {
      await page.evaluate(() => {
        const v = document.querySelector("savanna-player")?.shadowRoot?.querySelector("video");
        if (v) v.currentTime = 20;
      });
      await page.keyboard.press("ArrowLeft");
      await page.waitForTimeout(200);
      const time = await page.evaluate(() => document.querySelector("savanna-player")?.shadowRoot?.querySelector("video")?.currentTime);
      return time <= 15.5;
    }},
    { key: "l", name: "Seek Forward 10s (l)", check: async () => {
      await page.evaluate(() => {
        const v = document.querySelector("savanna-player")?.shadowRoot?.querySelector("video");
        if (v) v.currentTime = 20;
      });
      await page.keyboard.press("l");
      await page.waitForTimeout(200);
      const time = await page.evaluate(() => document.querySelector("savanna-player")?.shadowRoot?.querySelector("video")?.currentTime);
      return time >= 29.5;
    }},
    { key: "j", name: "Seek Backward 10s (j)", check: async () => {
      await page.evaluate(() => {
        const v = document.querySelector("savanna-player")?.shadowRoot?.querySelector("video");
        if (v) v.currentTime = 20;
      });
      await page.keyboard.press("j");
      await page.waitForTimeout(200);
      const time = await page.evaluate(() => document.querySelector("savanna-player")?.shadowRoot?.querySelector("video")?.currentTime);
      return time <= 10.5;
    }},
    { key: "m", name: "Mute/Unmute (m)", check: async () => {
      const before = await page.evaluate(() => document.querySelector("savanna-player")?.isMuted);
      await page.keyboard.press("m");
      await page.waitForTimeout(200);
      const after = await page.evaluate(() => document.querySelector("savanna-player")?.isMuted);
      await page.keyboard.press("m"); // restore
      return before !== after;
    }},
    { key: "c", name: "Toggle Captions (c)", check: async () => {
      const before = await page.evaluate(() => document.querySelector("savanna-player")?.captionsShowing);
      await page.keyboard.press("c");
      await page.waitForTimeout(200);
      const after = await page.evaluate(() => document.querySelector("savanna-player")?.captionsShowing);
      await page.keyboard.press("c"); // restore
      return before !== after;
    }},
    { key: "s", name: "Toggle Sign Window (s)", check: async () => {
      const before = await page.evaluate(() => document.querySelector("savanna-player")?.showSignWindow);
      await page.keyboard.press("s");
      await page.waitForTimeout(200);
      const after = await page.evaluate(() => document.querySelector("savanna-player")?.showSignWindow);
      await page.keyboard.press("s"); // restore
      return before !== after;
    }},
    { key: "d", name: "Toggle Audio Description (d)", check: async () => {
      const before = await page.evaluate(() => document.querySelector("savanna-player")?.audioDescriptionEnabled);
      await page.keyboard.press("d");
      await page.waitForTimeout(200);
      const after = await page.evaluate(() => document.querySelector("savanna-player")?.audioDescriptionEnabled);
      await page.keyboard.press("d"); // restore
      return before !== after;
    }},
    { key: "t", name: "Toggle Transcript (t)", check: async () => {
      const before = await page.evaluate(() => document.querySelector("savanna-player")?.isTranscriptOpen);
      await page.keyboard.press("t");
      await page.waitForTimeout(200);
      const after = await page.evaluate(() => document.querySelector("savanna-player")?.isTranscriptOpen);
      await page.keyboard.press("t"); // restore
      return before !== after;
    }},
    { key: "p", name: "Open Preferences Modal (p) & Escape", check: async () => {
      await page.keyboard.press("p");
      await page.waitForTimeout(300);
      const isOpen = await page.evaluate(() => {
        const d = document.querySelector("savanna-player")?.shadowRoot?.querySelector("dialog.prefs-dialog, dialog.captions-dialog");
        return d?.hasAttribute("open") || d?.open;
      });
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
      const isClosed = await page.evaluate(() => {
        const d = document.querySelector("savanna-player")?.shadowRoot?.querySelector("dialog.prefs-dialog, dialog.captions-dialog");
        return !d?.hasAttribute("open");
      });
      return isOpen && isClosed;
    }},
    { key: "?", name: "Open Shortcuts Help (?) & Escape", check: async () => {
      await page.keyboard.press("?");
      await page.waitForTimeout(300);
      const isOpen = await page.evaluate(() => {
        const d = document.querySelector("savanna-player")?.shadowRoot?.querySelector("dialog.shortcuts-dialog");
        return d?.hasAttribute("open") || d?.open;
      });
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
      const isClosed = await page.evaluate(() => {
        const d = document.querySelector("savanna-player")?.shadowRoot?.querySelector("dialog.shortcuts-dialog");
        return !d?.hasAttribute("open");
      });
      return isOpen && isClosed;
    }},
  ];

  for (const s of shortcutsToTest) {
    try {
      await page.evaluate(() => {
        const p = document.querySelector("savanna-player");
        p?.focus();
      });
      const passed = await s.check();
      report.shortcuts.push({ name: s.name, passed });
      console.log(`   - ${s.name}: ${passed ? "✅ PASS" : "❌ FAIL"}`);
    } catch (e) {
      report.shortcuts.push({ name: s.name, passed: false, error: e.message });
      console.log(`   - ${s.name}: ❌ ERROR (${e.message})`);
    }
  }

  // 1.3 Sign Language Window Interactions
  console.log("\n🖐️ Testing Sign Language Window Interactions...");
  const signInteraction = await page.evaluate(async () => {
    const sign = document.querySelector("savanna-sign-window");
    if (!sign) return { error: "No sign window element" };
    const root = sign.shadowRoot;
    const initialPos = { ...sign.position };

    // Test snap buttons
    const snapBtns = root?.querySelectorAll("header .actions button");
    const snapCount = snapBtns?.length || 0;

    // Test snapping to top-left
    snapBtns?.[0]?.click();
    await new Promise((r) => setTimeout(r, 200));
    const snappedTopLeft = { ...sign.position };

    // Test snapping to top-right
    snapBtns?.[1]?.click();
    await new Promise((r) => setTimeout(r, 200));
    const snappedTopRight = { ...sign.position };

    // Test video duration & looping
    const v = root?.querySelector("video");

    return {
      snapCount,
      initialPos,
      snappedTopLeft,
      snappedTopRight,
      videoDuration: v?.duration,
      videoLoop: v?.loop,
      videoMuted: v?.muted,
    };
  });
  const signPass = signInteraction.snapCount >= 4 && signInteraction.snappedTopLeft.x !== signInteraction.snappedTopRight.x && signInteraction.videoLoop === true;
  report.signWindow.push({ name: "Sign Window Interactions", passed: signPass, details: signInteraction });
  console.log(`   - Sign Window Snaps & Loop: ${signPass ? "✅ PASS" : "❌ FAIL"}`);

  // 1.4 Offline Pack Component Interaction
  console.log("\n📦 Testing Offline Pack Component...");
  const offlineState = await page.evaluate(async () => {
    const offline = document.querySelector("savanna-offline");
    if (!offline) return { error: "No savanna-offline" };
    const root = offline.shadowRoot;
    const manifestStatus = offline.status;
    const saveBtn = root?.querySelector("button:nth-child(1)");
    const refreshBtn = root?.querySelector("button:nth-child(2)");
    return {
      manifestStatus,
      saveBtnText: saveBtn?.innerText,
      saveBtnDisabled: saveBtn?.hasAttribute("disabled"),
      refreshBtnText: refreshBtn?.innerText,
    };
  });
  const offlinePass = offlineState.saveBtnText && offlineState.saveBtnText.includes("Save for offline");
  report.offline.push({ name: "Offline Pack Component", passed: offlinePass, details: offlineState });
  console.log(`   - Offline Pack Button: ${offlinePass ? "✅ PASS" : "❌ FAIL"}`);

  // 1.5 Responsive Viewport Audit
  console.log("\n📱 Testing Responsive Layouts...");
  const viewports = [
    { name: "Desktop (1280x800)", width: 1280, height: 800 },
    { name: "Tablet (768x1024)", width: 768, height: 1024 },
    { name: "Mobile (375x667)", width: 375, height: 667 },
  ];

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(300);
    const layout = await page.evaluate(() => {
      const player = document.querySelector("savanna-player");
      const rect = player?.getBoundingClientRect();
      const controls = player?.shadowRoot?.querySelector(".player-controls");
      const cRect = controls?.getBoundingClientRect();
      const bodyWidth = document.body.clientWidth;
      const hasHorizontalScroll = document.documentElement.scrollWidth > bodyWidth;
      return {
        playerWidth: rect?.width,
        controlsWidth: cRect?.width,
        hasHorizontalScroll,
      };
    });
    const vpPass = layout.playerWidth > 0 && !layout.hasHorizontalScroll;
    report.responsive.push({ name: vp.name, passed: vpPass, details: layout });
    console.log(`   - ${vp.name}: ${vpPass ? "✅ PASS" : "❌ FAIL"} (Horizontal overflow: ${layout.hasHorizontalScroll})`);
  }

  // 2. Audit Career Gateway Page
  console.log("\n💼 Phase 2: Auditing Career Gateway (jobs.html)...");
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("http://localhost:8080/savanna/pages/jobs.html", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  const careerState = await page.evaluate(async () => {
    const jobCards = document.querySelectorAll("savanna-job-card");
    const cred = document.querySelector("savanna-credential");
    const cardData = [];
    for (const c of jobCards) {
      const root = c.shadowRoot;
      const title = root?.querySelector("h2, h3")?.innerText;
      const audioBtn = root?.querySelector("button[aria-label*='audio'], button.audio-btn, button");
      cardData.push({ title, hasAudio: !!audioBtn });
    }
    const credTitle = cred?.shadowRoot?.querySelector("h2, h3")?.innerText;
    return {
      cardCount: jobCards.length,
      cardData,
      hasCred: !!cred,
      credTitle,
    };
  });
  console.log("   Career Gateway State:", JSON.stringify(careerState, null, 2));

  report.errors = { consoleErrors, pageErrors };

  console.log("\n==========================================");
  console.log("📊 AUDIT SUMMARY REPORT");
  console.log("==========================================");
  console.log(`Buttons Tested: ${report.buttons.length} (Passed: ${report.buttons.filter(b => b.passed).length})`);
  console.log(`Shortcuts Tested: ${report.shortcuts.length} (Passed: ${report.shortcuts.filter(s => s.passed).length})`);
  console.log(`Sign Window Tests: ${report.signWindow.length} (Passed: ${report.signWindow.filter(s => s.passed).length})`);
  console.log(`Offline Tests: ${report.offline.length} (Passed: ${report.offline.filter(o => o.passed).length})`);
  console.log(`Responsive Tests: ${report.responsive.length} (Passed: ${report.responsive.filter(r => r.passed).length})`);
  console.log(`Console Errors: ${consoleErrors.length}`);
  console.log(`Page Errors: ${pageErrors.length}`);
  if (consoleErrors.length > 0) {
    console.log("Console Error Details:", consoleErrors);
  }
  if (pageErrors.length > 0) {
    console.log("Page Error Details:", pageErrors);
  }

  await browser.close();
}

runAudit().catch(err => {
  console.error("FATAL AUDIT ERROR:", err);
  process.exit(1);
});

