export class GameAudio {
  private ctx: AudioContext | null = null;
  volume = 0.7;
  muted = false;

  unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, slide = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(gain * this.volume, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noise(dur: number, gain: number, hp = 800) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const n = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
    const data = n.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = n;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = hp;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain * this.volume, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.ctx.destination);
    src.start(t);
  }

  shoot(kind: string) {
    if (kind === "awp") {
      this.noise(0.18, 0.55, 400);
      this.tone(90, 0.2, "sawtooth", 0.18, -40);
    } else if (kind === "deagle") {
      this.noise(0.1, 0.42, 700);
      this.tone(140, 0.1, "square", 0.1, -60);
    } else {
      this.noise(0.06, 0.32, 1200);
      this.tone(180, 0.05, "square", 0.06, -80);
    }
  }

  hit(head: boolean) {
    this.tone(head ? 880 : 420, 0.06, "square", head ? 0.12 : 0.08);
  }

  kill() {
    this.tone(520, 0.08, "square", 0.1);
    this.tone(260, 0.14, "triangle", 0.08, -80);
  }

  empty() {
    this.tone(140, 0.05, "square", 0.04);
  }

  reload() {
    this.tone(220, 0.05, "triangle", 0.05);
    this.tone(180, 0.08, "triangle", 0.04);
  }

  hurt() {
    this.tone(90, 0.12, "sawtooth", 0.12, -30);
  }

  step() {
    this.noise(0.04, 0.08, 220);
  }

  win() {
    this.tone(440, 0.12, "square", 0.1);
    this.tone(660, 0.18, "square", 0.08);
  }
}
