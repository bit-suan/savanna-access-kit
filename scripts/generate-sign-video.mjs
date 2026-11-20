import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const { chromium } = await import(pathToFileURL(path.resolve('api/node_modules/playwright/index.mjs')).href);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();

console.log('Generating realistic animated sign language interpreter video...');

const videoBase64 = await page.evaluate(async () => {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext('2d');
  document.body.appendChild(canvas);

  const stream = canvas.captureStream(30); // 30 fps
  const mimeType = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm';
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 800000 });
  const chunks = [];

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const recordingPromise = new Promise((resolve) => {
    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: mimeType });
      const reader = new FileReader();
      reader.onloadend = () => resolve({ base64: reader.result.split(',')[1], mimeType });
      reader.readAsDataURL(blob);
    };
  });

  recorder.start();

  // Animate interpreter for 10 seconds (300 frames)
  const totalFrames = 300;
  for (let frame = 0; frame < totalFrames; frame++) {
    const t = frame / 30; // seconds

    // 1. Studio backdrop
    const grad = ctx.createLinearGradient(0, 0, 0, 360);
    grad.addColorStop(0, '#1e293b');
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 640, 360);

    // Subtle studio vignette
    const rad = ctx.createRadialGradient(320, 180, 50, 320, 180, 280);
    rad.addColorStop(0, 'rgba(59, 130, 246, 0.15)');
    rad.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, 640, 360);

    // 2. Torso / Shoulders (Professional dark navy signing attire)
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    // Neck base
    ctx.moveTo(320, 140);
    // Shoulder left
    ctx.bezierCurveTo(280, 150, 220, 175, 200, 240);
    ctx.lineTo(200, 360);
    ctx.lineTo(440, 360);
    // Shoulder right
    ctx.lineTo(440, 240);
    ctx.bezierCurveTo(420, 175, 360, 150, 320, 140);
    ctx.fill();

    // Collar / neckline
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(320, 150, 25, 0, Math.PI);
    ctx.stroke();

    // 3. Head & Face (Warm Ethiopian skin tone)
    const headBob = Math.sin(t * 3) * 2;
    const headTilt = Math.sin(t * 1.5) * 0.05;

    ctx.save();
    ctx.translate(320, 100 + headBob);
    ctx.rotate(headTilt);

    // Neck
    ctx.fillStyle = '#a26a42';
    ctx.fillRect(-15, 20, 30, 35);

    // Head base
    ctx.beginPath();
    ctx.ellipse(0, 0, 38, 48, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = '#1f1610';
    ctx.beginPath();
    ctx.arc(0, -10, 42, Math.PI * 0.8, Math.PI * 2.2);
    ctx.fill();

    // Eyes (expressive blinking & gazing)
    const isBlink = (frame % 75) < 3;
    ctx.fillStyle = '#fff';
    if (!isBlink) {
      // Left eye
      ctx.beginPath();
      ctx.ellipse(-14, -2, 7, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#261b14';
      ctx.beginPath();
      ctx.arc(-14 + Math.sin(t * 2) * 2, -2, 3, 0, Math.PI * 2);
      ctx.fill();

      // Right eye
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(14, -2, 7, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#261b14';
      ctx.beginPath();
      ctx.arc(14 + Math.sin(t * 2) * 2, -2, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Closed eye lines
      ctx.strokeStyle = '#261b14';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-20, -2); ctx.lineTo(-8, -2);
      ctx.moveTo(8, -2); ctx.lineTo(20, -2);
      ctx.stroke();
    }

    // Eyebrows (crucial grammatical markers in Ethiopian Sign Language!)
    const browRaise = Math.sin(t * 2.5) * 3;
    ctx.strokeStyle = '#1f1610';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-22, -14 - browRaise);
    ctx.quadraticCurveTo(-14, -18 - browRaise, -6, -13 - browRaise);
    ctx.moveTo(6, -13 - browRaise);
    ctx.quadraticCurveTo(14, -18 - browRaise, 22, -14 - browRaise);
    ctx.stroke();

    // Nose
    ctx.strokeStyle = '#85522e';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(2, 10);
    ctx.lineTo(-4, 14);
    ctx.stroke();

    // Mouth (moves in cadence with signing - mouthing / non-manual markers)
    const mouthOpen = Math.abs(Math.sin(t * 5)) * 6;
    ctx.fillStyle = '#6b3628';
    ctx.beginPath();
    ctx.ellipse(0, 24, 10, 3 + mouthOpen, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 4. Arms & Signing Hands (Complex, realistic gestures)
    // Dynamic hand coordinates driven by harmonic signing waves
    const leftHandX = 260 + Math.sin(t * 3.2) * 60 + Math.cos(t * 1.7) * 20;
    const leftHandY = 220 + Math.cos(t * 2.8) * 50 + Math.sin(t * 4.1) * 20;

    const rightHandX = 380 + Math.cos(t * 3.5) * 60 + Math.sin(t * 2.1) * 25;
    const rightHandY = 210 + Math.sin(t * 3.1) * 55 + Math.cos(t * 3.8) * 20;

    // Draw Left Arm (Dark Navy sleeve)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 26;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(220, 200); // Left shoulder
    ctx.quadraticCurveTo(210, 270, leftHandX, leftHandY);
    ctx.stroke();

    // Draw Right Arm (Dark Navy sleeve)
    ctx.beginPath();
    ctx.moveTo(420, 200); // Right shoulder
    ctx.quadraticCurveTo(430, 260, rightHandX, rightHandY);
    ctx.stroke();

    // Draw Left Hand (Ethiopian skin tone + fingers)
    ctx.fillStyle = '#a26a42';
    ctx.strokeStyle = '#85522e';
    ctx.lineWidth = 2;

    ctx.save();
    ctx.translate(leftHandX, leftHandY);
    ctx.rotate(Math.sin(t * 3) * 0.4);
    // Palm
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Fingers signing
    for (let f = -2; f <= 2; f++) {
      const fingerLen = 14 + Math.sin(t * 4 + f) * 4;
      ctx.beginPath();
      ctx.ellipse(f * 6, -18, 3.5, fingerLen, 0.1 * f, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();

    // Draw Right Hand (Ethiopian skin tone + fingers)
    ctx.save();
    ctx.translate(rightHandX, rightHandY);
    ctx.rotate(-Math.cos(t * 3.3) * 0.4);
    // Palm
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Fingers signing
    for (let f = -2; f <= 2; f++) {
      const fingerLen = 14 + Math.cos(t * 4 + f) * 4;
      ctx.beginPath();
      ctx.ellipse(f * 6, -18, 3.5, fingerLen, -0.1 * f, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();

    // 5. On-Screen Overlay Badge (ESL / የኢትዮጵያ ምልክት ቋንቋ)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect(14, 14, 280, 36, 6);
    ctx.fill();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Live pulsing green broadcast dot
    ctx.fillStyle = (frame % 20 < 10) ? '#22c55e' : '#15803d';
    ctx.beginPath();
    ctx.arc(28, 32, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('🇪🇹 ESL · የኢትዮጵያ ምልክት ቋንቋ', 42, 36);

    // Frame delay (33ms for 30fps)
    await new Promise((r) => setTimeout(r, 33));
  }

  recorder.stop();
  return await recordingPromise;
});

await browser.close();

console.log(`Video recorded! Format: ${videoBase64.mimeType}`);
const buffer = Buffer.from(videoBase64.base64, 'base64');
const targetMp4 = path.resolve('contracts/fixtures/media/esl-placeholder.mp4');
const targetWebm = path.resolve('contracts/fixtures/media/esl-placeholder.webm');

fs.writeFileSync(targetMp4, buffer);
fs.writeFileSync(targetWebm, buffer);

console.log(`Wrote ${buffer.length} bytes to ${targetMp4} and ${targetWebm}`);
