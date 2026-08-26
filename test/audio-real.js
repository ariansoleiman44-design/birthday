/* Deliberately does NOT pass --autoplay-policy=no-user-gesture-required.
   That flag is why a total-silence bug survived every previous run. */
const puppeteer = require('puppeteer-core');
const path = require('path');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FILE = 'file://' + path.join(__dirname, '..', 'lana-28-august.html');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--allow-file-access-from-files', '--font-render-hinting=none'],  // real policy
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 430, height: 932, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

  await page.goto(FILE, { waitUntil: 'networkidle2', timeout: 90000 });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle2' });
  await wait(2000);

  // break the seal by dragging, exactly as she would
  const box = await page.evaluate(() => {
    const r = document.getElementById('seal').getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.mouse.move(box.x, box.y);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) { await page.mouse.move(box.x, box.y + i * 10); await wait(24); }
  await page.mouse.up();
  await wait(7000);

  const state = await page.evaluate(() => {
    const a = document.getElementById('a-birthday');
    return {
      paused: a.paused,
      currentTime: +a.currentTime.toFixed(2),
      readyState: a.readyState,
      elementVolume: a.volume,
      muted: a.muted,
      playerShown: document.getElementById('player').classList.contains('show'),
      playerPlaying: document.getElementById('player').classList.contains('playing'),
    };
  });

  // the decisive check: is any audio context actually RUNNING?
  const ctxStates = await page.evaluate(() => window.__ctxProbe || null);
  await wait(3000);
  const later = await page.evaluate(() => ({
    currentTime: +document.getElementById('a-birthday').currentTime.toFixed(2),
  }));

  console.log(JSON.stringify({
    state, ctxStates,
    advancedBy: +(later.currentTime - state.currentTime).toFixed(2),
    verdict: (later.currentTime > state.currentTime && !state.paused) ? 'PLAYING' : 'SILENT',
    errors,
  }, null, 2));
  await browser.close();
})().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
