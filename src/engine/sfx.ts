// Hybrid SFX Engine: automatically loads external MP3s from public/audio/sfx/ (per AUDIO_SPEC.md)
// and falls back seamlessly to lightweight zero-dependency Web Audio synth when files are not yet present.

let audioCtx: AudioContext | null = null;
let sfxEnabled = true;
let sfxVolume = 0.35;

type SfxCueId =
  | 'ui_click'
  | 'ui_confirm'
  | 'ui_error'
  | 'tech_complete'
  | 'event_popup'
  | 'build_complete'
  | 'colonize'
  | 'laser_fire'
  | 'kinetic_fire'
  | 'missile_launch'
  | 'ship_explode'
  | 'war_declared'
  | 'alert_warning'
  | 'achievement';

const externalStatus: Partial<Record<SfxCueId, 'ok' | 'missing' | 'checking'>> = {};

// Combat cues can fire dozens of times in a single game tick. Without a
// cooldown the result is a machine gun; these limits keep them readable.
const COOLDOWN_MS: Partial<Record<SfxCueId, number>> = {
  laser_fire: 180,
  kinetic_fire: 180,
  missile_launch: 220,
  ship_explode: 260,
};

const lastPlayedAt = new Map<SfxCueId, number>();

export function setSfxConfig(enabled: boolean, volume: number) {
  sfxEnabled = enabled;
  sfxVolume = Math.max(0, Math.min(1, volume));
}

function getCtx(): AudioContext | null {
  if (!sfxEnabled || typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  gainScale = 0.25,
  slideToFreq?: number
) {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideToFreq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideToFreq), now + duration);
    }
    const peak = Math.max(0.001, sfxVolume * gainScale);
    gain.gain.setValueAtTime(peak, now);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  } catch {
    // Ignore audio context errors before user gesture
  }
}

function playCue(cue: SfxCueId, synthFallback: () => void) {
  if (!sfxEnabled) return;

  const cd = COOLDOWN_MS[cue];
  if (cd) {
    const now = performance.now();
    const last = lastPlayedAt.get(cue);
    if (last !== undefined && now - last < cd) return;
    lastPlayedAt.set(cue, now);
  }

  const status = externalStatus[cue];
  if (status === 'missing') {
    synthFallback();
    return;
  }

  const audio = new Audio(`./audio/sfx/sfx_${cue}.mp3`);
  audio.volume = sfxVolume;
  audio
    .play()
    .then(() => {
      externalStatus[cue] = 'ok';
    })
    .catch(() => {
      externalStatus[cue] = 'missing';
      synthFallback();
    });
}

export const sfx = {
  click() {
    playCue('ui_click', () => playTone(620, 0.055, 'triangle', 0.18, 480));
  },
  confirm() {
    playCue('ui_confirm', () => {
      playTone(520, 0.08, 'sine', 0.22, 780);
      setTimeout(() => playTone(780, 0.11, 'sine', 0.18, 1040), 55);
    });
  },
  error() {
    playCue('ui_error', () => playTone(220, 0.12, 'sawtooth', 0.16, 150));
  },
  discovery() {
    playCue('event_popup', () => {
      playTone(440, 0.12, 'sine', 0.22, 660);
      setTimeout(() => playTone(660, 0.15, 'sine', 0.2, 880), 90);
      setTimeout(() => playTone(880, 0.22, 'triangle', 0.18, 1100), 180);
    });
  },
  techComplete() {
    playCue('tech_complete', () => {
      playTone(523, 0.14, 'sine', 0.22, 659);
      setTimeout(() => playTone(784, 0.2, 'triangle', 0.2, 1046), 100);
    });
  },
  alert() {
    playCue('alert_warning', () => playTone(740, 0.09, 'square', 0.12, 520));
  },
  buildComplete() {
    playCue('build_complete', () => {
      playTone(160, 0.22, 'square', 0.14, 120);
      setTimeout(() => playTone(640, 0.2, 'sine', 0.14, 960), 80);
    });
  },
  colonize() {
    playCue('colonize', () => {
      playTone(392, 0.4, 'sine', 0.18, 523);
      setTimeout(() => playTone(523, 0.4, 'sine', 0.14, 659), 120);
    });
  },
  laserFire() {
    playCue('laser_fire', () => playTone(2200, 0.18, 'sawtooth', 0.16, 420));
  },
  kineticFire() {
    playCue('kinetic_fire', () => playTone(90, 0.16, 'sine', 0.26, 55));
  },
  missileLaunch() {
    playCue('missile_launch', () => playTone(300, 0.3, 'sawtooth', 0.16, 900));
  },
  shipExplode() {
    playCue('ship_explode', () => playTone(120, 0.5, 'sine', 0.3, 40));
  },
  warDeclared() {
    playCue('war_declared', () => {
      playTone(180, 0.35, 'sawtooth', 0.22, 110);
      setTimeout(() => playTone(150, 0.45, 'sawtooth', 0.2, 95), 220);
    });
  },
  achievement() {
    playCue('achievement', () => {
      playTone(587, 0.12, 'sine', 0.22, 880);
      setTimeout(() => playTone(880, 0.25, 'triangle', 0.22, 1175), 110);
    });
  },
};
