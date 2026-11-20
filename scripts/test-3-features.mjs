import { pathToFileURL } from 'node:url';
import path from 'node:path';

const { chromium } = await import(pathToFileURL(path.resolve('api/node_modules/playwright/index.mjs')).href);
const browser = await chromium.launch({ channel: 'chrome', headless: true });

console.log('Testing 3 New Capabilities...');

// Test 1: Open Badges Verification & Portable Offline Verifier
const page1 = await browser.newPage();
await page1.goto('http://localhost:8080/verify/C-7', { waitUntil: 'networkidle' });
const verifyDemoBtn = await page1.$('#btn-verify-demo');
await verifyDemoBtn.click();
await page1.waitForTimeout(300);
const auditLog = await page1.$eval('#audit-log', el => el.innerText);
const hasOfflineSuccess = auditLog.includes('CERTIFICATE VERIFIED AUTHENTIC') && auditLog.includes('No ALX Server Contact');
console.log('1. Portable Certificate Verifier:', hasOfflineSuccess ? '✅ PASS' : '❌ FAIL');

// Test 1b: Verify JSON-LD endpoint
const jsonLdRes = await page1.goto('http://localhost:8080/verify/C-7.json');
const jsonLd = await jsonLdRes.json();
const isBadgeValid = jsonLd.type.includes('OpenBadgeCredential') && !!jsonLd.proof;
console.log('1b. Open Badges JSON-LD Endpoint:', isBadgeValid ? '✅ PASS' : '❌ FAIL');

// Test 2: Lesson to Offline Pack (2G pack)
const page2 = await browser.newPage();
await page2.goto('http://localhost:8080/savanna/pages/concept-with-navigation.html', { waitUntil: 'networkidle' });
await page2.waitForTimeout(800);
const offlineInfo = await page2.evaluate(() => {
  const off = document.querySelector('savanna-offline');
  const btn = off?.shadowRoot?.querySelector('button');
  const status = off?.shadowRoot?.querySelector('[role="status"]');
  return {
    btnText: btn?.innerText,
    disabled: btn?.hasAttribute('disabled'),
    statusText: status?.innerText
  };
});
const packPass = !offlineInfo.disabled && offlineInfo.btnText && offlineInfo.btnText.includes('Save for offline');
console.log('2. Lesson to Offline Pack Component:', packPass ? '✅ PASS' : '❌ FAIL', offlineInfo);

// Test 3: Audio Description Studio
const page3 = await browser.newPage();
await page3.goto('http://localhost:8080/demo/audio-description-editor/index.html', { waitUntil: 'networkidle' });
const cuesCount = await page3.$$eval('.cue-card', els => els.length);
const hasRecordBtn = await page3.$('.cue-card button:has-text("Record Voice")');
const hasSyncBtn = await page3.$('#btn-sync-preview');
console.log('3. Audio Description Studio for Teachers:', (cuesCount >= 5 && !!hasRecordBtn && !!hasSyncBtn) ? '✅ PASS' : '❌ FAIL', { cuesCount });

await browser.close();
console.log('All 3 tests finished successfully.');
