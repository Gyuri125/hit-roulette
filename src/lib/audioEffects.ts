import { SoundEffectType } from "@/types/game";

interface AudioWindow extends Window {
  __hitsterAudioCtx?: AudioContext;
  webkitAudioContext?: typeof AudioContext;
}

let currentSfxVolume = 0.75;
let currentSfxMuted = false;

export const setSfxVolume = (vol: number) => {
  currentSfxVolume = Math.max(0, Math.min(1, vol));
};

export const getSfxVolume = (): number => currentSfxVolume;

export const setSfxMuted = (muted: boolean) => {
  currentSfxMuted = Boolean(muted);
};

export const getSfxMuted = (): boolean => currentSfxMuted;

const getEffectiveSfxScale = (): number => (currentSfxMuted ? 0 : currentSfxVolume);

export const getSharedAudioContext = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  const win = window as AudioWindow;
  if (!win.__hitsterAudioCtx) {
    const AudioCtx = window.AudioContext || win.webkitAudioContext;
    if (AudioCtx) {
      win.__hitsterAudioCtx = new AudioCtx();
    }
  }
  if (win.__hitsterAudioCtx && win.__hitsterAudioCtx.state === "suspended") {
    win.__hitsterAudioCtx.resume().catch(() => {});
  }
  return win.__hitsterAudioCtx || null;
};

export const playMarkerSound = (isMarking: boolean) => {
  const sfxScale = getEffectiveSfxScale();
  if (sfxScale <= 0) return;
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (isMarking) {
      osc.type = "sine";
      osc.frequency.setValueAtTime(460, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.25 * sfxScale, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    } else {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.12 * sfxScale, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    }
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch {
    // Web Audio may be blocked prior to user interaction
  }
};

export const playClickTone = () => {
  const sfxScale = getEffectiveSfxScale();
  if (sfxScale <= 0) return;
  try {
    const audioCtx = getSharedAudioContext();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(650 + Math.random() * 150, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.035);
    gain.gain.setValueAtTime(0.12 * sfxScale, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.035);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.035);
  } catch {
    // ignore
  }
};

export const playFanfareTone = () => {
  const sfxScale = getEffectiveSfxScale();
  if (sfxScale <= 0) return;
  try {
    const audioCtx = getSharedAudioContext();
    if (!audioCtx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const startTime = audioCtx.currentTime + idx * 0.09;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2 * sfxScale, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.45);
    });
  } catch {
    // ignore
  }
};

