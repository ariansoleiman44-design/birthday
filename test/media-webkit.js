const { webkit } = require('playwright');
const path = require('path');
const FILE = 'file://' + path.join(__dirname, '..', 'lana-28-august.html');
(async () => {
  const browser = await webkit.launch();
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  await page.goto(FILE, { waitUntil: 'load', timeout: 90000 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => document.getElementById('seal').click());
  await page.waitForTimeout(5000);

  const media = await page.evaluate(async () => {
    const vids = [...document.querySelectorAll('video')];
    const auds = [...document.querySelectorAll('audio')];
    // give them a moment to pull metadata
    await new Promise((r) => setTimeout(r, 2500));
    return {
      videos: vids.map((v) => ({ ready: v.readyState, dur: Math.round(v.duration) || 0, err: v.error ? v.error.code : null })),
      audios: auds.map((a) => ({ ready: a.readyState, dur: Math.round(a.duration) || 0, err: a.error ? a.error.code : null })),
      photos: [...document.querySelectorAll('.plate img')].filter((i) => i.naturalWidth > 0).length,
      portrait: (document.querySelector('.portrait img') || {}).naturalWidth || 0,
    };
  });

  await page.evaluate(() => document.getElementById('gallery').scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(__dirname, 'shots', 'wk-03-gallery.png') });
  await page.evaluate(() => document.getElementById('letter').scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(12000);
  const letter = await page.evaluate(() => ({
    chars: document.getElementById('letter-body').textContent.length,
    signed: document.getElementById('sign').classList.contains('in'),
  }));
  await page.screenshot({ path: path.join(__dirname, 'shots', 'wk-04-letter.png') });
  console.log(JSON.stringify({ media, letter, errors }, null, 2));
  await browser.close();
})().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
