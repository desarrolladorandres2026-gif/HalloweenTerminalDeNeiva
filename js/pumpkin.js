/*
 * Calabaza dibujada en Canvas 2D. El cuerpo, el rostro y los halos se
 * pre-renderizan una vez por tamaño; cada frame solo se componen con distinto alfa.
 */
(function () {
  'use strict';
  const TAU = Math.PI * 2;

  // Coordenadas del rostro: x en unidades de rx, y en unidades de ry (centro de la calabaza = 0,0)
  const FACE = {
    eyes: [
      [[-.60, -.10], [-.18, -.30], [-.27, .10]],
      [[.60, -.10], [.18, -.30], [.27, .10]]
    ],
    nose: [[0, .04], [-.09, .22], [.09, .22]],
    mouth: [
      [-.62, .30], [-.40, .40], [-.30, .31], [-.16, .44], [-.05, .35], [.05, .35],
      [.16, .44], [.30, .31], [.40, .40], [.62, .30],
      [.50, .56], [.34, .67], [.20, .58], [.08, .71], [-.08, .71], [-.20, .58], [-.34, .67], [-.50, .56]
    ]
  };

  const LOBES = [ // de atrás hacia adelante
    { o: -.66, w: .38, h: .84 }, { o: .66, w: .38, h: .84 },
    { o: -.34, w: .48, h: .94 }, { o: .34, w: .48, h: .94 },
    { o: 0, w: .50, h: 1 }
  ];

  // Huecos que deja cada golpe (x en rx, y en ry). Cada toque arranca uno; al décimo la calabaza estalla.
  const HOLE_AT = [[-.72, -.18], [.72, .12], [-.36, .58], [.42, -.56], [.05, .66], [-.62, .4], [.66, -.36], [-.2, -.62], [.34, .52]];
  function genHoles() {
    return HOLE_AT.map(c => {
      const n = 7 + Math.floor(Math.random() * 3), r = .17 + Math.random() * .08, pts = [];
      for (let k = 0; k < n; k++) {
        const a = (k / n) * TAU + (Math.random() - .5) * .5, rr = r * (.6 + Math.random() * .55);
        pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
      }
      return { c, r, pts };
    });
  }

  class Pumpkin {
    constructor(canvas) {
      this.c = canvas;
      this.ctx = canvas.getContext('2d');
      this.ready = false;
      this.holes = genHoles();
    }

    layer() {
      const c = document.createElement('canvas');
      c.width = this.W; c.height = this.H;
      return c;
    }

    resize(cssW, cssH, dpr) {
      this.W = Math.max(2, Math.round(cssW * dpr));
      this.H = Math.max(2, Math.round(cssH * dpr));
      this.c.width = this.W; this.c.height = this.H;
      this.build();
    }

    shapes(g, which) {
      const { cx, cy, rx, ry } = this.geo;
      const polys = which === 'eyes' ? FACE.eyes : FACE.eyes.concat([FACE.nose, FACE.mouth]);
      g.beginPath();
      polys.forEach(p => {
        p.forEach((pt, i) => (i ? g.lineTo : g.moveTo).call(g, cx + pt[0] * rx, cy + pt[1] * ry));
        g.closePath();
      });
    }

    build() {
      const W = this.W, H = this.H;
      const cx = W / 2, cy = H * .56, rx = W * .47, ry = H * .40;
      this.geo = { cx, cy, rx, ry };

      // --- cuerpo (iluminado solo por el resplandor de dentro, por eso es oscuro de base) ---
      const body = this.body = this.layer();
      const b = body.getContext('2d');
      LOBES.forEach(l => {
        const x = cx + l.o * rx, hw = l.w * rx, hh = l.h * ry;
        const g = b.createLinearGradient(x - hw, 0, x + hw, 0);
        g.addColorStop(0, '#220802'); g.addColorStop(.22, '#6e2606');
        g.addColorStop(.5, '#a8440b'); g.addColorStop(.78, '#6e2606'); g.addColorStop(1, '#1f0701');
        b.beginPath(); b.ellipse(x, cy, hw, hh, 0, 0, TAU);
        b.fillStyle = g; b.fill();

        const v = b.createLinearGradient(0, cy - hh, 0, cy + hh);
        v.addColorStop(0, 'rgba(0,0,0,.55)'); v.addColorStop(.32, 'rgba(0,0,0,0)');
        v.addColorStop(.72, 'rgba(0,0,0,.06)'); v.addColorStop(1, 'rgba(0,0,0,.62)');
        b.fillStyle = v; b.fill();

        b.lineWidth = W * .0035;
        b.strokeStyle = 'rgba(0,0,0,.14)';
        [.34, .68].forEach(k => { b.beginPath(); b.ellipse(x, cy, hw * k, hh * .97, 0, 0, TAU); b.stroke(); });
        b.strokeStyle = 'rgba(18,3,0,.7)'; b.lineWidth = W * .005;
        b.beginPath(); b.ellipse(x, cy, hw, hh, 0, 0, TAU); b.stroke();
      });

      const top = cy - ry;
      b.fillStyle = 'rgba(0,0,0,.55)';
      b.beginPath(); b.ellipse(cx, top + H * .02, W * .095, H * .026, 0, 0, TAU); b.fill();
      const sg = b.createLinearGradient(cx - W * .06, 0, cx + W * .09, 0);
      sg.addColorStop(0, '#1a0f05'); sg.addColorStop(.5, '#5c3b15'); sg.addColorStop(1, '#1a0f05');
      b.fillStyle = sg;
      b.beginPath();
      b.moveTo(cx - W * .05, top + H * .03);
      b.bezierCurveTo(cx - W * .045, top - H * .05, cx - W * .02, top - H * .10, cx + W * .045, top - H * .13);
      b.lineTo(cx + W * .085, top - H * .105);
      b.bezierCurveTo(cx + W * .04, top - H * .07, cx + W * .07, top, cx + W * .06, top + H * .035);
      b.closePath(); b.fill();

      // vaciado del rostro: fondo oscuro sobre el que se encienden las capas luminosas
      b.fillStyle = '#100300'; b.strokeStyle = '#100300'; b.lineJoin = 'round'; b.lineWidth = W * .006;
      this.shapes(b); b.fill(); b.stroke();

      // --- rostro encendido ---
      const face = this.face = this.layer();
      const f = face.getContext('2d');
      const fg = f.createRadialGradient(cx, cy + ry * .15, 0, cx, cy + ry * .15, rx * .95);
      fg.addColorStop(0, '#fff4cf'); fg.addColorStop(.25, '#ffc04d');
      fg.addColorStop(.55, '#ff7a10'); fg.addColorStop(1, '#c43f00');
      f.fillStyle = fg; f.strokeStyle = fg; f.lineJoin = 'round'; f.lineWidth = W * .004;
      this.shapes(f); f.fill(); f.stroke();

      // --- halo que se derrama sobre la superficie ---
      const glow = this.glow = this.layer();
      const gl = glow.getContext('2d');
      const off = W * 3;
      gl.save(); gl.translate(-off, 0); gl.shadowOffsetX = off;
      [[W * .22, 'rgba(255,80,0,.55)'], [W * .1, 'rgba(255,110,10,.9)'], [W * .035, 'rgba(255,200,100,1)']]
        .forEach(p => { gl.shadowBlur = p[0]; gl.shadowColor = p[1]; gl.fillStyle = '#000'; this.shapes(gl); gl.fill(); });
      gl.restore();

      // --- ojos al rojo vivo para el clic ---
      const eyes = this.eyes = this.layer();
      const e = eyes.getContext('2d');
      e.save(); e.translate(-off, 0); e.shadowOffsetX = off;
      e.shadowBlur = W * .16; e.shadowColor = 'rgba(255,170,60,1)'; e.fillStyle = '#000';
      this.shapes(e, 'eyes'); e.fill(); e.restore();
      e.fillStyle = '#fff6da'; this.shapes(e, 'eyes'); e.fill();

      this.ready = true;
    }

    draw(S, t) {
      const g = this.ctx, W = this.W, H = this.H;
      g.clearRect(0, 0, W, H);
      if (!this.ready || S.reveal <= .002) return;

      const r = S.reveal;
      const dim = 1 - .3 * S.dock;
      const flick = .82 + .12 * Math.sin(t * 1.7) + .06 * Math.sin(t * 5.3 + 1) + .05 * Math.sin(t * 11.1);
      const breath = .5 + .5 * Math.sin(t * 1.1);
      const ox = S.px * W * .012, oy = S.py * H * .008; // la cara "hundida" se desplaza un poco más: paralaje interno

      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = Math.min(1, r * 1.3) * dim;
      g.drawImage(this.body, 0, 0);

      g.globalAlpha = r * r * (.72 + .28 * flick) * dim;
      g.drawImage(this.face, ox, oy);

      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = Math.min(1.2, r * r * (.5 * flick + .14 * breath + S.beat * .35 + S.boost * .5)) * dim;
      g.drawImage(this.glow, ox, oy);

      const eye = Math.min(1, .12 * breath * r + S.eye);
      if (eye > .01) {
        g.globalAlpha = eye * r;
        g.drawImage(this.eyes, ox, oy);
      }
      this.drawHoles(g, S);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }

    // Polígono del hueco i en píxeles del lienzo (k = escala de aparición)
    holePx(i, k) {
      const { cx, cy, rx, ry } = this.geo, h = this.holes[i];
      if (k === undefined) k = 1;
      const x0 = cx + h.c[0] * rx, y0 = cy + h.c[1] * ry;
      return h.pts.map(p => [x0 + p[0] * rx * k, y0 + p[1] * rx * .9 * k]);
    }

    drawHoles(g, S) {
      if (!(S.damage > .01)) return;
      const { cx, cy, rx, ry } = this.geo, W = this.W;
      g.globalAlpha = Math.min(1, S.reveal);
      for (let i = 0; i < this.holes.length; i++) {
        const k = Math.min(1, S.damage - i);
        if (k <= 0) break;
        const h = this.holes[i], pts = this.holePx(i, .4 + .6 * k);
        const x0 = cx + h.c[0] * rx, y0 = cy + h.c[1] * ry, R = h.r * rx;
        g.beginPath(); pts.forEach((p, j) => (j ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath();
        // se ve el interior encendido de la calabaza
        g.globalCompositeOperation = 'source-over';
        const gr = g.createRadialGradient(x0, y0, 0, x0, y0, R * 1.1);
        gr.addColorStop(0, '#ffe3a0'); gr.addColorStop(.45, '#ff8a1c'); gr.addColorStop(1, '#3a0c01');
        g.fillStyle = gr; g.fill();
        g.strokeStyle = 'rgba(25,6,0,.95)'; g.lineWidth = W * .007; g.lineJoin = 'round'; g.stroke();
        g.globalCompositeOperation = 'lighter';
        const sp = g.createRadialGradient(x0, y0, 0, x0, y0, R * 2.2);
        sp.addColorStop(0, 'rgba(255,140,40,.35)'); sp.addColorStop(1, 'rgba(255,120,20,0)');
        g.fillStyle = sp; g.fillRect(x0 - R * 2.2, y0 - R * 2.2, R * 4.4, R * 4.4);
      }
    }

    // Fragmentos irregulares que cubren la calabaza (para el estallido final)
    fracture(cols, rows) {
      const W = this.W, H = this.H, { cx, cy, rx, ry } = this.geo, v = [];
      const x0 = W * .02, y0 = H * .02, cw = W * .96 / cols, ch = H * .96 / rows;
      for (let j = 0; j <= rows; j++) {
        v.push([]);
        for (let i = 0; i <= cols; i++) {
          const edge = i === 0 || j === 0 || i === cols || j === rows;
          v[j].push([x0 + i * cw + (edge ? 0 : (Math.random() - .5) * cw * .7), y0 + j * ch + (edge ? 0 : (Math.random() - .5) * ch * .7)]);
        }
      }
      const polys = [];
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const a = v[j][i], b = v[j][i + 1], c = v[j + 1][i + 1], d = v[j + 1][i];
        (Math.random() < .5 ? [[a, b, c], [a, c, d]] : [[a, b, d], [b, c, d]]).forEach(t => {
          const mx = (t[0][0] + t[1][0] + t[2][0]) / 3, my = (t[0][1] + t[1][1] + t[2][1]) / 3;
          const ex = (mx - cx) / (rx * 1.08), ey = (my - cy) / (ry * 1.05);
          const stem = Math.abs(mx - cx - W * .02) < W * .08 && my < cy - ry * .9 && my > cy - ry * 1.4;
          if (ex * ex + ey * ey < 1.05 || stem) polys.push(t);
        });
      }
      return polys;
    }
  }

  window.Pumpkin = Pumpkin;
})();
