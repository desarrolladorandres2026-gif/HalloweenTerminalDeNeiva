/*
 * Atmósfera en Canvas 2D: dos lienzos (detrás y delante de la calabaza).
 * Detrás: fondo, resplandor, haces de luz, niebla, brasas. Delante: niebla baja, brasas, chispas, murciélagos.
 */
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const rnd = (a, b) => a + Math.random() * (b - a);

  function sprite(size, stops) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    stops.forEach(s => g.addColorStop(s[0], s[1]));
    x.fillStyle = g; x.fillRect(0, 0, size, size);
    return c;
  }

  // Textura de niebla que se repite sin costura en horizontal.
  function fogSprite(rgb) {
    const W = 1024, H = 512;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d');
    for (let i = 0; i < 24; i++) {
      const px = rnd(0, W), py = rnd(H * .25, H * .75), r = rnd(90, 230);
      [-W, 0, W].forEach(dx => {
        const g = x.createRadialGradient(px + dx, py, 0, px + dx, py, r);
        g.addColorStop(0, 'rgba(' + rgb + ',.2)'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
        x.fillStyle = g; x.fillRect(0, 0, W, H);
      });
    }
    return c;
  }

  function drawBat(g, x, y, s, flap, dir, rim) {
    const f = Math.sin(flap);
    g.save(); g.translate(x, y); g.scale(dir * s, s);
    g.fillStyle = rim ? '#2a1205' : '#030201';
    g.strokeStyle = 'rgba(255,130,40,' + (rim || .22) + ')'; g.lineWidth = rim ? .5 : .35;
    for (let side = 0; side < 2; side++) {
      g.save(); if (side) g.scale(-1, 1);
      g.beginPath();
      g.moveTo(.4, -.6);
      g.bezierCurveTo(3, -3.5 - 5 * f, 7, -3 - 8 * f, 11, -.5 - 9 * f);
      g.quadraticCurveTo(9.4, 1 - 5 * f, 8, 1.6 - 4 * f);
      g.quadraticCurveTo(6.6, 3 - 3 * f, 5.2, 1.8 - 2 * f);
      g.quadraticCurveTo(3.6, 3.4 - f, 2, 1.6);
      g.quadraticCurveTo(1, 2.4, .4, 2);
      g.closePath(); g.fill(); g.stroke();
      g.restore();
    }
    g.beginPath(); g.ellipse(0, .4, 1.1, 2, 0, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(-.9, -1.3); g.lineTo(-.7, -2.6); g.lineTo(0, -1.6); g.lineTo(.7, -2.6); g.lineTo(.9, -1.3); g.closePath(); g.fill();
    g.restore();
  }

  class FX {
    constructor(back, front, S, opts) {
      this.cb = back; this.cf = front;
      this.b = back.getContext('2d'); this.f = front.getContext('2d');
      this.S = S; this.q = opts.quality; this.reduced = opts.reduced;
      this.t = 0;
      this.emberImg = sprite(64, [[0, 'rgba(255,236,180,1)'], [.16, 'rgba(255,175,70,.9)'], [.45, 'rgba(255,106,0,.25)'], [1, 'rgba(255,106,0,0)']]);
      const gray = fogSprite('196,166,146'), orange = fogSprite('255,112,30');
      this.fogB = [
        { img: gray, y: .36, k: 1.15, v: 9, a: .07, pos: 0 },
        { img: orange, y: .58, k: .95, v: -15, a: .07, pos: 300, add: true },
        { img: gray, y: .72, k: 1.35, v: 6, a: .06, pos: 700 }
      ];
      this.fogF = [
        { img: gray, y: .90, k: 1.0, v: -12, a: .08, pos: 150 },
        { img: gray, y: .80, k: 1.4, v: 8, a: .04, pos: 500 }
      ];
      this.orbs = []; this.puffs = []; this.puffT = 0;
      for (let i = 0, n = Math.round(16 * Math.max(.5, opts.quality)); i < n; i++) {
        this.orbs.push({ a: rnd(0, TAU), v: rnd(.4, .9) * (i % 3 === 0 ? -1 : 1), rx: rnd(1.05, 1.6), ry: rnd(.25, .55), tilt: rnd(-.35, .35), yoff: rnd(-.45, .35), size: rnd(1.4, 3.2), ph: rnd(0, TAU) });
      }
      this.puffImg = sprite(64, [[0, 'rgba(255,190,120,.9)'], [.5, 'rgba(255,130,50,.3)'], [1, 'rgba(255,106,0,0)']]);
      this.em = []; this.sparks = []; this.bats = []; this.rings = []; this.shards = []; this.trails = []; this.lastTrail = 0;
      this.batTimer = rnd(3000, 6000);
      this.resize();
    }

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      this.w = window.innerWidth; this.h = window.innerHeight;
      [this.cb, this.cf].forEach(c => { c.width = Math.round(this.w * dpr); c.height = Math.round(this.h * dpr); });
      this.b.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.f.setTransform(dpr, 0, 0, dpr, 0, 0);
      const area = Math.min(1.4, Math.max(.45, (this.w * this.h) / (1280 * 720)));
      this.max = Math.round(85 * this.q * area);
      while (this.em.length < this.max) this.em.push(this.newEmber({ on: false }, true));
      this.em.length = this.max;
    }

    newEmber(e, initial) {
      const near = Math.random() < .45;
      e.on = true;
      e.front = Math.random() < .25;
      e.x = near ? this.S.cx + rnd(-.3, .3) * this.w : rnd(0, this.w);
      e.y = initial ? rnd(this.h * .2, this.h) : this.h + rnd(0, 40);
      e.vy = rnd(14, 46); e.vx = 0;
      e.size = rnd(1.1, 3.4) * (e.front ? 1.7 : 1);
      e.age = initial ? rnd(0, 6) : 0; e.life = rnd(7, 15);
      e.ph = rnd(0, TAU); e.fr = rnd(.4, 1.3); e.sway = rnd(6, 22);
      return e;
    }

    burst(x, y, n) {
      n = Math.round(n * this.q);
      for (let i = 0; i < n; i++) {
        const a = rnd(0, TAU), sp = rnd(90, 460);
        this.sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, age: 0, life: rnd(1.4, 2.8), size: rnd(1.2, 3.4) });
      }
      if (this.sparks.length > 400) this.sparks.splice(0, this.sparks.length - 400);
      // las brasas cercanas salen despedidas
      const R = Math.max(this.w, this.h) * .5;
      this.em.forEach(e => {
        const dx = e.x - x, dy = e.y - y, d = Math.hypot(dx, dy) || 1;
        if (d < R) { const k = (1 - d / R) * rnd(120, 300); e.vx += dx / d * k; e.vy += -dy / d * k * .4; }
      });
    }

    reset() { this.sparks.length = 0; this.bats.length = 0; this.rings.length = 0; this.shards.length = 0; this.trails.length = 0; this.puffs.length = 0; this.batTimer = rnd(4000, 8000); }

    // Onda circular que se expande desde (x, y)
    ring(x, y, R, life) { if (this.rings.length < 8) this.rings.push({ x, y, age: 0, life: life || .8, R: R || Math.max(this.w, this.h) * .45 }); }

    // Partículas que viajan hacia el centro (antes de revelar algo)
    implode(x, y, n) {
      n = Math.round(n * this.q);
      const D = Math.max(this.w, this.h);
      for (let i = 0; i < n; i++) {
        const a = rnd(0, TAU), r = rnd(.3, .6) * D;
        this.sparks.push({ x: 0, y: 0, sx: x + Math.cos(a) * r, sy: y + Math.sin(a) * r, tx: x, ty: y, age: 0, life: rnd(.4, .6), size: rnd(1.2, 3), inw: true });
      }
    }

    // Pedazos reales de la calabaza: cada polígono (en píxeles de img) se recorta de la imagen y sale despedido.
    // rect: posición en pantalla de img; power: fuerza del impulso.
    pieces(img, rect, polys, power) {
      const s = rect.width / img.width, R = rect.width / 2;
      const ox = rect.left + rect.width / 2, oy = rect.top + rect.height * .56;
      polys.forEach(poly => {
        let mx = 0, my = 0;
        poly.forEach(p => { mx += p[0]; my += p[1]; });
        mx /= poly.length; my /= poly.length;
        const x = rect.left + mx * s, y = rect.top + my * s;
        const dx = x - ox, dy = y - oy, d = Math.hypot(dx, dy) || 1;
        const sp = rnd(.7, 1.6) * R * power;
        // recorte del pedazo una sola vez, en su propio lienzo pequeño
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        poly.forEach(p => { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); });
        x0 = Math.floor(x0); y0 = Math.floor(y0);
        const cw = Math.max(1, Math.ceil(x1 - x0)), chh = Math.max(1, Math.ceil(y1 - y0));
        const spr = document.createElement('canvas'); spr.width = cw; spr.height = chh;
        const sg = spr.getContext('2d');
        sg.beginPath(); poly.forEach((p, j) => (j ? sg.lineTo(p[0] - x0, p[1] - y0) : sg.moveTo(p[0] - x0, p[1] - y0))); sg.closePath();
        sg.clip(); sg.drawImage(img, -x0, -y0);
        this.shards.push({
          x, y, vx: dx / d * sp + rnd(-.2, .2) * R, vy: dy / d * sp * .7 - R * rnd(.6, 1.2) * power,
          r: 0, vr: rnd(-6, 6) * power, age: 0, life: rnd(1.4, 2.2), g: R * 4.2,
          pts: poly.map(p => [(p[0] - mx) * s, (p[1] - my) * s]),
          spr, ix: (x0 - mx) * s, iy: (y0 - my) * s, iw: cw * s, ih: chh * s
        });
      });
      if (this.shards.length > 90) this.shards.splice(0, this.shards.length - 90);
    }

    // Lluvia de brasas desde arriba
    rain(n) {
      n = Math.round(n * this.q);
      for (let i = 0; i < n; i++) this.sparks.push({ x: rnd(0, this.w), y: rnd(-this.h * .25, 0), vx: rnd(-20, 20), vy: rnd(80, 240), age: 0, life: rnd(1.6, 2.8), size: rnd(1, 2.4), fall: true });
      if (this.sparks.length > 400) this.sparks.splice(0, this.sparks.length - 400);
    }

    // Rastro del cursor (limitado en frecuencia y cantidad)
    trail(x, y) {
      const now = performance.now();
      if (this.reduced || now - this.lastTrail < 40) return;
      this.lastTrail = now;
      if (this.trails.length >= Math.round(36 * this.q)) this.trails.shift();
      this.trails.push({ x: x + rnd(-4, 4), y: y + rnd(-4, 4), vx: rnd(-22, 22), vy: rnd(-44, -8), age: 0, life: rnd(.4, .8), size: rnd(.8, 1.7) });
    }

    spawnBat(count) {
      if (this.reduced) return;
      const dir = Math.random() < .5 ? 1 : -1, n = count || (Math.random() < .3 ? 3 : 1);
      for (let i = 0; i < n; i++) {
        this.bats.push({
          x: dir > 0 ? -60 - i * 70 : this.w + 60 + i * 70, y: rnd(.1, .42) * this.h + i * 24,
          vx: dir * rnd(110, 170), dir, s: rnd(2.4, 3.8) * Math.min(1.3, Math.max(.7, this.w / 900)),
          ph: rnd(0, TAU), wob: rnd(.8, 1.6), amp: rnd(18, 44), flap: rnd(0, TAU)
        });
      }
    }

    // ---- animaciones alrededor de la calabaza ----
    auraBack(g, ds) {
      const S = this.S, R = S.pw / 2, vis = S.reveal;
      if (R < 6 || vis < .01) return;
      const cx = S.cx + S.lx * .4, gy = S.cy + R * .5;
      const a = vis * (.4 + .6 * Math.min(1, S.glow + S.boost * .5));
      g.save(); g.globalCompositeOperation = 'lighter';
      // luz que se derrama sobre el suelo
      g.translate(cx, gy); g.scale(1, .26);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, R * 1.7);
      gr.addColorStop(0, 'rgba(255,120,20,' + .42 * a * (1 + S.pulse * .5) + ')'); gr.addColorStop(1, 'rgba(255,106,0,0)');
      g.fillStyle = gr; g.fillRect(-R * 1.8, -R * 1.8, R * 3.6, R * 3.6);
      g.restore();
      // anillos rúnicos que giran en sentidos opuestos
      g.save(); g.globalCompositeOperation = 'lighter'; g.lineWidth = Math.max(1, R / 180);
      [{ k: 1.35, d: [3, 10], dir: 1, al: .42 }, { k: 1.75, d: [16, 8, 2, 8], dir: -1, al: .24 }].forEach(r => {
        const u = Math.max(.6, R / 200);
        g.setLineDash(r.d.map(v => v * u)); g.lineDashOffset = r.dir * this.t * 16 * u;
        g.strokeStyle = 'rgba(255,170,70,' + Math.min(1, r.al * a * (1 + S.pulse * .6)) + ')';
        g.beginPath(); g.ellipse(cx, gy, R * r.k * (1 + S.pulse * .06), R * r.k * .25, 0, 0, TAU); g.stroke();
      });
      g.restore();
      // las luces orbitales avanzan una vez por frame
      const sp = 1 + S.pulse * 1.5 + S.boost;
      this.orbs.forEach(o => { o.a += o.v * ds * sp; });
      this.drawOrbs(g, false, a);
    }

    drawOrbs(g, front, a) {
      const S = this.S, R = S.pw / 2, cx = S.cx + S.lx * .4, cy = S.cy + R * .1;
      g.save(); g.globalCompositeOperation = 'lighter';
      this.orbs.forEach(o => {
        for (let k = 0; k < 4; k++) {
          const ang = o.a - o.v * .07 * k;
          const depth = Math.sin(ang);
          if ((depth > 0) !== front) continue;
          const ax = Math.cos(ang) * o.rx * R, ay = depth * o.ry * R;
          const x = cx + ax * Math.cos(o.tilt) - ay * Math.sin(o.tilt);
          const y = cy + ax * Math.sin(o.tilt) + ay * Math.cos(o.tilt) + o.yoff * R + Math.sin(this.t * 1.2 + o.ph) * R * .03;
          const s = o.size * (R / 120) * 4.5 * (1 + S.pulse * .4) * (1 - k * .18) * (.8 + .2 * depth);
          g.globalAlpha = Math.min(1, a * (1 - k * .27) * (.55 + .45 * Math.sin(this.t * 3 + o.ph)));
          g.drawImage(this.emberImg, x - s, y - s, s * 2, s * 2);
        }
      });
      g.restore();
    }

    auraFront(g, ds) {
      const S = this.S, R = S.pw / 2, vis = S.reveal;
      if (R < 6 || vis < .01) return;
      const a = vis * (.4 + .6 * Math.min(1, S.glow + S.boost * .5));
      this.drawOrbs(g, true, a);
      // humo que sale del tallo
      if (vis > .3 && !this.reduced) {
        this.puffT -= ds;
        if (this.puffT <= 0 && this.puffs.length < 18) {
          this.puffT = rnd(.28, .5);
          this.puffs.push({ x: S.cx + R * .12, y: S.cy - R * .58, age: 0, life: rnd(2.2, 3.4), ph: rnd(0, TAU), vy: rnd(.18, .3) });
        }
      }
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = this.puffs.length - 1; i >= 0; i--) {
        const p = this.puffs[i];
        p.age += ds;
        if (p.age >= p.life) { this.puffs.splice(i, 1); continue; }
        const k = p.age / p.life;
        p.y -= p.vy * R * ds; p.x += Math.sin(p.age * 2 + p.ph) * R * .06 * ds;
        const s = R * (.08 + .3 * k);
        g.globalAlpha = Math.sin(Math.PI * k) * .2 * vis;
        g.drawImage(this.puffImg, p.x - s, p.y - s, s * 2, s * 2);
      }
      g.restore();
    }

    fog(g, layers, dt) {
      const S = this.S, w = this.w, h = this.h;
      const boost = 1 + S.smokeBoost * 1.6;
      layers.forEach(L => {
        L.pos += L.v * (1 + S.smokeBoost * 4) * dt;
        const dw = Math.max(w, 900) * L.k * 1.2, dh = dw / 2;
        const a = L.a * S.smoke * boost * (L.add ? .5 + S.glow : 1);
        if (a < .004) return;
        let x = ((L.pos % dw) + dw) % dw - dw;
        g.globalAlpha = Math.min(.5, a);
        g.globalCompositeOperation = L.add ? 'lighter' : 'source-over';
        for (; x < w; x += dw) g.drawImage(L.img, x, h * L.y - dh / 2 + Math.sin(this.t * .15 + L.pos * .001) * 8, dw, dh);
      });
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    }

    embers(g, front, dt, active) {
      const S = this.S;
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < this.em.length; i++) {
        const e = this.em[i];
        if (!e.on) { if (i < active) this.newEmber(e, false); else continue; }
        // actualización (una sola vez por frame: en el lienzo de fondo)
        if (!front) {
          e.age += dt;
          e.vx *= Math.pow(.2, dt);
          e.x += (Math.sin(this.t * e.fr + e.ph) * e.sway + e.vx) * dt;
          e.y -= e.vy * dt * (1 + S.smokeBoost);
          if (e.age > e.life || e.y < -20) { if (i < active) this.newEmber(e, false); else e.on = false; continue; }
        }
        if (e.front !== front) continue;
        const k = e.age / e.life;
        const tw = .65 + .35 * Math.sin(this.t * 7 + e.ph * 3);
        const a = Math.sin(Math.PI * k) * tw * (e.front ? .8 : 1);
        if (a < .02) continue;
        const s = e.size * 5.5;
        g.globalAlpha = Math.min(1, a);
        g.drawImage(this.emberImg, e.x - s, e.y - s, s * 2, s * 2);
      }
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    }

    frame(dt, t) {
      const S = this.S, w = this.w, h = this.h, ds = dt / 1000;
      this.t = t;
      const cx = S.cx + S.lx, cy = S.cy;
      const flick = 1 + .06 * Math.sin(t * 3.1) + .04 * Math.sin(t * 7.3);
      const active = Math.round(this.max * S.embers);

      // ----- detrás de la calabaza -----
      const b = this.b;
      b.globalCompositeOperation = 'source-over'; b.globalAlpha = 1;
      const bg = b.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#050505'); bg.addColorStop(1, '#0B0806');
      b.fillStyle = bg; b.fillRect(0, 0, w, h);

      b.globalCompositeOperation = 'lighter';
      const a = Math.min(1, (S.glow * .36 + S.boost * .4) * flick * (1 + S.beat * .45));
      if (a > .003) {
        const R = Math.max(w, h) * (.24 + .34 * (S.expand + S.pulse * .5) + .08 * S.glow);
        const g = b.createRadialGradient(cx, cy, 0, cx, cy, R);
        g.addColorStop(0, 'rgba(255,150,50,' + a * .8 + ')');
        g.addColorStop(.3, 'rgba(255,106,0,' + a * .38 + ')');
        g.addColorStop(1, 'rgba(255,106,0,0)');
        b.fillStyle = g; b.fillRect(0, 0, w, h);
      }
      if (S.tint > .003) {
        const g = b.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, 'rgba(255,120,20,' + .2 * S.tint + ')'); g.addColorStop(1, 'rgba(255,170,60,' + .06 * S.tint + ')');
        b.fillStyle = g; b.fillRect(0, 0, w, h);
      }
      // luz que sube desde el horizonte
      if (S.horizon > .003) {
        const g = b.createRadialGradient(w / 2, h * 1.05, 0, w / 2, h * 1.05, Math.max(w, h) * .7);
        g.addColorStop(0, 'rgba(255,106,0,' + .11 * S.horizon * flick + ')'); g.addColorStop(1, 'rgba(255,106,0,0)');
        b.fillStyle = g; b.fillRect(0, 0, w, h);
      }
      // banda de luz que cruza la pantalla en la transición
      if (S.sweep > 0 && S.sweep < 1) {
        const bx = -w * .3 + S.sweep * w * 1.6, bw = w * .35;
        const g = b.createLinearGradient(bx - bw, 0, bx + bw, 0);
        const al = .14 * Math.sin(Math.PI * S.sweep);
        g.addColorStop(0, 'rgba(255,140,40,0)'); g.addColorStop(.5, 'rgba(255,150,50,' + al + ')'); g.addColorStop(1, 'rgba(255,140,40,0)');
        b.fillStyle = g; b.fillRect(0, 0, w, h);
      }
      b.globalCompositeOperation = 'source-over';
      this.auraBack(b, ds);
      this.fog(b, this.fogB, ds);
      this.embers(b, false, ds, active);

      // ----- delante de la calabaza -----
      const f = this.f;
      f.clearRect(0, 0, w, h);
      this.auraFront(f, ds);
      this.fog(f, this.fogF, ds);
      this.embers(f, true, ds, active);

      f.globalCompositeOperation = 'lighter';
      for (let i = this.sparks.length - 1; i >= 0; i--) {
        const p = this.sparks[i];
        p.age += ds;
        if (p.age >= p.life) { this.sparks.splice(i, 1); continue; }
        let k, s;
        if (p.inw) {
          const u = p.age / p.life;
          p.x = p.sx + (p.tx - p.sx) * u * u; p.y = p.sy + (p.ty - p.sy) * u * u;
          k = .3 + .7 * u; s = p.size * 5; f.globalAlpha = k;
        } else {
          if (p.fall) { p.vy += 260 * ds; } else { const drag = Math.pow(.12, ds); p.vx *= drag; p.vy = p.vy * drag - 14 * ds; }
          p.x += p.vx * ds; p.y += p.vy * ds;
          k = 1 - p.age / p.life; s = p.size * 6 * (.4 + k * .6);
          f.globalAlpha = k * k;
        }
        f.drawImage(this.emberImg, p.x - s, p.y - s, s * 2, s * 2);
      }
      for (let i = this.trails.length - 1; i >= 0; i--) {
        const p = this.trails[i];
        p.age += ds;
        if (p.age >= p.life) { this.trails.splice(i, 1); continue; }
        p.x += p.vx * ds; p.y += p.vy * ds;
        const k = 1 - p.age / p.life, s = p.size * 5;
        f.globalAlpha = k * .9;
        f.drawImage(this.emberImg, p.x - s, p.y - s, s * 2, s * 2);
      }
      f.globalCompositeOperation = 'source-over';
      for (let i = this.shards.length - 1; i >= 0; i--) {
        const p = this.shards[i];
        p.age += ds;
        if (p.age >= p.life) { this.shards.splice(i, 1); continue; }
        p.vy += p.g * ds; p.x += p.vx * ds; p.y += p.vy * ds; p.r += p.vr * ds;
        const k = p.age / p.life;
        f.save(); f.translate(p.x, p.y); f.rotate(p.r);
        f.globalAlpha = k > .6 ? (1 - k) / .4 : 1;
        f.beginPath(); p.pts.forEach((q, j) => (j ? f.lineTo(q[0], q[1]) : f.moveTo(q[0], q[1]))); f.closePath();
        f.drawImage(p.spr, p.ix, p.iy, p.iw, p.ih);
        f.strokeStyle = 'rgba(255,150,40,.7)'; f.lineWidth = 1.2; f.stroke();
        f.restore();
      }
      f.globalAlpha = 1; f.globalCompositeOperation = 'lighter';
      for (let i = this.rings.length - 1; i >= 0; i--) {
        const r = this.rings[i];
        r.age += ds;
        const u = r.age / r.life;
        if (u >= 1) { this.rings.splice(i, 1); continue; }
        const e = 1 - Math.pow(1 - u, 3);
        f.globalAlpha = (1 - u) * .55;
        f.strokeStyle = 'rgb(255,150,50)'; f.lineWidth = 1 + 5 * (1 - u);
        f.beginPath(); f.arc(r.x, r.y, r.R * e, 0, TAU); f.stroke();
      }
      f.globalAlpha = 1; f.globalCompositeOperation = 'source-over';

      // murciélagos (ocasionales)
      if (S.batsOn && !this.reduced) {
        this.batTimer -= dt;
        if (this.batTimer <= 0) { this.spawnBat(); this.batTimer = rnd(9000, 18000); }
      }
      for (let i = this.bats.length - 1; i >= 0; i--) {
        const m = this.bats[i];
        m.x += m.vx * ds; m.ph += ds * m.wob; m.flap += ds * 14;
        const y = m.y + Math.sin(m.ph) * m.amp;
        if ((m.dir > 0 && m.x > w + 100) || (m.dir < 0 && m.x < -100)) { this.bats.splice(i, 1); continue; }
        drawBat(f, m.x, y, m.s, m.flap, m.dir);
      }
    }
  }

  window.FX = FX;
  FX.drawBat = drawBat;
})();
