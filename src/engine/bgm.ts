// Procedural Deep-Space Ambient Synth BGM + Automatic external MP3 loader (public/audio/bgm/)
//
// External tracks are crossfaded over 1.5s (AUDIO_SPEC.md section 5). The
// procedural synth remains as a fallback so the game always has music.

// Toggle external MP3 loading; set false to use the built-in Web Audio procedural synth.
export const USE_EXTERNAL_BGM = false;

export type BgmMood = 'title' | 'explore' | 'empire' | 'combat' | 'crisis' | 'victory';

const BGM_FILE_MAP: Record<BgmMood, string> = {
  title: './audio/bgm/bgm_title.mp3',
  explore: './audio/bgm/bgm_explore_1.mp3',
  empire: './audio/bgm/bgm_empire_mid.mp3',
  combat: './audio/bgm/bgm_combat.mp3',
  crisis: './audio/bgm/bgm_crisis.mp3',
  victory: './audio/bgm/bgm_victory.mp3',
};

// Second exploration track; the two alternate while exploring.
const BGM_EXPLORE_ALT = './audio/bgm/bgm_explore_2.mp3';

const CROSSFADE_MS = 1500;
const CROSSFADE_STEPS = 30;

class SpaceBgmManager {
  private enabled = true;
  private volume = 0.28;
  private currentMood: BgmMood = 'title';
  private started = false;

  // External <audio> elements (used automatically if MP3s exist in public/audio/bgm/)
  private externalAudio: HTMLAudioElement | null = null;
  private nextAudio: HTMLAudioElement | null = null;
  private usingExternal = false;

  // Crossfade / rotation bookkeeping
  private fadeTimer: number | null = null;
  private rotateTimer: number | null = null;
  private exploreIndex = 0;

  // Procedural Web Audio synth fallback
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
    for (const el of [this.externalAudio, this.nextAudio]) {
      if (!el) continue;
      el.volume = this.enabled ? this.volume : 0;
      if (!this.enabled && !el.paused) {
        el.pause();
      } else if (this.enabled && el === this.externalAudio && el.paused) {
        el.play().catch(() => {});
      }
    }
    if (!this.enabled) {
      this.stopSynthLoop();
      this.clearTimers();
    } else if (this.started && !this.usingExternal) {
      this.startSynthLoop();
    }
  }

  ensureStarted() {
    if (this.started) return;
    this.started = true;
    if (!this.enabled) return;
    this.playMood(this.currentMood);
  }

  /** Source for a mood. Exploration rotates between the two explore tracks. */
  private sourceFor(mood: BgmMood): string {
    if (mood !== 'explore') return BGM_FILE_MAP[mood];
    this.exploreIndex = (this.exploreIndex + 1) % 2;
    return this.exploreIndex === 0 ? BGM_FILE_MAP.explore : BGM_EXPLORE_ALT;
  }

  playMood(mood: BgmMood) {
    const moodChanged = mood !== this.currentMood;
    this.currentMood = mood;
    if (!this.started || !this.enabled) return;

    if (!USE_EXTERNAL_BGM) {
      if (!moodChanged && this.padTimer !== null) return;
      this.usingExternal = false;
      this.chordIndex = 0;
      this.stopSynthLoop();
      this.startSynthLoop();
      return;
    }

    if (!moodChanged && (this.usingExternal || this.padTimer !== null)) return;

    this.loadAndPlay(this.sourceFor(mood));
  }

  private loadAndPlay(src: string) {
    this.clearTimers();
    // Try external MP3 first; if unavailable (404), seamlessly fall back to procedural synth
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = 0; // ramped up by the crossfade

    audio
      .play()
      .then(() => {
        this.stopSynthLoop();
        const previous = this.externalAudio;
        // A spare element that is not part of this transition must be silent,
        // otherwise an interrupted crossfade leaves an orphan track playing.
        if (this.nextAudio && this.nextAudio !== previous && this.nextAudio !== audio) {
          this.nextAudio.pause();
          this.nextAudio.volume = 0;
        }
        this.externalAudio = audio;
        this.nextAudio = previous;
        this.usingExternal = true;
        if (previous) {
          this.crossfade(previous, audio);
        } else {
          audio.volume = this.enabled ? this.volume : 0;
        }
        this.scheduleRotation();
      })
      .catch(() => {
        this.usingExternal = false;
        this.startSynthLoop();
      });
  }

  /** Equal-power-ish linear crossfade between the outgoing and incoming track. */
  private crossfade(outgoing: HTMLAudioElement, incoming: HTMLAudioElement) {
    if (this.fadeTimer !== null) {
      window.clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }
    const target = this.enabled ? this.volume : 0;
    const from = outgoing.volume;
    let step = 0;
    incoming.volume = 0;
    this.fadeTimer = window.setInterval(() => {
      step++;
      const k = Math.min(1, step / CROSSFADE_STEPS);
      incoming.volume = target * k;
      outgoing.volume = from * (1 - k);
      if (k >= 1) {
        if (this.fadeTimer !== null) {
          window.clearInterval(this.fadeTimer);
          this.fadeTimer = null;
        }
        outgoing.pause();
        outgoing.volume = target;
      }
    }, CROSSFADE_MS / CROSSFADE_STEPS);
  }

  /** Alternate the two exploration tracks once the current one has played. */
  private scheduleRotation() {
    if (this.currentMood !== 'explore') return;
    const probe = this.externalAudio;
    if (!probe) return;
    const schedule = (duration: number) => {
      if (this.rotateTimer !== null) {
        window.clearTimeout(this.rotateTimer);
        this.rotateTimer = null;
      }
      this.rotateTimer = window.setTimeout(() => {
        if (!this.enabled || this.currentMood !== 'explore') return;
        this.loadAndPlay(this.sourceFor('explore'));
      }, Math.max(30, duration - 4) * 1000);
    };
    if (Number.isFinite(probe.duration) && probe.duration > 0) {
      schedule(probe.duration);
    } else {
      probe.addEventListener(
        'loadedmetadata',
        () => {
          const d =
            Number.isFinite(probe.duration) && probe.duration > 0 ? probe.duration : 210;
          schedule(d);
        },
        { once: true }
      );
    }
  }

  private clearTimers() {
    if (this.fadeTimer !== null) {
      window.clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }
    if (this.rotateTimer !== null) {
      window.clearTimeout(this.rotateTimer);
      this.rotateTimer = null;
    }
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
      if (!this.enabled || this.usingExternal) return;
      const ctx = this.getAudioCtx();
      if (!ctx || !this.masterGain) return;

      // Stellaris-inspired cosmic minor/modal synth pad progressions
      const progressions: Record<BgmMood, number[][]> = {
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

      const chords = progressions[this.currentMood];
      const freqs = chords[this.chordIndex % chords.length];
      this.chordIndex++;

      const now = ctx.currentTime;
      const dur = this.currentMood === 'combat' ? 4.2 : 6.8;

      // Low-pass filter for warm analog space pad feel
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(
        this.currentMood === 'combat' ? 780 : 520,
        now
      );
      filter.connect(this.masterGain);

      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = idx === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(f, now);

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
