"use client";

import React, { useState, useEffect } from "react";
import {
  Play,
  Pause,
  Eye,
  Shuffle,
  SkipForward,
  AlertTriangle,
  Volume2,
  VolumeX,
  Moon,
  Sparkles,
} from "lucide-react";

export const NeonEqualizerBar: React.FC<{
  isPlaying: boolean;
  accentColor: string;
  liveSpectrum?: number[];
  hasLiveSpectrum?: boolean;
}> = ({ isPlaying, accentColor, liveSpectrum, hasLiveSpectrum }) => {
  const [fallbackBars, setFallbackBars] = useState<number[]>(() => Array(32).fill(8));
  const useExternal = Array.isArray(liveSpectrum) && liveSpectrum.length > 0;

  useEffect(() => {
    if (useExternal) return;
    if (!isPlaying) {
      setFallbackBars(Array(32).fill(8));
      return;
    }
    const interval = setInterval(() => {
      setFallbackBars(
        Array.from({ length: 32 }, (_, idx) => {
          const distFromCenter = Math.abs(idx - 15.5) / 16;
          const wave = Math.max(0.25, 1 - distFromCenter * 0.85);
          return Math.floor((Math.random() * 82 + 18) * wave);
        })
      );
    }, 95);
    return () => clearInterval(interval);
  }, [isPlaying, useExternal]);

  const bars = useExternal ? liveSpectrum : fallbackBars;

  return (
    <div
      className="w-full max-w-2xl h-9 flex items-end justify-center gap-1 px-4 pointer-events-none select-none z-10 -mb-2 relative"
      title={hasLiveSpectrum ? "Valós idejű audio FFT spektrum" : "Ritmus-vizualizáció"}
    >
      {bars.map((val, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-full transition-all duration-75"
          style={{
            height: `${isPlaying ? val : 8}%`,
            backgroundColor: accentColor,
            opacity: isPlaying ? 0.88 : 0.18,
            boxShadow: isPlaying ? `0 0 12px ${accentColor}` : "none",
          }}
        />
      ))}
    </div>
  );
};

interface AudioPlayerFooterProps {
  isPlaying: boolean;
  isFlipped: boolean;
  activeTab: "boards" | "game";
  selectedDuration: number;
  progressPercent: number;
  accentColor: string;
  audioError: string | null;
  liveSpectrum?: number[];
  hasLiveSpectrum?: boolean;
  musicVolume: number;
  onMusicVolumeChange: (vol: number) => void;
  sfxVolume: number;
  onSfxVolumeChange: (vol: number) => void;
  sfxMuted: boolean;
  onToggleSfxMuted: () => void;
  onPlayToggle: () => void;
  onFlip: () => void;
  onNextTrack: () => void;
}

export const AudioPlayerFooter: React.FC<AudioPlayerFooterProps> = ({
  isPlaying,
  isFlipped,
  activeTab,
  selectedDuration,
  progressPercent,
  accentColor,
  audioError,
  liveSpectrum,
  hasLiveSpectrum,
  musicVolume,
  onMusicVolumeChange,
  sfxVolume,
  onSfxVolumeChange,
  sfxMuted,
  onToggleSfxMuted,
  onPlayToggle,
  onFlip,
  onNextTrack,
}) => {
  return (
    <div className="w-full flex flex-col items-center z-10 gap-2">
      {audioError && (
        <div className="w-full max-w-2xl px-4 py-2 rounded-2xl bg-rose-500/15 border border-rose-500/50 text-rose-200 text-xs font-bold flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{audioError}</span>
        </div>
      )}

      <NeonEqualizerBar
        isPlaying={isPlaying}
        accentColor={accentColor}
        liveSpectrum={liveSpectrum}
        hasLiveSpectrum={hasLiveSpectrum}
      />

      <footer className="relative overflow-hidden w-full max-w-2xl bg-neutral-900/90 backdrop-blur-xl border border-neutral-800 rounded-3xl p-3 flex flex-col gap-2.5 shadow-2xl mb-1">
        {selectedDuration > 0 && isPlaying && (
          <div
            className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-amber-400 via-rose-500 to-violet-500 transition-all duration-1000"
            style={{ width: `${progressPercent}%` }}
          />
        )}

        <div className="flex items-center justify-between gap-2">
          <button
            onClick={onPlayToggle}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs sm:text-sm tracking-wide transition shadow-lg shadow-amber-500/20 active:scale-95"
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            <span>{isPlaying ? "Szünet (P)" : "Zene (P)"}</span>
          </button>

          {activeTab === "game" && (
            <button
              onClick={onFlip}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs sm:text-sm border border-neutral-700 transition active:scale-95 shadow-md"
            >
              <Eye className="w-4 h-4 text-amber-400" />
              <span>{isFlipped ? "Elrejtés" : "Megfordítás (Space)"}</span>
            </button>
          )}

          <button
            onClick={onNextTrack}
            className="px-3.5 py-2.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition active:scale-95 flex items-center gap-1.5 text-xs font-bold"
          >
            <Shuffle className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Következő</span>
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Hangerő & Éjszakai mód sáv */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-800/70 px-1 text-[11px]">
          <div className="flex items-center gap-2 flex-1 min-w-[160px]">
            <button
              onClick={() => onMusicVolumeChange(musicVolume > 0 ? 0 : 0.9)}
              className="text-neutral-400 hover:text-amber-400 transition"
              title="Zene némítása / visszaállítása"
            >
              {musicVolume <= 0.01 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-amber-400" />
              )}
            </button>
            <span className="text-neutral-400 font-bold text-[10px] uppercase tracking-wider shrink-0">
              Zene:
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(musicVolume * 100)}
              onChange={(e) => onMusicVolumeChange(Number(e.target.value) / 100)}
              className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
            <span className="font-mono text-[10px] text-amber-300 font-bold w-8 text-right">
              {Math.round(musicVolume * 100)}%
            </span>
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-[180px]">
            <button
              onClick={onToggleSfxMuted}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-black transition shrink-0 ${
                sfxMuted
                  ? "bg-violet-500/20 border-violet-400 text-violet-200"
                  : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white"
              }`}
              title="Éjszakai mód: elnémítja a dudát, buzzert és csengőt, miközben a zene szól"
            >
              <Moon className="w-3 h-3 text-violet-400" />
              <span>{sfxMuted ? "Éjszakai mód BE" : "Effektek"}</span>
            </button>
            <input
              type="range"
              min={0}
              max={100}
              disabled={sfxMuted}
              value={sfxMuted ? 0 : Math.round(sfxVolume * 100)}
              onChange={(e) => onSfxVolumeChange(Number(e.target.value) / 100)}
              className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-violet-400 disabled:opacity-40"
            />
            <span className="font-mono text-[10px] text-violet-300 font-bold w-8 text-right">
              {sfxMuted ? "0%" : `${Math.round(sfxVolume * 100)}%`}
            </span>
          </div>

          {hasLiveSpectrum && (
            <span
              className="hidden sm:flex items-center gap-1 text-[9px] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full"
              title="Élő Web Audio FFT spektrum aktív"
            >
              <Sparkles className="w-2.5 h-2.5" />
              FFT Live
            </span>
          )}
        </div>
      </footer>
    </div>
  );
};
