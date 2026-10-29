/*
 * Drácula y su corte de murciélagos, dibujados en Canvas 2D (sin imágenes).
 * Todo se compone cada frame: respiración, capa ondulante, parpadeo, ojos que siguen
 * al puntero, sonrisa con colmillos y murciélagos que orbitan alrededor.
 */
(function () {
  'use strict';
  const TAU = Math.PI * 2;

  // Cada murciélago: órbita elíptica propia alrededor de Drácula
  const BATS = [
    { sp: .55, ph: 0.0, ax: 1.00, ay: .70, s: 1.0, fl: 11 },
    { sp: .42, ph: 1.3, ax: .85, ay: .95, s: .8, fl: 13 },
    { sp: .70, ph: 2.6, ax: 1.05, ay: .50, s: 1.2, fl: 9 },
    { sp: .50, ph: 3.9, ax: .70, ay: .85, s: .7, fl: 14 },
    { sp: .62, ph: 5.1, ax: .95, ay: .60, s: 1.0, fl: 10 },
    { sp: .38, ph: 2.0, ax: 1.10, ay: .80, s: .9, fl: 12 }
  ];

  function bat(g, x, y, s, flap, dir, alpha) {
    const f = Math.sin(flap);
    g.save(); g.translate(x, y); g.scale(dir, 1); g.globalAlpha *= alpha;
    g.fillStyle = '#070707'; g.strokeStyle = 'rgba(255,106,0,.45)'; g.lineWidth = Math.max(.6, s * .08);
    for (let side = -1; side <= 1; side += 2) {
      const tx = side * s * 2.3, ty = -s * (.1 + f * 1.15);
      g.beginPath();
      g.moveTo(0, -s * .25);
      g.quadraticCurveTo(side * s * 1.1, -s * (1 + f * .9), tx, ty);
      g.quadraticCurveTo(side * s * 1.95, ty + s * .85, side * s * 1.55, ty * .55 + s * .75);
      g.quadraticCurveTo(side * s * 1.3, ty * .4 + s * .35, side * s * 1.05, s * .75);
      g.quadraticCurveTo(side * s * .6, s * .3, 0, s * .5);
      g.closePath(); g.fill(); g.stroke();
    }
    g.beginPath(); g.ellipse(0, s * .1, s * .42, s * .7, 0, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(-s * .3, -s * .5); g.lineTo(-s * .18, -s * .95); g.lineTo(-s * .02, -s * .55);
    g.lineTo(s * .02, -s * .55); g.lineTo(s * .18, -s * .95); g.lineTo(s * .3, -s * .5); g.closePath(); g.fill();
    g.fillStyle = '#ff3a1a';
    g.fillRect(-s * .22, -s * .3, s * .1, s * .1); g.fillRect(s * .12, -s * .3, s * .1, s * .1);
    g.restore();
  }

  class Dracula {
    constructor(canvas) { this.c = canvas; this.g = canvas.getContext('2d'); this.w = 0; this.h = 0; this.blink = 0; this.nextBlink = 2; }

    resize(w, h, dpr) {
      this.w = w; this.h = h;
      this.c.width = Math.round(w * dpr); this.c.height = Math.round(h * dpr);
      this.dpr = dpr;
    }

    draw(vis, t, px, py, pulse) {
      const g = this.g, W = this.w, H = this.h;
      g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      if (vis < .004 || !W) return;

      const k = H / 300, bob = Math.sin(t * 1.4) * 3;
      g.globalAlpha = Math.min(1, vis);

      // murciélagos del fondo (z < 0)
      this.bats(g, W, H, t, false);

      g.save();
      g.translate(W / 2, H / 2 + (1 - vis) * 50 * k + bob * k); g.scale(k, k);

      // aura carmesí que late
      g.globalCompositeOperation = 'lighter';
      const ag = g.createRadialGradient(0, -20, 10, 0, -20, 210);
      const aa = (.3 + .06 * Math.sin(t * 2.2) + pulse * .12) * vis;
      ag.addColorStop(0, 'rgba(255,60,30,' + aa + ')'); ag.addColorStop(.5, 'rgba(180,20,10,' + aa * .4 + ')'); ag.addColorStop(1, 'rgba(120,0,0,0)');
      g.fillStyle = ag; g.fillRect(-260, -200, 520, 400);
      g.globalCompositeOperation = 'source-over';

      this.cape(g, t);
      this.body(g);
      this.head(g, t, px, py);
      g.restore();

      // murciélagos del frente (z >= 0)
      g.globalAlpha = Math.min(1, vis);
      this.bats(g, W, H, t, true);
      g.globalAlpha = 1;
    }

    bats(g, W, H, t, front) {
      for (const b of BATS) {
        const a = t * b.sp + b.ph, z = Math.sin(a * 1.0 + .6);
        if ((z >= 0) !== front) continue;
        const x = W / 2 + Math.cos(a) * W * .42 * b.ax * .9;
        const y = H * .5 + Math.sin(a * 1.7) * H * .36 * b.ay - H * .04;
        const dir = -Math.sin(a) >= 0 ? 1 : -1;
        const depth = .75 + .35 * z;
        bat(g, x, y, (H / 300) * 7 * b.s * depth, t * b.fl + b.ph, dir, front ? 1 : .6);
      }
    }

    cape(g, t) {
      const w1 = Math.sin(t * 1.6) * 7, w2 = Math.sin(t * 1.6 + 1.2) * 5;
      for (let side = -1; side <= 1; side += 2) {
        g.save(); g.scale(side, 1);
        // capa por detrás
        const cg = g.createLinearGradient(0, -90, 0, 150);
        cg.addColorStop(0, '#2a0507'); cg.addColorStop(1, '#0a0203');
        g.fillStyle = cg;
        g.beginPath();
        g.moveTo(0, -30); g.lineTo(96 + w2, -100);
        g.quadraticCurveTo(128 + w1, -50, 142 + w1, 20);
        g.quadraticCurveTo(156 + w1 * 1.4, 90, 152 + w1 * 1.6, 150);
        g.lineTo(0, 150); g.closePath(); g.fill();
        // forro carmesí del cuello alto
        const lg = g.createLinearGradient(0, -100, 60, 20);
        lg.addColorStop(0, '#c4161c'); lg.addColorStop(1, '#5e0a0f');
        g.fillStyle = lg;
        g.beginPath(); g.moveTo(96 + w2, -100); g.lineTo(52, -26); g.lineTo(76, 44); g.quadraticCurveTo(118 + w1, 30, 130 + w1, -4);
        g.quadraticCurveTo(122 + w1, -60, 96 + w2, -100); g.fill();
        g.restore();
      }
    }

    body(g) {
      // chaqueta
      g.fillStyle = '#0b0b0e';
      g.beginPath(); g.moveTo(-90, 150); g.quadraticCurveTo(-86, 52, -42, 26); g.lineTo(42, 26); g.quadraticCurveTo(86, 52, 90, 150); g.closePath(); g.fill();
      // camisa y V
      g.fillStyle = '#e8e2d6';
      g.beginPath(); g.moveTo(-28, 26); g.lineTo(0, 118); g.lineTo(28, 26); g.closePath(); g.fill();
      g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.moveTo(0, 30); g.lineTo(0, 118); g.lineTo(28, 26); g.closePath(); g.fill();
      // solapas con filo carmesí
      g.strokeStyle = '#9b1118'; g.lineWidth = 2.5; g.fillStyle = '#101014';
      for (let s = -1; s <= 1; s += 2) {
        g.beginPath(); g.moveTo(s * 26, 24); g.lineTo(s * 48, 28); g.lineTo(s * 6, 112); g.lineTo(s * 2, 100); g.closePath(); g.fill(); g.stroke();
      }
      // broche
      g.fillStyle = '#d3181f'; g.shadowColor = '#ff2a1a'; g.shadowBlur = 8;
      g.beginPath(); g.arc(0, 56, 5, 0, TAU); g.fill(); g.shadowBlur = 0;
    }

    head(g, t, px, py) {
      // cuello
      g.fillStyle = '#8f8c84'; g.fillRect(-17, 16, 34, 20);
      // orejas puntiagudas
      for (let s = -1; s <= 1; s += 2) {
        g.fillStyle = '#c6c2b6';
        g.beginPath(); g.moveTo(s * 42, -44); g.lineTo(s * 72, -70); g.lineTo(s * 47, -10); g.closePath(); g.fill();
        g.fillStyle = 'rgba(80,20,25,.35)';
        g.beginPath(); g.moveTo(s * 48, -40); g.lineTo(s * 64, -58); g.lineTo(s * 49, -20); g.closePath(); g.fill();
      }
      // cara
      const fg = g.createRadialGradient(-10, -45, 8, 0, -22, 70);
      fg.addColorStop(0, '#ece8dc'); fg.addColorStop(.7, '#bdb9ac'); fg.addColorStop(1, '#8e8b7e');
      g.fillStyle = fg;
      g.beginPath(); g.moveTo(-46, -34); g.quadraticCurveTo(-48, 20, -22, 32); g.quadraticCurveTo(0, 42, 22, 32); g.quadraticCurveTo(48, 20, 46, -34);
      g.quadraticCurveTo(44, -84, 0, -84); g.quadraticCurveTo(-44, -84, -46, -34); g.closePath(); g.fill();
      // mejillas hundidas
      g.fillStyle = 'rgba(40,40,30,.16)';
      g.beginPath(); g.ellipse(-30, 6, 9, 15, .3, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(30, 6, 9, 15, -.3, 0, TAU); g.fill();

      // pelo negro con pico de viuda
      g.fillStyle = '#060607';
      g.beginPath(); g.moveTo(-49, -30); g.quadraticCurveTo(-56, -96, 0, -92); g.quadraticCurveTo(56, -96, 49, -30);
      g.quadraticCurveTo(44, -60, 26, -64); g.quadraticCurveTo(8, -62, 0, -44); g.quadraticCurveTo(-8, -62, -26, -64); g.quadraticCurveTo(-44, -60, -49, -30); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(160,170,200,.28)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-30, -78); g.quadraticCurveTo(-8, -88, 14, -80); g.stroke();

      // parpadeo
      this.nextBlink -= 1 / 60;
      if (this.nextBlink < 0) { this.blink = 1; this.nextBlink = 2 + Math.random() * 3; }
      this.blink = Math.max(0, this.blink - .12);
      const open = 1 - Math.sin(this.blink * Math.PI);
      const ex = px * 3, ey = py * 2;

      // cejas
      g.strokeStyle = '#08080a'; g.lineWidth = 4.5; g.lineCap = 'round';
      const lift = Math.sin(t * .8) * 1.5;
      for (let s = -1; s <= 1; s += 2) { g.beginPath(); g.moveTo(s * 36, -40 + lift); g.lineTo(s * 9, -30 - lift); g.stroke(); }

      // ojos rojos
      for (let s = -1; s <= 1; s += 2) {
        const x = s * 21, y = -24;
        g.fillStyle = 'rgba(30,10,12,.45)'; g.beginPath(); g.ellipse(x, y, 14, 9 * Math.max(.15, open), 0, 0, TAU); g.fill();
        g.save(); g.beginPath(); g.ellipse(x, y, 11, 7 * Math.max(.05, open), 0, 0, TAU); g.clip();
        g.fillStyle = '#f2e8dc'; g.fillRect(x - 12, y - 8, 24, 16);
        g.shadowColor = '#ff2a1a'; g.shadowBlur = 10;
        g.fillStyle = '#ff2a1a'; g.beginPath(); g.arc(x + ex, y + ey, 5.6, 0, TAU); g.fill();
        g.shadowBlur = 0;
        g.fillStyle = '#120000'; g.beginPath(); g.ellipse(x + ex, y + ey, 1.4, 4.6, 0, 0, TAU); g.fill();
        g.restore();
      }
      // resplandor de los ojos
      g.globalCompositeOperation = 'lighter';
      const eg = .22 + .1 * Math.sin(t * 3);
      for (let s = -1; s <= 1; s += 2) {
        const gg = g.createRadialGradient(s * 21 + ex, -24 + ey, 0, s * 21 + ex, -24 + ey, 26);
        gg.addColorStop(0, 'rgba(255,50,30,' + eg + ')'); gg.addColorStop(1, 'rgba(255,50,30,0)');
        g.fillStyle = gg; g.fillRect(s * 21 - 30, -54, 60, 60);
      }
      g.globalCompositeOperation = 'source-over';

      // nariz
      g.strokeStyle = 'rgba(30,25,20,.45)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -18); g.lineTo(-5, 4); g.quadraticCurveTo(0, 8, 5, 4); g.stroke();

      // boca: sonrisa que se abre y deja ver los colmillos
      const m = Math.max(0, Math.sin(t * .9 - .4)) ;
      const dip = 6 + m * 12;
      g.fillStyle = '#2a0508';
      g.beginPath(); g.moveTo(-19, 15); g.quadraticCurveTo(0, 15 + dip, 19, 15); g.quadraticCurveTo(0, 13, -19, 15); g.closePath(); g.fill();
      g.strokeStyle = '#4a1014'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(-21, 13); g.quadraticCurveTo(0, 17, 21, 13); g.stroke();
      g.fillStyle = '#f6f1e6';
      const fl = 6 + m * 9;
      for (let s = -1; s <= 1; s += 2) { g.beginPath(); g.moveTo(s * 13, 14.5); g.lineTo(s * 7, 14.8); g.lineTo(s * 10, 14.5 + fl); g.closePath(); g.fill(); }
      // gota de sangre en un colmillo
      if (m > .5) { g.fillStyle = '#c4161c'; g.beginPath(); g.arc(10, 14.5 + fl + 3 + (m - .5) * 8, 1.7, 0, TAU); g.fill(); }
    }
  }

  window.Dracula = Dracula;
})();
