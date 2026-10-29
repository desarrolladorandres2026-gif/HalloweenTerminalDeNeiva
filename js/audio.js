/* Música: el archivo es opcional. Si falta, la experiencia sigue sin sonido. */
(function () {
  'use strict';

  class Music {
    constructor(src, volume, reactive) {
      this.src = src;
      this.target = volume;
      this.reactive = reactive;
      this.ok = true;
      this.playing = false;
      this.muted = false;
      this.level = 0;
      this.onchange = function () {};
      this._v = 0;
      this.el = new Audio();
      this.el.preload = 'auto';
      this.el.loop = true;
      this.el.volume = 0;
      this.el.addEventListener('error', () => this.fail());
      this.el.src = src;
    }
    get vol() { return this._v; }
    set vol(v) { this._v = Math.max(0, Math.min(1, v)); this.el.volume = this._v; }

    fail() {
      if (!this.ok) return;
      this.ok = false;
      this.playing = false;
      console.info('[halloween] No se encontró el audio (' + this.src + '). La experiencia continúa sin música.');
      this.onchange();
    }

    async start() {
      if (!this.ok) return;
      try {
        this.setupAnalyser(); // dentro del gesto del usuario, antes de reproducir
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
        await this.el.play();
        this.playing = true;
        Anim.tween(this, 'vol', this.target, 1500);
      } catch (e) {
        console.info('[halloween] No se pudo reproducir el audio:', e && e.name);
        if (!e || e.name !== 'NotAllowedError') this.fail();
      }
      this.onchange();
    }

    restart() {
      if (!this.ok) return;
      try { this.el.currentTime = 0; } catch (e) { /* sin metadatos aún */ }
      this.muted = false;
      this.vol = 0;
      this.start();
    }

    toggle() {
      if (!this.ok) return;
      this.muted = !this.muted;
      if (this.muted) {
        Anim.tween(this, 'vol', 0, 500, { done: () => this.el.pause() });
        this.playing = false;
      } else {
        this.el.play().then(() => { this.playing = true; }).catch(() => {});
        Anim.tween(this, 'vol', this.target, 900);
      }
      this.onchange();
    }

    pauseHidden() { if (this.playing) this.el.pause(); }
    resumeVisible() { if (this.playing && this.ok) this.el.play().catch(() => {}); }
    time() { return this.el.currentTime; }

    // Solo con http(s): en file:// el medio se considera de otro origen y el análisis silenciaría el audio.
    setupAnalyser() {
      if (!this.reactive || this.analyser || !/^https?:$/.test(location.protocol)) return;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        const ctx = this.ctx = new AC();
        const src = ctx.createMediaElementSource(this.el);
        this.analyser = ctx.createAnalyser();
        this.analyser.fftSize = 256;
        this.bins = new Uint8Array(this.analyser.frequencyBinCount);
        src.connect(this.analyser);
        this.analyser.connect(ctx.destination);
      } catch (e) { this.analyser = null; }
    }

    // Nivel de graves 0..1, suavizado.
    sample() {
      if (!this.analyser || !this.playing) { this.level *= .9; return this.level; }
      this.analyser.getByteFrequencyData(this.bins);
      let s = 0;
      for (let i = 1; i < 7; i++) s += this.bins[i];
      const v = Math.max(0, (s / 6 / 255 - .35) * 1.8);
      this.level += (v - this.level) * .25;
      return this.level;
    }
  }

  window.Music = Music;
})();
