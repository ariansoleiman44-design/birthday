const { webkit } = require('playwright');
const path = require('path');
const FILE = 'file://' + path.join(__dirname, '..', 'lana-28-august.html');

(async () => {
  const browser = await webkit.launch();
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  page.on('requestfailed', (r) => errors.push('REQFAIL: ' + r.url().slice(0, 60) + ' ' + (r.failure() || {}).errorText));

  await page.goto(FILE, { waitUntil: 'load', timeout: 90000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(__dirname, 'shots', 'wk-01-load.png') });

  const boot = await page.evaluate(() => ({
    envelope: !!document.getElementById('envelope'),
    envHidden: document.getElementById('envelope')
      ? getComputedStyle(document.getElementById('envelope')).display : 'missing',
    sealExists: !!document.getElementById('seal'),
    bodyLocked: document.body.classList.contains('is-locked'),
    petals: document.querySelectorAll('.petal').length,
    chocs: document.querySelectorAll('.seal-note').length,
    tMoods: (document.getElementById('t-moods') || {}).childElementCount,
    arcTabs: document.querySelectorAll('.arc-tab').length,
    scriptRan: typeof window.__px !== 'undefined' || document.querySelectorAll('.arc-tab').length > 0,
  }));

  // try to open it
  const sealBox = await page.evaluate(() => {
    const r = document.getElementById('seal').getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.mouse.move(sealBox.x, sealBox.y);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) { await page.mouse.move(sealBox.x, sealBox.y + i * 10); await page.waitForTimeout(24); }
  await page.mouse.up();
  await page.waitForTimeout(5000);
  await page.screenshot({ path: path.join(__dirname, 'shots', 'wk-02-open.png') });

  const after = await page.evaluate(() => ({
    envGone: document.getElementById('envelope').classList.contains('gone'),
    pageOpen: document.getElementById('page').classList.contains('open'),
    height: document.body.scrollHeight,
  }));

  console.log(JSON.stringify({ boot, after, errors }, null, 2));
  await browser.close();
})().catch((e) => { console.error('WEBKIT DRIVER FAILED:', e.message); process.exit(1); });
