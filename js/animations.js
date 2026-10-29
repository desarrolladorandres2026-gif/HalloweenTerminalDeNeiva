/* Interpolaciones y línea de tiempo con marcas configurables. */
(function () {
  'use strict';

  const ease = {
    lin: t => t,
    out: t => 1 - Math.pow(1 - t, 3),
    inOut: t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
  };

  let tweens = [];

  function tween(obj, key, to, dur, opts) {
    opts = opts || {};
    tweens.push({
      obj, key, to, dur: Math.max(1, dur), e: opts.ease || ease.inOut,
      t: -(opts.delay || 0), from: null, done: opts.done
    });
  }

  function update(dt) {
    for (let i = 0; i < tweens.length; i++) {
      const tw = tweens[i];
      tw.t += dt;
      if (tw.t < 0) continue;
      if (tw.from === null) tw.from = tw.obj[tw.key];
      const k = Math.min(1, tw.t / tw.dur);
      tw.obj[tw.key] = tw.from + (tw.to - tw.from) * tw.e(k);
      if (k >= 1) {
        tweens.splice(i--, 1);
        if (tw.done) tw.done();
      }
    }
  }

  function clear() { tweens = []; }

  class Timeline {
    constructor(cues, audio, useAudio) {
      this.cues = Object.keys(cues).map(n => ({ name: n, t: cues[n], fired: false }))
        .sort((a, b) => a.t - b.t);
      this.audio = audio;
      this.useAudio = useAudio;
      this.handlers = {};
      this.reset();
    }
    on(name, fn) { this.handlers[name] = fn; return this; }
    reset() { this.waitFor = null; this.running = false; this.elapsed = 0; this.offset = 0; this.cues.forEach(c => (c.fired = false)); }
    start() { this.reset(); this.running = true; }
    now() {
      const a = this.audio;
      const base = this.useAudio && a && a.playing ? a.time() * 1000 : this.elapsed;
      return base + this.offset;
    }
    // Adelanta el reloj hasta la marca (nunca retrocede).
    jumpTo(name) {
      const cue = this.cues.find(c => c.name === name);
      const n = this.now();
      if (cue && n < cue.t) this.offset += cue.t - n;
    }
    hasFired(name) { const c = this.cues.find(c => c.name === name); return !!(c && c.fired); }
    // Detiene el reloj justo antes de la marca hasta que se llame a proceed(nombre).
    proceed(name) { this.waitFor = null; this.jumpTo(name); }
    update(dt) {
      if (!this.running) return;
      this.elapsed += dt;
      let n = this.now();
      const w = this.waitFor && this.cues.find(c => c.name === this.waitFor);
      if (w && !w.fired && n >= w.t - 1) { this.elapsed -= n - (w.t - 1); n = w.t - 1; }
      for (const c of this.cues) {
        if (w && !w.fired && c.t >= w.t) continue;
        if (!c.fired && n >= c.t) {
          c.fired = true;
          if (this.handlers[c.name]) this.handlers[c.name]();
        }
      }
    }
  }

  window.Anim = { ease, tween, update, clear, Timeline };
})();
