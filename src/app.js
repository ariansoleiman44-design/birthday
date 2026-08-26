/* ============================================================
   FOR LANA — 28.08   ·   built by Arian

   PERFORMANCE RULES kept in this file:
     · ONE ambient canvas (#fall), 30fps, stopped when off-screen
       or when the tab is hidden
     · the cake canvas only animates while it is on screen
     · confetti only exists during the celebration, then frees itself
     · no blur filters, no backdrop-filter, no per-photo canvases
     · devicePixelRatio capped so a 3x phone does not render 9x pixels
   ============================================================ */
(function () {
  'use strict';

  var RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DPR = Math.min(window.devicePixelRatio || 1, 1.75);
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var rand = function (a, b) { return a + Math.random() * (b - a); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var buzz = function (p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} };

  function fit(c, dpr) {
    var d = dpr || DPR;
    var w = c.clientWidth || window.innerWidth;
    var h = c.clientHeight || window.innerHeight;
    c.width = Math.round(w * d); c.height = Math.round(h * d);
    var x = c.getContext('2d');
    x.setTransform(d, 0, 0, d, 0, 0);
    return { w: w, h: h, x: x };
  }

  /* ============================================================
     PAPER GRAIN — drawn once, never animated
     ============================================================ */

  (function grain() {
    var n = 120, c = document.createElement('canvas');
    c.width = n; c.height = n;
    var x = c.getContext('2d'), img = x.createImageData(n, n), d = img.data;
    for (var i = 0; i < d.length; i += 4) {
      var v = 120 + ((Math.random() * 135) | 0);
      d[i] = v; d[i + 1] = v - 4; d[i + 2] = v - 14; d[i + 3] = 15;
    }
    x.putImageData(img, 0, 0);
    $('#grain').style.backgroundImage = 'url(' + c.toDataURL('image/png') + ')';
  })();

  /* ============================================================
     THE FALL — gold dust and rose petals. The only ambient loop.
     ============================================================ */

  var fall = (function () {
    var cv = $('#fall'), S, ps = [], raf = 0, running = false, last = 0;
    var STEP = 1000 / 30;

    function build() {
      S = fit(cv, Math.min(DPR, 1.5));
      var n = Math.round(clamp(S.w * S.h / 26000, 14, 34));
      ps = [];
      for (var i = 0; i < n; i++) ps.push(mk(true));
    }
    function mk(init) {
      var petal = Math.random() < 0.34;
      return {
        petal: petal,
        x: Math.random() * S.w,
        y: init ? Math.random() * S.h : -20,
        r: petal ? rand(5, 11) : rand(1, 2.4),
        v: petal ? rand(0.35, 0.9) : rand(0.22, 0.6),
        sway: rand(0.5, 1.7), seed: rand(0, 6.28),
        rot: rand(0, 6.28), vr: rand(-0.02, 0.02),
        a: petal ? rand(0.5, 0.9) : rand(0.35, 0.85)
      };
    }

    function frame(t) {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      if (t - last < STEP) return;
      last = t;
      var x = S.x;
      x.clearRect(0, 0, S.w, S.h);
      for (var i = 0; i < ps.length; i++) {
        var p = ps[i];
        p.y += p.v;
        p.x += Math.sin(t * 0.0004 * p.sway + p.seed) * 0.5;
        p.rot += p.vr;
        if (p.y - 20 > S.h) { ps[i] = mk(false); continue; }
        x.globalAlpha = p.a;
        if (p.petal) {
          x.save();
          x.translate(p.x, p.y); x.rotate(p.rot);
          x.fillStyle = i % 3 === 0 ? '#D4737C' : '#C0121F';
          x.beginPath();
          x.ellipse(0, 0, p.r * 0.52, p.r, 0, 0, 6.2832);
          x.fill();
          x.restore();
        } else {
          x.fillStyle = i % 2 ? '#C9A227' : '#E6C766';
          x.beginPath(); x.arc(p.x, p.y, p.r, 0, 6.2832); x.fill();
        }
      }
      x.globalAlpha = 1;
    }

    function start() {
      if (running || RM) return;
      running = true; last = 0; raf = requestAnimationFrame(frame);
    }
    function stop() { running = false; cancelAnimationFrame(raf); }

    return {
      start: function () {
        if (RM) return;
        build(); start();
        document.addEventListener('visibilitychange', function () {
          if (document.hidden) stop(); else start();
        });
        var to; window.addEventListener('resize', function () {
          clearTimeout(to); to = setTimeout(function () { build(); }, 250);
        });
      }
    };
  })();

  /* ============================================================
     SOUND — short synthesised one-shots only. No looping ambience,
     so nothing runs while she is just reading.
     ============================================================ */

  var sfx = (function () {
    var ac = null, master = null, ok = false;

    function ctx() {
      if (ac) { if (ac.state === 'suspended') { try { ac.resume(); } catch (e) {} } return ac; }
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try {
        ac = new AC();
        master = ac.createGain(); master.gain.value = 0.75; master.connect(ac.destination);
        ok = true;
      } catch (e) { ac = null; }
      return ac;
    }
    function noise(sec) {
      var n = Math.floor(ac.sampleRate * sec), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      return b;
    }
    function bell(f, amp, dur) {
      if (!ctx()) return;
      var t = ac.currentTime, parts = [1, 2.01, 3.03, 4.2];
      for (var k = 0; k < parts.length; k++) {
        var o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f * parts[k];
        var g = ac.createGain(), a = amp / (k * 2 + 1);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(a, t + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur * (1 - k * 0.14));
        o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.15);
      }
    }
    var SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];

    return {
      wake: function () { ctx(); },
      chime: function (i) { bell(SCALE[i % 8], 0.16, 1.7); },
      soft: function (i) { bell(SCALE[i % 8] / 2, 0.035, 2.6); },
      arp: function () {
        [0, 2, 4, 7].forEach(function (n, k) {
          setTimeout(function () { bell(SCALE[n], 0.13, 2.4); }, k * 120);
        });
      },
      crack: function () {
        if (!ctx()) return;
        var t = ac.currentTime;
        var s = ac.createBufferSource(); s.buffer = noise(0.3);
        var bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.4;
        bp.frequency.setValueAtTime(2600, t);
        bp.frequency.exponentialRampToValueAtTime(420, t + 0.22);
        var g = ac.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.28, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
        s.connect(bp); bp.connect(g); g.connect(master); s.start(t); s.stop(t + 0.35);
      },
      whoosh: function () {
        if (!ctx()) return;
        var t = ac.currentTime;
        var s = ac.createBufferSource(); s.buffer = noise(1.1);
        var bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.8;
        bp.frequency.setValueAtTime(320, t);
        bp.frequency.exponentialRampToValueAtTime(2500, t + 0.15);
        bp.frequency.exponentialRampToValueAtTime(260, t + 0.7);
        var g = ac.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.30, t + 0.07);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
        s.connect(bp); bp.connect(g); g.connect(master); s.start(t); s.stop(t + 1);
      },
      heart: function (beats) {
        if (!ctx()) return;
        for (var b = 0; b < (beats || 3); b++) {
          for (var i = 0; i < 2; i++) {
            var t = ac.currentTime + b * 0.9 + i * 0.32;
            var o = ac.createOscillator(); o.type = 'sine';
            o.frequency.setValueAtTime(74, t);
            o.frequency.exponentialRampToValueAtTime(36, t + 0.16);
            var g = ac.createGain();
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(i ? 0.17 : 0.26, t + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
            o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.4);
          }
        }
      },
      duck: function (yes) {
        if (!ok) return;
        try { master.gain.value = yes ? 0.12 : 0.75; } catch (e) {}
      }
    };
  })();

  /* ============================================================
     MUSIC
     ============================================================ */

  var music = (function () {
    var a = { birthday: $('#a-birthday'), kaya: $('#a-kaya') };
    var names = { birthday: 'birthday song', kaya: 'ahmet kaya' };
    var cur = null, on = false, ducked = false, armed = false, timers = {};
    var el = $('#player'), label = $('#player-label');
    var ac = null, gains = {}, tried = false;

    /* iOS ignores HTMLMediaElement.volume, so gain nodes do the fading */
    function graph() {
      if (ac || tried) return;
      tried = true;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        ac = new AC();
        ['birthday', 'kaya'].forEach(function (k) {
          var src = ac.createMediaElementSource(a[k]);
          var g = ac.createGain(); g.gain.value = 0;
          src.connect(g); g.connect(ac.destination);
          gains[k] = g;
        });
      } catch (e) { ac = null; }
    }
    function set(key, to, ms) {
      clearTimeout(timers['p' + key]);
      if (ac && gains[key]) {
        var g = gains[key].gain, now = ac.currentTime;
        try {
          g.cancelScheduledValues(now);
          g.setValueAtTime(g.value, now);
          g.linearRampToValueAtTime(to, now + ms / 1000);
        } catch (e) { g.value = to; }
      } else {
        clearInterval(timers[key]);
        var node = a[key], from = node.volume, t0 = performance.now();
        timers[key] = setInterval(function () {
          var k = clamp((performance.now() - t0) / ms, 0, 1);
          try { node.volume = clamp(from + (to - from) * k, 0, 1); } catch (e) {}
          if (k >= 1) clearInterval(timers[key]);
        }, 50);
      }
      if (to > 0) {
        if (a[key].paused) { var p = a[key].play(); if (p && p.catch) p.catch(function () {}); }
      } else {
        timers['p' + key] = setTimeout(function () { try { a[key].pause(); } catch (e) {} }, ms + 120);
      }
    }
    function play(key) {
      cur = key;
      if (!on) return;
      graph();
      if (ac && ac.state === 'suspended') { try { ac.resume(); } catch (e) {} }
      Object.keys(a).forEach(function (k) {
        set(k, k === key ? (ducked ? 0.05 : 0.5) : 0, k === key ? 1600 : 1200);
      });
      label.textContent = names[key];
      el.classList.add('playing');
    }
    return {
      // MUST be called synchronously inside a real tap/click. Creating or
      // resuming an AudioContext from a setTimeout is not a user gesture, so
      // the context stays suspended and — because createMediaElementSource
      // reroutes the element through the graph — the result is total silence
      // with no error anywhere.
      prime: function () {
        graph();
        if (ac && ac.state === 'suspended') { try { ac.resume(); } catch (e) {} }
        try { window.__ctxProbe = ac ? ac.state : 'no-context'; } catch (e) {}
      },
      ctxState: function () { return ac ? ac.state : 'no-context'; },
      arm: function (key) {
        if (armed) { play(key); return; }
        armed = true; on = true; el.classList.add('show'); graph(); play(key);
      },
      to: play,
      isOn: function () { return on; },
      duck: function (yes) { ducked = yes; if (cur && on) set(cur, yes ? 0.05 : 0.5, 450); },
      toggle: function () {
        on = !on;
        if (on) { el.classList.add('playing'); if (cur) set(cur, 0.5, 600); }
        else { el.classList.remove('playing'); if (cur) set(cur, 0, 450); }
      },
      bind: function () {
        el.addEventListener('click', function () { music.toggle(); buzz(6); });
        el.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); music.toggle(); }
        });
      }
    };
  })();

  /* ============================================================
     THE ENVELOPE — she breaks the seal herself
     ============================================================ */

  var envelope = (function () {
    var box = $('#envelope'), seal = $('#seal'), hint = $('#env-hint');
    var startY = 0, pulled = 0, dragging = false, done = false;

    function pt(e) { var t = (e.touches && e.touches[0]) || e; return t.clientY; }

    function down(e) {
      if (done) return;
      dragging = true; startY = pt(e); pulled = 0;
      seal.classList.add('tugging');
      sfx.wake();
      music.prime();          // inside the gesture, while it still counts
      hint.classList.add('dim');
      if (e.cancelable) e.preventDefault();
    }
    function move(e) {
      if (!dragging || done) return;
      if (e.cancelable) e.preventDefault();
      pulled = Math.max(0, pt(e) - startY);
      var k = clamp(pulled / 90, 0, 1);
      seal.style.transform = 'translate(-50%,-50%) translateY(' + (pulled * 0.45) + 'px) rotate(' + (k * -10) + 'deg)';
      if (pulled > 90) open();
    }
    function up() {
      if (done) return;
      dragging = false; seal.classList.remove('tugging');
      seal.style.transform = 'translate(-50%,-50%)';
    }

    function open() {
      if (done) return; done = true;
      dragging = false;
      music.prime();          // and again here, for the plain-click path
      seal.classList.add('broken');
      sfx.crack();
      buzz([14, 40, 20]);

      // 1 — the flap falls open
      setTimeout(function () { box.classList.add('open'); }, 240);
      // 2 — the card rides up out of the pocket
      setTimeout(function () {
        box.classList.add('lifted');
        sfx.arp();
        music.arm('birthday');
        buzz(10);
      }, 1150);
      // 3 — the envelope clears the stage completely...
      setTimeout(function () {
        box.animate([{ opacity: 1 }, { opacity: 0 }],
          { duration: 550, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'forwards' });
        document.body.classList.remove('is-locked');
      }, 2450);
      // ...and only then does the real card take it, so the two never ghost
      setTimeout(function () {
        $('#page').classList.add('open');
        $('#medallion').classList.add('show');
        contents.show();
        pages.show();
        mode.show();
        rain.show();
        reveal.scan();
      }, 2900);
      setTimeout(function () {
        box.classList.add('gone');
        if (!film.seen()) film.play(); else resume.offer();
      }, 3700);
      progress.mark('open');
    }

    return {
      start: function () {
        document.body.classList.add('is-locked');
        var o = { passive: false };
        seal.addEventListener('pointerdown', down, o);
        window.addEventListener('pointermove', move, o);
        window.addEventListener('pointerup', up);
        seal.addEventListener('touchstart', down, o);
        window.addEventListener('touchmove', move, o);
        window.addEventListener('touchend', up);
        seal.addEventListener('click', function () { if (!done && pulled < 10) open(); });
        seal.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
        });
      },
      open: open
    };
  })();

  /* ============================================================
     REVEAL
     ============================================================ */

  var reveal = (function () {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    return {
      scan: function () {
        $$('.rise').forEach(function (n) { if (!n.classList.contains('in')) io.observe(n); });
      }
    };
  })();

  /* ============================================================
     COUNTDOWN
     ============================================================ */

  (function countdown() {
    var sec = $('#countdown'), fired = false;
    function target() {
      var now = new Date(), y = now.getFullYear();
      var t = new Date(y, 7, 28, 0, 0, 0, 0);
      if (now >= new Date(y, 7, 29)) t = new Date(y + 1, 7, 28, 0, 0, 0, 0);
      return t;
    }
    function pad(n) { return n < 10 ? '0' + n : '' + n; }
    function tick() {
      var now = new Date(), t = target();
      var nextYear = t.getFullYear() > now.getFullYear();
      var lab = $('#cd-label');
      if (lab) lab.textContent = nextYear ? 'Until the next one' : 'Until the day';
      var ms = t - now;
      if (ms <= 0) {
        if (!sec.classList.contains('is-today')) {
          sec.classList.add('is-today');
          if (fired) { confetti.fire(2600); sfx.arp(); buzz([20, 60, 20, 60, 40]); }
        }
        return;
      }
      fired = true;
      sec.classList.remove('is-today');
      var s = Math.floor(ms / 1000);
      $('#cd-d').textContent = pad(Math.floor(s / 86400));
      $('#cd-h').textContent = pad(Math.floor(s / 3600) % 24);
      $('#cd-m').textContent = pad(Math.floor(s / 60) % 60);
      $('#cd-s').textContent = pad(s % 60);
    }
    tick(); setInterval(tick, 1000);
  })();

  /* ============================================================
     THE ROSE — six petals, six reasons
     ============================================================ */

  var rose = (function () {
    var stage = $('#rose-stage'), say = $('#rose-say');
    var REASONS = [
      'You say &ldquo;blah&rdquo; and my whole day resets.',
      'You fall asleep mid&ndash;sentence. Softest thing I know.',
      'You forget everything except what actually matters.',
      'Rain makes you happy. That tells me exactly who you are.',
      'You are kind in the quiet way that nobody claps for.',
      'None of this was planned. It happened like it was arranged.'
    ];
    var found = 0;

    function build() {
      var core = document.createElement('div');
      core.className = 'rose-core';
      core.textContent = '0/6';
      for (var j = 0; j < 6; j++) {
        var inner = document.createElement('span');
        inner.className = 'petal-in';
        inner.style.transform = 'rotate(' + (j * 60 + 30) + 'deg)';
        stage.appendChild(inner);
      }
      for (var i = 0; i < 6; i++) {
        (function (i) {
          var b = document.createElement('button');
          b.type = 'button'; b.className = 'petal';
          b.setAttribute('aria-label', 'reason ' + (i + 1));
          b.style.transform = 'rotate(' + (i * 60) + 'deg)';
          b.innerHTML = '<span></span>';
          b.addEventListener('click', function () {
            say.innerHTML = REASONS[i];
            say.classList.add('show');
            buzz(7); sfx.chime(i);
            if (!b.classList.contains('done')) {
              b.classList.add('done'); found++;
              b.style.transform = 'rotate(' + (i * 60) + 'deg) translateY(-7%)';
              core.textContent = found + '/6';
              if (found === 6) {
                core.textContent = '♥';
                setTimeout(function () {
                  say.innerHTML = 'That is all six. There is one more, and it is not on this flower.';
                  sfx.heart(3);
                  $('#secret-hint').classList.add('show');
                  $('#medallion').classList.add('ready');
                  progress.mark('rose');
                }, 1400);
              }
            }
          });
          stage.appendChild(b);
        })(i);
      }
      stage.appendChild(core);
    }
    return { start: build };
  })();

  /* ============================================================
     HER — photographs
     ============================================================ */

  (function gallery() {
    // a whole day of her, in order: morning, daylight, night, out cold
    var shots = [
      ['__P5__', 'i', 'Morning. The blue one is doing my job and I have notes.'],
      ['__P3__', 'ii', 'Daylight, and you still looked like the moon.'],
      ['__P2__', 'iii', 'This is the one I open when it is late.'],
      ['__P1__', 'iv', 'And out. Obviously.']
    ];
    var host = $('#gal');
    shots.forEach(function (s, i) {
      var w = document.createElement('div');
      w.className = 'plate rise' + (i ? ' d' + Math.min(i, 3) : '');
      w.innerHTML =
        '<div class="frame">' + corners() +
          '<img src="' + s[0] + '" alt="Lana" loading="lazy" decoding="async" />' +
        '</div>' +
        '<div class="cap"><span class="n">' + s[1] + '</span><span class="t">' + s[2] + '</span></div>';
      host.appendChild(w);
    });
  })();

  function corners() {
    var p = '<svg class="corner CLS" viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M1 10 C1 4 4 1 10 1" fill="none" stroke="currentColor" stroke-width="1.1"/>' +
      '<path d="M1 16 C1 7 7 1 16 1" fill="none" stroke="currentColor" stroke-width="0.6"/>' +
      '<circle cx="4.2" cy="4.2" r="1.1" fill="currentColor"/></svg>';
    return ['tl', 'tr', 'bl', 'br'].map(function (c) { return p.replace('CLS', c); }).join('');
  }

  /* ============================================================
     MOVING — the clips
     ============================================================ */

  (function reel() {
    var clips = [
      ['__V1__', '__V1P__', 'i', 'Six seconds I have watched more than I will admit.'],
      ['__V2__', '__V2P__', 'ii', 'And six at night, under the sky you like.']
    ];
    var host = $('#reel');
    clips.forEach(function (c, i) {
      var w = document.createElement('div');
      w.className = 'plate rise' + (i ? ' d2' : '');
      w.innerHTML =
        '<div class="frame">' + corners() +
          '<video playsinline muted loop preload="metadata" poster="' + c[1] + '" src="' + c[0] + '"></video>' +
          '<button class="sound" type="button">sound</button>' +
        '</div>' +
        '<div class="cap"><span class="n">' + c[2] + '</span><span class="t">' + c[3] + '</span></div>';
      host.appendChild(w);

      var v = $('video', w), btn = $('.sound', w);
      v.addEventListener('error', function () {
        var img = document.createElement('img');
        img.src = c[1]; img.alt = 'Lana';
        v.replaceWith(img); btn.remove();
      });
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
          else { v.pause(); if (!v.muted) flip(false); }
        });
      }, { threshold: 0.3 }).observe(v);

      function flip(on) {
        v.muted = !on;
        btn.classList.toggle('on', on);
        btn.textContent = on ? 'sound on' : 'sound';
        music.duck(on); sfx.duck(on); rain.duck(on);
        if (on) progress.mark('video');
        if (on) {
          $$('video').forEach(function (o) { if (o !== v) o.muted = true; });
          $$('.sound').forEach(function (o) { if (o !== btn) { o.classList.remove('on'); o.textContent = 'sound'; } });
        }
      }
      btn.addEventListener('click', function () { flip(v.muted); buzz(7); });
      v.addEventListener('click', function () { flip(v.muted); });
    });
  })();

  /* ============================================================
     THE MOON — her real phase, engraved on the medal
     ============================================================ */

  (function moonPhase() {
    var cv = $('#phase-canvas');
    var SYN = 29.530588853, EPOCH = Date.UTC(2000, 0, 6, 18, 14, 0);

    function age(d) { var a = (d.getTime() - EPOCH) / 86400000 % SYN; return a < 0 ? a + SYN : a; }
    function name(f) {
      var lit = (1 - Math.cos(f * Math.PI * 2)) / 2, wax = f < 0.5;
      if (lit < 0.02) return 'New Moon';
      if (lit > 0.97) return 'Full Moon';
      if (Math.abs(lit - 0.5) < 0.03) return wax ? 'First Quarter' : 'Last Quarter';
      if (wax) return lit < 0.5 ? 'Waxing Crescent' : 'Waxing Gibbous';
      return lit > 0.5 ? 'Waning Gibbous' : 'Waning Crescent';
    }

    function draw() {
      var size = Math.max(90, Math.min(cv.clientWidth || 180, 400));
      var d = fit(cv);
      var x = d.x, R = d.w * 0.46, cx = d.w / 2, cy = d.h / 2;
      x.clearRect(0, 0, d.w, d.h);

      var a = age(new Date()), f = a / SYN, ang = f * Math.PI * 2;
      var lit = (1 - Math.cos(ang)) / 2, wax = f < 0.5;

      // engraved dark disc, then the lit part struck in gold
      x.fillStyle = 'rgba(110,82,14,0.16)';
      x.beginPath(); x.arc(cx, cy, R, 0, 6.2832); x.fill();

      var sh = document.createElement('canvas');
      sh.width = cv.width; sh.height = cv.height;
      var y = sh.getContext('2d'); y.setTransform(DPR, 0, 0, DPR, 0, 0);
      var g = y.createRadialGradient(cx - R * 0.3, cy - R * 0.32, R * 0.08, cx, cy, R);
      g.addColorStop(0, '#F6E7B4'); g.addColorStop(0.5, '#D9B44E');
      g.addColorStop(0.85, '#A8801C'); g.addColorStop(1, '#6E520E');
      y.fillStyle = g;
      y.beginPath(); y.arc(cx, cy, R, 0, 6.2832); y.fill();

      y.globalCompositeOperation = 'destination-out';
      if (wax) y.fillRect(0, 0, cx, d.h); else y.fillRect(cx, 0, cx, d.h);
      y.globalCompositeOperation = Math.cos(ang) > 0 ? 'destination-out' : 'source-over';
      if (Math.cos(ang) <= 0) {
        y.fillStyle = g;
      }
      y.beginPath();
      y.ellipse(cx, cy, Math.abs(R * Math.cos(ang)), R, 0, 0, 6.2832);
      y.fill();

      x.drawImage(sh, 0, 0, d.w, d.h);

      x.strokeStyle = 'rgba(110,82,14,0.4)'; x.lineWidth = 1;
      x.beginPath(); x.arc(cx, cy, R, 0, 6.2832); x.stroke();

      $('#phase-name').textContent = name(f);
      $('#phase-lit').textContent = Math.round(lit * 100) + '% lit';

      var now = new Date(), yr = now.getFullYear();
      var bd = new Date(yr, 7, 28, 21, 0, 0);
      if (now > new Date(yr, 7, 29)) bd = new Date(yr + 1, 7, 28, 21, 0, 0);
      var bf = age(bd) / SYN, bLit = Math.round((1 - Math.cos(bf * Math.PI * 2)) / 2 * 100);
      var same = Math.abs(bd - now) < 86400000 * 0.6;
      $('#phase-day').innerHTML = bLit >= 96
        ? (same ? 'And tonight it is <b>full</b>. The sky turned up for you.'
                : 'On the 28th it will be <b>full</b> &mdash; the biggest it gets. The sky booked your birthday off.')
        : (same ? 'And tonight it is doing it for you.'
                : 'On the 28th it will be a <b>' + name(bf) + '</b>, ' + bLit + '% lit.');
    }

    draw();
    var t; window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(draw, 300); });
    new IntersectionObserver(function (es) { if (es[0].isIntersecting) draw(); }, { threshold: 0.2 }).observe(cv);
  })();

  /* ============================================================
     THE LETTER — short on purpose
     ============================================================ */

  (function letter() {
    var TEXT =
      'Lana,\n\n' +
      'We never gave this a name. Maybe we were scared of it. Maybe we were waiting.\n\n' +
      'But I know what it is when your name lights up my screen, and I know what it is ' +
      'when you go quiet and I check three times that you are okay.\n\n' +
      'You forget everything. So I built you something that does not.\n\n' +
      'You do not have to answer today. I only refused to let another 28th of August ' +
      'go past with you not knowing.\n\n' +
      'Happy birthday. Look at the moon before you sleep.';

    var body = $('#letter-body'), sign = $('#sign'), sec = $('#letter');
    var i = 0, running = false, doneAll = false, speed = 1;

    function finish() {
      doneAll = true; body.textContent = TEXT; sign.classList.add('in');
      progress.mark('letter');
    }
    function step() {
      if (doneAll) return;
      if (i >= TEXT.length) { finish(); return; }
      var ch = TEXT[i++];
      body.textContent = TEXT.slice(0, i);
      var cur = document.createElement('span');
      cur.className = 'cur'; cur.textContent = '.';
      body.appendChild(cur);
      var d = ch === '\n' ? 26 : (ch === '.' || ch === ',') ? 80 : rand(6, 14);
      setTimeout(step, d / speed);
    }
    sec.addEventListener('click', function () { if (running && !doneAll) speed = 8; });

    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) {
          if (!running) { running = true; RM ? finish() : step(); }
          music.to('kaya');
        } else if (music.isOn()) music.to('birthday');
      });
    }, { threshold: 0.25 }).observe(sec);
  })();

  /* ============================================================
     THE CAKE
     ============================================================ */

  var cake = (function () {
    var cv = $('#cake-canvas'), C, W, H, t0 = 0;
    var candles = [], lit = true, smoke = [], raf = 0, alive = false, rose = 0;

    function size() {
      var d = fit(cv); W = d.w; H = d.h; C = d.x;
      candles = [];
      var n = 5, tierH = H * 0.115, top = H * 0.80 - 3 * tierH + 2;
      var cw = W * 0.032, gap = W * 0.084;
      for (var i = 0; i < n; i++) {
        candles.push({ x: W / 2 + (i - (n - 1) / 2) * gap, y: top, w: cw, h: H * 0.135, f: 1, seed: rand(0, 100) });
      }
    }
    function rr(x, y, w, h, r) {
      C.beginPath();
      C.moveTo(x + r, y); C.lineTo(x + w - r, y); C.quadraticCurveTo(x + w, y, x + w, y + r);
      C.lineTo(x + w, y + h - r); C.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      C.lineTo(x + r, y + h); C.quadraticCurveTo(x, y + h, x, y + h - r);
      C.lineTo(x, y + r); C.quadraticCurveTo(x, y, x + r, y); C.closePath();
    }

    function draw(now) {
      var t = (now - t0) / 1000;
      C.clearRect(0, 0, W, H);
      var cakeW = W * 0.60, tierH = H * 0.115, baseY = H * 0.80;

      if (lit) {
        var g0 = C.createRadialGradient(W / 2, H * 0.40, 0, W / 2, H * 0.40, W * 0.55);
        g0.addColorStop(0, 'rgba(255,190,90,0.20)');
        g0.addColorStop(1, 'rgba(255,190,90,0)');
        C.fillStyle = g0; C.fillRect(0, 0, W, H);
      }

      // gold stand
      C.fillStyle = 'rgba(201,162,39,0.30)';
      C.beginPath(); C.ellipse(W / 2, baseY + tierH * 0.17, cakeW * 0.66, tierH * 0.19, 0, 0, 6.2832); C.fill();
      C.strokeStyle = '#A8801C'; C.lineWidth = 1;
      C.beginPath(); C.ellipse(W / 2, baseY + tierH * 0.17, cakeW * 0.66, tierH * 0.19, 0, 0, 6.2832); C.stroke();

      for (var i = 0; i < 3; i++) {
        var f = 1 - i * 0.20, w = cakeW * f, x = (W - w) / 2, y = baseY - (i + 1) * tierH;
        var gr = C.createLinearGradient(x, y, x + w, y + tierH);
        gr.addColorStop(0, '#FFFDF8'); gr.addColorStop(0.55, '#F6EEDD'); gr.addColorStop(1, '#EADCC0');
        C.fillStyle = gr; rr(x, y, w, tierH, Math.min(5, tierH * 0.14)); C.fill();
        C.strokeStyle = 'rgba(168,128,28,0.42)'; C.lineWidth = 1; C.stroke();
        // gold icing running over the edge
        C.fillStyle = 'rgba(201,162,39,0.9)';
        C.fillRect(x, y, w, Math.max(2, tierH * 0.07));
        for (var k = 0; k < 7; k++) {
          var dx = x + w * (0.09 + 0.135 * k), dh = tierH * (0.2 + ((k * 37) % 5) / 11);
          C.beginPath();
          C.moveTo(dx - w * 0.026, y + tierH * 0.06);
          C.lineTo(dx + w * 0.026, y + tierH * 0.06);
          C.lineTo(dx, y + tierH * 0.06 + dh);
          C.closePath(); C.fill();
        }
        C.fillStyle = 'rgba(168,18,31,0.9)';
        C.fillRect(x, y + tierH * 0.62, w, Math.max(1.5, tierH * 0.05));
      }

      for (var c = 0; c < candles.length; c++) {
        var ca = candles[c];
        C.fillStyle = '#FFFDF8';
        rr(ca.x - ca.w / 2, ca.y - ca.h, ca.w, ca.h, ca.w * 0.3); C.fill();
        C.strokeStyle = 'rgba(168,128,28,0.5)'; C.lineWidth = 1; C.stroke();
        C.fillStyle = 'rgba(168,18,31,0.85)';
        C.fillRect(ca.x - ca.w / 2, ca.y - ca.h * 0.72, ca.w, ca.h * 0.09);
        C.strokeStyle = '#5B4E3E'; C.lineWidth = Math.max(1, ca.w * 0.13);
        C.beginPath(); C.moveTo(ca.x, ca.y - ca.h); C.lineTo(ca.x, ca.y - ca.h - ca.w * 0.4); C.stroke();

        if (ca.f > 0.01) {
          var fl = ca.f * (0.88 + 0.12 * Math.sin(t * 7 + ca.seed));
          var fy = ca.y - ca.h - ca.w * 0.4, fh = ca.h * 0.42 * fl, fw = ca.w * 0.6 * fl;
          var sway = Math.sin(t * 2.5 + ca.seed) * ca.w * 0.14 * fl;
          var fg = C.createRadialGradient(ca.x + sway * 0.4, fy - fh * 0.45, 0, ca.x + sway * 0.4, fy - fh * 0.45, fh);
          fg.addColorStop(0, 'rgba(255,250,220,' + ca.f + ')');
          fg.addColorStop(0.4, 'rgba(255,190,90,' + (0.95 * ca.f) + ')');
          fg.addColorStop(1, 'rgba(221,122,38,0)');
          C.fillStyle = fg;
          C.beginPath();
          C.moveTo(ca.x, fy);
          C.bezierCurveTo(ca.x - fw, fy - fh * 0.35, ca.x - fw * 0.55 + sway, fy - fh, ca.x + sway, fy - fh * 1.25);
          C.bezierCurveTo(ca.x + fw * 0.55 + sway, fy - fh, ca.x + fw, fy - fh * 0.35, ca.x, fy);
          C.closePath(); C.fill();
        }
      }

      if (!lit) {
        rose = Math.min(1, rose + 0.012);
        var R = Math.min(W, H) * 0.05 * rose;
        var rx = W / 2 - cakeW * 0.47, ry = baseY + tierH * 0.04, k;
        C.save(); C.translate(rx, ry); C.scale(R, R); C.globalAlpha = rose; C.lineCap = 'round';
        C.strokeStyle = 'rgba(90,74,40,0.85)'; C.lineWidth = 0.16;
        C.beginPath(); C.moveTo(-0.2, 0.4); C.quadraticCurveTo(-1.5, 1.1, -2.6, 0.7); C.stroke();
        C.fillStyle = 'rgba(96,104,58,0.85)';
        C.beginPath(); C.ellipse(-1.6, 0.66, 0.5, 0.21, 0.3, 0, 6.2832); C.fill();
        for (k = 0; k < 5; k++) {
          C.save(); C.rotate(k * 1.2566 + 0.35);
          C.fillStyle = k % 2 ? '#C0121F' : '#D62430';
          C.beginPath(); C.ellipse(0, -0.6, 0.42, 0.62, 0, 0, 6.2832); C.fill(); C.restore();
        }
        for (k = 0; k < 5; k++) {
          C.save(); C.rotate(k * 1.2566 + 0.98);
          C.fillStyle = '#9E0F1A';
          C.beginPath(); C.ellipse(0, -0.33, 0.26, 0.38, 0, 0, 6.2832); C.fill(); C.restore();
        }
        C.fillStyle = '#76070F'; C.beginPath(); C.arc(0, 0, 0.2, 0, 6.2832); C.fill();
        C.restore(); C.globalAlpha = 1;
      }

      for (var s = smoke.length - 1; s >= 0; s--) {
        var p = smoke[s];
        p.y -= p.v; p.x += Math.sin(p.y * 0.05 + p.seed) * 0.3; p.a -= 0.004; p.r += 0.2;
        if (p.a <= 0) { smoke.splice(s, 1); continue; }
        C.fillStyle = 'rgba(140,126,106,' + p.a.toFixed(3) + ')';
        C.beginPath(); C.arc(p.x, p.y, p.r, 0, 6.2832); C.fill();
      }

      raf = requestAnimationFrame(draw);
    }

    function blowOut() {
      if (!lit) return; lit = false;
      buzz([10, 30, 10, 30, 10]); sfx.whoosh();
      candles.forEach(function (c, i) {
        setTimeout(function () {
          var t = 0, iv = setInterval(function () {
            t += 0.08; c.f = Math.max(0, 1 - t * 2.6);
            if (c.f <= 0) {
              clearInterval(iv);
              for (var k = 0; k < 7; k++) {
                smoke.push({ x: c.x + rand(-2, 2), y: c.y - c.h - 6, v: rand(0.5, 1.2),
                  r: rand(1.4, 3.2), a: rand(0.10, 0.20), seed: rand(0, 10) });
              }
            }
          }, 30);
        }, i * 90);
      });
      setTimeout(function () {
        $('#blow-ui').style.display = 'none';
        $('#wish').classList.add('in');
        progress.mark('cake');
        sfx.chime(7); setTimeout(function () { sfx.arp(); }, 250);
        confetti.fire(1900);
      }, 900);
    }

    function startMic() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { fb('Your browser will not let me listen. Tap instead.'); return; }
      navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
        .then(function (stream) {
          var AC = window.AudioContext || window.webkitAudioContext, ac = new AC();
          var an = ac.createAnalyser(); an.fftSize = 1024;
          ac.createMediaStreamSource(stream).connect(an);
          var buf = new Uint8Array(an.fftSize), hot = 0;
          $('#mic-meter').classList.add('on');
          $('#blow-copy').textContent = 'Listening. Blow at the screen, properly.';
          (function poll() {
            if (!lit) { try { stream.getTracks().forEach(function (t) { t.stop(); }); ac.close(); } catch (e) {} return; }
            an.getByteTimeDomainData(buf);
            var sum = 0;
            for (var i = 0; i < buf.length; i++) { var v = (buf[i] - 128) / 128; sum += v * v; }
            var rms = Math.sqrt(sum / buf.length);
            $('#mic-fill').style.width = clamp(rms * 420, 0, 100) + '%';
            hot = rms > 0.115 ? hot + 1 : Math.max(0, hot - 1);
            if (hot > 7) blowOut();
            requestAnimationFrame(poll);
          })();
        })
        .catch(function () { fb('No microphone, no problem. Tap the button instead.'); });
    }
    function fb(msg) { $('#blow-copy').textContent = msg; $('#mic-btn').style.display = 'none'; }

    return {
      start: function () {
        size();
        new IntersectionObserver(function (es) {
          es.forEach(function (e) {
            if (e.isIntersecting && !alive) { alive = true; t0 = performance.now(); raf = requestAnimationFrame(draw); }
            else if (!e.isIntersecting && alive) { alive = false; cancelAnimationFrame(raf); }
          });
        }, { threshold: 0.15 }).observe(cv);
        var to; window.addEventListener('resize', function () { clearTimeout(to); to = setTimeout(size, 250); });
        $('#mic-btn').addEventListener('click', startMic);
        $('#tap-btn').addEventListener('click', blowOut);
        if (RM) fb('Tap to blow out the candles.');
      }
    };
  })();

  /* ============================================================
     CONFETTI — exists only during the celebration
     ============================================================ */

  var confetti = (function () {
    var cv = $('#confetti'), C, W, H, ps = [], raf = 0, running = false;
    var COL = ['#C9A227', '#E6C766', '#A8121F', '#DD7A26', '#FFFDF8', '#8C6A15'];

    function size() { var d = fit(cv, Math.min(DPR, 1.5)); W = d.w; H = d.h; C = d.x; }
    function add(n, petal) {
      for (var i = 0; i < n; i++) {
        ps.push({
          petal: petal, x: Math.random() * W, y: -rand(20, H * 0.7),
          w: rand(4, 8), h: rand(6, 12), r: rand(4, 9),
          vx: rand(-.8, .8), vy: rand(1.5, 3.6),
          rot: rand(0, 6.28), vr: rand(-.13, .13),
          col: COL[(Math.random() * COL.length) | 0], a: rand(.75, 1), sway: rand(.4, 1.4), seed: rand(0, 10)
        });
      }
    }
    function frame(t) {
      C.clearRect(0, 0, W, H);
      for (var i = ps.length - 1; i >= 0; i--) {
        var p = ps[i];
        p.x += p.vx + Math.sin(t * 0.001 * p.sway + p.seed) * 0.7;
        p.y += p.vy; p.rot += p.vr;
        if (p.y > H + 30) { ps.splice(i, 1); continue; }
        C.save(); C.translate(p.x, p.y); C.rotate(p.rot); C.globalAlpha = p.a; C.fillStyle = p.col;
        if (p.petal) { C.beginPath(); C.ellipse(0, 0, p.r * 0.5, p.r, 0, 0, 6.2832); C.fill(); }
        else C.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        C.restore();
      }
      if (ps.length) raf = requestAnimationFrame(frame);
      else { running = false; C.clearRect(0, 0, W, H); }
    }
    function run() { if (!running) { running = true; raf = requestAnimationFrame(frame); } }

    return {
      start: function () { size(); window.addEventListener('resize', size); },
      fire: function (ms) {
        if (RM) return;
        add(30, false); add(14, true); run();
        var t0 = performance.now();
        var iv = setInterval(function () {
          if (performance.now() - t0 > ms) { clearInterval(iv); return; }
          add(6, false); add(3, true); run();
        }, 300);
      },
      petals: function (n) { if (RM) return; add(n || 24, true); run(); }
    };
  })();


  /* ============================================================
     SCRATCH — a gold panel she rubs off with a finger.
     Only paints on pointer movement; there is no loop here.
     ============================================================ */

  var scratch = (function () {
    var wrap = $('.scratch-wrap'), cv = $('#scratch-canvas'), hint = $('#scratch-hint');
    var X, W, H, last = null, ready = false, done = false, sample, sctx;

    function paint() {
      var d = fit(cv); W = d.w; H = d.h; X = d.x;
      var g = X.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#E6C766'); g.addColorStop(0.3, '#C9A227');
      g.addColorStop(0.55, '#F0DFA6'); g.addColorStop(0.8, '#A8801C'); g.addColorStop(1, '#D9B44E');
      X.globalCompositeOperation = 'source-over';
      X.fillStyle = g; X.fillRect(0, 0, W, H);
      // engine-turned guilloche, drawn once
      X.strokeStyle = 'rgba(255,255,255,0.16)'; X.lineWidth = 1;
      for (var i = -H; i < W; i += 7) {
        X.beginPath(); X.moveTo(i, 0); X.lineTo(i + H, H); X.stroke();
      }
      X.fillStyle = 'rgba(110,82,14,0.55)';
      X.font = '600 ' + Math.round(clamp(W * 0.038, 10, 15)) + 'px Jost, system-ui, sans-serif';
      X.textAlign = 'center'; X.textBaseline = 'middle';
      var label = 'S C R A T C H   H E R E';
      X.fillText(label, W / 2, H / 2);
      sample = document.createElement('canvas'); sample.width = 40; sample.height = 40;
      sctx = sample.getContext('2d');
      ready = true;
    }

    function rub(x, y) {
      var r = Math.max(16, Math.min(W, H) * 0.13);
      X.globalCompositeOperation = 'destination-out';
      X.beginPath(); X.arc(x, y, r, 0, 6.2832); X.fill();
      if (last) {
        X.lineCap = 'round'; X.lineJoin = 'round';
        X.strokeStyle = 'rgba(0,0,0,1)'; X.lineWidth = r * 2;
        X.beginPath(); X.moveTo(last.x, last.y); X.lineTo(x, y); X.stroke();
      }
      last = { x: x, y: y };
      X.globalCompositeOperation = 'source-over';
    }
    function cleared() {
      sctx.clearRect(0, 0, 40, 40);
      sctx.drawImage(cv, 0, 0, 40, 40);
      var d = sctx.getImageData(0, 0, 40, 40).data, n = 0;
      for (var i = 3; i < d.length; i += 4) if (d[i] < 60) n++;
      return n / 1600;
    }
    function at(e) {
      var r = cv.getBoundingClientRect();
      var t = (e.touches && e.touches[0]) || e;
      return { x: t.clientX - r.left, y: t.clientY - r.top };
    }
    function move(e) {
      if (!ready || done) return;
      if (e.cancelable) e.preventDefault();
      var p = at(e); rub(p.x, p.y);
      if (hint) hint.style.opacity = '0';
      if (cleared() > 0.55) finish();
    }
    function finish() {
      if (done) return; done = true;
      cv.classList.add('gone');
      progress.mark('scratch');
      buzz([12, 40, 12]); sfx.chime(5);
      if (hint) hint.textContent = '';
    }

    return {
      start: function () {
        new IntersectionObserver(function (es) {
          if (es[0].isIntersecting && !ready) paint();
        }, { threshold: 0.25 }).observe(wrap);

        var o = { passive: false };
        cv.addEventListener('pointerdown', function (e) { last = null; sfx.wake(); move(e); }, o);
        cv.addEventListener('pointermove', function (e) {
          if (e.buttons || e.pointerType === 'touch') move(e);
        }, o);
        cv.addEventListener('pointerup', function () { last = null; });
        cv.addEventListener('touchstart', function (e) { last = null; move(e); }, o);
        cv.addEventListener('touchmove', move, o);
        cv.addEventListener('touchend', function () { last = null; });
        window.addEventListener('resize', function () { if (ready && !done) paint(); });
        if (RM) { setTimeout(finish, 400); }
      }
    };
  })();

  /* ============================================================
     THE COUPONS — five promises she can turn over
     ============================================================ */

  var coupons = (function () {
    var host = $('#tickets');
    var LIST = [
      ['One phone call at 3am', 'Any hour, any reason, no questions and no judgement. I pick up.'],
      ['One argument, already lost', 'You win it. I will not even put up a fight, and I will mean it.'],
      ['One entire day, your rules', 'Where we go, what we eat, when we sleep. I only drive.'],
      ['One rescue', 'Any place, any hour. You say the word and I am on my way.'],
      ['One trip to the shops', 'My card, your pace, and not one word of complaining out of me.'],
      ['One thing from the jewellery counter', 'You point at it. I pay for it. We do not discuss the price.'],
      ['One promise', 'Whatever you decide about us &mdash; I stay. That one never expires.']
    ];
    return {
      start: function () {
        LIST.forEach(function (c, i) {
          var b = document.createElement('button');
          b.type = 'button'; b.className = 'ticket';
          b.setAttribute('aria-label', c[0]);
          b.innerHTML =
            '<span class="ticket-in">' +
              '<span class="ticket-face">' +
                '<span class="ticket-n">no. ' + (i + 1) + '</span>' +
                '<span class="ticket-t">' + c[0] + '</span>' +
                '<span class="ticket-seal">L</span>' +
              '</span>' +
              '<span class="ticket-face back">' +
                '<span class="ticket-n">no. ' + (i + 1) + '</span>' +
                '<span class="ticket-b">' + c[1] + '</span>' +
                '<span class="ticket-stamp">honoured</span>' +
              '</span>' +
            '</span>';
          b.addEventListener('click', function () {
            b.classList.toggle('flipped');
            progress.mark('coupons');
            buzz(6); sfx.chime(i + 2);
          });
          host.appendChild(b);
        });
      }
    };
  })();

  /* ============================================================
     LIGHTBOX — her photographs, full screen
     ============================================================ */

  var lightbox = (function () {
    var box = $('#lightbox'), img = $('#lightbox-img');
    function open(src) {
      img.src = src;
      progress.mark('photos');
      box.classList.add('open'); box.setAttribute('aria-hidden', 'false');
      document.body.classList.add('is-locked');
      buzz(5);
    }
    function close() {
      box.classList.remove('open'); box.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('is-locked');
    }
    return {
      start: function () {
        $('#lightbox-close').addEventListener('click', close);
        box.addEventListener('click', function (e) { if (e.target !== img) close(); });
        document.addEventListener('keydown', function (e) {
          if (e.key === 'Escape' && box.classList.contains('open')) close();
        });
        $$('.plate img').forEach(function (n) {
          n.parentNode.addEventListener('click', function () { open(n.src); });
        });
      }
    };
  })();


  /* ============================================================
     FONTS — nothing is shown in a substitute face
     ============================================================ */

  (function fonts() {
    var mark = function () { document.documentElement.classList.add('fonts-ready'); };
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(mark);
      setTimeout(mark, 2500);          // never let a slow face hold the door shut
    } else mark();
  })();

  /* ============================================================
     GOLD LEAF — the sweep is only alive while it can be seen
     ============================================================ */

  (function leaf() {
    $$('.leaf').forEach(function (n) {
      new IntersectionObserver(function (es) {
        n.classList.toggle('live', es[0].isIntersecting);
      }, { threshold: 0.05 }).observe(n);
    });
  })();

  /* ============================================================
     A GREETING THAT KNOWS THE HOUR
     ============================================================ */

  (function greeting() {
    var el = $('#greeting');
    var h = new Date().getHours();
    var line =
      h < 5  ? 'It is the middle of the night. Of course it is. Read it anyway.' :
      h < 9  ? 'You are awake early. Who are you and what have you done with Lana?' :
      h < 12 ? 'Good morning. Have breakfast after this, not before.' :
      h < 17 ? 'Afternoon. Whatever you were doing can wait.' :
      h < 21 ? 'Evening. Good hour for this.' :
               'It is late and you should be asleep. I know you are not.';
    el.textContent = line;
    setTimeout(function () { el.classList.add('in'); }, 900);
  })();

  /* ============================================================
     KEEP THE CARD — paints the invitation as a picture she can
     save to her phone.
     ============================================================ */

  var keepsake = (function () {
    var btn = $('#keep-card'), note = $('#keep-note');
    var W = 1080, H = 1350;

    function spaced(x, text, cx, y, size, family, weight, track, fill) {
      x.font = (weight || 400) + ' ' + size + 'px ' + family;
      x.fillStyle = fill;
      var chars = text.split(''), gap = size * track, total = 0, i;
      for (i = 0; i < chars.length; i++) total += x.measureText(chars[i]).width + gap;
      total -= gap;
      var cur = cx - total / 2;
      for (i = 0; i < chars.length; i++) {
        x.fillText(chars[i], cur, y);
        cur += x.measureText(chars[i]).width + gap;
      }
      return total;
    }

    function rose(x, cx, cy, r, flip) {
      x.save(); x.translate(cx, cy); x.scale(flip ? -r / 32 : r / 32, r / 32);
      x.lineCap = 'round'; x.lineJoin = 'round';
      x.strokeStyle = '#6E520E'; x.lineWidth = 1.5;
      x.beginPath(); x.moveTo(6, 18); x.bezierCurveTo(6, 25, -1, 29, -10, 29); x.stroke();
      x.fillStyle = '#8A9A46';
      x.beginPath(); x.ellipse(-6, 22, 8, 3.4, -0.35, 0, 6.2832); x.fill();
      x.strokeStyle = '#A8121F'; x.lineWidth = 2.6;
      x.beginPath();
      x.arc(0, -3, 7, 0, 6.2832);
      x.moveTo(11.5, -3); x.arc(0, -3, 11.5, 0, 4.2);
      x.moveTo(16, -3); x.arc(0, -3, 16, 0.6, 4.9);
      x.stroke();
      x.fillStyle = '#C0121F';
      x.beginPath(); x.arc(0, -3, 2.6, 0, 6.2832); x.fill();
      x.restore();
    }

    function render() {
      var c = document.createElement('canvas');
      c.width = W; c.height = H;
      var x = c.getContext('2d');

      var bg = x.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#FFFDF8'); bg.addColorStop(0.5, '#F8F1E4'); bg.addColorStop(1, '#F1E7D4');
      x.fillStyle = bg; x.fillRect(0, 0, W, H);

      x.strokeStyle = 'rgba(168,128,28,0.45)'; x.lineWidth = 2;
      x.strokeRect(46, 46, W - 92, H - 92);
      x.strokeStyle = 'rgba(168,128,28,0.22)'; x.lineWidth = 1;
      x.strokeRect(64, 64, W - 128, H - 128);

      rose(x, 96, 96, 44, false);
      rose(x, W - 96, H - 96, 44, true);

      x.textBaseline = 'alphabetic'; x.textAlign = 'left';
      x.font = '400 108px "Pinyon Script", cursive';
      x.fillStyle = '#A8121F';
      var hb = 'Happy Birthday', hw = x.measureText(hb).width;
      x.fillText(hb, (W - hw) / 2, 250);

      // the arched portrait
      var img = $('.portrait img');
      var pw = 430, ph = 560, px = (W - pw) / 2, py = 320;
      x.save();
      x.beginPath();
      x.moveTo(px, py + pw / 2);
      x.arc(px + pw / 2, py + pw / 2, pw / 2, Math.PI, 0);
      x.lineTo(px + pw, py + ph - 8);
      x.quadraticCurveTo(px + pw, py + ph, px + pw - 8, py + ph);
      x.lineTo(px + 8, py + ph);
      x.quadraticCurveTo(px, py + ph, px, py + ph - 8);
      x.closePath();
      x.fillStyle = '#EFE4CD'; x.fill();
      x.strokeStyle = 'rgba(168,128,28,0.5)'; x.lineWidth = 3; x.stroke();
      x.clip();
      if (img && img.naturalWidth) {
        var s = Math.max(pw / img.naturalWidth, ph / img.naturalHeight);
        var dw = img.naturalWidth * s, dh = img.naturalHeight * s;
        x.drawImage(img, px + (pw - dw) / 2, py + (ph - dh) * 0.22, dw, dh);
      }
      x.restore();

      var g = x.createLinearGradient(0, 960, 0, 1080);
      g.addColorStop(0, '#F0DFA6'); g.addColorStop(0.35, '#C9A227');
      g.addColorStop(0.7, '#8C6A15'); g.addColorStop(1, '#E6C766');
      spaced(x, 'LANA', W / 2, 1075, 150, '"Marcellus", serif', 400, 0.1, g);

      spaced(x, 'TWENTY-EIGHT AUGUST', W / 2, 1140, 26, '"Jost", sans-serif', 300, 0.55, '#6E520E');

      x.font = '400 54px "Amiri", serif';
      x.fillStyle = 'rgba(168,128,28,0.9)';
      var ar = '\u0644\u0627\u0646\u0627', aw = x.measureText(ar).width;
      x.fillText(ar, (W - aw) / 2, 1215);

      x.beginPath(); x.moveTo(W / 2 - 90, 1258); x.lineTo(W / 2 + 90, 1258);
      x.strokeStyle = 'rgba(168,128,28,0.4)'; x.lineWidth = 1; x.stroke();
      x.save();
      x.translate(W / 2, 1258); x.rotate(Math.PI / 4);
      x.fillStyle = '#A8801C'; x.fillRect(-5, -5, 10, 10);
      x.restore();

      spaced(x, 'MADE BY ARIAN', W / 2, 1300, 20, '"Jost", sans-serif', 300, 0.5, 'rgba(110,82,14,0.7)');
      return c;
    }

    function say(t) { note.textContent = t; }

    function keep() {
      btn.disabled = true;
      say('Painting it\u2026');
      var run = function () {
        var c = render();
        c.toBlob(function (blob) {
          if (!blob) { btn.disabled = false; say('That did not work. Try again.'); return; }
          // outside the artifact host there is no window.claude at all
          if (!window.claude || typeof window.claude.use !== 'function') { fallback(c); return; }
          window.claude.use('downloads').then(function (dl) {
            if (!dl) { fallback(c); return; }
            dl.save({ filename: 'lana-28-august.png', data: blob }).then(function () {
              btn.disabled = false; say('Saved. It is yours now.'); sfx.chime(6); buzz(8);
              progress.mark('keep');
            }, function (err) {
              btn.disabled = false;
              say((err && err.code === 'declined') ? 'No problem. It stays here.' : '');
              if (err && err.code !== 'declined') fallback(c);
            });
          }, function () { fallback(c); });
        }, 'image/png');
      };
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(run); else run();
    }

    function fallback(c) {
      btn.disabled = false;
      $('#lightbox-img').src = c.toDataURL('image/png');
      $('#lightbox').classList.add('open');
      $('#lightbox').setAttribute('aria-hidden', 'false');
      document.body.classList.add('is-locked');
      say('Hold the picture to save it to your phone.');
    }

    return {
      render: render,
      keep: keep,
      start: function () {
        // The button used to appear only inside the artifact host, so on the
        // public link it was invisible. It is always shown now; without the
        // downloads capability `keep` falls back to showing the picture to
        // hold and save, which works everywhere.
        btn.hidden = false;
        btn.addEventListener('click', keep);
      }
    };
  })();


  /* ============================================================
     THE RECORD — the music gets a body instead of a button
     ============================================================ */

  var record = (function () {
    var deck = $('.deck'), host = $('#tracks'), visible = false;
    var TRACKS = [
      { key: 'birthday', name: 'The one he picked for you', sub: 'for lana' },
      { key: 'kaya', name: 'Katlime Ferman', sub: 'his, not yours' }
    ];
    var cur = null;

    function mark(key) {
      cur = key;
      $$('.track').forEach(function (t) { t.classList.toggle('on', t.dataset.key === key); });
      if (visible) deck.classList.add('playing-disc');
    }

    return {
      start: function () {
        TRACKS.forEach(function (t, i) {
          var b = document.createElement('button');
          b.type = 'button'; b.className = 'track'; b.dataset.key = t.key;
          b.innerHTML = '<span class="track-n">' + (i + 1) + '</span>' +
                        '<b>' + t.name + '</b><em>' + t.sub + '</em>';
          b.addEventListener('click', function () {
            music.arm(t.key); music.to(t.key); mark(t.key); buzz(6);
            progress.mark('record');
          });
          host.appendChild(b);
        });
        // the needle lifts when the music is off, drops when it is on —
        // and the disc never spins while it is off screen
        var sync = function () {
          deck.classList.toggle('playing-disc', !!(visible && cur && music.isOn()));
        };
        new IntersectionObserver(function (es) {
          visible = es[0].isIntersecting; sync();
        }, { threshold: 0.1 }).observe(deck);
        setInterval(function () { if (visible) sync(); }, 900);
      },
      note: function (key) { if (key) mark(key); }
    };
  })();

  /* ============================================================
     DOES HE ACTUALLY KNOW YOU — every answer is one he gave first
     ============================================================ */

  var quiz = (function () {
    var host = $('#quiz'), scoreEl = $('#quiz-score');
    var Q = [
      { ask: 'Which flower is yours?',
        opts: ['A rose', 'A tulip', 'A daisy', 'A lily'], right: 0,
        said: 'He said a rose. One, not a bouquet.' },
      { ask: 'Your colours are…',
        opts: ['Blue and silver', 'White, orange, black, red', 'Pink and cream', 'Green and gold'], right: 1,
        said: 'He said white, orange, black and red. Everything you have been looking at is made of them.' },
      { ask: 'The word you say constantly.',
        opts: ['Yalla', 'Hmm', 'Blah', 'Whatever'], right: 2,
        said: 'He said &ldquo;blah&rdquo;. He also said it fixes his whole day.' },
      { ask: 'What are you always looking at?',
        opts: ['The moon', 'Your phone', 'The mirror', 'The road'], right: 0,
        said: 'He said the moon. And the sky, and the rain.' },
      { ask: 'Whose voice do you keep going back to?',
        opts: ['Sezen Aksu', 'Ahmet Kaya', 'Ibrahim Tatlises', 'Tarkan'], right: 1,
        said: 'He said Ahmet Kaya. It is playing further up this page.' },
      { ask: 'The thing you are worst at.',
        opts: ['Being on time', 'Remembering anything', 'Sitting still', 'Choosing food'], right: 1,
        said: 'He said you forget everything. Then he built you a page that does not.' }
    ];
    var answered = 0, right = 0;

    return {
      start: function () {
        Q.forEach(function (q, i) {
          var wrap = document.createElement('div');
          wrap.className = 'q';
          var opts = q.opts.map(function (o, j) {
            return '<button class="q-opt" type="button" data-j="' + j + '">' + o + '</button>';
          }).join('');
          wrap.innerHTML =
            '<p class="q-ask">' + (i + 1) + '. ' + q.ask + '</p>' +
            '<div class="q-opts">' + opts + '</div>' +
            '<p class="q-said"><span>' + q.said + '</span></p>';
          $$('.q-opt', wrap).forEach(function (b) {
            b.addEventListener('click', function () {
              if (wrap.classList.contains('answered')) return;
              var j = +b.dataset.j, ok = j === q.right;
              wrap.classList.add('answered');
              b.classList.add('chosen'); if (!ok) b.classList.add('wrong');
              $$('.q-opt', wrap)[q.right].classList.add('right');
              answered++; if (ok) right++;
              buzz(ok ? 8 : 4); sfx.chime(ok ? i + 2 : 0);
              if (answered === Q.length) {
                var msg =
                  right === 6 ? 'Six out of six. He was paying attention the whole time.' :
                  right >= 4  ? right + ' out of 6. He knows you better than most people do.' :
                  right >= 2  ? right + ' out of 6 — and honestly, that is on you for being complicated.' :
                                'Fine, ' + right + ' out of 6. He still wrote all of this.';
                scoreEl.textContent = msg;
                scoreEl.classList.add('show');
                progress.mark('quiz');
                confetti.petals(16);
              }
            });
          });
          host.appendChild(wrap);
        });
      }
    };
  })();

  /* ============================================================
     THE ORACLE — three cards, take whichever
     ============================================================ */

  var oracle = (function () {
    var host = $('#oracle'), say = $('#oracle-say'), again = $('#oracle-again');
    var POOL = [
      'Today is going to be softer than you think it will be.',
      'Say the thing you have been not saying. It lands better than silence does.',
      'Someone thought about you before you woke up. That is not a guess.',
      'Whatever you are worrying about is smaller than it was at 2am.',
      'Go outside for ten minutes. The sky is doing something for you.',
      'You are allowed to sleep in. That is the whole message.',
      'The next good thing is closer than the last bad one.',
      'You do not have to be interesting today. Being here is plenty.',
      'One person would drop everything if you asked. You know which one.',
      'Something you gave up on is quietly still working.',
      'Drink water, answer the message, and stop rereading it.',
      'It is going to rain eventually, and you are going to love it.',
      'You are the reason a whole website exists. Sit with that.',
      'Nothing is required of you tonight.',
      'He is thinking about you right now. Statistically, he almost always is.'
    ];
    var pool = POOL.slice(), spent = false;

    function draw() {
      if (!pool.length) pool = POOL.slice();
      var i = Math.floor(rand(0, pool.length));
      return pool.splice(i, 1)[0];
    }
    function deal() {
      host.innerHTML = ''; host.classList.remove('spent');
      say.classList.remove('show'); again.hidden = true; spent = false;
      for (var i = 0; i < 3; i++) {
        (function () {
          var b = document.createElement('button');
          b.type = 'button'; b.className = 'ocard';
          b.setAttribute('aria-label', 'take a card');
          b.innerHTML = '<span class="ocard-in">' +
            '<span class="ocard-face front"><span>L</span></span>' +
            '<span class="ocard-face back">&#10022;</span></span>';
          b.addEventListener('click', function () {
            if (spent) return;
            spent = true;
            b.classList.add('turned');
            progress.mark('oracle');
            host.classList.add('spent');
            buzz(9); sfx.chime(3);
            setTimeout(function () {
              say.textContent = draw();
              say.classList.add('show');
              again.hidden = false;
            }, 620);
          });
          host.appendChild(b);
        })();
      }
    }
    return {
      start: function () {
        deal();
        again.addEventListener('click', function () { deal(); buzz(5); });
      }
    };
  })();

  /* ============================================================
     THIRTY DAYS — one sealed note a day, so she keeps coming back
     ============================================================ */

  var calendar = (function () {
    var host = $('#cal'), panel = $('#cal-open'), dayEl = $('#cal-day'), textEl = $('#cal-text');
    var copy = $('#cal-copy');
    var KEY = 'lana-2808-cal';
    var NOTES = [
      'Day one of thirty. Whatever kind of day this was, it ends with somebody having thought about you for a month in advance.',
      'You were asleep when I wrote this. You are probably asleep now too. Good.',
      'The rain you like is coming back eventually. I checked. Not scientifically, but I checked.',
      'I am not going to ask what you dreamt about, because you will have forgotten it by the time you read this.',
      'If today was heavy: put it down. It will still be there tomorrow and you can pick it up then, or not.',
      'Somebody described you to me once as &ldquo;the quiet one&rdquo; and I have never disagreed with anything harder.',
      'One week. You have opened this seven times, which means I have been in your head seven mornings. Worth it.',
      'You laugh before the joke finishes. It ruins the joke. Never stop.',
      'Whatever you are putting off — do the small version of it today. That counts.',
      'The moon is doing something tonight. Go and look at it and think of nobody in particular.',
      'You are allowed to be in a bad mood. You do not owe anyone the good version of you.',
      'Ten days ago you did not know this existed. Now you check it. I win.',
      'I would like it recorded that I have never once had to pretend to be interested in what you were saying.',
      'If someone was rude to you this week, remember that they have to live as themselves, and you do not.',
      'Halfway. Fifteen more. I planned this far ahead, which should tell you something.',
      'You say you are bad at replying. You reply to me. Draw your own conclusions.',
      'Today, buy the thing. The small one. The one you keep looking at and putting back.',
      'There is a version of this where I never said any of it and we both just carried on. I am glad we are not in that one.',
      'You are somebody’s favourite person. Several somebodies. One of them built this.',
      'Twenty days. Officially longer than most of your attention spans.',
      'If you are reading this late: close it, sleep, and read it again tomorrow. It will not mind.',
      'I hope something small and stupid made you laugh today. If not, come back and read number eight.',
      'Nothing has changed on my end. Just checking in so you know that.',
      'I have seen the photograph of you and that blue thing in the morning. I am not jealous. I am simply aware.',
      'Whatever you decided about us, or did not decide — today is not the deadline. There is no deadline.',
      'A month is nearly up. You have been thinking about this every day, which was the entire plan.',
      'Tell someone you love them today. Doesn’t have to be me. Just say it to somebody.',
      'One year from now this page will still open, still play, still say the same things.',
      'Second to last. I am not going to get sentimental. That is tomorrow’s job.',
      'Thirty. This is the last sealed one of the daily ones, so here is the plain version: I am glad you exist, I am glad I know you, and I am not going anywhere. After this they come once a week instead, because I was not finished.'
    ];
    // after the first thirty they slow to one a week, so it lasts
    var WEEKLY = [
      'Week one of the slow ones. Same person writing, just less often. Do not read anything into the gap.',
      'You have had a whole month of these now. Still here. Still means it.',
      'Whatever changed since August, I hope it changed in your favour.',
      'You are allowed to have outgrown something. That is not the same as losing it.',
      'Reminder, in case the month has been long: you are not difficult. You are specific.',
      'If you are cold, it is autumn now. Put something on. That is the whole note.',
      'Two months. I could have stopped at one. I did not want to.',
      'Somebody said your name in a sentence today and I paid more attention than I should have.',
      'The rain you like is properly back by now. Go and stand in it for a second.',
      'You have almost certainly forgotten note eleven. Go and read it again, it holds up.',
      'Nothing has changed. I keep saying that because it keeps being true.',
      'Three months. This is longer than most things people start.',
      'Winter version of the same message: I hope you are warm and somebody is being kind to you.',
      'If you are having a bad week, the coupons are still valid. All seven of them.',
      'You are further from your birthday than you have ever been, and closer to the next one than you were yesterday.',
      'Last of the weekly ones. The page stays. The songs stay. So do I. Happy nearly-birthday again, whenever that lands.'
    ];
    NOTES = NOTES.concat(WEEKLY);
    var DAILY_COUNT = NOTES.length - WEEKLY.length;

    // one a day for the first thirty, then one every seven days
    function availableCount(st) {
      if (!st || !st.start) return 1;
      var days = Math.floor((midnight(new Date()) - st.start) / 86400000) + 1;
      if (days <= DAILY_COUNT) return clamp(days, 1, DAILY_COUNT);
      var weeks = Math.floor((days - DAILY_COUNT) / 7);
      return clamp(DAILY_COUNT + weeks, DAILY_COUNT, NOTES.length);
    }

    function state() {
      try { return JSON.parse(localStorage.getItem(KEY) || 'null') || {}; } catch (e) { return {}; }
    }
    function save(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }
    function midnight(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); }

    function build() {
      var st = state();
      if (!st.start) { st.start = midnight(new Date()); st.opened = []; save(st); }
      var available = availableCount(st);

      host.innerHTML = '';
      NOTES.forEach(function (note, i) {
        var n = i + 1;
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'seal-note';
        var opened = st.opened.indexOf(n) !== -1;
        if (opened) b.classList.add('open');
        else if (n <= available) b.classList.add('today');
        else { b.classList.add('locked'); b.disabled = true; }
        b.setAttribute('aria-label', 'note ' + n + (n <= available ? '' : ' (locked)'));
        b.innerHTML = '<span>' + n + '</span>';
        b.addEventListener('click', function () {
          if (n > available) return;
          var cur = state();
          if (cur.opened.indexOf(n) === -1) {
            cur.opened.push(n); save(cur);
            b.classList.remove('today'); b.classList.add('open');
            progress.mark('choc');
            sfx.crack(); buzz([12, 40, 12]); confetti.petals(10);
            if (typeof today !== 'undefined' && today.refresh) today.refresh();
          } else { sfx.chime(n); }
          panel.hidden = false;
          dayEl.textContent = 'No. ' + n + ' of 30';
          textEl.innerHTML = note;
          refresh();
        });
        host.appendChild(b);
      });

      refresh();
    }

    function refresh() {
      var st = state();
      var available = availableCount(st);
      var unread = available - st.opened.length;
      var sealed = NOTES.length - available;
      var d = new Date(), bday = d.getMonth() === 7 && d.getDate() === 28;

      if (available >= NOTES.length && unread <= 0) {
        copy.innerHTML = 'The whole box is open. Go back through them whenever you like.';
      } else if (unread > 0) {
        var everyWeek = available >= DAILY_COUNT;
        copy.innerHTML = (bday ? 'Happy birthday. ' : '') +
          '<b>' + unread + (unread === 1 ? ' is' : ' are') + ' waiting for you.</b> ' +
          (sealed ? 'One more is unwrapped every ' + (everyWeek ? 'week' : 'day') +
                    ' &mdash; ' + sealed + ' still in foil.' : '');
      } else {
        var weekly = available >= DAILY_COUNT;
        copy.innerHTML = '<b>Come back ' + (weekly ? 'next week' : 'tomorrow') + '</b> for the next one. ' +
          sealed + ' still in gold foil after that.';
      }
    }

    function todayInfo() {
      var st = state();
      if (!st.start) return { n: 1, note: NOTES[0], opened: false, left: NOTES.length - 1 };
      var avail = availableCount(st);
      var next = null;
      for (var i = 1; i <= avail; i++) if (st.opened.indexOf(i) === -1) { next = i; break; }
      var n = next || avail;
      return { n: n, note: NOTES[n - 1], opened: next === null, left: NOTES.length - avail };
    }
    function openNumber(n) {
      var b = host.children[n - 1];
      if (b && !b.disabled) b.click();
    }

    return { start: build, todayInfo: todayInfo, open: openNumber, refresh: refresh,
             noteText: function (n) { return NOTES[n - 1] || ''; } };
  })();


  /* ============================================================
     SEALED UNTIL THE 28th — this one genuinely cannot be opened early
     ============================================================ */

  var dayLock = (function () {
    var seal = $('#big-seal'), timer = $('#lock-timer'), copy = $('#lock-copy');
    var head = $('#lock-head'), note = $('#lock-note'), text = $('#lock-text');
    var label = $('#lock-label');
    var KEY = 'lana-2808-daylock';
    var TEXT = 'So it is actually the day now.\n\n' +
      'Everything above this was written before it, while I was still guessing how you would ' +
      'take it. This part I wrote for right now, for whatever hour you are reading it in.\n\n' +
      'I hope somebody has already made a fuss of you today. If they have not, I am doing it ' +
      'from here, loudly.\n\n' +
      'You get one of these a year and you spend most of them insisting it is not a big deal. ' +
      'It is a big deal. It is the day the rest of us got you.\n\n' +
      'Happy birthday, Lana. Go and be impossible about it.';

    function isDay() { var d = new Date(); return d.getMonth() === 7 && d.getDate() === 28; }
    function past() { var d = new Date(); return (d.getMonth() > 7) || (d.getMonth() === 7 && d.getDate() > 28); }
    function target() {
      var n = new Date(), y = n.getFullYear();
      var t = new Date(y, 7, 28, 0, 0, 0, 0);
      if (n >= new Date(y, 7, 29)) t = new Date(y + 1, 7, 28, 0, 0, 0, 0);
      return t;
    }

    function reveal(silent) {
      seal.classList.remove('ready', 'locked');
      seal.classList.add('spent');
      note.hidden = false;
      text.textContent = TEXT;
      head.textContent = 'It opened.';
      label.textContent = 'The 28th of August';
      copy.textContent = '';
      try { localStorage.setItem(KEY, '1'); } catch (e) {}
      progress.mark('daylock');
      if (!silent) { sfx.crack(); buzz([16, 50, 16, 50, 30]); confetti.fire(2200); }
    }

    function tick() {
      if (isDay() || past()) {
        seal.classList.remove('locked'); seal.classList.add('ready');
        timer.textContent = 'open it';
        head.textContent = 'This one is for today.';
        label.textContent = 'It is the day';
        copy.textContent = 'It has been sitting here sealed since before you first opened this page.';
        return;
      }
      var ms = target() - new Date(), sec = Math.floor(ms / 1000);
      var d = Math.floor(sec / 86400), h = Math.floor(sec / 3600) % 24, m = Math.floor(sec / 60) % 60;
      timer.textContent = d > 0 ? d + 'd ' + h + 'h' : h + 'h ' + m + 'm';
      seal.classList.add('locked');
    }

    return {
      start: function () {
        var already = false;
        try { already = !!localStorage.getItem(KEY); } catch (e) {}
        tick(); setInterval(tick, 30000);
        if (already && (isDay() || past())) { reveal(true); return; }
        seal.addEventListener('click', function () {
          if (seal.classList.contains('locked')) {
            copy.textContent = 'Nice try. It knows what day it is.';
            buzz(4); return;
          }
          reveal(false);
        });
      }
    };
  })();

  /* ============================================================
     HER COVER — she decides which photograph is on the invitation
     ============================================================ */

  var cover = (function () {
    var wrap = $('.portrait'), img = $('.portrait img'), btn = $('#cover-swap');
    var KEY = 'lana-2808-cover';
    var srcs = [], i = 0;

    return {
      start: function () {
        srcs = [img.src].concat($$('.plate img').map(function (n) { return n.src; }));
        try {
          var v = parseInt(localStorage.getItem(KEY), 10);
          if (!isNaN(v) && v > 0 && v < srcs.length) { i = v; img.src = srcs[i]; }
        } catch (e) {}
        btn.addEventListener('click', function () {
          i = (i + 1) % srcs.length;
          wrap.classList.add('swapping');
          buzz(5); sfx.chime(i + 1);
          setTimeout(function () {
            img.src = srcs[i];
            wrap.classList.remove('swapping');
            try { localStorage.setItem(KEY, String(i)); } catch (e) {}
          }, 300);
        });
      }
    };
  })();

  /* ============================================================
     HOW WAS TODAY — one press a day, kept for her
     ============================================================ */

  var diary = (function () {
    var host = $('#moods'), say = $('#mood-say'), list = $('#diary'), copy = $('#diary-copy');
    var KEY = 'lana-2808-diary';
    var MOODS = [
      { k: 'good',  label: 'good',  reply: 'Good. Write that one down somewhere, you forget the good ones fastest.' },
      { k: 'tired', label: 'tired', reply: 'Then stop reading and go to sleep. This will still be here tomorrow.' },
      { k: 'blah',  label: 'blah',  reply: 'Classic. Say it out loud though &mdash; it works better out loud.' },
      { k: 'heavy', label: 'heavy', reply: 'Put it down for tonight. It will still be there in the morning, and so will I.' },
      { k: 'happy', label: 'happy', reply: 'Do not interrogate it. Just have it.' }
    ];

    function today() {
      var d = new Date();
      return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    }
    function load() {
      try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
    }
    function save(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }
    function pretty(iso) {
      var p = iso.split('-');
      var d = new Date(+p[0], +p[1] - 1, +p[2]);
      try { return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); }
      catch (e) { return iso; }
    }

    function render() {
      var log = load(), t = today();
      var mine = null;
      log.forEach(function (e) { if (e.d === t) mine = e; });
      $$('.mood').forEach(function (b, j) { b.classList.toggle('on', !!mine && mine.m === j); });
      if (mine) {
        say.innerHTML = MOODS[mine.m].reply;
        say.classList.add('show');
        copy.textContent = 'Answered for today. You can change it if the day turns.';
      } else {
        copy.textContent = 'One press. I am not asking for a paragraph. It keeps the answer for you.';
      }
      list.innerHTML = '';
      log.slice(-8).reverse().forEach(function (e) {
        var li = document.createElement('li');
        li.innerHTML = '<i class="mi m' + (e.m + 1) + '"></i><b>' + pretty(e.d) + '</b>' +
                       '<span>' + MOODS[e.m].label + '</span>';
        list.appendChild(li);
      });
    }

    function api() { return { moods: MOODS, today: today, load: load, save: save, render: render }; }

    return {
      api: api,
      set: function (j) {
        var log = load(), t = today(), found = false;
        log.forEach(function (e) { if (e.d === t) { e.m = j; found = true; } });
        if (!found) log.push({ d: t, m: j });
        save(log); render();
      },
      current: function () {
        var log = load(), t = today(), m = null;
        log.forEach(function (e) { if (e.d === t) m = e.m; });
        return m;
      },
      moods: function () { return MOODS; },
      start: function () {
        MOODS.forEach(function (m, j) {
          var b = document.createElement('button');
          b.type = 'button'; b.className = 'mood m' + (j + 1);
          b.innerHTML = '<i></i><b>' + m.label + '</b>';
          b.addEventListener('click', function () {
            var log = load(), t = today(), found = false;
            log.forEach(function (e) { if (e.d === t) { e.m = j; found = true; } });
            if (!found) log.push({ d: t, m: j });
            save(log); render();
            progress.mark('mood');
            if (typeof today !== 'undefined' && today.refresh) today.refresh();
            buzz(7); sfx.chime(j + 1);
            if (j === 0 || j === 4) confetti.petals(10);
          });
          host.appendChild(b);
        });
        render();
      }
    };
  })();


  /* ============================================================
     SING — a live needle for her voice. Nothing is recorded and
     nothing leaves the phone; the analyser reads the stream and
     the stream is dropped the moment she leaves.
     ============================================================ */

  var sing = (function () {
    var cv = $('#bars'), btn = $('#sing-btn'), idle = $('#bars-idle');
    var say = $('#sing-say'), copy = $('#sing-copy');
    var C, W, H, an = null, stream = null, ac = null, raf = 0, live = false, visible = false;
    var buf = null, peak = 0, praised = 0;
    var BARS = 34, vals = [];

    function size() { var d = fit(cv); W = d.w; H = d.h; C = d.x; }

    function frame() {
      if (!live) return;
      raf = requestAnimationFrame(frame);
      an.getByteTimeDomainData(buf);
      var sum = 0, i;
      for (i = 0; i < buf.length; i++) { var v = (buf[i] - 128) / 128; sum += v * v; }
      var rms = Math.sqrt(sum / buf.length);
      peak = Math.max(peak * 0.995, rms);

      vals.push(clamp(rms * 4.2, 0, 1));
      if (vals.length > BARS) vals.shift();

      C.clearRect(0, 0, W, H);
      var bw = W / BARS, mid = H / 2;
      for (i = 0; i < vals.length; i++) {
        var h = Math.max(2, vals[i] * H * 0.86);
        var x = i * bw + bw * 0.22, w = bw * 0.56;
        var g = C.createLinearGradient(0, mid - h / 2, 0, mid + h / 2);
        g.addColorStop(0, '#F3E3A8'); g.addColorStop(0.5, '#E6C766'); g.addColorStop(1, '#A8801C');
        C.fillStyle = g;
        C.fillRect(x, mid - h / 2, w, h);
      }
      C.strokeStyle = 'rgba(230,199,102,0.22)'; C.lineWidth = 1;
      C.beginPath(); C.moveTo(0, mid); C.lineTo(W, mid); C.stroke();

      if (rms > 0.10 && praised < 1) { praised = 1; nudge('There it is. Keep going.'); }
      else if (peak > 0.22 && praised < 2) { praised = 2; nudge('Alright, that is a real voice. He was not exaggerating.'); }
    }
    function nudge(t) { say.textContent = t; say.classList.add('show'); }

    function stop() {
      live = false; cancelAnimationFrame(raf);
      try { if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
      try { if (ac) ac.close(); } catch (e) {}
      stream = null; ac = null; an = null;
      idle.classList.remove('gone');
      btn.textContent = 'Let it listen';
      if (C) C.clearRect(0, 0, W, H);
    }

    function start() {
      if (live) { stop(); return; }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        copy.textContent = 'Your browser will not let it listen. Sing anyway, nobody is stopping you.';
        return;
      }
      navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
        .then(function (st) {
          stream = st;
          var AC = window.AudioContext || window.webkitAudioContext;
          ac = new AC();
          an = ac.createAnalyser(); an.fftSize = 1024;
          ac.createMediaStreamSource(st).connect(an);
          buf = new Uint8Array(an.fftSize);
          vals = []; peak = 0; praised = 0;
          size(); live = true;
          idle.classList.add('gone');
          progress.mark('sing');
          btn.textContent = 'Stop listening';
          music.duck(true);
          nudge('Go on then.');
          raf = requestAnimationFrame(frame);
        })
        .catch(function () {
          copy.textContent = 'It cannot hear you without permission. Sing anyway &mdash; it is your birthday.';
        });
    }

    return {
      start: function () {
        size();
        btn.addEventListener('click', function () { start(); buzz(6); });
        new IntersectionObserver(function (es) {
          visible = es[0].isIntersecting;
          if (!visible && live) { stop(); music.duck(false); }
        }, { threshold: 0.12 }).observe(cv);
        window.addEventListener('resize', function () { if (live) size(); });
      }
    };
  })();

  /* ============================================================
     CATCH THE CHOCOLATE — thirty seconds, no way to lose
     ============================================================ */

  var game = (function () {
    var cv = $('#game'), over = $('#game-over'), startBtn = $('#game-start');
    var scoreEl = $('#game-score'), timeEl = $('#game-time');
    var resultEl = $('#game-result'), bestEl = $('#game-best');
    var KEY = 'lana-2808-best';
    var C, W, H, raf = 0, playing = false, items = [], pops = [];
    var cupX = 0.5, score = 0, endsAt = 0, spawnAt = 0;

    var KINDS = [
      { p: 0.60, r: 0.036, pts: 1, kind: 'choc' },
      { p: 0.30, r: 0.030, pts: 2, kind: 'bean' },
      { p: 0.10, r: 0.030, pts: 5, kind: 'gem' }
    ];

    function size() { var d = fit(cv); W = d.w; H = d.h; C = d.x; }
    function best() { try { return +(localStorage.getItem(KEY) || 0); } catch (e) { return 0; } }
    function setBest(v) { try { localStorage.setItem(KEY, String(v)); } catch (e) {} }

    function pick() {
      var r = Math.random(), acc = 0;
      for (var i = 0; i < KINDS.length; i++) { acc += KINDS[i].p; if (r <= acc) return KINDS[i]; }
      return KINDS[0];
    }

    function drawCup(x, y, w) {
      var h = w * 0.72;
      C.beginPath();
      C.moveTo(x - w / 2, y);
      C.lineTo(x + w / 2, y);
      C.lineTo(x + w * 0.34, y + h);
      C.lineTo(x - w * 0.34, y + h);
      C.closePath();
      var g = C.createLinearGradient(x - w / 2, y, x + w / 2, y + h);
      g.addColorStop(0, '#FFFBF4'); g.addColorStop(0.5, '#EBD9C0'); g.addColorStop(1, '#C9A227');
      C.fillStyle = g; C.fill();
      C.strokeStyle = '#8C6A15'; C.lineWidth = 1.2; C.stroke();
      C.fillStyle = '#5A3620';
      C.beginPath(); C.ellipse(x, y + 1, w * 0.48, w * 0.10, 0, 0, 6.2832); C.fill();
    }

    function drawItem(it) {
      var r = it.r;
      C.save(); C.translate(it.x, it.y); C.rotate(it.rot);
      if (it.kind === 'choc') {
        var g = C.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
        g.addColorStop(0, '#9C6238'); g.addColorStop(0.6, '#6B3F22'); g.addColorStop(1, '#3A2113');
        C.fillStyle = g;
        C.beginPath(); C.arc(0, 0, r, 0, 6.2832); C.fill();
        C.strokeStyle = 'rgba(235,217,192,0.5)'; C.lineWidth = Math.max(1, r * 0.1);
        C.beginPath(); C.moveTo(-r * 0.5, -r * 0.2); C.lineTo(r * 0.5, -r * 0.2); C.stroke();
      } else if (it.kind === 'bean') {
        var g2 = C.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
        g2.addColorStop(0, '#7B4A2A'); g2.addColorStop(1, '#2A1810');
        C.fillStyle = g2;
        C.beginPath(); C.ellipse(0, 0, r * 0.72, r, 0, 0, 6.2832); C.fill();
        C.strokeStyle = 'rgba(235,217,192,0.45)'; C.lineWidth = Math.max(1, r * 0.12);
        C.beginPath(); C.moveTo(0, -r * 0.82); C.quadraticCurveTo(r * 0.22, 0, 0, r * 0.82); C.stroke();
      } else {
        C.fillStyle = '#E6C766';
        C.beginPath();
        C.moveTo(0, -r); C.lineTo(r * 0.72, 0); C.lineTo(0, r); C.lineTo(-r * 0.72, 0);
        C.closePath(); C.fill();
        C.fillStyle = 'rgba(255,255,255,0.55)';
        C.beginPath(); C.moveTo(0, -r); C.lineTo(r * 0.3, -r * 0.25); C.lineTo(-r * 0.3, -r * 0.25);
        C.closePath(); C.fill();
      }
      C.restore();
    }

    function loop(now) {
      if (!playing) return;
      raf = requestAnimationFrame(loop);
      var left = Math.max(0, Math.ceil((endsAt - now) / 1000));
      timeEl.textContent = left;
      C.clearRect(0, 0, W, H);

      if (now > spawnAt) {
        var k = pick();
        items.push({ x: rand(W * 0.1, W * 0.9), y: -20, r: Math.min(W, H) * k.r,
          v: rand(H * 0.0022, H * 0.0042), rot: rand(0, 6.28), vr: rand(-0.03, 0.03),
          pts: k.pts, kind: k.kind });
        spawnAt = now + rand(280, 620);
      }

      var cupW = W * 0.24, cupY = H - H * 0.14, cx = cupX * W;
      for (var i = items.length - 1; i >= 0; i--) {
        var it = items[i];
        it.y += it.v * 16; it.rot += it.vr;
        if (it.y + it.r >= cupY && it.y - it.r < cupY + cupW * 0.5 &&
            Math.abs(it.x - cx) < cupW * 0.52) {
          score += it.pts; scoreEl.textContent = score;
          pops.push({ x: it.x, y: cupY, t: 1, pts: it.pts });
          items.splice(i, 1); buzz(4); sfx.chime(it.pts);
          continue;
        }
        if (it.y - it.r > H) { items.splice(i, 1); continue; }
        drawItem(it);
      }

      drawCup(cx, cupY, cupW);

      for (var j = pops.length - 1; j >= 0; j--) {
        var p = pops[j]; p.t -= 0.03; p.y -= 1.4;
        if (p.t <= 0) { pops.splice(j, 1); continue; }
        C.globalAlpha = p.t;
        C.fillStyle = '#8C6A15';
        C.font = '600 ' + Math.round(W * 0.05) + 'px Jost, system-ui, sans-serif';
        C.textAlign = 'center';
        C.fillText('+' + p.pts, p.x, p.y);
        C.globalAlpha = 1;
      }

      if (now >= endsAt) finish();
    }

    function finish() {
      playing = false; cancelAnimationFrame(raf);
      var b = best();
      if (score > b) { setBest(score); b = score; }
      progress.mark('game');
      resultEl.textContent =
        score >= 60 ? score + '. You are frighteningly good at this.' :
        score >= 35 ? score + '. Respectable. Coffee beans are worth two.' :
        score >= 15 ? score + '. You were distracted. I know you were.' :
                      score + '. Were you even holding the phone?';
      bestEl.textContent = 'best ' + b;
      startBtn.textContent = 'Again';
      over.classList.remove('hide');
      confetti.petals(14);
    }

    function begin() {
      size();
      score = 0; items = []; pops = []; cupX = 0.5;
      scoreEl.textContent = '0'; timeEl.textContent = '30';
      over.classList.add('hide');
      playing = true;
      endsAt = performance.now() + 30000;
      spawnAt = performance.now() + 300;
      raf = requestAnimationFrame(loop);
    }

    function move(e) {
      if (!playing) return;
      if (e.cancelable) e.preventDefault();
      var r = cv.getBoundingClientRect();
      var t = (e.touches && e.touches[0]) || e;
      cupX = clamp((t.clientX - r.left) / r.width, 0.12, 0.88);
    }

    return {
      start: function () {
        size();
        bestEl.textContent = best() ? 'best ' + best() : '';
        resultEl.textContent = 'Thirty seconds. Ready?';
        startBtn.addEventListener('click', function () { begin(); buzz(8); });
        var o = { passive: false };
        cv.addEventListener('pointerdown', move, o);
        cv.addEventListener('pointermove', move, o);
        cv.addEventListener('touchstart', move, o);
        cv.addEventListener('touchmove', move, o);
        new IntersectionObserver(function (es) {
          if (!es[0].isIntersecting && playing) finish();
        }, { threshold: 0.15 }).observe(cv);
        window.addEventListener('resize', function () { if (playing) size(); });
      }
    };
  })();


  /* ============================================================
     CONTENTS — twenty-one chapters is too many to scroll blindly
     ============================================================ */

  var contents = (function () {
    var btn = $('#index-btn'), box = $('#index'), list = $('#index-list');
    // third value is the discovery this chapter is ticked off by
    var CH = [
      ['card', 'The Invitation', 'open'],
      ['today-sec', 'Today', 'choc'],
      ['countdown', 'The Countdown', null],
      ['day-lock', 'Sealed Until the 28th', 'daylock'],
      ['rose', 'Six Petals', 'rose'],
      ['gallery', 'Her', 'photos'],
      ['reel-sec', 'Moving', 'video'],
      ['tonight', 'The Moon Tonight', null],
      ['resume-day', 'The 28th of August', null],
      ['scratch', 'Scratch the Gold', 'scratch'],
      ['letter', 'The Letter', 'letter'],
      ['coupons', 'Seven Coupons', 'coupons'],
      ['record-sec', 'The Record', 'record'],
      ['sing-sec', 'Sing Something', 'sing'],
      ['quiz-sec', 'Does He Know You', 'quiz'],
      ['oracle-sec', 'Three Cards', 'oracle'],
      ['game-sec', 'Catch the Chocolate', 'game'],
      ['cake', 'The Cake', 'cake'],
      ['back', 'Your Turn', 'reply'],
      ['openwhen-sec', 'Open When…', 'openwhen'],
      ['seen-sec', 'What I See In You', null],
      ['noticed-sec', 'You Thought Nobody Noticed', 'noticed'],
      ['remind-sec', 'Remind Me Of Us', 'remind'],
      ['strangers-sec', 'If We Ever Become Strangers', 'strangers'],
      ['pass-sec', 'Four Words', 'password'],
      ['place-sec', 'The Place', null],
      ['board-sec', 'The Girl At That Desk', null],
      ['mirror-sec', 'The Most Beautiful Thing', 'mirror'],
      ['garden-sec', 'The Garden', null],
      ['future-sec', 'Letters With Dates', null],
      ['question-sec', 'One Question', 'answered'],
      ['calendar-sec', 'The Box of Thirty', 'choc'],
      ['diary-sec', 'How Was Today', 'mood'],
      ['finale', 'The End', null]
    ];
    var items = [], current = -1;

    function open() {
      mark();
      box.classList.add('open'); box.setAttribute('aria-hidden', 'false');
      document.body.classList.add('is-locked');
      buzz(5);
    }
    function close() {
      box.classList.remove('open'); box.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('is-locked');
    }
    function mark() {
      items.forEach(function (li, i) {
        li.classList.toggle('here', i === current);
        var key = CH[i][2];
        if (key) li.classList.toggle('done', progress.has(key));
      });
      var keys = {}, done = 0, total = 0;
      CH.forEach(function (c) { if (c[2]) keys[c[2]] = 1; });
      for (var k in keys) { total++; if (progress.has(k)) done++; }
      $('#index-found').textContent = done + ' of ' + total + ' found';
    }

    return {
      start: function () {
        CH.forEach(function (c, i) {
          var li = document.createElement('li');
          var b = document.createElement('button');
          b.type = 'button';
          b.innerHTML = '<span class="n">' + (i < 9 ? '0' : '') + (i + 1) + '</span>' +
                        '<span class="t">' + c[1] + '</span>' +
                        (c[2] ? '<span class="tick"></span>' : '');
          b.addEventListener('click', function () {
            close();
            var el = $('#' + c[0]);
            if (!el) return;
            sfx.chime(i);
            // smooth-scrolling twelve thousand pixels takes forever, so the
            // page dissolves, jumps, and comes back — it reads as a scene change
            var page = $('#page');
            page.classList.add('warping');
            setTimeout(function () {
              el.scrollIntoView({ behavior: 'instant', block: 'start' });
              requestAnimationFrame(function () { page.classList.remove('warping'); });
            }, 260);
          });
          li.appendChild(b); list.appendChild(li); items.push(li);

          var sec = $('#' + c[0]);
          if (sec) {
            new IntersectionObserver(function (es) {
              if (es[0].isIntersecting) { current = i; sec.classList.add('in-view'); }
              else sec.classList.remove('in-view');
            }, { threshold: 0.3 }).observe(sec);
          }
        });
        btn.addEventListener('click', open);
        progress.onChange(function () { if (box.classList.contains('open')) mark(); });
        $('#index-close').addEventListener('click', close);
        box.addEventListener('click', function (e) { if (e.target === box) close(); });
        document.addEventListener('keydown', function (e) {
          if (e.key === 'Escape' && box.classList.contains('open')) close();
        });
      },
      show: function () { btn.classList.add('show'); },
      ids: function () { return CH.map(function (c) { return c[0]; }); }
    };
  })();

  /* ============================================================
     TOUCH — a gold ring where her finger lands
     ============================================================ */

  (function ripple() {
    if (RM) return;
    var SEL = '.btn,.track,.mood,.q-opt,.ticket,.ocard,.seal-note,.petal,.cover-swap,' +
              '.sound,#medallion,#seal,.big-seal,#index-btn,.index-list button,.star';
    document.addEventListener('pointerdown', function (e) {
      var t = e.target && e.target.closest ? e.target.closest(SEL) : null;
      if (!t) return;
      var r = document.createElement('span');
      r.className = 'tap-ring';
      r.style.left = e.clientX + 'px';
      r.style.top = e.clientY + 'px';
      document.body.appendChild(r);
      setTimeout(function () { r.remove(); }, 600);
    }, { passive: true });
  })();


  /* ============================================================
     TODAY — on a normal visit this is the whole errand: unwrap
     one chocolate, answer one question. No scrolling required.
     ============================================================ */

  var today = (function () {
    var dateEl = $('#today-date'), chocBtn = $('#t-choc'), chocN = $('#t-choc-n');
    var title = $('#t-choc-title'), sub = $('#t-choc-sub'), note = $('#t-note');
    var moodHost = $('#t-moods'), reply = $('#t-reply');

    function renderChoc() {
      var info = calendar.todayInfo();
      chocN.textContent = info.n;
      chocBtn.classList.toggle('done', info.opened);
      chocBtn.classList.toggle('waiting', !info.opened);
      if (info.opened) {
        title.textContent = 'No. ' + info.n + ' of 30';
        sub.textContent = info.left > 0
          ? 'Come back tomorrow for the next one.'
          : 'That is the whole box.';
      } else {
        title.textContent = 'Today’s chocolate';
        sub.textContent = 'Unwrap it.';
      }
    }

    function renderMood() {
      var cur = diary.current(), M = diary.moods();
      $$('.t-mood').forEach(function (b, j) { b.classList.toggle('on', cur === j); });
      reply.innerHTML = cur === null ? '' : M[cur].reply;
    }

    function renderStreak() {
      var el = $('#t-streak'), away = $('#t-away');
      var d = streak.days(), g = streak.gap();
      el.textContent = d > 1 ? d + ' days in a row' : '';
      var now = new Date();
      if (g >= 3) {
        away.hidden = false;
        away.textContent = g >= 14
          ? 'Two weeks. I was starting to take it personally.'
          : 'You have been gone ' + g + ' days. The chocolates kept.';
      } else if (now.getDate() === 28 && now.getMonth() !== 7) {
        away.hidden = false;
        away.textContent = 'It is the 28th again. Not your birthday, but I noticed anyway.';
      } else {
        away.hidden = true;
      }
    }

    return {
      start: function () {
        try {
          dateEl.textContent = new Date().toLocaleDateString(undefined,
            { weekday: 'long', day: 'numeric', month: 'long' });
        } catch (e) { dateEl.textContent = 'Today'; }

        diary.moods().forEach(function (m, j) {
          var b = document.createElement('button');
          b.type = 'button'; b.className = 't-mood m' + (j + 1);
          b.innerHTML = '<i class="mi m' + (j + 1) + '"></i><b>' + m.label + '</b>';
          b.addEventListener('click', function () {
            diary.set(j); renderMood(); buzz(7); sfx.chime(j + 1);
            progress.mark('mood');
            if (j === 0 || j === 4) confetti.petals(8);
          });
          moodHost.appendChild(b);
        });

        chocBtn.addEventListener('click', function () {
          var info = calendar.todayInfo();
          calendar.open(info.n);
          note.hidden = false;
          note.innerHTML = info.note;
          renderChoc();
        });

        renderChoc(); renderMood(); renderStreak();
      },
      refresh: function () { renderChoc(); renderMood(); }
    };
  })();

  /* ============================================================
     WHAT SHE HAS FOUND — so the contents doubles as a map
     ============================================================ */

  var progress = (function () {
    var KEY = 'lana-2808-found';
    var set = {};
    try { set = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) {}
    var listeners = [];
    return {
      mark: function (k) {
        if (set[k]) return;
        set[k] = 1;
        try { localStorage.setItem(KEY, JSON.stringify(set)); } catch (e) {}
        listeners.forEach(function (f) { f(); });
      },
      has: function (k) { return !!set[k]; },
      count: function () { var n = 0; for (var k in set) if (set[k]) n++; return n; },
      onChange: function (f) { listeners.push(f); }
    };
  })();


  /* ============================================================
     NIGHT — picks itself by the clock the first time, then obeys her
     ============================================================ */

  var mode = (function () {
    var KEY = 'lana-2808-mode', btn = $('#mode-btn'), root = document.documentElement;
    function isNight() { var h = new Date().getHours(); return h >= 20 || h < 6; }
    function apply(m) {
      if (m === 'night') root.setAttribute('data-mode', 'night');
      else root.removeAttribute('data-mode');
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', m === 'night' ? '#16100A' : '#F7F1E6');
    }
    return {
      start: function () {
        var saved = null;
        try { saved = localStorage.getItem(KEY); } catch (e) {}
        apply(saved || (isNight() ? 'night' : 'day'));
        btn.addEventListener('click', function () {
          var next = root.getAttribute('data-mode') === 'night' ? 'day' : 'night';
          apply(next);
          try { localStorage.setItem(KEY, next); } catch (e) {}
          buzz(6); sfx.chime(next === 'night' ? 1 : 5);
        });
      },
      show: function () { btn.classList.add('show'); }
    };
  })();

  /* ============================================================
     RAIN — synthesised, looping, hers to switch on
     ============================================================ */

  var rain = (function () {
    // A real recording of light rain, trimmed to a seamless 39s loop.
    // The distant thunder is still synthesised on top, because the
    // recording has none and she asked for a little.
    var btn = $('#rain-btn'), el = $('#a-rain');
    var ac = null, gain = null, src = null, on = false, wired = false;
    var thunderTimer = null;

    function ctx() {
      if (!ac) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        try { ac = new AC(); } catch (e) { ac = null; return null; }
      }
      if (ac.state === 'suspended') { try { ac.resume(); } catch (e) {} }
      return ac;
    }

    function wire() {
      if (wired || !ac) return; wired = true;
      gain = ac.createGain(); gain.gain.value = 0.0001; gain.connect(ac.destination);
      try {
        src = ac.createMediaElementSource(el);
        src.connect(gain);
      } catch (e) { src = null; }        // fall back to element volume below
      scheduleThunder();
    }

    function level(v, ms) {
      if (gain && ac) {
        var t = ac.currentTime;
        try {
          gain.gain.cancelScheduledValues(t);
          gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), t);
          gain.gain.exponentialRampToValueAtTime(Math.max(v, 0.0001), t + ms / 1000);
          return;
        } catch (e) {}
      }
      try { el.volume = clamp(v, 0, 1); } catch (e) {}
    }

    // distant, and rare — two parts: the crack, then the long roll
    function thunder(close) {
      if (!ac || !on) return;
      var t = ac.currentTime + 0.05;
      var dur = close ? 3.4 : 5.2;
      var n = Math.floor(ac.sampleRate * dur);
      var b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
      var last = 0;
      for (var i = 0; i < n; i++) {
        var w = Math.random() * 2 - 1;
        last = (last + 0.008 * w) / 1.008;
        d[i] = last * 6;
      }
      var s2 = ac.createBufferSource(); s2.buffer = b;
      var lp = ac.createBiquadFilter(); lp.type = 'lowpass';
      lp.frequency.setValueAtTime(close ? 620 : 300, t);
      lp.frequency.exponentialRampToValueAtTime(48, t + dur * 0.8);
      var g = ac.createGain();
      var peak = close ? 0.26 : 0.11;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + (close ? 0.10 : 0.5));
      g.gain.exponentialRampToValueAtTime(peak * 0.45, t + dur * 0.35);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s2.connect(lp); lp.connect(g); g.connect(ac.destination);
      s2.start(t); s2.stop(t + dur + 0.1);
    }

    function scheduleThunder() {
      clearTimeout(thunderTimer);
      var wait = 42000 + Math.random() * 68000;
      thunderTimer = setTimeout(function () {
        if (on) thunder(Math.random() < 0.22);
        scheduleThunder();
      }, wait);
    }

    return {
      start: function () {
        btn.addEventListener('click', function () {
          ctx(); wire();
          on = !on;
          if (on) {
            var p = el.play(); if (p && p.catch) p.catch(function () {});
            level(0.55, 1800);
            setTimeout(function () { if (on) thunder(false); }, 8000);
          } else {
            level(0.0001, 800);
            setTimeout(function () { if (!on) { try { el.pause(); } catch (e) {} } }, 900);
          }
          btn.classList.toggle('on', on);
          buzz(5);
          progress.mark('rain');
        });
      },
      show: function () { btn.classList.add('show'); },
      duck: function (yes) { if (on) level(yes ? 0.10 : 0.55, 400); },
      isOn: function () { return on; }
    };
  })();


  /* ============================================================
     THE STREAK — how many days running she has opened this
     ============================================================ */

  var streak = (function () {
    var KEY = 'lana-2808-visits';
    var days = 0, gap = 0;

    function key(d) { return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
    function midnight(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); }

    return {
      start: function () {
        var log = [];
        try { log = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) {}
        var now = new Date(), t = key(now);
        var last = log.length ? log[log.length - 1] : null;
        if (last) {
          var p = last.split('-');
          gap = Math.round((midnight(now) - midnight(new Date(+p[0], +p[1] - 1, +p[2]))) / 86400000);
        }
        if (last !== t) { log.push(t); if (log.length > 400) log = log.slice(-400); }
        try { localStorage.setItem(KEY, JSON.stringify(log)); } catch (e) {}

        // count backwards while the days are consecutive
        days = 1;
        for (var i = log.length - 2; i >= 0; i--) {
          var a = log[i + 1].split('-'), b = log[i].split('-');
          var da = midnight(new Date(+a[0], +a[1] - 1, +a[2]));
          var db = midnight(new Date(+b[0], +b[1] - 1, +b[2]));
          if (Math.round((da - db) / 86400000) === 1) days++; else break;
        }
      },
      days: function () { return days; },
      gap: function () { return gap; }
    };
  })();

  /* ============================================================
     THE TIME CAPSULE — sealed until next 28 August
     ============================================================ */

  var capsule = (function () {
    var write = $('#capsule-write'), locked = $('#capsule-locked');
    var ta = $('#capsule-text'), note = $('#capsule-note'), copy = $('#capsule-copy');
    var when = $('#capsule-when'), sub = $('#capsule-sub');
    var openBox = $('#capsule-open'), dateEl = $('#capsule-date'), bodyEl = $('#capsule-body');
    var KEY = 'lana-2808-capsule';

    function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
    function nextBirthday(from) {
      var y = from.getFullYear();
      var t = new Date(y, 7, 28, 0, 0, 0, 0);
      if (from >= t) t = new Date(y + 1, 7, 28, 0, 0, 0, 0);
      return t;
    }

    function render() {
      var v = load();
      if (!v) { write.hidden = false; locked.hidden = true; return; }
      write.hidden = true; locked.hidden = false;
      var open = new Date(v.opensAt), now = new Date();
      if (now >= open) {
        when.textContent = 'It opened';
        sub.textContent = 'You wrote this a year ago. Here it is.';
        openBox.hidden = false;
        try {
          dateEl.textContent = 'Sealed ' + new Date(v.at).toLocaleDateString(undefined,
            { day: 'numeric', month: 'long', year: 'numeric' });
        } catch (e) { dateEl.textContent = 'Sealed last year'; }
        bodyEl.textContent = v.t;
        copy.textContent = '';
      } else {
        var d = Math.ceil((open - now) / 86400000);
        when.textContent = d + (d === 1 ? ' day to go' : ' days to go');
        sub.textContent = 'Sealed. You cannot read it and neither can he.';
        openBox.hidden = true;
        copy.textContent = 'It opens on the 28th of August. Not a day sooner.';
      }
    }

    return {
      start: function () {
        $('#capsule-seal').addEventListener('click', function () {
          var v = ta.value.trim();
          if (!v) { note.textContent = 'Write something first.'; note.classList.add('show'); return; }
          var opensAt = nextBirthday(new Date()).getTime();
          try { localStorage.setItem(KEY, JSON.stringify({ t: v, at: Date.now(), opensAt: opensAt })); } catch (e) {}
          sfx.crack(); buzz([14, 44, 14]); confetti.petals(12);
          progress.mark('capsule');
          render();
        });
        render();
      }
    };
  })();


  /* ============================================================
     THE ARCADE — ten games, one stage, only one alive at a time
     ============================================================ */

  var arcade = (function () {
    var tabsEl = $('#arc-tabs'), stage = $('#arc-stage'), say = $('#arc-say');
    var cleanup = null;

    function clear() {
      if (cleanup) { try { cleanup(); } catch (e) {} cleanup = null; }
      stage.innerHTML = ''; say.textContent = '';
    }
    function h(tag, cls, html) {
      var e = document.createElement(tag);
      if (cls) e.className = cls;
      if (html != null) e.innerHTML = html;
      return e;
    }
    function tell(t) { say.innerHTML = t; }

    /* ---------- 1. memory ---------- */
    function memory() {
      var srcs = $$('.plate img').map(function (n) { return n.src; }).slice(0, 5);
      if (!srcs.length) { tell('No photographs loaded.'); return; }
      var deck = srcs.concat(srcs).sort(function () { return Math.random() - 0.5; });
      var grid = h('div', 'mem-grid');
      var up = [], done = 0, busy = false, tries = 0;
      deck.forEach(function (src) {
        var b = h('button', 'mem-card');
        b.type = 'button';
        b.innerHTML = '<span class="mem-in"><span class="mem-face a"></span>' +
                      '<span class="mem-face b"><img src="' + src + '" alt=""></span></span>';
        b.dataset.src = src;
        b.addEventListener('click', function () {
          if (busy || b.classList.contains('up') || b.classList.contains('got')) return;
          b.classList.add('up'); up.push(b); sfx.chime(up.length);
          if (up.length === 2) {
            busy = true; tries++;
            var same = up[0].dataset.src === up[1].dataset.src;
            setTimeout(function () {
              if (same) {
                up.forEach(function (c) { c.classList.add('got'); });
                done++;
                if (done === srcs.length) {
                  tell('All of them, in ' + tries + ' goes. You do not have fish memory at all.');
                  confetti.petals(14); progress.mark('arcade');
                }
              } else up.forEach(function (c) { c.classList.remove('up'); });
              up = []; busy = false;
            }, same ? 340 : 720);
          }
        });
        grid.appendChild(b);
      });
      stage.appendChild(grid);
      tell('Five pairs. Allegedly your weak spot.');
    }

    /* ---------- 2. slide puzzle ---------- */
    function slide() {
      var img = $$('.plate img')[0];
      if (!img) { tell('No photograph loaded.'); return; }
      var order = [0,1,2,3,4,5,6,7,8], blank = 8;
      var grid = h('div', 'slide-grid');
      var tiles = [];
      for (var i = 0; i < 9; i++) {
        var b = h('button', 'slide-t'); b.type = 'button';
        grid.appendChild(b); tiles.push(b);
      }
      function paint() {
        tiles.forEach(function (t, idx) {
          var v = order[idx];
          if (v === 8) { t.classList.add('blank'); t.style.backgroundImage = 'none'; return; }
          t.classList.remove('blank');
          t.style.backgroundImage = 'url(' + img.src + ')';
          t.style.backgroundPosition = (v % 3) * 50 + '% ' + Math.floor(v / 3) * 50 + '%';
        });
      }
      function canMove(i) {
        var r = Math.floor(i / 3), c = i % 3, br = Math.floor(blank / 3), bc = blank % 3;
        return (r === br && Math.abs(c - bc) === 1) || (c === bc && Math.abs(r - br) === 1);
      }
      function move(i) {
        if (!canMove(i)) return false;
        var t = order[i]; order[i] = order[blank]; order[blank] = t; blank = i;
        paint(); return true;
      }
      for (var k = 0; k < 120; k++) {
        var opts = [];
        for (var j = 0; j < 9; j++) if (canMove(j)) opts.push(j);
        move(opts[(Math.random() * opts.length) | 0]);
      }
      tiles.forEach(function (t, idx) {
        t.addEventListener('click', function () {
          if (!move(idx)) return;
          buzz(4); sfx.chime(idx);
          var win = order.every(function (v, n) { return v === n; });
          if (win) { tell('Solved. That was her face all along.'); confetti.petals(12); progress.mark('arcade'); }
        });
      });
      paint();
      stage.appendChild(grid);
      tell('Slide them back into her.');
    }

    /* ---------- 3. wheel ---------- */
    function wheel() {
      var SLICES = ['a long call', 'coffee on me', 'a photo of you', 'chocolate', 'a song',
                    'an early night', 'one coupon', 'a walk in the rain'];
      var wrap = h('div', 'wheel-wrap');
      var cv = h('canvas'); cv.id = 'wheel-canvas';
      wrap.appendChild(h('div', 'wheel-pin')); wrap.appendChild(cv);
      stage.appendChild(wrap);
      var btn = h('button', 'btn solid', 'Spin'); btn.type = 'button';
      stage.appendChild(btn);

      var d = fit(cv), W = d.w, H = d.h, C = d.x, R = Math.min(W, H) / 2 - 2;
      var step = 6.2832 / SLICES.length;
      for (var i = 0; i < SLICES.length; i++) {
        C.beginPath(); C.moveTo(W / 2, H / 2);
        C.arc(W / 2, H / 2, R, i * step - 1.5708, (i + 1) * step - 1.5708); C.closePath();
        C.fillStyle = i % 2 ? '#EFE2CD' : '#E3D0B2';
        if (i % 4 === 1) C.fillStyle = '#D9B44E';
        C.fill();
        C.strokeStyle = 'rgba(110,82,14,.35)'; C.lineWidth = 1; C.stroke();
        C.save();
        C.translate(W / 2, H / 2); C.rotate(i * step - 1.5708 + step / 2);
        C.fillStyle = '#3A2113'; C.font = '600 ' + Math.round(W * 0.045) + 'px Jost, sans-serif';
        C.textAlign = 'right'; C.textBaseline = 'middle';
        C.fillText(SLICES[i], R - 8, 0);
        C.restore();
      }
      var spinning = false, turn = 0;
      btn.addEventListener('click', function () {
        if (spinning) return; spinning = true;
        var pick = (Math.random() * SLICES.length) | 0;
        turn += 4 * 6.2832 + (6.2832 - (pick + 0.5) * step);
        cv.style.transform = 'rotate(' + turn + 'rad)';
        buzz(8);
        setTimeout(function () {
          spinning = false;
          tell('It landed on <b>' + SLICES[pick] + '</b>. He owes you that now.');
          sfx.chime(pick); confetti.petals(8); progress.mark('arcade');
        }, 3500);
      });
      tell('One spin, one thing he owes you.');
    }

    /* ---------- 4. would you rather ---------- */
    function rather() {
      var Q = [
        ['A whole day of rain', 'A whole day of sun'],
        ['Coffee for the rest of your life', 'Chocolate for the rest of your life'],
        ['Sleep in until noon', 'Watch a sunrise'],
        ['A long call at 3am', 'A short one every morning'],
        ['Somewhere with a sea', 'Somewhere with mountains'],
        ['Be told the truth immediately', 'Be surprised later'],
        ['Sing in front of everyone', 'Sing only for one person']
      ];
      var i = 0;
      var row = h('div', 'field-row'); row.style.justifyContent = 'center';
      var a = h('button', 'btn', ''), b2 = h('button', 'btn', '');
      a.type = 'button'; b2.type = 'button';
      row.appendChild(a); row.appendChild(h('span', 'arc-sub', 'or')); row.appendChild(b2);
      stage.appendChild(row);
      function next() {
        if (i >= Q.length) { tell('That is all of them. I was taking notes.'); progress.mark('arcade'); return; }
        a.textContent = Q[i][0]; b2.textContent = Q[i][1];
        tell('Pick one. No thinking.');
      }
      function pick(n) {
        if (i >= Q.length) return;
        tell('<b>' + Q[i][n] + '</b>. Noted, and slightly judged.');
        i++; buzz(6); sfx.chime(i);
        setTimeout(next, 1100);
      }
      a.addEventListener('click', function () { pick(0); });
      b2.addEventListener('click', function () { pick(1); });
      next();
    }

    /* ---------- 5. truth or dare ---------- */
    function truthDare() {
      var T = ['What is the last thing that made you cry laughing?',
               'What do you actually think about when you cannot sleep?',
               'Name one thing you have never told anybody.',
               'What is the nicest thing anyone has said about you?',
               'What are you pretending not to want?'];
      var D = ['Send a voice note singing one line. Any line.',
               'Text the last person you thought about, right now.',
               'Take a photograph of whatever is in front of you and keep it.',
               'Say one good thing about yourself out loud.',
               'Go and drink a full glass of water before you read anything else.'];
      var row = h('div', 'field-row'); row.style.justifyContent = 'center';
      var t = h('button', 'btn solid', 'Truth'), d2 = h('button', 'btn', 'Dare');
      t.type = 'button'; d2.type = 'button';
      row.appendChild(t); row.appendChild(d2);
      stage.appendChild(row);
      function go(list, label) {
        tell('<b>' + label + '</b> &mdash; ' + list[(Math.random() * list.length) | 0]);
        buzz(7); sfx.chime(3); progress.mark('arcade');
      }
      t.addEventListener('click', function () { go(T, 'Truth'); });
      d2.addEventListener('click', function () { go(D, 'Dare'); });
      tell('Choose one. It is only me watching.');
    }

    /* ---------- 6. fortune cookie ---------- */
    function cookie() {
      var F = ['Someone is going to be unreasonably happy to hear from you today.',
               'The thing you are avoiding takes eleven minutes.',
               'Say yes to the next small invitation.',
               'You will be right about something and too polite to say so.',
               'Good news arrives sideways, from somebody you had forgotten.',
               'Whatever you are worried about tonight will be smaller by Thursday.',
               'Eat the chocolate. That is the whole fortune.'];
      var b = h('button', 'cookie', '<i></i>'); b.type = 'button';
      stage.appendChild(b);
      b.addEventListener('click', function () {
        b.classList.add('open'); sfx.crack(); buzz([10, 30, 10]);
        tell(F[(Math.random() * F.length) | 0]);
        progress.mark('arcade');
      });
      tell('Crack it.');
    }

    /* ---------- 7. pick a box ---------- */
    function boxes() {
      var P = ['A coupon of your choosing. Any of the seven.',
               'One song, sung badly, on request.',
               'Whatever you were about to say no to — say yes, it is covered.',
               'A chocolate you do not have to wait for. Go and take tomorrow’s.',
               'Nothing. Sorry. But you picked it, and that was the fun part.',
               'One favour, no questions, redeemable forever.'];
      var wrap = h('div', 'boxes');
      for (var i = 0; i < 3; i++) {
        (function () {
          var b = h('button', 'gbox'); b.type = 'button';
          b.addEventListener('click', function () {
            if (wrap.classList.contains('spent')) return;
            wrap.classList.add('spent'); b.classList.add('picked');
            buzz(9); sfx.chime(4); confetti.petals(10);
            tell(P[(Math.random() * P.length) | 0]);
            progress.mark('arcade');
          });
          wrap.appendChild(b);
        })();
      }
      stage.appendChild(wrap);
      tell('Three boxes. One is genuinely empty. Pick anyway.');
    }

    /* ---------- 8. piano ---------- */
    function piano() {
      var ac = null;
      function ctx() {
        if (!ac) { var AC = window.AudioContext || window.webkitAudioContext; if (AC) ac = new AC(); }
        if (ac && ac.state === 'suspended') { try { ac.resume(); } catch (e) {} }
        return ac;
      }
      function play(f) {
        if (!ctx()) return;
        var t = ac.currentTime;
        var o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
        var o2 = ac.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 2;
        var g = ac.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.22, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
        var g2 = ac.createGain(); g2.gain.value = 0.06;
        o.connect(g); o2.connect(g2); g2.connect(g); g.connect(ac.destination);
        o.start(t); o2.start(t); o.stop(t + 1.8); o2.stop(t + 1.8);
      }
      var W = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];
      var B = [277.18, 311.13, null, 369.99, 415.30, 466.16, null];
      var keys = h('div', 'keys');
      W.forEach(function (f, i) {
        var k = h('button', 'wkey'); k.type = 'button';
        k.addEventListener('pointerdown', function () { play(f); k.classList.add('on'); buzz(3); });
        k.addEventListener('pointerup', function () { k.classList.remove('on'); });
        k.addEventListener('pointerleave', function () { k.classList.remove('on'); });
        keys.appendChild(k);
      });
      B.forEach(function (f, i) {
        if (!f) return;
        var k = h('button', 'bkey'); k.type = 'button';
        k.style.left = ((i + 1) * (100 / 8) - 4.5) + '%';
        k.addEventListener('pointerdown', function () { play(f); k.classList.add('on'); buzz(3); });
        k.addEventListener('pointerup', function () { k.classList.remove('on'); });
        k.addEventListener('pointerleave', function () { k.classList.remove('on'); });
        keys.appendChild(k);
      });
      stage.appendChild(keys);
      cleanup = function () { try { if (ac) ac.close(); } catch (e) {} };
      tell('Eight keys. You can sing, so this should be beneath you.');
      progress.mark('arcade');
    }

    /* ---------- 9. hold a note ---------- */
    function hold() {
      var best = 0;
      try { best = +(localStorage.getItem('lana-2808-hold') || 0); } catch (e) {}
      var time = h('p', 'hold-time', '0.0');
      var bar = h('div', 'hold-bar', '<div class="hold-fill"></div>');
      var btn = h('button', 'btn solid', 'Start'); btn.type = 'button';
      var note = h('p', 'arc-sub', best ? 'best ' + best.toFixed(1) + 's' : '');
      stage.appendChild(time); stage.appendChild(bar); stage.appendChild(btn); stage.appendChild(note);
      var fill = $('.hold-fill', bar);
      var ac = null, stream = null, raf = 0, running = false, startedAt = 0, quiet = 0;

      function stop(final) {
        running = false; cancelAnimationFrame(raf);
        try { if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
        try { if (ac) ac.close(); } catch (e) {}
        stream = null; ac = null;
        btn.textContent = 'Again';
        if (final > best) {
          best = final; try { localStorage.setItem('lana-2808-hold', String(best)); } catch (e) {}
          note.textContent = 'best ' + best.toFixed(1) + 's';
          tell('<b>' + final.toFixed(1) + ' seconds.</b> New best. Show-off.');
          confetti.petals(10);
        } else {
          tell(final.toFixed(1) + ' seconds. Best is still ' + best.toFixed(1) + '.');
        }
        progress.mark('arcade');
      }

      btn.addEventListener('click', function () {
        if (running) { stop((performance.now() - startedAt) / 1000); return; }
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          tell('Your browser will not let it listen.'); return;
        }
        navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
          .then(function (st) {
            stream = st;
            var AC = window.AudioContext || window.webkitAudioContext;
            ac = new AC();
            var an = ac.createAnalyser(); an.fftSize = 1024;
            ac.createMediaStreamSource(st).connect(an);
            var buf = new Uint8Array(an.fftSize);
            running = true; startedAt = 0; quiet = 0;
            btn.textContent = 'Stop';
            tell('Take a breath and go.');
            (function poll() {
              if (!running) return;
              raf = requestAnimationFrame(poll);
              an.getByteTimeDomainData(buf);
              var sum = 0;
              for (var i = 0; i < buf.length; i++) { var v = (buf[i] - 128) / 128; sum += v * v; }
              var rms = Math.sqrt(sum / buf.length);
              fill.style.width = clamp(rms * 380, 0, 100) + '%';
              if (rms > 0.055) {
                if (!startedAt) startedAt = performance.now();
                quiet = 0;
                time.textContent = ((performance.now() - startedAt) / 1000).toFixed(1);
              } else if (startedAt) {
                quiet++;
                if (quiet > 18) stop((performance.now() - startedAt) / 1000 - 0.3);
              }
            })();
          })
          .catch(function () { tell('It cannot hear you without permission.'); });
      });
      cleanup = function () { stop(0); };
      tell('Hold one note. It times you until you stop.');
    }

    /* ---------- 10. breathing ---------- */
    function breathe() {
      var ring = h('div', 'breathe-ring', '<span class="breathe-word">in</span>');
      stage.appendChild(ring);
      var word = $('.breathe-word', ring);
      var phase = 0, timer = null;
      var STEPS = [['in', 4000, true], ['hold', 2000, true], ['out', 6000, false], ['', 1000, false]];
      function step() {
        var s2 = STEPS[phase % STEPS.length];
        word.textContent = s2[0];
        ring.classList.toggle('big', s2[2]);
        phase++;
        timer = setTimeout(step, s2[1]);
      }
      step();
      cleanup = function () { clearTimeout(timer); };
      tell('For the days you press <b>heavy</b>. Follow the circle, four rounds is enough.');
      progress.mark('arcade');
    }

    var GAMES = [
      ['Memory', memory], ['Puzzle', slide], ['Wheel', wheel], ['Rather', rather],
      ['Truth', truthDare], ['Cookie', cookie], ['Boxes', boxes], ['Piano', piano],
      ['Hold', hold], ['Breathe', breathe]
    ];

    return {
      start: function () {
        GAMES.forEach(function (g, i) {
          var b = h('button', 'arc-tab', g[0]); b.type = 'button';
          b.addEventListener('click', function () {
            $$('.arc-tab').forEach(function (t) { t.classList.remove('on'); });
            b.classList.add('on');
            clear(); g[1]();
            buzz(4);
          });
          tabsEl.appendChild(b);
        });
        // nothing runs until she picks one
        stage.appendChild(h('p', 'arc-h', 'Pick one.'));
        stage.appendChild(h('p', 'arc-sub', 'ten of them'));
        new IntersectionObserver(function (es) {
          if (!es[0].isIntersecting && cleanup) { try { cleanup(); } catch (e) {} cleanup = null; }
        }, { threshold: 0.05 }).observe(stage);
      }
    };
  })();


  /* ============================================================
     THREE MORE LETTERS — one a week for the first three weeks
     ============================================================ */

  var moreLetters = (function () {
    var list = $('#more-list'), openBox = $('#more-open');
    var whenEl = $('#more-when'), bodyEl = $('#more-body'), copy = $('#more-copy');
    var L = [
      { day: 7, title: 'After a week', text:
        'A week in.\n\n' +
        'I have been watching the little counter go up, which is a strange way to know somebody is ' +
        'thinking about you. Seven mornings. I will take it.\n\n' +
        'I want to say something I left out of the first letter because it felt like too much on day one: ' +
        'the reason I built all this is not that I am good at building things. It is that I could not think ' +
        'of any other way to hand you something you could keep.\n\n' +
        'Flowers die. This does not.' },
      { day: 14, title: 'After two weeks', text:
        'Two weeks.\n\n' +
        'By now you have almost certainly forgotten half the notes, which is the funniest possible outcome ' +
        'and exactly what I planned for.\n\n' +
        'Here is the honest middle-of-the-month version. Nothing about how I feel has moved. Not up, not ' +
        'down. It has just quietly stayed, the way it has for a long time now, whether or not either of us ' +
        'said anything about it.\n\n' +
        'You do not have to do anything with that. I just wanted it written down where you could find it.' },
      { day: 21, title: 'After three weeks', text:
        'Three weeks.\n\n' +
        'This is the last of the long ones, so I will use it properly.\n\n' +
        'Thank you for opening this every day. That is not a small thing — you forget most things, and you ' +
        'did not forget this. I noticed. I notice most things where you are concerned.\n\n' +
        'Whatever happens between us, or does not, you will always have been the person somebody built a ' +
        'whole month for. Keep the link. It does not expire and neither does the offer inside it.\n\n' +
        'Go and be twenty-something and impossible.' }
    ];
    var KEY = 'lana-2808-more';

    function days() {
      try {
        var st = JSON.parse(localStorage.getItem('lana-2808-cal') || 'null');
        if (!st || !st.start) return 1;
        var x = new Date(); x.setHours(0, 0, 0, 0);
        return Math.floor((x.getTime() - st.start) / 86400000) + 1;
      } catch (e) { return 1; }
    }
    function seen() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } }

    function render() {
      var d = days(), open = seen();
      list.innerHTML = '';
      var next = null;
      L.forEach(function (l, i) {
        var unlocked = d >= l.day;
        if (!unlocked && next === null) next = l.day - d;
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'more-item' + (unlocked ? '' : ' locked');
        b.innerHTML = '<span class="w">' + (unlocked ? '&#9998;' : '&#128274;') + '</span>' +
                      '<b>' + l.title + '</b>' +
                      '<em>' + (unlocked ? (open.indexOf(i) === -1 ? 'new' : 'read') : 'day ' + l.day) + '</em>';
        if (unlocked) {
          b.addEventListener('click', function () {
            var o = seen(); if (o.indexOf(i) === -1) { o.push(i); try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
            openBox.hidden = false;
            whenEl.textContent = l.title;
            bodyEl.textContent = l.text;
            sfx.crack(); buzz(8); progress.mark('letters');
            render();
          });
        }
        list.appendChild(b);
      });
      copy.textContent = next === null
        ? 'All three are open.'
        : 'The next one unlocks in ' + next + (next === 1 ? ' day.' : ' days.');
    }
    return { start: render };
  })();

  /* ============================================================
     THINGS SHE HAS ACTUALLY SAID — only real ones go in here
     ============================================================ */

  (function said() {
    var host = $('#said');
    var Q = [
      ['blah', 'roughly nine times a day'],
      ['Morning \u{1F97A}', 'sent at an hour that was not morning']
    ];
    Q.forEach(function (q) {
      var li = document.createElement('li');
      li.innerHTML = '&ldquo;' + q[0] + '&rdquo;<span>' + q[1] + '</span>';
      host.appendChild(li);
    });
  })();

  /* ============================================================
     HER NAME, DOWNWARDS
     ============================================================ */

  (function acrostic() {
    var host = $('#acrostic');
    var A = [
      ['L', 'Late. Always. And somehow never actually missed anything that mattered.'],
      ['A', 'Awake at hours no reasonable person keeps, talking to me.'],
      ['N', 'Never once boring. Not one single day of it.'],
      ['A', 'And still, out of everybody, the one I would tell first.']
    ];
    A.forEach(function (a) {
      var li = document.createElement('li');
      li.innerHTML = '<span class="c">' + a[0] + '</span><span class="l">' + a[1] + '</span>';
      host.appendChild(li);
    });
  })();

  /* ============================================================
     THE SKY, ACCORDING TO NOBODY QUALIFIED
     ============================================================ */

  (function horoscope() {
    var LINES = [
      'Someone will misunderstand you today and it will be entirely their fault.',
      'Mercury is doing something. Take the nap anyway.',
      'A small purchase is justified. The stars have signed off on it.',
      'You will be right and you will be polite about it, which is worse for them.',
      'Avoid making any decision before your second coffee. The universe insists.',
      'Somebody is going to be pleased to hear from you. Go first.',
      'Your patience will be tested by a person who does not deserve it. Ration it.',
      'An old song will catch you off guard. Let it.',
      'Today rewards doing nothing impressive whatsoever.',
      'You are owed something. Ask for it.',
      'The evening is better than the morning. Hold on until then.',
      'Say the thing. The chart is very clear about this.'
    ];
    var LUCKY = ['gold', 'rose red', 'coffee brown', 'cream', 'moon white'];
    var THING = ['a long shower', 'the second chocolate', 'a window seat',
                 'saying no', 'a voice note', 'the good mug'];

    var d = new Date();
    var seed = d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate();
    function pick(arr, salt) { return arr[(seed * 9301 + salt * 49297) % 233280 % arr.length]; }

    try {
      $('#horo-date').textContent = d.toLocaleDateString(undefined,
        { weekday: 'long', day: 'numeric', month: 'long' });
    } catch (e) { $('#horo-date').textContent = 'Today'; }
    $('#horo-text').textContent = pick(LINES, 1);
    $('#horo-lucky').textContent = 'Lucky colour ' + pick(LUCKY, 2) + ' · lucky thing ' + pick(THING, 3);
  })();


  /* ============================================================
     QR — a real encoder (byte mode, ECC level L). Written out here
     because nothing may be fetched from outside this file.
     ============================================================ */

  /* ============================================================
     QR — the matrix is generated at BUILD time by a real encoder and
     inlined here as a bitmap. Hand-writing the spec produced codes that
     would not scan, and an unscannable QR is worse than none.
     ============================================================ */

  var QR = (function () {
    var DATA = __QRDATA__;      // { size, bits: "0101..." }
    return {
      draw: function (cv, scale) {
        if (!DATA || !DATA.size) return false;
        var n = DATA.size, s2 = scale || 5, quiet = 4;
        cv.width = (n + quiet * 2) * s2; cv.height = cv.width;
        var x = cv.getContext('2d');
        x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height);
        x.fillStyle = '#2E1D11';
        for (var r = 0; r < n; r++) for (var c = 0; c < n; c++)
          if (DATA.bits.charAt(r * n + c) === '1')
            x.fillRect((c + quiet) * s2, (r + quiet) * s2, s2, s2);
        return true;
      }
    };
  })();



  /* ============================================================
     KEEPSAKES — everything she can take off the page
     ============================================================ */

  var keeps = (function () {
    var host = $('#keeps'), note = $('#keeps-note');

    function say(t) { note.textContent = t; note.classList.add('show'); }

    function offer(filename, data, canvasForFallback) {
      if (!window.claude || typeof window.claude.use !== 'function') {
        if (canvasForFallback) showIt(canvasForFallback);
        else say('Saving is not available here.');
        return;
      }
      window.claude.use('downloads').then(function (dl) {
        if (!dl) { if (canvasForFallback) showIt(canvasForFallback); else say('Saving is not available here.'); return; }
        dl.save({ filename: filename, data: data }).then(function () {
          say('Saved. It is yours now.'); sfx.chime(6); buzz(8); progress.mark('keeps');
        }, function (err) {
          if (err && err.code === 'declined') { say('No problem.'); return; }
          if (canvasForFallback) showIt(canvasForFallback); else say('That did not work.');
        });
      }, function () { if (canvasForFallback) showIt(canvasForFallback); });
    }
    function showIt(cv) {
      $('#lightbox-img').src = cv.toDataURL('image/png');
      $('#lightbox').classList.add('open');
      $('#lightbox').setAttribute('aria-hidden', 'false');
      document.body.classList.add('is-locked');
      say('Hold the picture to save it to your phone.');
    }

    function paper(W, H) {
      var c = document.createElement('canvas'); c.width = W; c.height = H;
      var x = c.getContext('2d');
      var g = x.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#FFFBF4'); g.addColorStop(0.5, '#F7F1E6'); g.addColorStop(1, '#EFE2CD');
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.strokeStyle = 'rgba(168,128,28,0.45)'; x.lineWidth = 2;
      x.strokeRect(40, 40, W - 80, H - 80);
      x.strokeStyle = 'rgba(168,128,28,0.2)'; x.lineWidth = 1;
      x.strokeRect(56, 56, W - 112, H - 112);
      return { c: c, x: x };
    }
    function wrap(x, text, maxW) {
      var words = text.split(' '), lines = [], line = '';
      for (var i = 0; i < words.length; i++) {
        var t = line ? line + ' ' + words[i] : words[i];
        if (x.measureText(t).width > maxW && line) { lines.push(line); line = words[i]; }
        else line = t;
      }
      if (line) lines.push(line);
      return lines;
    }

    /* ---- the letter, as a picture ---- */
    function letterImage() {
      var text = $('#letter-body').textContent || '';
      if (!text.trim()) { say('Read the letter first — it has not been written out yet.'); return; }
      var W = 1000, x0 = 110, maxW = W - x0 * 2;
      var probe = document.createElement('canvas').getContext('2d');
      probe.font = '400 34px Caveat, cursive';
      var paras = text.split('\n\n'), all = [];
      paras.forEach(function (para, i) {
        wrap(probe, para.replace(/\n/g, ' '), maxW).forEach(function (l) { all.push(l); });
        if (i < paras.length - 1) all.push('');
      });
      var H = 260 + all.length * 52 + 200;
      var p = paper(W, H), x = p.x;
      x.font = '400 26px Jost, sans-serif'; x.fillStyle = '#6E520E';
      x.textAlign = 'center'; x.fillText('U N S E N T   U N T I L   N O W', W / 2, 150);
      x.strokeStyle = '#A8121F'; x.lineWidth = 3;
      x.beginPath(); x.moveTo(x0 - 24, 200); x.lineTo(x0 - 24, 200 + all.length * 52); x.stroke();
      x.textAlign = 'left'; x.font = '400 34px Caveat, cursive'; x.fillStyle = '#2E1D11';
      all.forEach(function (l, i) { x.fillText(l, x0, 250 + i * 52); });
      x.font = '400 76px "Pinyon Script", cursive'; x.fillStyle = '#A8121F';
      x.fillText('Arian', x0, 250 + all.length * 52 + 90);
      p.c.toBlob(function (b) { if (b) offer('lana-letter.png', b, p.c); }, 'image/png');
    }

    /* ---- a story card, 9:16 ---- */
    function storyCard() {
      var W = 1080, H = 1920;
      var p = paper(W, H), x = p.x;
      var img = $('.portrait img');
      x.textAlign = 'center';
      x.font = '400 130px "Pinyon Script", cursive'; x.fillStyle = '#A8121F';
      x.fillText('Happy Birthday', W / 2, 330);
      var pw = 560, ph = 720, px = (W - pw) / 2, py = 400;
      x.save();
      x.beginPath();
      x.moveTo(px, py + pw / 2);
      x.arc(px + pw / 2, py + pw / 2, pw / 2, Math.PI, 0);
      x.lineTo(px + pw, py + ph); x.lineTo(px, py + ph); x.closePath();
      x.strokeStyle = 'rgba(168,128,28,0.5)'; x.lineWidth = 4; x.stroke();
      x.clip();
      if (img && img.naturalWidth) {
        var s2 = Math.max(pw / img.naturalWidth, ph / img.naturalHeight);
        var dw = img.naturalWidth * s2, dh = img.naturalHeight * s2;
        x.drawImage(img, px + (pw - dw) / 2, py + (ph - dh) * 0.2, dw, dh);
      }
      x.restore();
      var g = x.createLinearGradient(0, 1240, 0, 1400);
      g.addColorStop(0, '#F0DA9B'); g.addColorStop(0.4, '#C9A227'); g.addColorStop(1, '#8C6A15');
      x.font = '400 190px Marcellus, serif'; x.fillStyle = g;
      x.fillText('LANA', W / 2, 1400);
      x.font = '400 34px Jost, sans-serif'; x.fillStyle = '#6E520E';
      x.fillText('T W E N T Y - E I G H T   A U G U S T', W / 2, 1480);
      x.font = '400 70px Amiri, serif'; x.fillStyle = 'rgba(168,128,28,0.9)';
      x.fillText('لانا', W / 2, 1580);
      x.font = '400 26px Jost, sans-serif'; x.fillStyle = 'rgba(110,82,14,0.7)';
      x.fillText('M A D E   B Y   A R I A N', W / 2, 1780);
      p.c.toBlob(function (b) { if (b) offer('lana-story.png', b, p.c); }, 'image/png');
    }

    /* ---- every note she has opened, as one sheet ---- */
    function allNotes() {
      var st = null;
      try { st = JSON.parse(localStorage.getItem('lana-2808-cal') || 'null'); } catch (e) {}
      if (!st || !st.opened || !st.opened.length) { say('Open a chocolate first and it will have something to print.'); return; }
      var texts = [];
      $$('.seal-note').forEach(function (b, i) {
        if (st.opened.indexOf(i + 1) === -1) return;
        texts.push([i + 1, calendar.noteText(i + 1)]);
      });
      var W = 1000, x0 = 110, maxW = W - x0 * 2;
      var probe = document.createElement('canvas').getContext('2d');
      probe.font = '400 30px "EB Garamond", serif';
      var blocks = texts.map(function (t) { return { n: t[0], lines: wrap(probe, t[1], maxW) }; });
      var H = 240 + blocks.reduce(function (a, b) { return a + 60 + b.lines.length * 44; }, 0) + 120;
      var p = paper(W, H), x = p.x;
      x.textAlign = 'center'; x.font = '400 26px Jost, sans-serif'; x.fillStyle = '#6E520E';
      x.fillText('T H E   B O X   O F   F O R T Y - S I X', W / 2, 150);
      x.textAlign = 'left';
      var y = 240;
      blocks.forEach(function (b) {
        x.font = '400 22px Jost, sans-serif'; x.fillStyle = '#A8801C';
        x.fillText('NO. ' + b.n, x0, y);
        x.font = '400 30px "EB Garamond", serif'; x.fillStyle = '#2E1D11';
        b.lines.forEach(function (l, i) { x.fillText(l, x0, y + 40 + i * 44); });
        y += 60 + b.lines.length * 44;
      });
      p.c.toBlob(function (b2) { if (b2) offer('lana-notes.png', b2, p.c); }, 'image/png');
    }

    /* ---- her diary, as a file ---- */
    function diaryFile() {
      var log = [];
      try { log = JSON.parse(localStorage.getItem('lana-2808-diary') || '[]'); } catch (e) {}
      if (!log.length) { say('Answer "how was today" at least once first.'); return; }
      var M = diary.moods();
      var out = 'How it went\r\n===========\r\n\r\n';
      log.forEach(function (e) { out += e.d + '   ' + M[e.m].label + '\r\n'; });
      out += '\r\n' + log.length + ' days recorded.\r\n';
      offer('lana-diary.txt', out, null);
    }

    var ITEMS = [
      ['The invitation', 'png', function () {
        // never delegate to #keep-card: that button only exists inside the
        // artifact host, and this list has to work from a plain file too
        var run = function () {
          var c = keepsake.render();
          c.toBlob(function (bl) { if (bl) offer('lana-28-august.png', bl, c); }, 'image/png');
        };
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(run); else run();
      }],
      ['The letter', 'png', letterImage],
      ['A card for your story', '9:16', storyCard],
      ['Every note so far', 'png', allNotes],
      ['Your diary', 'txt', diaryFile]
    ];

    return {
      start: function () {
        ITEMS.forEach(function (it) {
          var b = document.createElement('button');
          b.type = 'button'; b.className = 'keep-item';
          b.innerHTML = '<b>' + it[0] + '</b><em>' + it[1] + '</em>';
          b.addEventListener('click', function () { buzz(6); it[2](); });
          host.appendChild(b);
        });
        QR.draw($('#qr'), 5);
      }
    };
  })();


  /* ============================================================
     TURNING PAGES — arrows, keys and swipes move a whole chapter
     ============================================================ */

  var pages = (function () {
    var ids = [], i = 0;
    function build() { ids = contents.ids(); }
    function currentIndex() {
      var best = 0, bestTop = Infinity;
      ids.forEach(function (id, n) {
        var el = $('#' + id); if (!el) return;
        var t = Math.abs(el.getBoundingClientRect().top);
        if (t < bestTop) { bestTop = t; best = n; }
      });
      return best;
    }
    function go(dir) {
      if (!ids.length) build();
      var n = clamp(currentIndex() + dir, 0, ids.length - 1);
      var el = $('#' + ids[n]);
      if (!el) return;
      var page = $('#page');
      page.classList.add('warping');
      sfx.chime(n % 8); buzz(5);
      setTimeout(function () {
        el.scrollIntoView({ behavior: 'instant', block: 'start' });
        requestAnimationFrame(function () { page.classList.remove('warping'); });
      }, 220);
    }
    return {
      start: function () {
        build();
        $('#page-prev').addEventListener('click', function () { go(-1); });
        $('#page-next').addEventListener('click', function () { go(1); });
        document.addEventListener('keydown', function (e) {
          if ($('#index').classList.contains('open') || $('#vault').classList.contains('open')) return;
          if (document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
          if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); go(1); }
          if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(-1); }
        });
      },
      show: function () { $('#page-nav').classList.add('show'); }
    };
  })();

  /* ============================================================
     EACH CHAPTER HAS ITS OWN NOTE — quiet, once, on arrival
     ============================================================ */

  (function chapterTone() {
    if (RM) return;
    contents.ids().forEach(function (id, i) {
      var el = $('#' + id); if (!el) return;
      var rung = false;
      new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting || rung) return;
        rung = true;
        sfx.soft(i);
      }, { threshold: 0.55 }).observe(el);
    });
  })();


  /* ============================================================
     THE FILM — plays itself once, the first time she ever opens
     this, and any time she asks for it again.
     ============================================================ */

  var film = (function () {
    var box = $('#film'), photo = $('#film-photo'), img = $('#film-img');
    var line = $('#film-line'), name = $('#film-name'), sub = $('#film-sub');
    var KEY = 'lana-2808-film';
    var timers = [], running = false;

    function at(ms, fn) { timers.push(setTimeout(fn, ms)); }
    function clearAll() { timers.forEach(clearTimeout); timers = []; }

    function showLine(t) {
      line.classList.remove('show');
      at(0, function () {
        line.innerHTML = t;
        requestAnimationFrame(function () { line.classList.add('show'); });
      });
    }
    function hideLine() { line.classList.remove('show'); }

    function showPhoto(src) {
      photo.classList.remove('show', 'drift');
      img.src = src;
      requestAnimationFrame(function () {
        photo.classList.add('show');
        requestAnimationFrame(function () { photo.classList.add('drift'); });
      });
    }
    function hidePhoto() { photo.classList.remove('show'); }

    function end() {
      if (!running) return;
      running = false;
      clearAll();
      box.classList.remove('on', 'warm');
      box.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('is-locked');
      photo.classList.remove('show', 'drift');
      line.classList.remove('show'); name.classList.remove('show'); sub.classList.remove('show');
      try { localStorage.setItem(KEY, '1'); } catch (e) {}
      progress.mark('film');
    }

    function play() {
      if (running) return;
      running = true;
      clearAll();
      var srcs = [];
      var p = $('.portrait img'); if (p) srcs.push(p.src);
      $$('.plate img').forEach(function (n) { srcs.push(n.src); });
      if (!srcs.length) { running = false; return; }

      box.classList.add('on');
      box.classList.remove('warm');
      box.setAttribute('aria-hidden', 'false');
      document.body.classList.add('is-locked');
      photo.classList.remove('show', 'drift');
      name.classList.remove('show'); sub.classList.remove('show');
      line.classList.remove('show');

      sfx.wake();
      music.arm('birthday');

      var t = 0;
      // ---- act one: the words ----
      t += 900;  at(t, function () { showLine('Somebody spent a month on this.'); });
      t += 3400; at(t, function () { hideLine(); });
      t += 700;  at(t, function () { showLine('Before you scroll a single thing &mdash;'); });
      t += 3000; at(t, function () { hideLine(); });

      // ---- act two: her ----
      t += 800;
      srcs.slice(0, 5).forEach(function (src, i) {
        at(t, function () { showPhoto(src); sfx.soft(i + 2); });
        t += 2600;
      });
      at(t, function () { hidePhoto(); });

      // ---- act three: the line, one word at a time ----
      t += 900;
      var words = ['You', 'forget', 'everything.', 'So', 'he', 'built', 'you', 'something', 'that', 'does', 'not.'];
      words.forEach(function (w, i) {
        at(t, function () {
          line.classList.remove('show');
          line.innerHTML = w;
          requestAnimationFrame(function () { line.classList.add('show'); });
          if (i % 2 === 0) sfx.soft(i);
        });
        t += 480;
      });
      t += 900; at(t, function () { hideLine(); });

      // ---- act four: her name ----
      t += 700;
      at(t, function () {
        box.classList.add('warm');
        name.classList.add('show');
        sfx.arp();
        buzz([14, 50, 14, 50, 30]);
        confetti.petals(26);
      });
      t += 2200;
      at(t, function () { sub.textContent = 'Happy Birthday'; sub.classList.add('show'); });
      t += 1400; at(t, function () { confetti.fire(2200); });
      t += 2600; at(t, end);
    }

    return {
      start: function () {
        $('#film-skip').addEventListener('click', end);
        $('#film-again').addEventListener('click', function () { play(); });
        box.addEventListener('click', function (e) { if (e.target === box) end(); });
        document.addEventListener('keydown', function (e) {
          if (e.key === 'Escape' && running) end();
        });
      },
      seen: function () { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } },
      play: play
    };
  })();

  /* ============================================================
     MIDNIGHT — if she is holding the page when the day turns
     ============================================================ */

  var midnight = (function () {
    var box = $('#midnight'), fired = false, armed = false;
    function isBirthday() { var d = new Date(); return d.getMonth() === 7 && d.getDate() === 28; }
    function show() {
      if (fired) return; fired = true;
      box.classList.add('on'); box.setAttribute('aria-hidden', 'false');
      document.body.classList.add('is-locked');
      music.arm('birthday'); sfx.arp(); confetti.fire(4000);
      buzz([20, 60, 20, 60, 20, 60, 60]);
      progress.mark('midnight');
    }
    return {
      start: function () {
        armed = !isBirthday();         // only meaningful if we start before the day
        $('#m-close').addEventListener('click', function () {
          box.classList.remove('on'); box.setAttribute('aria-hidden', 'true');
          document.body.classList.remove('is-locked');
        });
        setInterval(function () {
          if (armed && isBirthday()) show();
        }, 20000);
      }
    };
  })();

  /* ============================================================
     WHAT THE PAGE NOTICED — her own month, read back to her
     ============================================================ */

  var report = (function () {
    var host = $('#report'), locked = $('#report-locked');

    function read(k, d) { try { return JSON.parse(localStorage.getItem(k) || d); } catch (e) { return JSON.parse(d); } }

    function render() {
      var visits = read('lana-2808-visits', '[]');
      var cal = read('lana-2808-cal', 'null');
      var diaryLog = read('lana-2808-diary', '[]');
      var back = read('lana-2808-back', '{"replies":[],"wishes":[]}');
      var days = streak.days();

      if (visits.length < 3) {
        host.innerHTML = '';
        locked.textContent = 'Come back a few more times and this fills itself in. It is already counting.';
        return;
      }
      locked.textContent = '';

      var moods = {};
      diaryLog.forEach(function (e) { moods[e.m] = (moods[e.m] || 0) + 1; });
      var M = diary.moods(), top = null, topN = 0;
      Object.keys(moods).forEach(function (k) { if (moods[k] > topN) { topN = moods[k]; top = +k; } });

      var rows = [];
      rows.push([visits.length, 'times you have opened this' + (days > 2 ? ', ' + days + ' of them in a row' : '')]);
      if (cal && cal.opened) rows.push([cal.opened.length, 'chocolates gone']);
      if (diaryLog.length) rows.push([diaryLog.length, 'days you told it how you were']);
      if (top !== null) rows.push([topN, 'of those days were <b>' + M[top].label + '</b>']);
      if (back.wishes && back.wishes.length) rows.push([back.wishes.length, 'wishes in the jar']);
      if (back.replies && back.replies.length) rows.push([back.replies.length, 'things you wrote back']);
      rows.push([progress.count(), 'of the hidden things found']);
      var ans = question.answer();
      if (ans) rows.push(['&#10022;', 'and when he finally asked, you said <b>' + ans.short + '</b>']);

      host.innerHTML = '';
      rows.forEach(function (r) {
        var d = document.createElement('div');
        d.className = 'report-row';
        d.innerHTML = '<b>' + r[0] + '</b><span>' + r[1] + '</span>';
        host.appendChild(d);
      });
    }
    return { start: function () {
      render();
      new IntersectionObserver(function (es) { if (es[0].isIntersecting) render(); },
        { threshold: 0.2 }).observe($('#report-sec'));
    } };
  })();


  /* ============================================================
     ONE QUESTION — she has never had an easy way to answer it,
     so this is one. Every answer is a safe one.
     ============================================================ */

  var question = (function () {
    var lockedEl = $('#q-locked'), askEl = $('#q-ask'), doneEl = $('#q-done');
    var optsEl = $('#q-opts'), chosenEl = $('#q-chosen'), replyEl = $('#q-reply');
    var noteEl = $('#q-note'), headEl = $('#q-head');
    var KEY = 'lana-2808-answer';

    var A = [
      { id: 'yes', short: 'Yes. It is something.',
        card: 'Yes.\nIt is something.',
        reply: 'Then that is the best thing anybody has said to me this year, and it is not close. ' +
               'Nothing has to change tomorrow. I only wanted to hear it once, from you, out loud.' },
      { id: 'maybe', short: 'I do not know yet.',
        card: 'I do not\nknow yet.',
        reply: 'Good. That is an honest answer and I would rather have it than a kind lie. ' +
               'There is no clock on this. I am not going anywhere while you work it out.' },
      { id: 'noname', short: 'Let us not put a name on it.',
        card: 'Let us not\nput a name on it.',
        reply: 'Then we will not. It was never the name I was after. ' +
               'Everything stays exactly as it was &mdash; except now you know, and I am glad you do.' }
    ];

    function saved() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
    function find(id) { for (var i = 0; i < A.length; i++) if (A[i].id === id) return A[i]; return null; }

    function showDone(a) {
      lockedEl.hidden = true; askEl.hidden = true; doneEl.hidden = false;
      headEl.textContent = 'You answered.';
      chosenEl.textContent = a.short;
      replyEl.innerHTML = a.reply;
    }
    function showAsk() {
      lockedEl.hidden = true; doneEl.hidden = true; askEl.hidden = false;
      headEl.textContent = 'Then I’ll stop.';
    }
    function showLocked() {
      askEl.hidden = true; doneEl.hidden = true; lockedEl.hidden = false;
      headEl.textContent = 'Then I’ll stop.';
    }

    function render() {
      var s2 = saved();
      if (s2 && find(s2.id)) { showDone(find(s2.id)); return; }
      if (progress.has('letter')) showAsk(); else showLocked();
    }

    function cardFor(a) {
      var W = 1080, H = 1350;
      var c = document.createElement('canvas'); c.width = W; c.height = H;
      var x = c.getContext('2d');
      var g = x.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#FFFBF4'); g.addColorStop(0.5, '#F7F1E6'); g.addColorStop(1, '#EFE2CD');
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.strokeStyle = 'rgba(168,128,28,0.45)'; x.lineWidth = 2; x.strokeRect(46, 46, W - 92, H - 92);
      x.strokeStyle = 'rgba(168,128,28,0.2)'; x.lineWidth = 1; x.strokeRect(64, 64, W - 128, H - 128);

      x.textAlign = 'center';
      x.font = '400 28px Jost, sans-serif'; x.fillStyle = '#6E520E';
      x.fillText('H E   A S K E D', W / 2, 210);
      x.font = '400 62px Marcellus, serif'; x.fillStyle = '#2E1D11';
      x.fillText('Is this something?', W / 2, 300);

      x.beginPath(); x.moveTo(W / 2 - 90, 380); x.lineTo(W / 2 + 90, 380);
      x.strokeStyle = 'rgba(168,128,28,0.45)'; x.lineWidth = 1; x.stroke();
      x.save(); x.translate(W / 2, 380); x.rotate(Math.PI / 4);
      x.fillStyle = '#A8801C'; x.fillRect(-5, -5, 10, 10); x.restore();

      x.font = '400 28px Jost, sans-serif'; x.fillStyle = '#6E520E';
      x.fillText('S H E   S A I D', W / 2, 470);

      var lines = a.card.split('\n');
      x.font = '400 116px "Pinyon Script", cursive'; x.fillStyle = '#A8121F';
      lines.forEach(function (l, i) { x.fillText(l, W / 2, 620 + i * 130); });

      x.font = '400 30px Jost, sans-serif'; x.fillStyle = '#6E520E';
      x.fillText('L A N A   ·   2 8   A U G U S T', W / 2, 1130);
      x.font = '400 24px Jost, sans-serif'; x.fillStyle = 'rgba(110,82,14,0.7)';
      x.fillText('F O R   A R I A N', W / 2, 1210);
      return c;
    }

    function offerCard(a) {
      var run = function () {
        var c = cardFor(a);
        c.toBlob(function (blob) {
          if (!blob) return;
          if (!window.claude || typeof window.claude.use !== 'function') { fallback(c); return; }
          window.claude.use('downloads').then(function (dl) {
            if (!dl) { fallback(c); return; }
            dl.save({ filename: 'lana-answer.png', data: blob }).then(function () {
              noteEl.textContent = 'Saved. Send it to him whenever you like.';
              noteEl.classList.add('show'); sfx.chime(6); buzz(8);
            }, function (err) {
              if (err && err.code === 'declined') { noteEl.textContent = 'No problem.'; noteEl.classList.add('show'); return; }
              fallback(c);
            });
          }, function () { fallback(c); });
        }, 'image/png');
      };
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(run); else run();
    }
    function fallback(c) {
      $('#lightbox-img').src = c.toDataURL('image/png');
      $('#lightbox').classList.add('open');
      $('#lightbox').setAttribute('aria-hidden', 'false');
      document.body.classList.add('is-locked');
      noteEl.textContent = 'Hold the picture to save it, then send it to him.';
      noteEl.classList.add('show');
    }

    function copy(a) {
      var txt = 'He asked: is this something?\n\nI said: ' + a.short;
      var done = function () {
        noteEl.textContent = 'Copied. Paste it to him whenever you are ready.';
        noteEl.classList.add('show');
      };
      function fb() {
        try {
          var ta = document.createElement('textarea');
          ta.value = txt; ta.style.cssText = 'position:fixed;opacity:0;left:-9999px';
          document.body.appendChild(ta); ta.select();
          document.execCommand('copy'); document.body.removeChild(ta); done();
        } catch (e) { noteEl.textContent = 'Your browser will not let me copy it.'; noteEl.classList.add('show'); }
      }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, fb);
      else fb();
    }

    return {
      answer: function () { var s2 = saved(); return s2 ? find(s2.id) : null; },
      start: function () {
        A.forEach(function (a) {
          var b = document.createElement('button');
          b.type = 'button'; b.className = 'q-opt-btn';
          b.textContent = a.short;
          b.addEventListener('click', function () {
            try { localStorage.setItem(KEY, JSON.stringify({ id: a.id, at: Date.now() })); } catch (e) {}
            showDone(a);
            buzz([16, 50, 16]); sfx.heart(2); confetti.petals(20);
            progress.mark('answered');
          });
          optsEl.appendChild(b);
        });
        $('#q-card').addEventListener('click', function () { var a = question.answer(); if (a) offerCard(a); });
        $('#q-copy').addEventListener('click', function () { var a = question.answer(); if (a) copy(a); });
        $('#q-redo').addEventListener('click', function () {
          try { localStorage.removeItem(KEY); } catch (e) {}
          noteEl.classList.remove('show'); showAsk();
        });
        render();
        progress.onChange(render);
        new IntersectionObserver(function (es) { if (es[0].isIntersecting) render(); },
          { threshold: 0.2 }).observe($('#question-sec'));
      }
    };
  })();


  /* ============================================================
     OPEN WHEN — some of these know what time it is
     ============================================================ */

  var openWhen = (function () {
    var grid = $('#ow-grid'), box = $('#ow-open'), whenEl = $('#ow-when'), bodyEl = $('#ow-body');
    var KEY = 'lana-2808-ow';
    var L = [
      { k: 'sad', t: 'you are sad',
        b: 'Not the big kind necessarily. The flat kind, where nothing is wrong and nothing is right either.\n\n' +
           'You do not have to explain it to anybody, including me. It does not need a reason to be real.\n\n' +
           'Do the smallest thing. Water, a window, one message to one person. Not because it fixes it — ' +
           'because you are worth the small effort even on the days you do not think so.\n\n' +
           'It passes. It always has. I have watched it pass before.' },
      { k: 'sleep', t: 'you cannot sleep', gate: 'night',
        b: 'Of course you cannot. It is you.\n\n' +
           'Stop trying to win. Nobody has ever fallen asleep by concentrating harder on it.\n\n' +
           'Whatever you are running through at this hour is louder than it is true. Three in the morning ' +
           'is a liar and it always has been.\n\n' +
           'Put the phone down after this. Look at the ceiling. Think about rain. I am probably awake too.' },
      { k: 'miss', t: 'you miss me',
        b: 'Good. That is fair, because it goes both ways and I am worse at hiding it.\n\n' +
           'You are allowed to say it out loud. To me, specifically. You do not have to dress it up as ' +
           'something casual first.\n\n' +
           'And if you would rather not say it — fine. Read this instead and know it was already written down ' +
           'before you needed it.' },
      { k: 'alone', t: 'you feel alone',
        b: 'Feeling alone and being alone are two different things, and tonight you have got the first one.\n\n' +
           'Here is the plain fact: there is a person who built an entire month of small things for you before ' +
           'you asked for any of it. That is not nothing, and it did not stop when you closed the page.\n\n' +
           'You are carried around in somebody’s head all day. You just cannot see it from in there.' },
      { k: 'beautiful', t: 'you forget how beautiful you are',
        b: 'You will not believe me, so I will not argue.\n\n' +
           'I will only say this: it was never mainly about your face. It is the way you laugh before the ' +
           'joke lands. It is you sending "Morning" at an hour that is not morning. It is the fact that ' +
           'you are kind when there is nothing in it for you.\n\n' +
           'The face is a bonus. Go and look again anyway.' },
      { k: 'angry', t: 'you are angry at me',
        b: 'Then I have probably earned it, and you should say so.\n\n' +
           'I would rather have you annoyed and honest than pleasant and gone. Do not go quiet on me to be ' +
           'polite. Tell me what I did.\n\n' +
           'I am not going anywhere over an argument. I did not build all this to fold at the first hard ' +
           'conversation.' },
      { k: 'push', t: 'you need to get up and do something',
        b: 'You are not lazy. You are tired, and those are not the same thing.\n\n' +
           'Pick the smallest version of the thing. Not the whole thing — the first two minutes of it. ' +
           'That is the entire trick and there is nothing else to it.\n\n' +
           'You are far more capable than the version of you that talks in your head at night. I have seen ' +
           'the evidence. She has not.' },
      { k: 'enough', t: 'you feel you are not enough',
        b: 'You wrote this one down yourself, long before I ever saw it. So you already know the feeling well.\n\n' +
           'Here is the only argument I have, and it is not a compliment — it is evidence.\n\n' +
           'You taught yourself a second language out of books. You set yourself six goals and not one of them ' +
           'was selfish. You got up on the days it was pointless.\n\n' +
           'Not-enough people do not do any of that. They cannot. You have simply never been allowed to be ' +
           'the judge in your own case.' },
      { k: 'meant', t: 'you finally understand what you meant to me', gate: 'day30',
        b: 'If you are reading this, a month has gone by and you are still here.\n\n' +
           'So here it is without the packaging: you were not a phase, or a distraction, or somebody I was ' +
           'passing time with. You were the person I checked for first and thought about last.\n\n' +
           'I did not build this to convince you of anything. I built it so that on some ordinary day years ' +
           'from now, you would be able to prove to yourself that it was real.\n\n' +
           'It was real. All of it.' }
    ];

    function read() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } }
    function days() {
      try {
        var st = JSON.parse(localStorage.getItem('lana-2808-cal') || 'null');
        if (!st || !st.start) return 1;
        var x = new Date(); x.setHours(0, 0, 0, 0);
        return Math.floor((x.getTime() - st.start) / 86400000) + 1;
      } catch (e) { return 1; }
    }
    function allowed(l) {
      if (l.gate === 'night') { var h = new Date().getHours(); return h >= 0 && h < 5; }
      if (l.gate === 'day30') return days() >= 30;
      return true;
    }
    function label(l) {
      if (allowed(l)) return read().indexOf(l.k) === -1 ? 'sealed' : 'read';
      if (l.gate === 'night') return 'after midnight';
      return 'day 30';
    }

    function render() {
      grid.innerHTML = '';
      L.forEach(function (l) {
        var ok = allowed(l), was = read().indexOf(l.k) !== -1;
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'ow-item' + (ok ? '' : ' locked') + (was ? ' read' : '');
        b.innerHTML = '<span class="ow-env"></span><b>Open when ' + l.t + '</b><em>' + label(l) + '</em>';
        if (ok) b.addEventListener('click', function () {
          var r = read(); if (r.indexOf(l.k) === -1) { r.push(l.k); try { localStorage.setItem(KEY, JSON.stringify(r)); } catch (e) {} }
          box.hidden = false;
          whenEl.textContent = 'Open when ' + l.t;
          bodyEl.textContent = l.b;
          sfx.crack(); buzz(8); progress.mark('openwhen');
          render();
        });
        grid.appendChild(b);
      });
    }
    return { start: render };
  })();

  /* ============================================================
     WHAT I SEE IN YOU — about her, not about him
     ============================================================ */

  (function seen() {
    var host = $('#seen-list');
    var S = [
      ['What makes you you',
       'You are funny before you are anything else. Not performed funny — the accidental kind, where you ' +
       'say one flat word like <b>blah</b> and it is somehow the whole joke. People spend years trying to ' +
       'be that and you do it half asleep.'],
      ['What I admire',
       'You are kind in the way that costs something. Anybody can be nice when it is easy. You check on ' +
       'people when you are tired, which is a different thing entirely.'],
      ['What I hope you never change',
       'That you still get excited about small things. Rain. The moon. A chocolate. A photo of a sky. ' +
       'Most people lose that by your age and pretend they meant to.'],
      ['What I hope life gives you',
       'Mornings you are not dreading. Somebody who notices when you go quiet. Enough money that you never ' +
       'have to think twice at a jewellery counter. And a proper long sleep, uninterrupted, at least once a week.'],
      ['What I see that you do not',
       'You think you are forgetful and late and difficult. What is actually true is that you are the person ' +
       'everyone tells things to. That does not happen by accident. People do not confide in the difficult one.'],
      ['The part nobody sees',
       'You are much harder on yourself than anybody else would ever dare to be. I wish you would speak to ' +
       'yourself the way you speak to the people you love. You would be unstoppable and slightly unbearable.']
    ];
    S.forEach(function (x) {
      var li = document.createElement('li');
      li.innerHTML = '<h3>' + x[0] + '</h3><p>' + x[1] + '</p>';
      host.appendChild(li);
    });
  })();

  /* ============================================================
     YOU THOUGHT NOBODY NOTICED
     ============================================================ */

  (function noticed() {
    var host = $('#noticed'), say = $('#noticed-say');
    var N = [
      'You say <b>blah</b> when you have a real answer and cannot be bothered to dress it up. It is never actually nothing.',
      'You send <b>Morning</b> at hours that are not morning, and you have never once acknowledged this.',
      'You sleep holding that blue one. I noticed, and I have said nothing about it until now.',
      'You go quiet before you go sad. The quiet always comes first. I have learnt to watch for it.',
      'You look at the sky more than anybody I know. Not at anything in it. Just at it.',
      'Rain puts you in a good mood. Actual weather changes your entire personality and you think that is normal.',
      'You forget what you said an hour ago but you remember what somebody else said weeks later. That is not bad memory. That is where your attention goes.',
      'You sing when you think nobody is listening, and you are much better than you let on.',
      'You choose the same colours over and over. White, orange, black, red. You have a whole palette and you do not know it.',
      'You say you do not like a fuss and then you go very quiet and very pleased when somebody makes one.'
    ];
    N.forEach(function (t, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'n-chip';
      b.textContent = (i + 1 < 10 ? '0' : '') + (i + 1);
      b.addEventListener('click', function () {
        $$('.n-chip').forEach(function (c) { c.classList.remove('on'); });
        b.classList.add('on');
        say.classList.remove('show');
        setTimeout(function () { say.innerHTML = t; say.classList.add('show'); }, 120);
        buzz(5); sfx.chime(i); progress.mark('noticed');
      });
      host.appendChild(b);
    });
  })();

  /* ============================================================
     REMIND ME OF US — a different thing every time
     ============================================================ */

  (function remind() {
    var stage = $('#remind-stage'), btn = $('#remind-btn');
    var last = -1;

    function pool() {
      var out = [];
      $$('.plate img').forEach(function (n) { out.push({ kind: 'photograph', img: n.src }); });
      var p = $('.portrait img'); if (p) out.push({ kind: 'photograph', img: p.src });
      $$('.clip video, .plate video').forEach(function (v) { out.push({ kind: 'six seconds', vid: v.currentSrc || v.src }); });
      [
        'You say “blah” like it is a full sentence. Somehow I always understand it.',
        'You forget everything except the things that actually matter.',
        'Rain makes you happy, and that tells me everything about who you are.',
        'None of this was planned. It happened like somebody arranged it.',
        'One rose. Not a bouquet. A bouquet is for people you are trying to impress.',
        'You are the only person who can say one word and fix an entire day.',
        'I check whether you are online more times a day than I would ever admit.',
        'Whatever this is — I am not going anywhere.'
      ].forEach(function (t) { out.push({ kind: 'something he wrote', text: t }); });
      return out;
    }

    function show() {
      var list = pool();
      if (!list.length) return;
      var i = Math.floor(rand(0, list.length));
      if (list.length > 1) { var g = 0; while (i === last && g++ < 8) i = Math.floor(rand(0, list.length)); }
      last = i;
      var it = list[i];
      stage.innerHTML = '';
      var k = document.createElement('p'); k.className = 'remind-kind'; k.textContent = it.kind;
      stage.appendChild(k);
      if (it.img) {
        var im = document.createElement('img'); im.src = it.img; im.alt = 'Lana';
        stage.appendChild(im);
      } else if (it.vid) {
        var v = document.createElement('video');
        v.src = it.vid; v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = true;
        stage.appendChild(v);
        var pr = v.play(); if (pr && pr.catch) pr.catch(function () {});
      } else {
        var t = document.createElement('p'); t.textContent = it.text;
        stage.appendChild(t);
      }
      buzz(5); sfx.chime(i); progress.mark('remind');
    }

    btn.addEventListener('click', show);
    var first = document.createElement('p');
    first.className = 'remind-kind'; first.textContent = 'press the button';
    stage.appendChild(first);
  })();

  /* ============================================================
     IF WE EVER BECOME STRANGERS
     ============================================================ */

  (function strangers() {
    var seal = $('#strangers-seal'), note = $('#strangers-note'), body = $('#strangers-body');
    var hint = $('#strangers-hint');
    var TEXT =
      'I hope this one never becomes useful.\n\n' +
      'But people drift, and lives move, and it would be dishonest to build all of this and pretend that ' +
      'could never happen to us.\n\n' +
      'So: if we end up strangers one day — if we stop talking, or something goes wrong, or life simply ' +
      'takes us in different directions — I do not want you to remember me with any weight attached.\n\n' +
      'No guilt. You will not owe me anything. You never did.\n\n' +
      'I would only want you to remember that for some part of your life there was somebody who paid ' +
      'proper attention. Who knew that you say blah, and go quiet before you go sad, and look at the sky ' +
      'for no reason. Who thought all of that was worth writing down.\n\n' +
      'That version of you existed, and somebody saw her clearly, and was glad about it.\n\n' +
      'That does not stop being true, whatever happens next.';
    seal.addEventListener('click', function () {
      seal.classList.add('spent');
      note.hidden = false;
      body.textContent = TEXT;
      hint.textContent = '';
      sfx.heart(2); buzz([14, 60, 14]); progress.mark('strangers');
    });
  })();


  /* ============================================================
     FOUR WORDS — passwords only she could guess
     ============================================================ */

  var passwords = (function () {
    var input = $('#pass-in'), note = $('#pass-note'), out = $('#pass-out');
    var wordEl = $('#pass-word'), bodyEl = $('#pass-body'), foundEl = $('#pass-found');
    var KEY = 'lana-2808-pass';
    var P = [
      { w: 'blah', title: 'blah',
        b: 'Of course it was this one.\n\n' +
           'You say it maybe nine times a day and you have no idea it has become a whole language. ' +
           'It means yes, no, I am tired, I am fine, I do not want to talk about it, and I am happy — ' +
           'and somehow I always know which.\n\n' +
           'One day somebody else will say it near me and I will look up before I can stop myself. ' +
           'That is what you have done to a completely ordinary word.' },
      { w: 'stitch', title: 'stitch',
        b: 'The blue one.\n\n' +
           'You sent me a photograph in the morning with him under your arm and your eyes barely open, ' +
           'and I have thought about it more times than is reasonable.\n\n' +
           'He gets to be there for the version of you nobody else sees. Honestly, I am a bit jealous of a toy.' },
      { w: 'morning', title: 'morning',
        b: 'You send it at hours that are not morning. Two in the afternoon. Eleven at night, once.\n\n' +
           'I have never corrected you and I never will, because at some point it stopped meaning the time ' +
           'of day and started meaning <i>I thought about you when I woke up</i>.\n\n' +
           'That is the actual translation. I worked it out ages ago.' },
      { w: 'rain', title: 'rain',
        b: 'The weather changes and so do you. It is the strangest, best thing about you.\n\n' +
           'Everybody else complains. You go quiet and pleased and you look out of the window like ' +
           'something good is finally happening.\n\n' +
           'I hope it rains on your birthday. I hope it rains on a lot of your days.' }
    ];

    function found() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } }
    function tally() {
      foundEl.textContent = found().length + ' of ' + P.length + ' opened';
    }
    function tryWord(raw) {
      var w = String(raw || '').trim().toLowerCase().replace(/[^a-z؀-ۿ]/g, '');
      if (!w) { note.textContent = 'Type something first.'; note.classList.add('show'); return; }
      var hit = null;
      P.forEach(function (p) { if (p.w === w) hit = p; });
      if (!hit) {
        note.textContent = 'Not that one. It is something only the two of you say.';
        note.classList.add('show'); buzz(4); return;
      }
      var f = found();
      if (f.indexOf(hit.w) === -1) { f.push(hit.w); try { localStorage.setItem(KEY, JSON.stringify(f)); } catch (e) {} }
      out.hidden = false;
      wordEl.textContent = '“' + hit.title + '”';
      bodyEl.innerHTML = hit.b.replace(/\n/g, '<br>');
      note.textContent = ''; note.classList.remove('show');
      input.value = '';
      sfx.crack(); buzz([12, 40, 12]); confetti.petals(10);
      progress.mark('password');
      tally();
      if (found().length === P.length) {
        note.textContent = 'All four. There are no more — those were the only words that were ours.';
        note.classList.add('show');
      }
    }

    return {
      start: function () {
        $('#pass-go').addEventListener('click', function () { tryWord(input.value); });
        input.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') { e.preventDefault(); tryWord(input.value); }
        });
        tally();
      }
    };
  })();

  /* ============================================================
     THE GARDEN — one flower for every thing she has found
     ============================================================ */

  var garden = (function () {
    var cv = $('#garden'), copy = $('#garden-copy');
    var C, W, H, raf = 0, alive = false, t0 = 0;
    var KEYS = ['open','film','choc','mood','daylock','rose','photos','video','scratch','letter',
                'coupons','record','sing','quiz','oracle','game','arcade','reply','wish','vault',
                'keeps','capsule','openwhen','noticed','remind','strangers','answered','password',
                'letters','midnight','rain','keep'];

    function size() { var d = fit(cv); W = d.w; H = d.h; C = d.x; }

    function flower(x, groundY, h, hue, sway, open) {
      C.strokeStyle = 'rgba(96,104,58,.85)'; C.lineWidth = Math.max(1.2, h * 0.022);
      C.beginPath();
      C.moveTo(x, groundY);
      C.quadraticCurveTo(x + sway * 0.5, groundY - h * 0.55, x + sway, groundY - h);
      C.stroke();
      C.fillStyle = 'rgba(110,124,66,.8)';
      C.beginPath();
      C.ellipse(x + sway * 0.3 - h * 0.09, groundY - h * 0.45, h * 0.11, h * 0.045, -0.5, 0, 6.2832);
      C.fill();
      var fx = x + sway, fy = groundY - h, r = h * (open ? 0.13 : 0.06);
      if (open) {
        for (var k = 0; k < 5; k++) {
          C.save(); C.translate(fx, fy); C.rotate(k * 1.2566 + hue);
          C.fillStyle = k % 2 ? '#C0121F' : '#D62430';
          C.beginPath(); C.ellipse(0, -r * 0.62, r * 0.44, r * 0.64, 0, 0, 6.2832); C.fill();
          C.restore();
        }
        C.fillStyle = '#C9A227';
        C.beginPath(); C.arc(fx, fy, r * 0.24, 0, 6.2832); C.fill();
      } else {
        C.fillStyle = 'rgba(160,140,96,.55)';
        C.beginPath(); C.ellipse(fx, fy, r * 0.5, r * 0.8, 0, 0, 6.2832); C.fill();
      }
    }

    function draw(now) {
      if (!alive) return;
      raf = requestAnimationFrame(draw);
      var t = (now - t0) / 1000;
      C.clearRect(0, 0, W, H);
      var groundY = H * 0.93;
      C.strokeStyle = 'rgba(110,82,14,.25)'; C.lineWidth = 1;
      C.beginPath(); C.moveTo(0, groundY); C.lineTo(W, groundY); C.stroke();

      var n = KEYS.length;
      for (var i = 0; i < n; i++) {
        var open = progress.has(KEYS[i]);
        var seed = (i * 97) % 53;
        var x = W * (0.06 + 0.88 * ((i + 0.5) / n));
        var h = H * (open ? (0.34 + (seed % 7) * 0.035) : 0.13);
        var sway = Math.sin(t * 0.5 + i) * (open ? h * 0.06 : h * 0.03);
        flower(x, groundY, h, seed * 0.21, sway, open);
      }
    }

    function update() {
      var c = 0;
      KEYS.forEach(function (k) { if (progress.has(k)) c++; });
      copy.innerHTML = c === 0
        ? 'Nothing has grown yet. Every single thing you find in here plants one.'
        : '<b>' + c + '</b> of ' + KEYS.length + ' have opened. The rest are still waiting on you.';
    }

    return {
      start: function () {
        size(); update();
        progress.onChange(update);
        new IntersectionObserver(function (es) {
          if (es[0].isIntersecting && !alive) { alive = true; size(); t0 = performance.now(); raf = requestAnimationFrame(draw); }
          else if (!es[0].isIntersecting && alive) { alive = false; cancelAnimationFrame(raf); }
        }, { threshold: 0.15 }).observe(cv);
        var to; window.addEventListener('resize', function () { clearTimeout(to); to = setTimeout(function () { if (alive) size(); }, 250); });
      }
    };
  })();

  /* ============================================================
     LETTERS WITH DATES ON THEM
     ============================================================ */

  var future = (function () {
    var list = $('#future-list'), box = $('#future-open');
    var whenEl = $('#future-when'), bodyEl = $('#future-body');

    function nextOf(m, d) {
      var n = new Date(), y = n.getFullYear();
      var t = new Date(y, m, d, 0, 0, 0, 0);
      if (n >= t) t = new Date(y + 1, m, d, 0, 0, 0, 0);
      return t;
    }
    var F = [
      { title: 'On the first of January', when: function () { return nextOf(0, 1); },
        b: 'A new year, and you are still here reading something I wrote in an August that is now behind us.\n\n' +
           'I have no idea what happened between then and now. Whether we are closer, or further, or exactly ' +
           'the same. Whatever it turned out to be, I hope this year is gentler with you than the last one was.\n\n' +
           'Same as ever: eat properly, sleep more, and text me when you cannot.' },
      { title: 'On your next birthday', when: function () {
          // the one AFTER this year's — otherwise it unlocks two days from now
          var n = new Date(), y = n.getFullYear();
          var thisYear = new Date(y, 7, 28);
          var base = (n >= new Date(y, 7, 29)) ? y + 1 : y;
          return new Date(base + 1, 7, 28, 0, 0, 0, 0);
        },
        b: 'A whole year.\n\n' +
           'I wrote this before I knew how any of it would go, which means I am talking to a version of you ' +
           'I have not met yet. Hello. I hope she is doing well.\n\n' +
           'Whatever this turned into — friends, or more, or something with no name — I meant every word of ' +
           'the version you read last year, and I still do.\n\n' +
           'Happy birthday, again. You will forget I said this. That is fine. It is written down.' }
    ];

    function render() {
      list.innerHTML = '';
      F.forEach(function (f, i) {
        var open = f.when(), now = new Date();
        var unlocked = now >= open;
        var d = Math.ceil((open - now) / 86400000);
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'more-item' + (unlocked ? '' : ' locked');
        b.innerHTML = '<span class="w">' + (unlocked ? '&#9998;' : '&#128274;') + '</span>' +
                      '<b>' + f.title + '</b><em>' + (unlocked ? 'open' : d + ' days') + '</em>';
        if (unlocked) b.addEventListener('click', function () {
          box.hidden = false; whenEl.textContent = f.title; bodyEl.textContent = f.b;
          sfx.crack(); buzz(8); progress.mark('future');
        });
        list.appendChild(b);
      });
    }
    return { start: render };
  })();

  /* ============================================================
     THE ROOM AT THE END — opens only when she has found nearly
     everything. Quiet, dark, and the last honest thing.
     ============================================================ */

  var room = (function () {
    var box = $('#room'), body = $('#room-body');
    var NEEDED = 18, shown = false;
    var TEXT =
      'If you are reading this, you found nearly everything I left in here.\n\n' +
      'Which means you went looking. That is the part I did not expect and cannot really get over.\n\n' +
      'So here is the last of it, with nothing built around it.\n\n' +
      'I did not make this because it was your birthday. Your birthday was the excuse. I made it because ' +
      'somewhere along the way I started paying a kind of attention to you that I have never paid to anybody, ' +
      'and there was no ordinary way to tell you that without making it strange.\n\n' +
      'I am not asking you for anything. I never was. There is no version of this where you owe me a feeling.\n\n' +
      'I only wanted one person on this earth to have proof that they were looked at properly. ' +
      'Not idealised. Not decorated. Actually noticed — the blah, the going quiet, the sky, the blue toy, ' +
      'all of it.\n\n' +
      'That is the whole thing. There was never enough room on a website for it, and there still is not.\n\n' +
      'Happy birthday, Lana.';

    function open() {
      if (shown) return; shown = true;
      body.textContent = TEXT;
      box.classList.add('on'); box.setAttribute('aria-hidden', 'false');
      document.body.classList.add('is-locked');
      music.duck(true); rain.duck(true); sfx.heart(3);
      // no vibrate here: this can open without a tap, and Chrome warns about it
      progress.mark('room');
      try { localStorage.setItem('lana-2808-room', '1'); } catch (e) {}
    }
    function close() {
      box.classList.remove('on'); box.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('is-locked');
      music.duck(false); rain.duck(false);
    }
    function check() {
      if (shown) return;
      if (progress.count() >= NEEDED) setTimeout(open, 900);
    }
    return {
      start: function () {
        $('#room-close').addEventListener('click', close);
        document.addEventListener('keydown', function (e) {
          if (e.key === 'Escape' && box.classList.contains('on')) close();
        });
        try { if (localStorage.getItem('lana-2808-room')) shown = false; } catch (e) {}
        progress.onChange(check);
        check();
      },
      force: open
    };
  })();


  /* ============================================================
     THE MOST BEAUTIFUL THING IN THE WORLD
     ============================================================ */

  var mirror = (function () {
    var box = $('#mirror'), line = $('#mirror-line'), closeBtn = $('#mirror-close');
    var timers = [], open = false;
    function clearAll() { timers.forEach(clearTimeout); timers = []; }
    function at(ms, fn) { timers.push(setTimeout(fn, ms)); }

    function show() {
      if (open) return; open = true;
      clearAll();
      line.classList.remove('show'); line.textContent = '';
      closeBtn.hidden = true; closeBtn.classList.remove('show');
      box.classList.add('on'); box.setAttribute('aria-hidden', 'false');
      document.body.classList.add('is-locked');
      // everything goes quiet — the silence is doing half the work
      music.duck(true); rain.duck(true); sfx.duck(true);
      try { if (box.requestFullscreen) box.requestFullscreen(); } catch (e) {}
      buzz(8);
      progress.mark('mirror');

      // four seconds of nothing but her own reflection
      at(4200, function () { line.textContent = 'It was you.'; line.classList.add('show'); });
      at(9000, function () {
        line.classList.remove('show');
        at(1400, function () {
          line.textContent = 'It was always going to be you.';
          line.classList.add('show');
        });
      });
      at(13000, function () { closeBtn.hidden = false; closeBtn.classList.add('show'); });
    }

    function hide() {
      open = false; clearAll();
      box.classList.remove('on'); box.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('is-locked');
      line.classList.remove('show');
      music.duck(false); rain.duck(false); sfx.duck(false);
      try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen(); } catch (e) {}
    }

    return {
      start: function () {
        $('#mirror-btn').addEventListener('click', show);
        closeBtn.addEventListener('click', hide);
        document.addEventListener('keydown', function (e) {
          if (e.key === 'Escape' && open) hide();
        });
      }
    };
  })();


  /* ============================================================
     HER BOARD — every line here is quoted from the board she made
     for herself. Nothing invented; only answered.
     ============================================================ */

  (function board() {
    var host = $('#board'), end = $('#board-end');
    var B = [
      { tag: 'you wrote', hers: '“I worried about… not being good enough.”',
        his: 'You wrote that on a wall, above a desk covered in books you were teaching yourself from. ' +
             'Nobody who is not good enough does that. <b>Not-good-enough people do not build a desk like that.</b>' },
      { tag: 'you wrote', hers: '“I used to… feel like I’m not enough. Compare myself.”',
        his: 'You compare your inside to other people’s outside, which is a rigged game and you always lose it. ' +
             'I have seen the inside. It is kinder and harder-working than most of the outsides you are measuring it against.' },
      { tag: 'your goals', hers: '“Finish Quran. Become a teacher. Write a novel. Help my family. Travel the world. Make my parents proud.”',
        his: 'Six things, and not one of them is about being admired. Every single one is about giving something back. ' +
             '<b>That list tells me more about you than any photograph.</b>' },
      { tag: 'the books', hers: 'Second Language Acquisition · English Grammar in Use · Teaching by Principles',
        his: 'You are going to be a very good teacher. Not because of the books — because you are the person ' +
             'people already come to when they do not understand something and are embarrassed about it.' },
      { tag: 'you were proud of', hers: '“Not giving up. Always trying. Caring deeply. Having a big heart.”',
        his: 'You listed caring deeply as an achievement, and you were right to. Most people file it under weakness ' +
             'and spend years training it out of themselves. Do not.' },
      { tag: 'on the wall', hers: 'Sabr · صبر',
        his: 'Patience, and the harder half of it: staying decent while you wait. You have had more practice at ' +
             'that than anyone your age should have needed.' },
      { tag: 'the black note', hers: '“Even on the hardest days, I still got up and tried.”',
        his: 'This is the one I keep going back to. Not the goals, not the dreams. <b>This.</b> ' +
             'You got up. On the days it was pointless, you got up anyway. That is the entire thing.' },
      { tag: 'you reminded yourself', hers: '“You are stronger than you think. Your pain has a purpose. You’re going to make it.”',
        his: 'You wrote those to a version of yourself who needed them and could not hear them from anybody else. ' +
             'So here they are from outside your own head, where they are easier to believe: ' +
             '<b>all four of them are true, and you are already making it.</b>' }
    ];

    B.forEach(function (n) {
      var d = document.createElement('div');
      d.className = 'note';
      d.innerHTML = '<span class="note-tag">' + n.tag + '</span>' +
                    '<p class="note-hers">' + n.hers + '</p>' +
                    '<p class="note-his">' + n.his + '</p>' +
                    (n.tag === 'on the wall' ? '<p class="sabr">صبر</p>' : '');
      host.appendChild(d);
    });

    end.innerHTML = 'You called that board <i>The Old Me</i>. I have met the new one. ' +
                    'She is the same person, only less frightened — and I liked the first one too.';
  })();

  /* ============================================================
     THE SEAL — press and hold for what was never said
     ============================================================ */

  var vault = (function () {
    var med = $('#medallion'), box = $('#vault'), list = $('#vault-list'), hint = $('#secret-hint');
    var KEY = 'lana-2808-vault', timer = null, asked = false;
    var LINES = [
      'I check whether you are online more times a day than I would ever admit.',
      'When you go quiet I invent entire disasters in my head. Then one <b>blah</b> arrives and I am fine again.',
      'Here it is once, and I am not deleting it this time: <b>I am not only your friend, and I think you have known that for a while.</b>',
      'If you ever said it first, I would say it back before you finished the sentence.',
      'I am not asking you for anything today. I only refused to let another 28th of August go by with you not knowing.'
    ];

    function build() {
      if (list.children.length) return;
      LINES.forEach(function (t) {
        var li = document.createElement('li'); li.innerHTML = t; list.appendChild(li);
      });
    }
    function open() {
      build();
      box.classList.add('open'); box.setAttribute('aria-hidden', 'false');
      document.body.classList.add('is-locked');
      med.classList.remove('ready');
      try { localStorage.setItem(KEY, '1'); } catch (e) {}
      buzz([18, 50, 18, 50, 40]); sfx.heart(3);
      progress.mark('vault');
      $$('#vault-list li').forEach(function (li, i) {
        setTimeout(function () { li.classList.add('in'); sfx.chime(i + 2); }, 450 + i * 800);
      });
      hint.innerHTML = 'You found it. Hold the seal any time you want to read it again.';
    }
    function close() {
      box.classList.remove('open'); box.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('is-locked');
    }
    function askMotion() {
      if (asked) return; asked = true;
      try {
        if (window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function') {
          DeviceMotionEvent.requestPermission().then(function (r) { if (r === 'granted') shake.listen(); }).catch(function () {});
        } else shake.listen();
      } catch (e) {}
    }
    function down() {
      askMotion();
      med.classList.add('pressing');
      clearTimeout(timer);
      timer = setTimeout(function () { med.classList.remove('pressing'); open(); }, 1000);
    }
    function up() { clearTimeout(timer); med.classList.remove('pressing'); }

    return {
      start: function () {
        med.addEventListener('pointerdown', down);
        med.addEventListener('pointerup', up);
        med.addEventListener('pointerleave', up);
        med.addEventListener('pointercancel', up);
        med.addEventListener('contextmenu', function (e) { e.preventDefault(); });
        med.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
        });
        $('#vault-close').addEventListener('click', close);
        box.addEventListener('click', function (e) { if (e.target === box) close(); });
        document.addEventListener('keydown', function (e) {
          if (e.key === 'Escape' && box.classList.contains('open')) close();
        });
        try {
          if (localStorage.getItem(KEY)) hint.innerHTML = 'Hold the seal in the corner again whenever you want it.';
        } catch (e) {}
      }
    };
  })();

  /* ============================================================
     SHAKE
     ============================================================ */

  var shake = (function () {
    var card = $('#shake-card'), text = $('#shake-text');
    var last = 0, prev = null, listening = false, i = 0;
    var LINES = [
      'Still thinking about you. Shake again, it will not change.',
      'You are the only person who can say one word and fix a whole day.',
      'Go and drink some water. Then come back.',
      'You looked good today. No evidence. Just confidence.',
      'If it is 3am: sleep. This will still be here.',
      'Nobody laughs at your jokes the way I do.'
    ];
    function show() {
      text.textContent = LINES[i % LINES.length]; i++;
      card.classList.add('show'); buzz(12); sfx.chime(i + 1);
      clearTimeout(show._t);
      show._t = setTimeout(function () { card.classList.remove('show'); }, 5000);
    }
    function onMotion(e) {
      var a = e.accelerationIncludingGravity;
      if (!a) return;
      if (prev) {
        var d = Math.abs(a.x - prev.x) + Math.abs(a.y - prev.y) + Math.abs(a.z - prev.z);
        var now = performance.now();
        if (d > 34 && now - last > 5000) { last = now; show(); }
      }
      prev = { x: a.x || 0, y: a.y || 0, z: a.z || 0 };
    }
    return {
      listen: function () {
        if (listening || RM) return; listening = true;
        window.addEventListener('devicemotion', onMotion);
      },
      show: show
    };
  })();

  /* ============================================================
     WRITE BACK
     ============================================================ */

  var writeback = (function () {
    var KEY = 'lana-2808-back';
    var store = { replies: [], wishes: [] };
    var note = $('#reply-note'), jar = $('#jar');
    var canPersist = null;

    function load() {
      try {
        var raw = localStorage.getItem(KEY);
        if (raw) { var v = JSON.parse(raw); if (v && v.replies) store = v; }
      } catch (e) {}
    }
    function save() {
      try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {}
      persist();
    }
    function persist() {
      if (canPersist === false) return;
      if (!window.claude || typeof window.claude.use !== 'function') { canPersist = false; return; }
      try {
        window.claude.use('artifact').then(function (api) {
          if (!api || typeof api.publish !== 'function') { canPersist = false; return; }
          return api.publish({ 'data/lana.json': JSON.stringify(store, null, 2) }).then(function () {
            canPersist = true;
            try { localStorage.setItem('lana-2808-persisted', '1'); } catch (e) {}
            if (note.dataset.kind === 'reply') say('Sent. It is saved into this page — he will see it here.', 'reply');
          }, function () { canPersist = false; });
        }, function () { canPersist = false; });
      } catch (e) { canPersist = false; }
    }
    function pullRemote() {
      if (!window.claude || typeof window.claude.use !== 'function') return;
      // only worth asking once something has actually been written there,
      // otherwise every visit logs a 404 for a file that does not exist yet
      var everSaved = false;
      try { everSaved = !!localStorage.getItem('lana-2808-persisted'); } catch (e) {}
      if (!everSaved) return;
      try {
        fetch('data/lana.json', { cache: 'no-store' })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (v) {
            if (!v || !v.wishes) return;
            var seen = {};
            store.wishes.concat(v.wishes).forEach(function (w) { seen[w.at + '|' + w.t] = w; });
            store.wishes = Object.keys(seen).map(function (k) { return seen[k]; })
              .sort(function (a, b) { return a.at - b.at; });
            renderJar();
          }).catch(function () {});
      } catch (e) {}
    }
    function fmt(ts) {
      var d = new Date(ts);
      try { return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }); }
      catch (e) { return d.toDateString(); }
    }
    function renderJar() {
      jar.innerHTML = '';
      store.wishes.forEach(function (w) {
        var li = document.createElement('li');
        var d = document.createElement('span'); d.className = 'd'; d.textContent = fmt(w.at);
        var t = document.createElement('span'); t.className = 't'; t.textContent = w.t;
        li.appendChild(d); li.appendChild(t); jar.appendChild(li);
      });
    }
    function say(msg, kind) { note.textContent = msg; note.dataset.kind = kind || ''; note.classList.add('show'); }
    function copy(txt) {
      var done = function () { say('Copied. Paste it to him wherever you two actually talk.', 'copy'); };
      function fallback() {
        try {
          var ta = document.createElement('textarea');
          ta.value = txt; ta.style.cssText = 'position:fixed;opacity:0;left:-9999px';
          document.body.appendChild(ta); ta.select();
          document.execCommand('copy'); document.body.removeChild(ta); done();
        } catch (e) { say('Select it and copy it — your browser will not let me.', 'copy'); }
      }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, fallback);
      else fallback();
    }

    return {
      start: function () {
        load(); renderJar(); pullRemote();
        var ta = $('#reply-text'), wi = $('#wish-text');
        if (store.replies.length) ta.value = store.replies[store.replies.length - 1].t;

        $('#reply-send').addEventListener('click', function () {
          var v = ta.value.trim();
          if (!v) { say('Write something first. Even one word.', 'reply'); return; }
          store.replies.push({ t: v, at: Date.now() });
          save(); buzz([10, 40, 10]); sfx.chime(4); progress.mark('reply');
          say('Kept. Saved here, and it is yours — nobody can delete it but you.', 'reply');
        });
        $('#reply-copy').addEventListener('click', function () {
          var v = ta.value.trim();
          if (!v) { say('Nothing to copy yet.', 'copy'); return; }
          copy(v);
        });
        $('#wish-add').addEventListener('click', function () {
          var v = wi.value.trim();
          if (!v) return;
          store.wishes.push({ t: v, at: Date.now() });
          wi.value = ''; save(); renderJar(); buzz(8); sfx.chime(6); progress.mark('wish');
          confetti.petals(14);
        });
        wi.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') { e.preventDefault(); $('#wish-add').click(); }
        });
      }
    };
  })();

  /* ============================================================
     RESUME · PROGRESS · GOLD LEAF
     ============================================================ */

  var resume = (function () {
    var KEY = 'lana-2808-spot', bar = $('#resume'), saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    function save() {
      try {
        var y = window.scrollY, h = document.body.scrollHeight - window.innerHeight;
        if (h > 0 && y / h > 0.06 && y / h < 0.94) localStorage.setItem(KEY, JSON.stringify({ r: y / h }));
      } catch (e) {}
    }
    return {
      start: function () {
        var t; window.addEventListener('scroll', function () {
          clearTimeout(t); t = setTimeout(save, 1000);
        }, { passive: true });
      },
      offer: function () {
        if (!saved || !saved.r) return;
        setTimeout(function () {
          bar.classList.add('show');
          setTimeout(function () { bar.classList.remove('show'); }, 13000);
        }, 2400);
        $('#resume-go').addEventListener('click', function () {
          var h = document.body.scrollHeight - window.innerHeight;
          window.scrollTo({ top: saved.r * h, behavior: 'smooth' });
          bar.classList.remove('show');
        });
        $('#resume-x').addEventListener('click', function () { bar.classList.remove('show'); });
      }
    };
  })();

  (function chrome() {
    var bar = $('#prog'), cue = $('#cue'), ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        var h = document.body.scrollHeight - window.innerHeight;
        bar.style.width = (h > 0 ? clamp(window.scrollY / h, 0, 1) * 100 : 0) + '%';
        if (cue) cue.classList.toggle('hide', window.scrollY > 40);
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
  })();

  $('#again').addEventListener('click', function () {
    try { localStorage.removeItem('lana-2808-spot'); } catch (e) {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(function () { location.reload(); }, 600);
  });

  // gold leaf shifts with the phone; one cheap listener, no loop
  if (!RM && window.DeviceOrientationEvent) {
    var hero = $('#hero'), pending = false, gv = 0;
    window.addEventListener('deviceorientation', function (e) {
      gv = clamp((e.gamma || 0) / 45, -1, 1);
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () {
        pending = false;
        if (hero) hero.style.setProperty('--leaf', (40 + gv * 34).toFixed(1) + '%');
      });
    }, true);
  }

  /* ============================================================
     BOOT
     ============================================================ */

  // a safety net: whatever she touches first, unlock audio while it is a gesture
  (function primeOnFirstTouch() {
    var done = false;
    var go = function () {
      if (done) return; done = true;
      try { music.prime(); } catch (e) {}
      try { sfx.wake(); } catch (e) {}
    };
    ['pointerdown', 'touchstart', 'keydown'].forEach(function (ev) {
      document.addEventListener(ev, go, { once: true, passive: true, capture: true });
    });
  })();

  fall.start();
  confetti.start();
  cake.start();
  rose.start();
  scratch.start();
  coupons.start();
  lightbox.start();
  keepsake.start();
  record.start();
  contents.start();
  streak.start();
  today.start();
  capsule.start();
  mode.start();
  rain.start();
  arcade.start();
  moreLetters.start();
  keeps.start();
  pages.start();
  film.start();
  midnight.start();
  report.start();
  question.start();
  openWhen.start();
  passwords.start();
  mirror.start();
  garden.start();
  future.start();
  room.start();
  sing.start();
  game.start();
  dayLock.start();
  cover.start();
  diary.start();
  quiz.start();
  oracle.start();
  calendar.start();
  music.bind();
  vault.start();
  writeback.start();
  resume.start();
  envelope.start();
})();
