"use client";

import React from "react";
import { createPortal } from "react-dom";
import { Music2, Shuffle, CalendarRange, RotateCcw, MoveHorizontal, X, Mic, Sparkles, Tag } from "lucide-react";
import { MusicFilter, TvTheme } from "@/types/game";

interface FilterBarProps {
  isTvMode: boolean;
  musicFilter: MusicFilter;
  setMusicFilter: (f: MusicFilter) => void;
  selectedGenre: string;
  setSelectedGenre: (g: string) => void;
  availableGenres: string[];
  onlyWithLyrics: boolean;
  setOnlyWithLyrics: (v: boolean) => void;
  minYear: number;
  maxYear: number;
  absoluteMinYear: number;
  absoluteMaxYear: number;
  setMinYear: (y: number) => void;
  setMaxYear: (y: number) => void;
  playedCount: number;
  totalFilteredCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  isTvMode,
  musicFilter,
  setMusicFilter,
  selectedGenre,
  setSelectedGenre,
  availableGenres,
  onlyWithLyrics,
  setOnlyWithLyrics,
  minYear,
  maxYear,
  absoluteMinYear,
  absoluteMaxYear,
  setMinYear,
  setMaxYear,
  playedCount,
  totalFilteredCount,
}) => {
  const isWideOpenYears = minYear <= absoluteMinYear && maxYear >= absoluteMaxYear;

  return (
    <div
      className={`w-full flex flex-col gap-2 py-2 px-3 bg-neutral-900/50 border border-neutral-800/80 rounded-2xl my-1.5 backdrop-blur-md z-10 ${
        isTvMode ? "max-w-[1900px]" : "max-w-6xl"
      }`}
    >
      <div className="w-full flex flex-wrap justify-between items-center gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-1 bg-neutral-900/90 p-1 rounded-xl border border-neutral-800">
            <Music2 className="w-3.5 h-3.5 text-amber-400 ml-1.5" />
            <button
              onClick={() => setMusicFilter("all")}
              className={`px-2.5 py-1 rounded-lg font-bold transition text-[11px] ${
                musicFilter === "all" ? "bg-amber-500 text-neutral-950 shadow" : "text-neutral-400 hover:text-white"
              }`}
            >
              🎲 Vegyes
            </button>
            <button
              onClick={() => setMusicFilter("hungarian")}
              className={`px-2.5 py-1 rounded-lg font-bold transition text-[11px] ${
                musicFilter === "hungarian"
                  ? "bg-emerald-500 text-neutral-950 shadow"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              🇭🇺 Magyar
            </button>
            <button
              onClick={() => setMusicFilter("international")}
              className={`px-2.5 py-1 rounded-lg font-bold transition text-[11px] ${
                musicFilter === "international"
                  ? "bg-cyan-500 text-neutral-950 shadow"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              🌍 Nemzetközi
            </button>
          </div>

          <button
            onClick={() => setOnlyWithLyrics(!onlyWithLyrics)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition ${
              onlyWithLyrics
                ? "bg-amber-500/20 border-amber-400 text-amber-200 shadow"
                : "bg-neutral-900/90 border-neutral-800 text-neutral-400 hover:text-white"
            }`}
            title="Csak dalszöveggel / karaoke móddal rendelkező dalok"
          >
            <Mic className="w-3 h-3 text-amber-400" />
            <span>Csak dalszöveges</span>
          </button>

          {availableGenres.length > 0 && (
            <div className="flex items-center gap-1 bg-neutral-900/90 p-1 rounded-xl border border-neutral-800">
              <Tag className="w-3 h-3 text-violet-400 ml-1" />
              <button
                onClick={() => setSelectedGenre("all")}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${
                  selectedGenre === "all"
                    ? "bg-violet-500 text-white shadow"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Minden műfaj
              </button>
              {availableGenres.map((genre) => (
                <button
                  key={genre}
                  onClick={() => setSelectedGenre(genre)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${
                    selectedGenre === genre
                      ? "bg-violet-500 text-white shadow"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {[
            { label: "Összes", min: absoluteMinYear, max: absoluteMaxYear },
            { label: "80-as", min: 1980, max: 1989 },
            { label: "90-es", min: 1990, max: 1999 },
            { label: "2000-es", min: 2000, max: 2009 },
            { label: "2010+", min: 2010, max: absoluteMaxYear },
          ].map((era) => {
            const activeEra = minYear === era.min && maxYear === era.max;
            return (
              <button
                key={era.label}
                onClick={() => {
                  setMinYear(era.min);
                  setMaxYear(era.max);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                  activeEra
                    ? "bg-violet-600 border-violet-400 text-white shadow"
                    : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                }`}
              >
                {era.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-neutral-900/90 border border-neutral-800 text-[11px] font-mono text-amber-400 font-bold">
            <Shuffle className="w-3 h-3 text-amber-400" />
            <span>
              {playedCount}/{totalFilteredCount} dal
            </span>
          </span>
        </div>
      </div>

      <div className="w-full flex flex-wrap items-center justify-between gap-3 pt-1.5 border-t border-neutral-800/60">
        <div className="flex items-center gap-3 flex-1 min-w-[260px]">
          <CalendarRange className="w-4 h-4 text-cyan-400 shrink-0" />
          <div className="flex items-center gap-2 flex-1">
            <span className="text-[10px] font-mono text-cyan-300 font-bold w-8">{minYear}</span>
            <input
              type="range"
              min={absoluteMinYear}
              max={maxYear}
              value={minYear}
              onChange={(e) => setMinYear(Math.min(Number(e.target.value), maxYear))}
              className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>
          <div className="flex items-center gap-2 flex-1">
            <input
              type="range"
              min={minYear}
              max={absoluteMaxYear}
              value={maxYear}
              onChange={(e) => setMaxYear(Math.max(Number(e.target.value), minYear))}
              className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-rose-400"
            />
            <span className="text-[10px] font-mono text-rose-300 font-bold w-8">{maxYear}</span>
          </div>
        </div>

        {(!isWideOpenYears || selectedGenre !== "all" || onlyWithLyrics || musicFilter !== "all") && (
          <button
            onClick={() => {
              setMinYear(absoluteMinYear);
              setMaxYear(absoluteMaxYear);
              setSelectedGenre("all");
              setOnlyWithLyrics(false);
              setMusicFilter("all");
            }}
            className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-300 text-[11px] font-bold transition"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Szűrők reset</span>
          </button>
        )}
      </div>
    </div>
  );
};

interface TvLayoutModalProps {
  mounted: boolean;
  isOpen: boolean;
  onClose: () => void;
  tvGap: number;
  tvWheelSize: number;
  tvCardWidth: number;
  tvHeaderScale: number;
  tvTheme: TvTheme;
  onSelectTheme: (theme: TvTheme) => void;
  onSaveLayout: (wheel: number, card: number, gap: number, headerScale?: number) => void;
  onApplyPreset: (type: "cinema" | "balanced" | "compact") => void;
}

export const TvLayoutModal: React.FC<TvLayoutModalProps> = ({
  mounted,
  isOpen,
  onClose,
  tvGap,
  tvWheelSize,
  tvCardWidth,
  tvHeaderScale,
  tvTheme,
  onSelectTheme,
  onSaveLayout,
  onApplyPreset,
}) => {
  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md bg-neutral-900 border-2 border-amber-500/50 rounded-3xl p-6 shadow-[0_20px_70px_rgba(0,0,0,0.95)] flex flex-col gap-5 text-neutral-200 relative max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <MoveHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black uppercase tracking-wider text-white text-base">TV Elrendezés & Téma</h3>
              <p className="text-[11px] text-neutral-400">16:9 képernyő, vizuális hangulat és méretek</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition"
            title="Bezárás"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Vizuális Téma választó */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>TV Vizuális Téma</span>
          </span>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "gala" as const, emoji: "✨", title: "Klasszikus Gála", desc: "Arany & Fekete" },
              { id: "synthwave" as const, emoji: "🌆", title: "80s Synthwave", desc: "Cián & Neon Lila" },
              { id: "retro" as const, emoji: "📼", title: "90s Retro MTV", desc: "Vibráló Pop" },
            ].map((theme) => (
              <button
                key={theme.id}
                onClick={() => onSelectTheme(theme.id)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition text-center ${
                  tvTheme === theme.id
                    ? "bg-amber-500/20 border-amber-400 text-white shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                    : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700"
                }`}
              >
                <span className="text-lg mb-0.5">{theme.emoji}</span>
                <span className="font-extrabold text-[11px]">{theme.title}</span>
                <span className="text-[9px] opacity-75 mt-0.5">{theme.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-amber-400">
            Gyors Sablonok (1-kattintás)
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => onApplyPreset("cinema")}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-neutral-950 hover:bg-amber-500/20 border border-neutral-800 hover:border-amber-500/50 transition group"
            >
              <span className="text-lg mb-0.5">🎬</span>
              <span className="font-extrabold text-white text-xs group-hover:text-amber-300">Mozi</span>
              <span className="text-[10px] text-neutral-500 mt-0.5">Óriás elemek</span>
            </button>
            <button
              onClick={() => onApplyPreset("balanced")}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-neutral-950 hover:bg-amber-500/20 border border-neutral-800 hover:border-amber-500/50 transition group"
            >
              <span className="text-lg mb-0.5">🎯</span>
              <span className="font-extrabold text-white text-xs group-hover:text-amber-300">Optimális</span>
              <span className="text-[10px] text-neutral-500 mt-0.5">Kiegyensúlyozott</span>
            </button>
            <button
              onClick={() => onApplyPreset("compact")}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-neutral-950 hover:bg-amber-500/20 border border-neutral-800 hover:border-amber-500/50 transition group"
            >
              <span className="text-lg mb-0.5">⚡</span>
              <span className="font-extrabold text-white text-xs group-hover:text-amber-300">Kompakt</span>
              <span className="text-[10px] text-neutral-500 mt-0.5">Feszes nézet</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3.5 bg-neutral-950/70 p-4 rounded-2xl border border-neutral-800/80">
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-neutral-300">Köztes Hézag (Rés a kettő közt):</span>
              <span className="font-mono font-black text-amber-400 bg-neutral-900 px-2 py-0.5 rounded-lg border border-neutral-800 text-xs">
                {tvGap} px
              </span>
            </div>
            <input
              type="range"
              min="8"
              max="160"
              step="4"
              value={tvGap}
              onChange={(e) => onSaveLayout(tvWheelSize, tvCardWidth, parseInt(e.target.value, 10))}
              className="w-full accent-amber-500 cursor-pointer h-2 bg-neutral-800 rounded-lg appearance-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-neutral-300">Roulette Kerék Mérete:</span>
              <span className="font-mono font-black text-amber-400 bg-neutral-900 px-2 py-0.5 rounded-lg border border-neutral-800 text-xs">
                {tvWheelSize} px
              </span>
            </div>
            <input
              type="range"
              min="380"
              max="650"
              step="10"
              value={tvWheelSize}
              onChange={(e) => onSaveLayout(parseInt(e.target.value, 10), tvCardWidth, tvGap)}
              className="w-full accent-amber-500 cursor-pointer h-2 bg-neutral-800 rounded-lg appearance-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-neutral-300">Hitster Zenei Kártya Szélessége:</span>
              <span className="font-mono font-black text-amber-400 bg-neutral-900 px-2 py-0.5 rounded-lg border border-neutral-800 text-xs">
                {tvCardWidth} px
              </span>
            </div>
            <input
              type="range"
              min="360"
              max="580"
              step="10"
              value={tvCardWidth}
              onChange={(e) => onSaveLayout(tvWheelSize, parseInt(e.target.value, 10), tvGap)}
              className="w-full accent-amber-500 cursor-pointer h-2 bg-neutral-800 rounded-lg appearance-none"
            />
          </div>

          <div className="flex flex-col gap-1.5 pt-1 border-t border-neutral-800/60">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-neutral-300">Felső Menüsáv & Ikonok Mérete:</span>
              <span className="font-mono font-black text-amber-400 bg-neutral-900 px-2 py-0.5 rounded-lg border border-neutral-800 text-xs">
                {tvHeaderScale}%
              </span>
            </div>
            <input
              type="range"
              min="85"
              max="150"
              step="5"
              value={tvHeaderScale}
              onChange={(e) => onSaveLayout(tvWheelSize, tvCardWidth, tvGap, parseInt(e.target.value, 10))}
              className="w-full accent-amber-500 cursor-pointer h-2 bg-neutral-800 rounded-lg appearance-none"
            />
            <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
              <span>Kicsi (85%)</span>
              <span className={tvHeaderScale === 100 ? "text-amber-400 font-bold" : ""}>Normál (100%)</span>
              <span className={tvHeaderScale === 125 ? "text-amber-400 font-bold" : ""}>Nagy TV (125%)</span>
              <span>Óriás (150%)</span>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-neutral-800">
          <button
            onClick={() => onSaveLayout(530, 470, 28, 100)}
            className="text-xs text-neutral-400 hover:text-amber-400 flex items-center gap-1.5 font-bold transition py-2 px-3 rounded-xl hover:bg-neutral-800/60"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Alaphelyzet</span>
          </button>

          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-neutral-950 font-black text-xs uppercase tracking-wider shadow-lg transition active:scale-95"
          >
            Kész (Mentés)
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
