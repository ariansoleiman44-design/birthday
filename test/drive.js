/* Drives the invitation in real Chrome, throttled to phone-class CPU,
   and measures how hard it is actually working. */
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FILE = 'file://' + path.join(__dirname, '..', 'lana-28-august.html');
const OUT = path.join(__dirname, 'shots');
fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required',
           '--font-render-hinting=none'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 430, height: 932, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  page.on('requestfailed', (r) => errors.push('REQFAIL: ' + r.url().slice(0, 70)));

  const cdp = await page.createCDPSession();
  await cdp.send('Performance.enable');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });   // ~ mid-range phone

  await page.goto(FILE, { waitUntil: 'networkidle2', timeout: 90000 });
  await wait(2500);
  await page.screenshot({ path: path.join(OUT, '01-envelope.png') });

  // ---- break the seal by dragging it down --------------------------------
  const sealBox = await page.evaluate(() => {
    const r = document.getElementById('seal').getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.mouse.move(sealBox.x, sealBox.y);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) { await page.mouse.move(sealBox.x, sealBox.y + i * 10); await wait(24); }
  await page.mouse.up();
  await wait(600);
  const brokeByDrag = await page.evaluate(() =>
    document.getElementById('envelope').classList.contains('open'));
  await wait(1200);
  await page.screenshot({ path: path.join(OUT, '02-opening.png') });
  await wait(1800);

  // ---- performance under a scripted scroll -------------------------------
  const m0 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
  await page.evaluate(() => {
    window.__f = { n: 0, t0: performance.now() };
    (function tick() { window.__f.n++; requestAnimationFrame(tick); })();
  });
  // the scroll runs INSIDE the page, driven by rAF — driving it from node
  // means the CDP round-trips dominate the measurement instead of the page
  await page.evaluate(() => new Promise((done) => {
    const end = performance.now() + 6000;
    let moved = 0;
    (function step() {
      window.scrollBy(0, 12);            // ~720px/s at 60fps, a brisk real flick
      moved += 12;
      if (performance.now() < end &&
          window.scrollY + window.innerHeight < document.body.scrollHeight - 4) {
        requestAnimationFrame(step);
      } else { window.__px = moved; done(); }
    })();
  }));
  const px = await page.evaluate(() => window.__px || 1);
  const perf = await page.evaluate(() => {
    const s = (performance.now() - window.__f.t0) / 1000;
    return { fps: +(window.__f.n / s).toFixed(1), seconds: +s.toFixed(1) };
  });
  const m1 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
  const cost = (k) => +((m1[k] - m0[k])).toFixed(3);

  await page.evaluate(() => window.scrollTo(0, 0));
  await wait(900);

  const go = async (id, ms = 1500) => {
    await page.evaluate((i) => {
      const el = document.getElementById(i);
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
    }, id);
    await wait(ms);
  };

  // ---- walk the chapters --------------------------------------------------
  let n = 3;
  for (const id of ['card', 'today-sec', 'countdown', 'day-lock', 'rose', 'gallery', 'reel-sec',
                    'tonight', 'resume-day', 'scratch', 'letter', 'coupons', 'record-sec',
                    'letters-more', 'said-sec', 'acrostic-sec', 'stars-sec', 'quiz-sec',
                    'sing-sec', 'oracle-sec', 'game-sec', 'arcade', 'cake', 'back',
                    'calendar-sec', 'capsule-sec', 'diary-sec', 'keep-sec', 'finale']) {
    await go(id, 1500);
    if (id === 'rose') {
      await page.evaluate(() => document.querySelectorAll('.petal').forEach((p) => p.click()));
      await wait(2600);
    }
    if (id === 'scratch') {
      // rub the gold off the way a finger would
      const box = await page.evaluate(() => {
        const r = document.getElementById('scratch-canvas').getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      });
      await page.mouse.move(box.x + box.w * 0.1, box.y + box.h * 0.2);
      await page.mouse.down();
      for (let row = 0; row < 6; row++) {
        for (let i = 0; i <= 14; i++) {
          const fx = box.x + box.w * (0.05 + (i / 14) * 0.9);
          const fy = box.y + box.h * (0.14 + (row / 5) * 0.72);
          await page.mouse.move(row % 2 ? box.x + box.w * 1.05 - (fx - box.x) : fx, fy);
        }
      }
      await page.mouse.up();
      await wait(1200);
    }
    if (id === 'coupons') {
      await page.evaluate(() => document.querySelectorAll('.ticket').forEach((t) => t.click()));
      await wait(1400);
    }
    if (id === 'record-sec') {
      await page.evaluate(() => document.querySelectorAll('.track')[1].click());
      await wait(1400);
    }
    if (id === 'quiz-sec') {
      // answer every question the way he wrote it down
      await page.evaluate(() => {
        const right = [0, 1, 2, 0, 1, 1];
        document.querySelectorAll('.q').forEach((q, i) =>
          q.querySelectorAll('.q-opt')[right[i]].click());
      });
      await wait(1600);
    }
    if (id === 'oracle-sec') {
      await page.evaluate(() => document.querySelectorAll('.ocard')[1].click());
      await wait(1600);
    }
    if (id === 'calendar-sec') {
      await page.evaluate(() => {
        const t = document.querySelector('.seal-note.today');
        if (t) t.click();
      });
      await wait(1400);
    }
    if (id === 'arcade') {
      await page.evaluate(() => document.querySelectorAll('.arc-tab')[5].click());
      await wait(900);
      await page.evaluate(() => { const c = document.querySelector('.cookie'); if (c) c.click(); });
      await wait(900);
    }
    if (id === 'capsule-sec') {
      await page.evaluate(() => { document.getElementById('capsule-text').value = 'remember this month'; });
      await page.evaluate(() => document.getElementById('capsule-seal').click());
      await wait(1200);
    }
    if (id === 'diary-sec') {
      await page.evaluate(() => document.querySelectorAll('.mood')[2].click());
      await wait(1200);
    }
    if (id === 'letter') await wait(9000);
    if (id === 'cake') {
      await page.screenshot({ path: path.join(OUT, '11a-cake-lit.png') });
      await page.evaluate(() => document.getElementById('tap-btn').click());
      await wait(3200);
    }
    if (id === 'back') {
      await page.evaluate(() => { document.getElementById('reply-text').value = 'blah. the good kind.'; });
      await page.evaluate(() => document.getElementById('reply-send').click());
      await page.evaluate(() => { document.getElementById('wish-text').value = 'sleep more, worry less'; });
      await page.evaluate(() => document.getElementById('wish-add').click());
      await wait(1200);
    }
    await page.screenshot({ path: path.join(OUT, String(n++).padStart(2, '0') + '-' + id + '.png') });
  }

  // ---- the secret ---------------------------------------------------------
  const med = await page.evaluate(() => {
    const r = document.getElementById('medallion').getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2,
      top: (document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) || {}).id };
  });
  await page.mouse.move(med.x, med.y);
  await page.mouse.down(); await wait(1400); await page.mouse.up();
  await wait(3200);
  await page.screenshot({ path: path.join(OUT, '90-vault.png') });

  const state = await page.evaluate(() => ({
    envelopeGone: document.getElementById('envelope').classList.contains('gone'),
    pageOpen: document.getElementById('page').classList.contains('open'),
    risesIn: document.querySelectorAll('.rise.in').length,
    risesTotal: document.querySelectorAll('.rise').length,
    petals: document.querySelectorAll('.petal').length,
    petalsDone: document.querySelectorAll('.petal.done').length,
    photos: document.querySelectorAll('.plate img').length,
    photosLoaded: [...document.querySelectorAll('.plate img')].filter((i) => i.naturalWidth > 0).length,
    videosReady: [...document.querySelectorAll('video')].filter((v) => v.readyState >= 2).length,
    phase: document.getElementById('phase-name').textContent,
    phaseDay: document.getElementById('phase-day').textContent,
    letterChars: document.getElementById('letter-body').textContent.length,
    signed: document.getElementById('sign').classList.contains('in'),
    wish: document.getElementById('wish').classList.contains('in'),
    countdown: ['cd-d','cd-h','cd-m','cd-s'].map((i) => document.getElementById(i).textContent).join(':'),
    jar: document.querySelectorAll('#jar li').length,
    vaultOpen: document.getElementById('vault').classList.contains('open'),
    vaultLines: document.querySelectorAll('#vault-list li').length,
    medallionTop: null,
    audio: [...document.querySelectorAll('audio')].map((a) => ({ dur: Math.round(a.duration), paused: a.paused })),
    canvases: document.querySelectorAll('canvas').length,
    scratchCleared: document.getElementById('scratch-canvas').classList.contains('gone'),
    tracks: document.querySelectorAll('.track').length,
    trackOn: document.querySelectorAll('.track.on').length,
    discSpinning: document.querySelector('.deck').classList.contains('playing-disc'),
    quizQs: document.querySelectorAll('.q').length,
    quizAnswered: document.querySelectorAll('.q.answered').length,
    quizScore: document.getElementById('quiz-score').textContent,
    oracleCards: document.querySelectorAll('.ocard').length,
    oracleTurned: document.querySelectorAll('.ocard.turned').length,
    oracleSaid: document.getElementById('oracle-say').textContent.slice(0, 30),
    calNotes: document.querySelectorAll('.seal-note').length,
    calAvailable: document.querySelectorAll('.seal-note:not(.locked)').length,
    calOpened: document.querySelectorAll('.seal-note.open').length,
    calPanel: !document.getElementById('cal-open').hidden,
    calText: document.getElementById('cal-text').textContent.slice(0, 34),
    lockTimer: document.getElementById('lock-timer').textContent,
    lockLocked: document.getElementById('big-seal').classList.contains('locked'),
    moods: document.querySelectorAll('.mood').length,
    moodChosen: document.querySelectorAll('.mood.on').length,
    moodSay: document.getElementById('mood-say').textContent.slice(0, 26),
    diaryRows: document.querySelectorAll('#diary li').length,
    coverSrcHead: (document.querySelector('.portrait img').src || '').slice(0, 15),
    tickets: document.querySelectorAll('.ticket').length,
    arcadeTabs: document.querySelectorAll('.arc-tab').length,
    chocTotal: document.querySelectorAll('.seal-note').length,
    moreLetters: document.querySelectorAll('.more-item').length,
    keepItems: document.querySelectorAll('.keep-item').length,
    qrDrawn: document.getElementById('qr').width > 0,
    capsuleSealed: !document.getElementById('capsule-locked').hidden,
    saidLines: document.querySelectorAll('#said li').length,
    acrostic: document.querySelectorAll('#acrostic li').length,
    horoscope: document.getElementById('horo-text').textContent.length > 10,
    nightAvailable: !!document.getElementById('mode-btn'),
    gameBestShown: document.getElementById('game-best').textContent,
    singBtn: document.getElementById('sing-btn').textContent,
    ticketsFlipped: document.querySelectorAll('.ticket.flipped').length,
    docWidth: document.documentElement.scrollWidth,
    winWidth: window.innerWidth,
    pageHeight: document.body.scrollHeight,
  }));
  state.medallionTop = med.top;

  // ---- the lightbox -------------------------------------------------------
  await go('gallery', 1200);
  await page.evaluate(() => document.querySelector('.plate .frame').click());
  await wait(900);
  const lb = await page.evaluate(() => ({
    open: document.getElementById('lightbox').classList.contains('open'),
    src: (document.getElementById('lightbox-img').src || '').slice(0, 22),
  }));
  await page.screenshot({ path: path.join(OUT, '89-lightbox.png') });
  await page.evaluate(() => document.getElementById('lightbox-close').click());
  await wait(600);
  lb.closed = await page.evaluate(() =>
    !document.getElementById('lightbox').classList.contains('open') &&
    !document.body.classList.contains('is-locked'));

  // ---- she changes the cover photo ---------------------------------------
  await go('card', 1000);
  const cover0 = await page.evaluate(() => document.querySelector('.portrait img').src.slice(-40));
  await page.evaluate(() => document.getElementById('cover-swap').click());
  await wait(900);
  const cover1 = await page.evaluate(() => ({
    src: document.querySelector('.portrait img').src.slice(-40),
    stored: localStorage.getItem('lana-2808-cover'),
  }));
  const coverSwap = { changed: cover0 !== cover1.src, stored: cover1.stored };
  // and it survives a reload
  await page.reload({ waitUntil: 'networkidle2' });
  await wait(1500);
  await page.evaluate(() => document.getElementById('seal').click());
  await wait(4200);
  coverSwap.keptAfterReload =
    (await page.evaluate(() => document.querySelector('.portrait img').src.slice(-40))) === cover1.src;

  // ---- desktop, fresh tab -------------------------------------------------
  const dp = await browser.newPage();
  await dp.setViewport({ width: 1440, height: 900 });
  dp.on('pageerror', (e) => errors.push('DESKTOP: ' + e.message));
  await dp.goto(FILE, { waitUntil: 'networkidle2' });
  await wait(1800);
  await dp.evaluate(() => document.getElementById('seal').click());
  await wait(2800);
  await dp.screenshot({ path: path.join(OUT, '91-desktop-card.png') });
  await dp.evaluate(() => document.getElementById('gallery').scrollIntoView({ behavior: 'instant' }));
  await wait(1600);
  await dp.screenshot({ path: path.join(OUT, '92-desktop-gallery.png') });
  const desk = await dp.evaluate(() => ({
    docWidth: document.documentElement.scrollWidth, winWidth: window.innerWidth,
    opened: document.getElementById('envelope').classList.contains('gone'),
  }));

  console.log(JSON.stringify({
    brokeByDrag,
    // NOTE: rAF rate in headless is not a real frame rate (it idles down when
    // nothing animates and overshoots 60 while being driven), so the honest
    // measure of smoothness here is CPU time spent per second of scrolling.
    perf: { cpuSecPer1000px: +(cost('TaskDuration') / (px / 1000)).toFixed(3),
            pxScrolled: px,
            taskSec: cost('TaskDuration'), scriptSec: cost('ScriptDuration'),
            layoutSec: cost('LayoutDuration'), styleSec: cost('RecalcStyleDuration'),
            over: perf.seconds + 's of in-page rAF scrolling, 4x CPU throttle' },
    state, coverSwap, lightbox: lb, desk, errors,
  }, null, 2));
  await browser.close();
})().catch((e) => { console.error('DRIVER FAILED', e); process.exit(1); });
