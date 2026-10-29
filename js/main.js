/* Orquestación: estado, bucle de render, escenas, botones e interacciones. */
(function () {
  'use strict';

  const C = window.CONFIG;
  const $ = s => document.querySelector(s);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const lowPower = (navigator.hardwareConcurrency || 4) <= 4;
  const quality = reduced ? .35 : (coarse || lowPower) ? .65 : 1;

  const el = {
    pumpkin: $('#pumpkin'), inner: $('.pk-inner'), canvas: $('#pk'), photo: $('#photo'),
    terminal: $('#s-terminal'), announce: $('#s-announce'),
    secret: $('#secret'), secretP: $('#secret p'), sound: $('#sound'),
    cut: $('#cut'), gate: $('#gate'), enter: $('#enter'),
    hint: $('#hint'), reveal: $('#reveal'), replay: $('#replay')
  };

  const fresh = () => ({
    glow: 0, expand: 0, pulse: 0, boost: 0, smoke: 0, smokeBoost: 0, reveal: 0, eye: 0,
    drac: 0, embers: 0, dock: 0, beat: 0, horizon: 0, sweep: 0, tint: 0, batsOn: false,
    hover: 0, charge: 0, kick: 0, wob: 0, pw: 300, damage: 0, dent: 0, tilt: 0, sq: 0, sqV: 0,
    cx: window.innerWidth / 2, cy: window.innerHeight / 2, lx: 0, px: 0, py: 0
  });
  const S = fresh();

  const music = new Music(C.audioSrc, C.volume, C.audioReactive);
  const pumpkin = new Pumpkin(el.canvas);
  const drac = new Dracula($('#drac'));
  const fx = new FX($('#back'), $('#front'), S, { quality, reduced });
  const tl = new Anim.Timeline(C.timeline, music, C.syncToAudio);
  const tw = Anim.tween, ez = Anim.ease;

  let started = false, clicks = 0, hits = 0, taps = 0, secretDone = false, hasPhoto = false;
  let hoverT = 0, holding = false, holdT = 0, exploded = false;
  let replaying = false;

  // Espera sin setTimeout: pertenece a Anim, así reiniciar la experiencia la cancela.
  const after = (ms, fn) => tw({ v: 0 }, 'v', 1, ms, { done: fn });

  // ---------- fotografía opcional ----------
  if (C.photoSrc) {
    const img = new Image();
    img.onload = () => { el.photo.style.backgroundImage = 'url("' + C.photoSrc + '")'; hasPhoto = true; };
    img.onerror = () => console.info('[halloween] Sin fotografía (' + C.photoSrc + '). Se usa solo el nombre institucional.');
    img.src = C.photoSrc;
  }

  // ---------- tamaño ----------
  function sizePumpkin() {
    pumpkin.resize(el.pumpkin.offsetWidth, el.pumpkin.offsetHeight, Math.min(window.devicePixelRatio || 1, 2));
    const dc = $('#drac');
    drac.resize(dc.clientWidth, dc.clientHeight, Math.min(window.devicePixelRatio || 1, 2));
  }
  let rz = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => { fx.resize(); sizePumpkin(); }, 150);
  });
  sizePumpkin();

  // ---------- puntero: paralaje + cursor mágico ----------
  let mx = 0, my = 0, lastMove = -1e9;
  window.addEventListener('pointermove', e => {
    if (started) fx.trail(e.clientX, e.clientY);
    if (e.pointerType === 'touch') return;
    mx = (e.clientX / window.innerWidth - .5) * 2;
    my = (e.clientY / window.innerHeight - .5) * 2;
    lastMove = performance.now();
  }, { passive: true });

  // ---------- bucle ----------
  let last = 0, raf = 0, T = 0;
  const decay = (v, tau, dt) => v * Math.exp(-dt / tau);

  function frame(ts) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(50, last ? ts - last : 16);
    last = ts; T += dt / 1000;

    Anim.update(dt);
    tl.update(dt);
    ambient(dt);

    // mantener pulsada la calabaza: la luz se carga hasta la explosión
    if (holding) {
      holdT += dt;
      if (holdT > 350 && !exploded) {
        S.charge = Math.min(1, (holdT - 350) / 1000);
        if (S.charge >= 1) { exploded = true; S.charge = 0; energyBlast(); }
      }
    } else S.charge = decay(S.charge, 200, dt);
    S.hover += (hoverT - S.hover) * (1 - Math.exp(-dt / 140));

    S.boost = Math.max(decay(S.boost, 700, dt), S.hover * .3, S.charge);
    S.eye = Math.max(decay(S.eye, 900, dt), S.hover * .3, S.charge);
    S.pulse = decay(S.pulse, 900, dt);
    S.smokeBoost = decay(S.smokeBoost, 1800, dt);
    S.kick = decay(S.kick, 260, dt);
    S.wob = decay(S.wob, 500, dt);
    // muelle de aplastamiento al golpear (sq > 0: se achata, sq < 0: se estira)
    const d = dt / 1000;
    S.sqV += (-420 * S.sq - 15 * S.sqV) * d; S.sq = Math.max(-.6, Math.min(.6, S.sq + S.sqV * d));
    S.beat = music.sample();

    const idle = reduced || ts - lastMove > 3500;
    const tx = idle ? (reduced ? 0 : Math.sin(T * .25) * .55) : mx;
    const ty = idle ? (reduced ? 0 : Math.cos(T * .2) * .35) : my;
    const k = 1 - Math.exp(-dt / 260);
    S.px += (tx - S.px) * k; S.py += (ty - S.py) * k;

    const r = el.pumpkin.getBoundingClientRect();
    S.cx = r.left + r.width / 2; S.cy = r.top + r.height / 2; S.pw = r.width;
    S.lx = -S.px * window.innerWidth * .035;

    const depth = 1 + S.hover * .8;
    const jit = reduced ? 0 : S.charge * 2.5 * (Math.random() - .5);
    const sc = 1 + S.hover * .035 + S.charge * .05 + Math.cos(T * 30) * S.kick * .03;
    const sx = sc * (1 + S.sq * .28 + S.dent * .07), sy = sc * (1 - S.sq * .28 - S.dent * .1);
    el.inner.style.transform = 'translate3d(' + (-S.px * 12 * depth + jit).toFixed(2) + 'px,' + (-S.py * 8 * depth + jit).toFixed(2) + 'px,0) rotate('
      + (S.px * .9 + S.tilt + Math.sin(T * 22) * S.wob * 5).toFixed(2) + 'deg) scale(' + sx.toFixed(3) + ',' + sy.toFixed(3) + ')';

    pumpkin.draw(S, T);
    drac.draw(S.drac, reduced ? 0 : T, S.px, S.py, S.pulse);
    fx.frame(dt, T);
  }
  // Animaciones por toda la pantalla mientras el Terminal espera el botón REVELAR.
  const amb = { burst: 0, ring: 0, rain: 0, bat: 0, sweep: 0, flash: 0, on: false };
  const rr = (a, b) => a + Math.random() * (b - a);
  function ambient(dt) {
    const on = tl.hasFired('terminal') && !tl.hasFired('announceTitle');
    if (on !== amb.on) {
      amb.on = on; document.body.classList.toggle('waiting', on);
      if (on) { amb.burst = 400; amb.ring = 900; amb.rain = 1200; amb.bat = 1500; amb.sweep = 2500; amb.flash = rr(3500, 6000); }
    }
    if (!on || reduced) return;
    const W = window.innerWidth, H = window.innerHeight;
    if ((amb.burst -= dt) < 0) { amb.burst = rr(500, 1100); fx.burst(rr(.08, .92) * W, rr(.1, .9) * H, 28); }
    if ((amb.ring -= dt) < 0) { amb.ring = rr(1400, 2600); fx.ring(rr(.15, .85) * W, rr(.2, .8) * H, Math.max(W, H) * rr(.2, .4), 1.2); S.pulse = Math.max(S.pulse, .7); }
    if ((amb.rain -= dt) < 0) { amb.rain = rr(2200, 3800); fx.rain(40); }
    if ((amb.bat -= dt) < 0) { amb.bat = rr(2500, 4500); fx.spawnBat(); }
    if ((amb.sweep -= dt) < 0) { amb.sweep = rr(3500, 5000); S.sweep = 0; tw(S, 'sweep', 1, 1400, { ease: ez.lin }); S.smokeBoost = 1; }
    if ((amb.flash -= dt) < 0) { // relámpago anaranjado de pantalla completa
      amb.flash = rr(4500, 8000);
      const f = document.getElementById('flash');
      f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
      S.boost = Math.max(S.boost, 1.2); S.kick = .8;
    }
  }
  function run() { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }
  function halt() { cancelAnimationFrame(raf); raf = 0; }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { halt(); music.pauseHidden(); } else { run(); music.resumeVisible(); }
  });

  // ---------- botones: solo los que tienen sentido en cada momento ----------
  const buttons = ['reveal', 'replay'];
  function ui(names) { buttons.forEach(n => { el[n].hidden = names.indexOf(n) < 0; }); }
  const show = n => n.classList.add('show');
  const hide = n => n.classList.remove('show');

  // ---------- efectos reutilizables ----------
  function burstFx(n, soft) {
    S.pulse = Math.max(S.pulse, soft ? 1.2 : 1);
    S.smokeBoost = 1;
    fx.burst(S.cx, S.cy, n);
  }
  function energyBlast() {
    S.eye = 1.6; S.boost = 1.4; S.pulse = 2; S.kick = 1; S.smokeBoost = 1;
    fx.burst(S.cx, S.cy, 220); fx.ring(S.cx, S.cy);
    after(140, () => fx.ring(S.cx, S.cy, undefined, 1.1));
  }

  // ---------- escenas (cada marca de la línea de tiempo) ----------
  tl.on('ember', () => tw(S, 'embers', .35, 1500))
    .on('glow', () => tw(S, 'glow', .3, 1800))
    .on('smoke', () => tw(S, 'smoke', 1, 2500))
    .on('reveal', () => {
      tw(S, 'reveal', 1, 2200, { ease: ez.out });
      tw(S, 'glow', .85, 2200);
      tw(S, 'embers', 1, 2500);
    })
    .on('interactive', () => {
      el.pumpkin.classList.add('live'); el.pumpkin.tabIndex = 0;
    })
    .on('hint', () => { if (!tl.hasFired('transition')) show(el.hint); })
    .on('bats', () => { S.batsOn = true; })
    .on('transition', () => {
      hide(el.hint);
      ui([]);
      el.pumpkin.classList.add('docked');
      S.kick = 1;
      burstFx(160, true);
      fx.ring(S.cx, S.cy);
      tw(S, 'expand', 1, 600, { ease: ez.out, done: () => tw(S, 'expand', .25, 1500) });
      tw(S, 'glow', .55, 1200, { delay: 200 });
      tw(S, 'dock', 1, 800);
      tw(S, 'horizon', 1, 1500);
      S.sweep = 0; tw(S, 'sweep', 1, 900, { ease: ez.lin });
      if (hasPhoto) el.photo.classList.add('on');
    })
    .on('terminal', () => {
      show(el.terminal); el.terminal.classList.add('in');
      ui(['reveal']);
      tw(S, 'drac', 1, 1600, { ease: ez.out });
      tl.waitFor = 'terminalOut'; // el reloj se detiene hasta que se pulse REVELAR LA INVITACIÓN
    })
    .on('terminalOut', () => hide(el.terminal))
    .on('announceTitle', () => {
      tw(S, 'drac', 0, 700);
      show(el.announce); el.announce.classList.add('s1');
      S.pulse = 1.3; S.boost = .8; S.kick = .8;
      fx.ring(window.innerWidth / 2, window.innerHeight * .3, undefined, .8);
      ui([]);
    })
    .on('announceSub', () => el.announce.classList.add('s2'))
    .on('announceDate', () => el.announce.classList.add('s3'))
    .on('announceInst', () => el.announce.classList.add('s4'))
    .on('announceInvite', () => {
      el.announce.classList.add('s5'); S.pulse = 1.2; S.boost = .8; fx.burst(S.cx, S.cy, 60);
    })
    .on('end', () => ui(['replay']));

  // ---------- acciones de los botones ----------
  function goReveal() {
    if (tl.hasFired('announceTitle')) return;
    ui([]);
    fx.implode(window.innerWidth / 2, window.innerHeight / 2, 110);
    S.boost = 1; S.smokeBoost = 1;
    after(380, () => {
      fx.burst(window.innerWidth / 2, window.innerHeight * .35, 90);
      S.pulse = 1.6;
      tl.proceed('announceTitle');
    });
  }
  el.reveal.addEventListener('click', goReveal);
  el.replay.addEventListener('click', replay);

  // Enter / Espacio activan el control principal solo si el foco no está ya en un control
  document.addEventListener('keydown', e => {
    if (e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (e.target.closest && e.target.closest('button, a, input, #pumpkin')) return;
    const act = !started ? enter : !el.reveal.hidden ? goReveal : null;
    if (act) { e.preventDefault(); act(); }
  });

  // ---------- la calabaza ----------
  const reactions = [
    () => { S.eye = 1; fx.burst(S.cx, S.cy, 80); S.pulse = Math.max(S.pulse, 1); },
    () => { S.eye = .8; S.kick = 1; fx.ring(S.cx, S.cy); },
    () => { S.wob = 1; S.smokeBoost = 1; fx.burst(S.cx, S.cy, 45); },
    () => { S.boost = 1.3; S.pulse = 1.6; fx.ring(S.cx, S.cy, undefined, .6); after(130, () => fx.ring(S.cx, S.cy)); fx.burst(S.cx, S.cy, 50); }
  ];

  // Copia de lo que muestra ahora la calabaza, para recortar de ahí los pedazos.
  function snapshot() {
    pumpkin.draw(S, T); // asegura que el lienzo tiene el estado actual
    const c = document.createElement('canvas');
    c.width = el.canvas.width; c.height = el.canvas.height;
    c.getContext('2d').drawImage(el.canvas, 0, 0);
    return c;
  }

  // Introducción: cada toque abolla la calabaza y le arranca un pedazo; al décimo estalla y la secuencia continúa.
  function hitPumpkin() {
    hits++;
    S.sqV = 7 + hits * .4; S.kick = 1;
    S.dent = Math.min(1, hits / C.breakHits);
    tw(S, 'tilt', (hits % 2 ? 1 : -1) * (1.5 + hits * .5), 180, { ease: ez.out });
    if (hits >= C.breakHits) { breakPumpkin(); return; }
    const i = hits - 1;
    if (i < pumpkin.holes.length) {
      fx.pieces(snapshot(), el.canvas.getBoundingClientRect(), [pumpkin.holePx(i)], 1.1);
      tw(S, 'damage', hits, 120, { ease: ez.out });
    }
  }

  function breakPumpkin() {
    const cols = quality < 1 ? 5 : 7, rows = quality < 1 ? 4 : 6;
    fx.pieces(snapshot(), el.canvas.getBoundingClientRect(), pumpkin.fracture(cols, rows), 1.4);
    energyBlast();
    const clean = () => { S.reveal = 0; S.damage = 0; S.dent = 0; S.sq = 0; S.sqV = 0; S.tilt = 0; };
    clean(); after(250, clean); // por si quedaba una interpolación del último golpe
    tl.proceed('transition');
    after(900, () => tw(S, 'reveal', 1, 500)); // la calabaza renace ya acoplada
  }

  function poke() {
    if (!el.pumpkin.classList.contains('live') || S.reveal < .5) return;
    S.boost = Math.max(S.boost, 1);
    reactions[taps++ % reactions.length]();
    if (!tl.hasFired('transition')) {
      hitPumpkin();
      return;
    }
    clicks++;
    if (clicks >= C.secretClicks && !secretDone) runSecret();
  }
  el.pumpkin.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (!el.pumpkin.classList.contains('live')) return;
    holding = true; holdT = 0; exploded = false;
    poke();
  });
  const release = () => { holding = false; };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  el.pumpkin.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') hoverT = 1; });
  el.pumpkin.addEventListener('pointerleave', () => { hoverT = 0; holding = false; });
  el.pumpkin.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!e.repeat) poke(); }
  });

  // toque en el fondo: destello pequeño; en modo exploración, una sorpresa
  document.addEventListener('pointerdown', e => {
    if (!started || e.target.closest('button, #pumpkin, #gate')) return;
    fx.burst(e.clientX, e.clientY, 14); fx.ring(e.clientX, e.clientY, 90, .5);
  });

  // ---------- secreto de siete clics ----------
  function runSecret() {
    secretDone = true;
    el.secretP.textContent = '';
    C.secretText.split(' ').forEach((word, i) => {
      const s = document.createElement('span');
      s.className = 'sw'; s.style.setProperty('--i', i); s.textContent = word;
      el.secretP.appendChild(s);
      el.secretP.appendChild(document.createTextNode(' '));
    });
    // 1) la energía converge, 2) estalla con ondas, murciélagos y lluvia de brasas, 3) aparece el mensaje
    fx.implode(S.cx, S.cy, 120);
    S.eye = 1.6; S.boost = 1.4;
    after(350, () => {
      document.body.classList.add('secret-on');
      show(el.secret);
      tw(S, 'glow', 1, 600);
      energyBlast();
      after(180, () => fx.ring(S.cx, S.cy, undefined, 1.3));
      fx.spawnBat(5); fx.rain(70);
      S.tint = 0; tw(S, 'tint', 1, 400);
      after(C.secretHold, () => {
        hide(el.secret);
        document.body.classList.remove('secret-on');
        tw(S, 'glow', .55, 800);
        tw(S, 'tint', 0, 800);
      });
    });
  }

  // ---------- música ----------
  music.onchange = () => {
    el.sound.hidden = !music.ok;
    el.sound.setAttribute('aria-pressed', String(music.muted));
    el.sound.setAttribute('aria-label', music.muted ? 'Reanudar música' : 'Pausar música');
  };
  el.sound.addEventListener('click', () => music.toggle());

  // ---------- inicio y repetición ----------
  function begin() {
    el.sound.classList.add('show');
    tl.start();
    tl.waitFor = 'transition';
    const skip = +new URLSearchParams(location.search).get('t') || 0; // ?t=30 salta a los 30 s (solo para ajustar)
    if (skip) { tl.offset = skip * 1000; tl.update(0); for (let i = 0; i < skip * 20; i++) Anim.update(50); }
  }
  function enter() {
    if (started) return;
    started = true;
    el.gate.classList.add('out');
    setTimeout(() => { el.gate.hidden = true; if (window.GateFx) GateFx.stop(); }, 600);
    music.start();
    begin();
  }
  el.enter.addEventListener('click', enter);

  function reset() {
    Anim.clear();
    Object.assign(S, fresh());
    clicks = 0; hits = 0; taps = 0; secretDone = false; holding = false; exploded = false; hoverT = 0;
    el.pumpkin.classList.remove('live', 'docked');
    el.pumpkin.tabIndex = -1;
    [el.terminal, el.announce, el.secret, el.hint].forEach(hide);
    el.terminal.classList.remove('in');
    el.announce.classList.remove('s1', 's2', 's3', 's4', 's5');
    el.photo.classList.remove('on');
    document.body.classList.remove('secret-on');
    ui([]);
    fx.reset();
    sizePumpkin();
  }
  function replay() {
    if (replaying) return;
    replaying = true;
    el.cut.classList.add('on');
    setTimeout(() => {
      reset();
      begin();
      music.restart();
      el.cut.classList.remove('on');
      replaying = false;
    }, 500);
  }

  run();
})();
