import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const base = process.env.TEST_URL || 'http://127.0.0.1:8000/';
const browser = await chromium.launch({ channel: process.env.TEST_BROWSER_CHANNEL || undefined });
async function waitForOfflineShell(page) {
  await page.locator('#app-update').waitFor({ state: 'visible' });
  await page.evaluate(async () => {
    await Promise.race([
      (async () => {
        await navigator.serviceWorker.ready;
        if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
      })(),
      new Promise((_, reject) => setTimeout(async () => {
        const registrations = await navigator.serviceWorker.getRegistrations();
        reject(new Error('Offline shell did not become ready: ' + JSON.stringify(registrations.map(registration => ({
          active: registration.active?.state, installing: registration.installing?.state, waiting: registration.waiting?.state,
        })))));
      }, 10000)),
    ]);
  });
}
try {
  for (const viewport of [{ width: 320, height: 700 }, { width: 412, height: 860 }, { width: 863, height: 347 }, { width: 1280, height: 900 }]) {
    const context = await browser.newContext({ viewport, hasTouch: true });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '#rack');
    await page.locator('.slot').first().waitFor();
    // Let the first install complete before the seed reload interrupts this document.
    await waitForOfflineShell(page);
    await page.evaluate(async () => {
      const { readCellar, saveCellar } = await import('./store.js');
      const current = await readCellar();
      const canvas = document.createElement('canvas');
      canvas.width = 1200; canvas.height = 1800;
      const drawing = canvas.getContext('2d');
      drawing.fillStyle = '#eeeecc'; drawing.fillRect(0, 0, 1200, 1800);
      drawing.fillStyle = '#502139'; drawing.font = '80px sans-serif'; drawing.fillText('Label 2010', 180, 850);
      const photo = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));
      await saveCellar({ racks: [{ id: 'main', name: 'Main rack', rows: 3, columns: 6, bottles: {
        '1:1': { name: 'Label 2010 Shiraz', style: 'Red', vintage: '2010', photo },
        '1:2': { name: 'No photo', style: 'White', photo: null },
      } }] }, current.revision);
    });
    await page.reload();
    await page.locator('.slot[data-key="1:1"]').click();
    const detail = page.locator('#dialog');
    const trigger = detail.getByRole('button', { name: 'Enlarge bottle photo' });
    await trigger.click();
    const viewer = page.locator('.photo-viewer');
    await page.waitForFunction(() => document.querySelector('.photo-viewer img')?.naturalWidth === 1200);
    const fit = await viewer.evaluate(element => ({ width: element.clientWidth, height: element.clientHeight, scroll: element.scrollHeight }));
    assert.equal(fit.width, viewport.width);
    assert.equal(fit.height, viewport.height);
    assert.equal(fit.scroll, viewport.height);
    await viewer.getByRole('button', { name: 'Zoom in', exact: true }).click();
    assert.equal(await viewer.locator('output').textContent(), '150%');
    await viewer.locator('img').evaluate(async image => Promise.all(image.getAnimations().map(animation => animation.finished)));
    const stage = viewer.locator('.photo-viewer-stage');
    const box = await stage.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 70, box.y + box.height / 2 + 70, { steps: 8 });
    await page.mouse.up();
    const moved = await viewer.locator('img').evaluate(image => new DOMMatrix(getComputedStyle(image).transform).m42);
    assert(moved > 0, 'Zoomed photo pans within bounds');
    await viewer.getByRole('button', { name: 'Reset', exact: true }).click();
    assert.equal(await viewer.locator('output').textContent(), '100%');
    await viewer.locator('img').evaluate(async image => Promise.all(image.getAnimations().map(animation => animation.finished)));
    // Real browser touch input exercises the two-pointer pinch path.
    const cdp = await context.newCDPSession(page);
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    const touches = offset => [{ x: cx - offset, y: cy, id: 1 }, { x: cx + offset, y: cy, id: 2 }];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: touches(30) });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: touches(75) });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    assert.equal(await viewer.locator('output').textContent(), '250%');
    await page.setViewportSize({ width: viewport.height, height: viewport.width });
    await page.waitForTimeout(80);
    assert(await viewer.getByRole('button', { name: 'Close photo' }).isVisible());
    await page.keyboard.press('Escape');
    await viewer.waitFor({ state: 'detached' });
    assert(await detail.isVisible(), 'Closing viewer preserves bottle details');
    assert(await trigger.evaluate(element => element === document.activeElement), 'Focus returns to photo');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await trigger.click();
    await viewer.getByRole('button', { name: 'Zoom in', exact: true }).click();
    assert.equal(await viewer.locator('img').evaluate(image => getComputedStyle(image).transitionDuration), '0s');
    await viewer.getByRole('button', { name: 'Close photo' }).click();
    await detail.getByRole('button', { name: 'Close', exact: true }).click();
    await page.locator('.slot[data-key="1:2"]').click();
    assert.equal(await detail.locator('.photo-enlarge').count(), 0, 'Placeholder artwork does not offer photo zoom');
    await waitForOfflineShell(page);
    await context.setOffline(true);
    await page.reload();
    await page.locator('.slot[data-key="1:1"]').click();
    await page.getByRole('button', { name: 'Enlarge bottle photo' }).click();
    await page.waitForFunction(() => document.querySelector('.photo-viewer img')?.naturalWidth === 1200);
    assert.deepEqual(errors, []);
    console.log('Photo viewer passed', viewport);
    await context.close();
  }
} finally { await browser.close(); }
