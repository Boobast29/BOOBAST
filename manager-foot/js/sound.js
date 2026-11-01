// ============================================================
//  Ambiance sonore synthétisée (Web Audio) : foule, sifflet, but
// ============================================================
const Sound = {
  ctx: null, crowd: null, crowdGain: null, master: null, on: true,
  init() {
    if (this.ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = .5; this.master.connect(this.ctx.destination);
      return true;
    } catch { return false; }
  },
  noiseBuffer(sec = 2) {
    const b = this.ctx.createBuffer(1, this.ctx.sampleRate * sec, this.ctx.sampleRate);
    const d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + .02 * w) / 1.02; d[i] = last * 3.5; }
    return b;
  },
  startCrowd() {
    if (!this.on || !this.init()) return;
    this.ctx.resume?.();
    if (this.crowd) return;
    const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuffer(3); src.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = .6;
    this.crowdGain = this.ctx.createGain(); this.crowdGain.gain.value = .0;
    src.connect(f); f.connect(this.crowdGain); this.crowdGain.connect(this.master);
    src.start(); this.crowd = src;
    this.crowdGain.gain.linearRampToValueAtTime(.25, this.ctx.currentTime + 1.5);
  },
  intensity(x) { // 0..1
    if (!this.crowdGain) return;
    this.crowdGain.gain.setTargetAtTime(.18 + clamp(x, 0, 1) * .35, this.ctx.currentTime, .4);
  },
  stopCrowd() {
    if (!this.crowd) return;
    const c = this.crowd, g = this.crowdGain;
    g.gain.setTargetAtTime(0, this.ctx.currentTime, .3);
    setTimeout(() => { try { c.stop(); } catch { } }, 1200);
    this.crowd = null; this.crowdGain = null;
  },
  whistle(n = 1, long = false) {
    if (!this.on || !this.init()) return;
    const t0 = this.ctx.currentTime;
    for (let i = 0; i < n; i++) {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain(), lfo = this.ctx.createOscillator(), lg = this.ctx.createGain();
      o.type = 'sine'; o.frequency.value = 2900;
      lfo.frequency.value = 38; lg.gain.value = 120; lfo.connect(lg); lg.connect(o.frequency);
      const s = t0 + i * (long ? .55 : .3), d = (long && i === n - 1) ? .9 : .22;
      g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(.12, s + .02); g.gain.setValueAtTime(.12, s + d); g.gain.linearRampToValueAtTime(0, s + d + .05);
      o.connect(g); g.connect(this.master); o.start(s); lfo.start(s); o.stop(s + d + .1); lfo.stop(s + d + .1);
    }
  },
  roar(big = true) {
    if (!this.on || !this.init()) return;
    const t0 = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuffer(4);
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = .4;
    const g = this.ctx.createGain();
    const peak = big ? .9 : .35;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(peak, t0 + .35); g.gain.setTargetAtTime(0, t0 + 1.6, .7);
    src.connect(f); f.connect(g); g.connect(this.master); src.start(t0); src.stop(t0 + 4);
    if (big) { // corne de supporters
      const o = this.ctx.createOscillator(), og = this.ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = 233;
      og.gain.setValueAtTime(0, t0 + .2); og.gain.linearRampToValueAtTime(.06, t0 + .3); og.gain.setValueAtTime(.06, t0 + 1.1); og.gain.linearRampToValueAtTime(0, t0 + 1.3);
      o.connect(og); og.connect(this.master); o.start(t0 + .2); o.stop(t0 + 1.4);
    }
  },
  groan() {
    if (!this.on || !this.init()) return;
    const t0 = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuffer(2);
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.4, t0 + .2); g.gain.setTargetAtTime(0, t0 + .6, .3);
    src.connect(f); f.connect(g); g.connect(this.master); src.start(t0); src.stop(t0 + 2);
  }
};
