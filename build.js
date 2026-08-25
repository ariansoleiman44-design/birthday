/* Assembles the single self-contained page for Lana.
   Every photo, clip and song is inlined as a data: URI so nothing can break. */
const fs = require('fs');
const path = require('path');

const R = (p) => fs.readFileSync(path.join(__dirname, p), 'utf8');
const uri = (p, mime) =>
  'data:' + mime + ';base64,' + fs.readFileSync(path.join(__dirname, p)).toString('base64');

const ASSETS = {
  __P1__: ['assets/web/p1.jpg', 'image/jpeg'],
  __P2__: ['assets/web/p2.jpg', 'image/jpeg'],
  __P3__: ['assets/web/p3.jpg', 'image/jpeg'],
  __P4__: ['assets/web/p4.jpg', 'image/jpeg'],
  __P5__: ['assets/web/p5.jpg', 'image/jpeg'],
  __V1P__: ['assets/web/v1poster.jpg', 'image/jpeg'],
  __V2P__: ['assets/web/v2poster.jpg', 'image/jpeg'],
  __V1__: ['assets/web/v1.mp4', 'video/mp4'],
  __V2__: ['assets/web/v2.mp4', 'video/mp4'],
  __BIRTHDAY__: ['assets/web/birthday.m4a', 'audio/mp4'],
  __KAYA__: ['assets/web/kaya.m4a', 'audio/mp4'],
};

// the QR matrix is produced here, by a real encoder, and inlined as a bitmap
const ARTIFACT_URL = 'https://claude.ai/code/artifact/0f3eabaf-8cbf-4dcf-8995-7fc872857a0b';
const qrc = require('qrcode').create(ARTIFACT_URL, { errorCorrectionLevel: 'M' });
const QRDATA = JSON.stringify({
  size: qrc.modules.size,
  bits: Array.from(qrc.modules.data).map((v) => (v ? '1' : '0')).join(''),
  url: ARTIFACT_URL,
});

let body = R('src/body.html');
let js = R('src/app.js');
const css = R('src/style.css');

js = js.split('__QRDATA__').join(QRDATA);

for (const [token, [file, mime]] of Object.entries(ASSETS)) {
  const d = uri(file, mime);
  body = body.split(token).join(d);
  js = js.split(token).join(d);
}

const FONTS =
  'https://fonts.googleapis.com/css2?' +
  'family=EB+Garamond:ital,wght@0,400;0,500;1,400;1,500' +
  '&family=Marcellus&family=Pinyon+Script&family=Jost:wght@300;400' +
  '&family=Amiri:wght@400;700&family=Caveat:wght@400;600&display=swap';

const out =
  // MUST be first and within the first 1024 bytes: without it a browser opening
  // this as a plain file guesses windows-1252 and mangles لانا, the dashes and
  // every curly quote. The artifact host supplies its own <head>, which is why
  // this only ever showed up on the standalone file.
  '<meta charset="utf-8" />\n' +
  '<title>Lana, 28 August</title>\n' +
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />\n' +
  '<meta name="theme-color" content="#FAF5EC" />\n' +
  '<link rel="preconnect" href="https://fonts.googleapis.com" />\n' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />\n' +
  '<link rel="stylesheet" href="' + FONTS + '" />\n' +
  // the artifact host wraps this file in its own <head>/<body>; make sure the
  // viewport tag ends up in <head> wherever the wrapper places it
  '<script>(function(){try{var m=document.querySelector(\'meta[name="viewport"]\');' +
  'if(!m){m=document.createElement("meta");m.setAttribute("name","viewport");}' +
  'm.setAttribute("content","width=device-width, initial-scale=1, viewport-fit=cover");' +
  'if(m.parentNode!==document.head)document.head.appendChild(m);}catch(e){}})();<\/script>\n' +
  '<style>\n' + css + '\n</style>\n' +
  body + '\n' +
  '<script>\n' + js + '\n</script>\n';

const dest = path.join(__dirname, 'lana-28-august.html');
fs.writeFileSync(dest, out);

const mb = (Buffer.byteLength(out) / 1048576).toFixed(2);
console.log('built  ->  ' + dest);
console.log('size   ->  ' + mb + ' MB   (artifact ceiling is 16 MB)');
if (Buffer.byteLength(out) > 15.2 * 1048576) {
  console.error('!! too close to the ceiling — re-compress assets');
  process.exit(1);
}
