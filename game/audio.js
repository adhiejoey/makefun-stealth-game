// audio.js — every sound is synthesized with WebAudio: no audio files, no
// network. Footsteps patter, running steps thud louder, the alarm wails while
// a guard hunts you, and pickups, wins and losses get short jingles.
// The context is created on the first user gesture (a key or a click).

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.alarmNodes = null;
    this.enabled = true;
  }

  /** Create (or resume) the audio context. Safe to call on every gesture. */
  unlock() {
    if (!this.enabled) return;
    if (this.ctx === null) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled) this.stopAlarm();
    return this.enabled;
  }

  /** One footstep: a short burst of filtered noise, louder while running. */
  footstep(running) {
    if (!this.ctx || !this.enabled) return;
    const dur = 0.07;
    const buffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = running ? 420 : 260;
    const gain = this.ctx.createGain();
    gain.gain.value = running ? 0.22 : 0.09;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start();
  }

  /** A bright two-note blip when a gem is pocketed. */
  pickup() {
    if (!this.ctx || !this.enabled) return;
    this.blip(880, 0.09, 0.16);
    window.setTimeout(() => this.blip(1318, 0.12, 0.16), 70);
  }

  /** A low sting when a guard grabs you. */
  caught() {
    if (!this.ctx || !this.enabled) return;
    this.blip(196, 0.35, 0.3);
    window.setTimeout(() => this.blip(147, 0.45, 0.3), 160);
  }

  /** A rising three-note jingle when you slip out the exit. */
  win() {
    if (!this.ctx || !this.enabled) return;
    [523, 659, 784].forEach((freq, i) => {
      window.setTimeout(() => this.blip(freq, 0.22, 0.2), i * 130);
    });
  }

  /** One sine blip: a soft tone that fades out. */
  blip(freq, dur, vol) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start();
    osc.stop(this.ctx.currentTime + dur);
  }

  /** Start the two-tone alarm loop while any guard is hunting. */
  startAlarm() {
    if (!this.ctx || !this.enabled || this.alarmNodes !== null) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 520;
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 2.4;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 180;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.setTargetAtTime(0.05, this.ctx.currentTime, 0.25);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start();
    lfo.start();
    this.alarmNodes = { osc, lfo, gain };
  }

  /** Silence the alarm loop. */
  stopAlarm() {
    if (this.alarmNodes === null) return;
    try {
      this.alarmNodes.osc.stop();
      this.alarmNodes.lfo.stop();
    } catch {
      // Already stopped; nothing to do.
    }
    this.alarmNodes = null;
  }
}