export const playBuzzerSound = () => {
  const sfxScale = getEffectiveSfxScale();
  if (sfxScale <= 0) return;
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(340, ctx.currentTime);
    osc.frequency.setValueAtTime(480, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.3 * sfxScale, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch {
    // ignore
  }
};

export const playPartySoundEffect = (effect: SoundEffectType) => {
  const sfxScale = getEffectiveSfxScale();
  if (sfxScale <= 0) return;
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;

    if (effect === "airhorn") {
      const freqs = [390, 465, 585];
      freqs.forEach((f) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(f, ctx.currentTime);
        gain.gain.setValueAtTime(0.16 * sfxScale, ctx.currentTime);
        gain.gain.setValueAtTime(0.02 * sfxScale, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.16 * sfxScale, ctx.currentTime + 0.16);
        gain.gain.setValueAtTime(0.02 * sfxScale, ctx.currentTime + 0.28);
        gain.gain.setValueAtTime(0.18 * sfxScale, ctx.currentTime + 0.32);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.85);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.85);
      });
    } else if (effect === "crickets") {
      for (let burst = 0; burst < 3; burst++) {
        for (let i = 0; i < 4; i++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = ctx.currentTime + burst * 0.38 + i * 0.045;
          osc.type = "sine";
          osc.frequency.setValueAtTime(4100 + (i % 2) * 200, start);
          gain.gain.setValueAtTime(0.12 * sfxScale, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.035);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(start);
          osc.stop(start + 0.035);
        }
      }
    } else if (effect === "trombone") {
      const notes = [
        { f: 293.66, start: 0, dur: 0.28 },
        { f: 277.18, start: 0.3, dur: 0.28 },
        { f: 261.63, start: 0.6, dur: 0.28 },
        { f: 246.94, start: 0.9, dur: 0.65 },
      ];
      notes.forEach((n, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        const st = ctx.currentTime + n.start;
        osc.frequency.setValueAtTime(n.f, st);
        if (idx === 3) {
          osc.frequency.linearRampToValueAtTime(n.f - 30, st + n.dur);
        }
        gain.gain.setValueAtTime(0.18 * sfxScale, st);
        gain.gain.exponentialRampToValueAtTime(0.001, st + n.dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(st);
        osc.stop(st + n.dur);
      });
    } else if (effect === "drumroll") {
      for (let i = 0; i < 18; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const st = ctx.currentTime + i * 0.05;
        osc.type = "triangle";
        osc.frequency.setValueAtTime(140 + (i % 2) * 35, st);
        osc.frequency.exponentialRampToValueAtTime(55, st + 0.04);
        gain.gain.setValueAtTime(0.18 * sfxScale, st);
        gain.gain.exponentialRampToValueAtTime(0.001, st + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(st);
        osc.stop(st + 0.04);
      }
      const endOsc = ctx.createOscillator();
      const endGain = ctx.createGain();
      const endTime = ctx.currentTime + 0.92;
      endOsc.type = "sine";
      endOsc.frequency.setValueAtTime(523.25, endTime);
      endGain.gain.setValueAtTime(0.25 * sfxScale, endTime);
      endGain.gain.exponentialRampToValueAtTime(0.001, endTime + 0.5);
      endOsc.connect(endGain);
      endGain.connect(ctx.destination);
      endOsc.start(endTime);
      endOsc.stop(endTime + 0.5);
    } else if (effect === "fanfare") {
      const notes = [
        { f: 523.25, start: 0, dur: 0.15 },
        { f: 523.25, start: 0.15, dur: 0.15 },
        { f: 523.25, start: 0.3, dur: 0.15 },
        { f: 659.25, start: 0.45, dur: 0.35 },
        { f: 783.99, start: 0.8, dur: 0.6 },
      ];
      notes.forEach((n) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const st = ctx.currentTime + n.start;
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(n.f, st);
        gain.gain.setValueAtTime(0.2 * sfxScale, st);
        gain.gain.exponentialRampToValueAtTime(0.001, st + n.dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(st);
        osc.stop(st + n.dur);
      });
    }
  } catch {
    // ignore
  }
};

export const getFirstLyricTime = (lyrics?: string): number => {
  if (!lyrics) return 0;
  const match = lyrics.match(/\[(\d{2}):(\d{2})\.?(\d{2,3})?\]/);
  if (match) {
    const mins = parseInt(match[1], 10);
    const secs = parseInt(match[2], 10);
    const ms = match[3] ? parseInt(match[3].padEnd(3, "0").slice(0, 3), 10) : 0;
    return mins * 60 + secs + ms / 1000;
  }
  return 0;
};

export const getSmartStartTime = (lyrics?: string): number => {
  const firstTime = getFirstLyricTime(lyrics);
  if (firstTime > 6) {
    return Math.max(0, Math.floor(firstTime - 5));
  }
  return 0;
};

export type HapticPattern =
  | "festive_win"
  | "joker_win"
  | "risk_loss"
  | "warning_pulse"
  | "tap"
  | "subtle";

export const triggerHaptic = (pattern: HapticPattern) => {
  if (typeof window === "undefined" || !("vibrate" in navigator)) return;
  try {
    if (pattern === "festive_win") {
      navigator.vibrate([200, 100, 350]);
    } else if (pattern === "joker_win") {
      navigator.vibrate([150, 80, 150, 80, 400]);
    } else if (pattern === "risk_loss") {
      navigator.vibrate([90, 40, 90, 40, 240]);
    } else if (pattern === "warning_pulse") {
      navigator.vibrate([120, 80, 120, 80, 120, 80, 300]);
    } else if (pattern === "tap") {
      navigator.vibrate(35);
    } else if (pattern === "subtle") {
      navigator.vibrate(15);
    }
  } catch {
    // ignore
  }
};
