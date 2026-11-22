// Procedural Deep-Space Ambient Synth BGM.
//
// The soundtrack is generated entirely at runtime with the Web Audio API:
// layered oscillator chords run through a low-pass filter to produce a warm
// analog "space pad". Each mood has its own chord progression, so the music
// follows the situation (title / exploration / empire / combat / crisis /
// victory) without shipping a single audio file.

export type BgmMood = 'title' | 'explore' | 'empire' | 'combat' | 'crisis' | 'victory';

/** Human-readable mood names, shared with the settings panel auditioner. */
export const BGM_MOODS: Array<{ mood: BgmMood; label: string }> = [
  { mood: 'title', label: '主界面' },
  { mood: 'explore', label: '深空探索' },
  { mood: 'empire', label: '帝国繁荣' },
  { mood: 'combat', label: '舰队交战' },
  { mood: 'crisis', label: '银河天灾' },
  { mood: 'victory', label: '凯旋终章' },
];

/** Chord progressions per mood (Hz). Stellaris-inspired minor / modal colour. */
const PROGRESSIONS: Record<BgmMood, number[][]> = {
  title: [
    [146.83, 220.0, 293.66, 349.23], // Dm9
    [116.54, 174.61, 261.63, 349.23], // Bbmaj7
    [130.81, 196.0, 293.66, 329.63], // Cadd9
    [110.0, 164.81, 220.0, 329.63], // Am
  ],
  explore: [
    [130.81, 196.0, 246.94, 329.63], // Cmaj7
    [110.0, 164.81, 246.94, 293.66], // Am9
    [174.61, 220.0, 261.63, 329.63], // Fmaj7
    [146.83, 220.0, 261.63, 329.63], // Dm9
  ],
  empire: [
    [174.61, 220.0, 261.63, 329.63], // Fmaj7
    [146.83, 220.0, 261.63, 329.63], // Dm9
    [116.54, 174.61, 233.08, 293.66], // Bbmaj7
    [130.81, 196.0, 261.63, 329.63], // Cadd9
  ],
  combat: [
    [82.41, 123.47, 164.81, 196.0], // Em
    [98.0, 146.83, 196.0, 233.08], // Gm
    [73.42, 110.0, 146.83, 174.61], // Dm
    [82.41, 123.47, 155.56, 196.0], // Em tension
  ],
  crisis: [
    [69.3, 103.83, 146.83, 164.81], // C#m dark
    [65.41, 98.0, 138.59, 155.56], // dissonant void
  ],
  victory: [
    [146.83, 220.0, 293.66, 369.99], // Dmaj
    [196.0, 246.94, 293.66, 392.0], // Gmaj
  ],
};

class SpaceBgmManager {
  private enabled = true;
  private volume = 0.28;
  private currentMood: BgmMood = 'title';
  private started = false;

  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private padTimer: number | null = null;
  private chordIndex = 0;

  setConfig(enabled: boolean, volume: number) {
    this.enabled = enabled;
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.enabled ? this.volume * 0.25 : 0.0001,
        this.ctx.currentTime,
        0.3
      );
    }
    if (!this.enabled) {
      this.stopSynthLoop();
    } else if (this.started) {
      this.startSynthLoop();
    }
  }

  ensureStarted() {
    if (this.started) return;
    this.started = true;
    if (!this.enabled) return;
    this.playMood(this.currentMood);
  }

  playMood(mood: BgmMood) {
    const moodChanged = mood !== this.currentMood;
    this.currentMood = mood;
    if (!this.started || !this.enabled) return;
    if (!moodChanged && this.padTimer !== null) return;

    this.chordIndex = 0;
    this.stopSynthLoop();
    this.startSynthLoop();
  }

  private getAudioCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      this.ctx = new Ctx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.enabled ? this.volume * 0.25 : 0.0001;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private startSynthLoop() {
    if (this.padTimer !== null) return;

    const playChord = () => {
      if (!this.enabled) return;
      const ctx = this.getAudioCtx();
      if (!ctx || !this.masterGain) return;

      const chords = PROGRESSIONS[this.currentMood];
      const freqs = chords[this.chordIndex % chords.length];
      this.chordIndex++;

      const now = ctx.currentTime;
      const dur = this.currentMood === 'combat' ? 4.2 : 6.8;

      // Low-pass filter for warm analog space pad feel
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(this.currentMood === 'combat' ? 780 : 520, now);
      filter.connect(this.masterGain);

      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = idx === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(f, now);

        // Slow swell in, long tail out — the classic "inhale" of a space pad.
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(idx === 0 ? 0.24 : 0.14, now + 1.4);
        g.gain.linearRampToValueAtTime(0.0001, now + dur);

        osc.connect(g);
        g.connect(filter);
        osc.start(now);
        osc.stop(now + dur + 0.1);
      });
    };

    playChord();
    this.padTimer = window.setInterval(playChord, 5600);
  }

  private stopSynthLoop() {
    if (this.padTimer !== null) {
      window.clearInterval(this.padTimer);
      this.padTimer = null;
    }
  }
}

export const bgm = new SpaceBgmManager();
