"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  getSharedAudioContext,
  setSfxVolume as applySfxVolume,
  setSfxMuted as applySfxMuted,
} from "@/lib/audioEffects";

export function useAudioPlayer(audioSrc?: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const consecutiveAudioErrorsRef = useRef<number>(0);

  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceConnectedRef = useRef<boolean>(false);
  const rafRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [selectedDuration, setSelectedDuration] = useState<number>(30);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [audioError, setAudioError] = useState<string | null>(null);

  const [musicVolume, setMusicVolumeState] = useState<number>(0.9);
  const musicVolumeRef = useRef<number>(0.9);
  const [sfxVolume, setSfxVolumeState] = useState<number>(0.75);
  const [sfxMuted, setSfxMutedState] = useState<boolean>(false);

  const [corsAudioEnabled, setCorsAudioEnabled] = useState<boolean>(false);
  const corsProbedHostRef = useRef<string | null>(null);
  const [hasLiveSpectrum, setHasLiveSpectrum] = useState<boolean>(false);
  const [spectrum, setSpectrum] = useState<number[]>(() => Array(32).fill(10));

  // Beállítások betöltése localStorage-ból
  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedMusicVol = localStorage.getItem("hit_music_volume");
    const savedSfxVol = localStorage.getItem("hit_sfx_volume");
    const savedSfxMuted = localStorage.getItem("hit_sfx_muted");

    if (savedMusicVol !== null) {
      const parsed = Math.max(0, Math.min(1, parseFloat(savedMusicVol)));
      if (!Number.isNaN(parsed)) {
        setMusicVolumeState(parsed);
        musicVolumeRef.current = parsed;
      }
    }
    if (savedSfxVol !== null) {
      const parsed = Math.max(0, Math.min(1, parseFloat(savedSfxVol)));
      if (!Number.isNaN(parsed)) {
        setSfxVolumeState(parsed);
        applySfxVolume(parsed);
      }
    }
    if (savedSfxMuted !== null) {
      const muted = savedSfxMuted === "true";
      setSfxMutedState(muted);
      applySfxMuted(muted);
    }
  }, []);

  // Biztonságos CORS előellenőrzés az R2 hosthoz (csak akkor kapcsolja be az AnalyserNode-ot, ha a CORS biztosított)
  useEffect(() => {
    if (!audioSrc || typeof window === "undefined") return;
    let hostKey = "";
    try {
      hostKey = new URL(audioSrc, window.location.href).origin;
    } catch {
      return;
    }
    if (corsProbedHostRef.current === hostKey) return;
    corsProbedHostRef.current = hostKey;

    let cancelled = false;
    fetch(audioSrc, { method: "HEAD", mode: "cors" })
      .then((res) => {
        if (!cancelled && res.ok) {
          setCorsAudioEnabled(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCorsAudioEnabled(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [audioSrc]);

  const ensureAnalyserConnected = useCallback(() => {
    if (!corsAudioEnabled || sourceConnectedRef.current || !audioRef.current) return;
    try {
      const ctx = getSharedAudioContext();
      if (!ctx) return;
      const source = ctx.createMediaElementSource(audioRef.current);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.78;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      analyserRef.current = analyser;
      sourceConnectedRef.current = true;
      setHasLiveSpectrum(true);
    } catch {
      setHasLiveSpectrum(false);
    }
  }, [corsAudioEnabled]);

  // Valódi vagy dinamikus fallback spektrum-frissítés lejátszás közben
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setSpectrum(Array(32).fill(8));
      return;
    }

    let lastTick = 0;
    const freqData = analyserRef.current
      ? new Uint8Array(analyserRef.current.frequencyBinCount)
      : null;

    const update = (ts: number) => {
      if (ts - lastTick >= 65) {
        lastTick = ts;
        if (analyserRef.current && freqData && sourceConnectedRef.current) {
          analyserRef.current.getByteFrequencyData(freqData);
          const nextBars: number[] = [];
          const step = Math.max(1, Math.floor((freqData.length * 0.7) / 32));
          for (let i = 0; i < 32; i++) {
            const idx = Math.min(freqData.length - 1, i * step);
            const raw = freqData[idx] || 0;
            const scaled = Math.max(10, Math.min(100, Math.round((raw / 255) * 100)));
            nextBars.push(scaled);
          }
          setSpectrum(nextBars);
        } else {
          // Harmonikus fallback spektrum, ha az R2 host nem küld CORS fejlécet
          const t = ts / 180;
          setSpectrum(
            Array.from({ length: 32 }, (_, idx) => {
              const distFromCenter = Math.abs(idx - 15.5) / 16;
              const envelope = Math.max(0.28, 1 - distFromCenter * 0.8);
              const wave = 0.5 + 0.35 * Math.sin(t + idx * 0.45) + 0.25 * Math.cos(t * 1.7 - idx * 0.3);
              return Math.max(12, Math.min(100, Math.round((wave * 75 + Math.random() * 25) * envelope)));
            })
          );
        }
      }
      rafRef.current = requestAnimationFrame(update);
    };

    rafRef.current = requestAnimationFrame(update);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, hasLiveSpectrum]);

  const setMusicVolume = useCallback((vol: number) => {
    const safe = Math.max(0, Math.min(1, vol));
    setMusicVolumeState(safe);
    musicVolumeRef.current = safe;
    if (typeof window !== "undefined") {
      localStorage.setItem("hit_music_volume", String(safe));
    }
    if (audioRef.current && !fadeTimerRef.current) {
      try {
        audioRef.current.volume = safe;
      } catch {
        // ignore
      }
    }
  }, []);

  const setSfxVolume = useCallback((vol: number) => {
    const safe = Math.max(0, Math.min(1, vol));
    setSfxVolumeState(safe);
    applySfxVolume(safe);
    if (typeof window !== "undefined") {
      localStorage.setItem("hit_sfx_volume", String(safe));
    }
  }, []);

  const toggleSfxMuted = useCallback(() => {
    setSfxMutedState((prev) => {
      const next = !prev;
      applySfxMuted(next);
      if (typeof window !== "undefined") {
        localStorage.setItem("hit_sfx_muted", String(next));
      }
      return next;
    });
  }, []);

  const stopFadeTimer = useCallback(() => {
    if (fadeTimerRef.current) {
      clearInterval(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
  }, []);

  const fadeIn = useCallback(
    (audio: HTMLAudioElement, targetMult = 1.0, durationMs = 1500) => {
      stopFadeTimer();
      const targetVol = Math.max(0, Math.min(1, targetMult * musicVolumeRef.current));
      try {
        audio.volume = 0;
      } catch {
        // ignore
      }
      if (targetVol <= 0.01) return;

      const stepTime = 30;
      const steps = durationMs / stepTime;
      const increment = targetVol / steps;
      let curVol = 0;

      fadeTimerRef.current = setInterval(() => {
        const liveTarget = musicVolumeRef.current * targetMult;
        curVol = Math.min(liveTarget, curVol + increment);
        try {
          audio.volume = curVol;
        } catch {
          // ignore
        }
        if (curVol >= liveTarget) stopFadeTimer();
      }, stepTime);
    },
    [stopFadeTimer]
  );

  const fadeOut = useCallback(
    (audio: HTMLAudioElement, durationMs = 1800, onDone?: () => void) => {
      stopFadeTimer();
      const startVol = audio.volume;
      if (startVol <= 0.05) {
        audio.pause();
        try {
          audio.volume = musicVolumeRef.current;
        } catch {
          // ignore
        }
        if (onDone) onDone();
        return;
      }
      const stepTime = 30;
      const steps = durationMs / stepTime;
      const decrement = startVol / steps;
      let curVol = startVol;

      fadeTimerRef.current = setInterval(() => {
        curVol = Math.max(0, curVol - decrement);
        try {
          audio.volume = curVol;
        } catch {
          // ignore
        }
        if (curVol <= 0) {
          stopFadeTimer();
          audio.pause();
          try {
            audio.volume = musicVolumeRef.current;
          } catch {
            // ignore
          }
          if (onDone) onDone();
        }
      }, stepTime);
    },
    [stopFadeTimer]
  );

  useEffect(() => {
    return () => stopFadeTimer();
  }, [stopFadeTimer]);

  const handleStop = useCallback(
    (immediate = false) => {
      if (!audioRef.current) {
        setIsPlaying(false);
        return;
      }
      if (immediate) {
        stopFadeTimer();
        audioRef.current.pause();
        try {
          audioRef.current.volume = musicVolumeRef.current;
        } catch {
          // ignore
        }
        setIsPlaying(false);
      } else {
        fadeOut(audioRef.current, 1600, () => {
          setIsPlaying(false);
        });
      }
    },
    [fadeOut, stopFadeTimer]
  );

  const handleSeek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const handleDurationChange = useCallback(
    (seconds: number) => {
      setSelectedDuration(seconds);
      if (!isPlaying) setTimeLeft(seconds);
    },
    [isPlaying]
  );

  return {
    audioRef,
    consecutiveAudioErrorsRef,
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    selectedDuration,
    timeLeft,
    setTimeLeft,
    audioError,
    setAudioError,
    musicVolume,
    setMusicVolume,
    sfxVolume,
    setSfxVolume,
    sfxMuted,
    toggleSfxMuted,
    corsAudioEnabled,
    hasLiveSpectrum,
    spectrum,
    ensureAnalyserConnected,
    fadeIn,
    fadeOut,
    handleStop,
    handleSeek,
    handleDurationChange,
  };
}

