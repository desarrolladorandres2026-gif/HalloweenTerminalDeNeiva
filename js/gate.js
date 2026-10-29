/* Pantalla de entrada: murciélagos en vuelo y pequeñas calabazas encendidas. */
(function () {
  'use strict';
  const cv = document.getElementById('gate-canvas');
  if (!cv || !window.Pumpkin || !window.FX) return;
  const g = cv.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rnd = (a, b) => a + Math.random() * (b - a);

  let w = 0, h = 0, pumps = [], bats = [], raf = 0, t = 0, last = 0, running = true;

  function build() {
    const base = Math.min(w * .3, h * .24, 210);
    const defs = [{ x: .17, y: .9, k: 1 }, { x: .83, y: .91, k: .85 }];
    if (w > 700) defs.push({ x: .5, y: .97, k: .5 }, { x: .32, y: .95, k: .45 }, { x: .68, y: .95, k: .5 });
    pumps = defs.map((d, i) => {
      const size = base * d.k, c = document.createElement('canvas');
      const p = new Pumpkin(c);
      p.resize(size, size * .86, Math.min(window.devicePixelRatio || 1, 1.5));
      return { p, c, size, x: d.x * w, y: d.y * h, ph: rnd(0, 6), delay: .3 + i * .45,
        S: { reveal: 0, dock: 0, px: 0, py: 0, boost: 0, eye: 0, beat: 0, hover: 0 } };
    });
    const n = reduced ? 2 : 4;
    bats = [];
    for (let i = 0; i < n; i++) bats.push(newBat(true, i));
  }

  function newBat(initial, i) {
    const dir = Math.random() < .5 ? 1 : -1;
    return {
      dir, x: initial ? rnd(0, w) : (dir > 0 ? -60 : w + 60), y: rnd(.1, .6) * h,
      vx: dir * rnd(70, 130), s: rnd(2.6, 4.2) * Math.min(1.3, Math.max(.7, w / 900)),
      ph: rnd(0, 6), wob: rnd(.8, 1.6), amp: rnd(20, 50), flap: rnd(0, 6), wait: initial ? 0 : rnd(0, 2)
    };
  }

  function size() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = window.innerWidth; h = window.innerHeight;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }

  function frame(ts) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, last ? (ts - last) / 1000 : .016);
    last = ts; t += dt;

    g.clearRect(0, 0, w, h);
    g.globalCompositeOperation = 'lighter';
    const bg = g.createRadialGradient(w / 2, h * .6, 0, w / 2, h * .6, Math.max(w, h) * .6);
    bg.addColorStop(0, 'rgba(255,106,0,.09)'); bg.addColorStop(1, 'rgba(255,106,0,0)');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);

    pumps.forEach(o => {
      const s = o.S, tt = t + o.ph;
      s.reveal = Math.min(1, Math.max(0, (t - o.delay) / 1.2));
      s.boost = .12 + .1 * Math.sin(tt * 1.3);
      s.eye = .15 + .15 * Math.sin(tt * 2.1);
      s.px = Math.sin(tt * .5) * .4;
      o.p.draw(s, tt);
      const bob = reduced ? 0 : Math.sin(tt * 1.1) * 5;
      const fl = (.8 + .2 * Math.sin(tt * 5)) * s.reveal;
      const gr = g.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.size * 1.4);
      gr.addColorStop(0, 'rgba(255,120,20,' + .26 * fl + ')'); gr.addColorStop(1, 'rgba(255,106,0,0)');
      g.fillStyle = gr; g.fillRect(o.x - o.size * 1.5, o.y - o.size * 1.5, o.size * 3, o.size * 3);
      g.drawImage(o.c, o.x - o.size / 2, o.y - o.size * .43 + bob, o.size, o.size * .86);
    });

    g.globalCompositeOperation = 'source-over';
    bats.forEach((b, i) => {
      if (b.wait > 0) { b.wait -= dt; return; }
      b.x += b.vx * dt; b.ph += dt * b.wob; b.flap += dt * 13;
      if ((b.dir > 0 && b.x > w + 80) || (b.dir < 0 && b.x < -80)) { bats[i] = newBat(false, i); return; }
      FX.drawBat(g, b.x, b.y + Math.sin(b.ph) * b.amp, b.s, b.flap, b.dir, .85);
    });
  }

  window.addEventListener('resize', () => { if (running) size(); });
  window.GateFx = { stop() { running = false; cancelAnimationFrame(raf); } };
  size();
  raf = requestAnimationFrame(frame);
})();
