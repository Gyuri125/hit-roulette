"use client";

import React, { useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { Track } from "../types/track";
import { Disc3, Calendar, Mic2, Music, Sparkles, Mic } from "lucide-react";

export type GuessTarget = "year" | "title" | "artist" | "all";

interface LyricLine {
  time: number; // másodpercben
  text: string;
}

// Szabványos LRC időzített dalszöveg feldolgozó ([mm:ss.xx] Szöveg)
const parseLrc = (lrcString: string): LyricLine[] => {
  if (!lrcString) return [];
  const lines = lrcString.split("\n");
  const result: LyricLine[] = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.?(\d{2,3})?\]/;

  lines.forEach((line) => {
    const match = timeRegex.exec(line);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const milliseconds = match[3] ? parseInt(match[3].padEnd(3, "0").slice(0, 3), 10) : 0;
      const totalSeconds = minutes * 60 + seconds + milliseconds / 1000;
      const text = line.replace(timeRegex, "").trim();
      if (text) {
        result.push({ time: totalSeconds, text });
      }
    } else if (line.trim()) {
      // Ha nincs időbélyeg (sima szöveg), fallbackként hozzáadjuk
      result.push({ time: -1, text: line.trim() });
    }
  });

  return result.sort((a, b) => a.time - b.time);
};

interface MusicCardProps {
  track: Track;
  isFlipped: boolean;
  onFlip: () => void;
  highlight?: GuessTarget;
  currentTime?: number; // Az éppen játszott audió másodperce
}

export const MusicCard: React.FC<MusicCardProps> = ({
  track,
  isFlipped,
  onFlip,
  highlight = "year",
  currentTime = 0,
}) => {
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null);
  const activeLineRef = useRef<HTMLParagraphElement | null>(null);

  // Dalszöveg feldolgozása
  const parsedLyrics = useMemo(() => {
    return parseLrc(track.lyrics || "");
  }, [track.lyrics]);

  // Aktív sor indexének kiszámítása az audio currentTime alapján
  const activeIndex = useMemo(() => {
    if (!parsedLyrics.length || parsedLyrics[0].time === -1) return -1;
    let idx = -1;
    for (let i = 0; i < parsedLyrics.length; i++) {
      if (currentTime >= parsedLyrics[i].time) {
        idx = i;
      } else {
        break;
      }
    }
    return idx;
  }, [parsedLyrics, currentTime]);

  // Apple Music automatikus finom görgetés a középpontba
  useEffect(() => {
    if (activeLineRef.current && isFlipped) {
      activeLineRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeIndex, isFlipped]);

  return (
    <div
      onClick={onFlip}
      className="relative w-72 sm:w-80 lg:w-88 min-h-[480px] sm:min-h-[530px] lg:min-h-[580px] cursor-pointer select-none perspective-[1200px]"
    >
      <motion.div
        className="w-full h-full relative"
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* ================= ELŐLAP (TIPPELŐS OLDAL) ================= */}
        <div
          className="absolute inset-0 w-full h-full rounded-[32px] bg-gradient-to-b from-neutral-900 via-neutral-900 to-neutral-950 border-2 border-neutral-800 p-5 sm:p-6 flex flex-col justify-between shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-md"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold uppercase tracking-wider text-[10px] sm:text-xs">
              Hitster Kártya
            </span>
            <span className="text-neutral-500">#{track.id}</span>
          </div>

          <div className="flex flex-col items-center justify-center gap-4 my-auto">
            <div className="relative w-32 h-32 sm:w-40 sm:h-40 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-amber-500/10 blur-xl animate-pulse" />
              <div className="relative w-full h-full rounded-full bg-neutral-950 border-4 border-neutral-800 flex items-center justify-center shadow-2xl">
                <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full border border-neutral-800 flex items-center justify-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                    <Disc3 className="w-6 h-6 sm:w-8 sm:h-8 text-amber-400 animate-[spin_8s_linear_infinite]" />
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center px-2">
              <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-white">
                Hallgasd meg a dalt!
              </h3>
              <p className="text-[11px] sm:text-xs text-neutral-400 mt-1">
                Kattints vagy nyomj Space-t a felfedéshez.
              </p>
            </div>
          </div>

          <div className="text-center text-[10px] uppercase font-bold tracking-widest text-neutral-600">
            Kattints a megfordításhoz ↷
          </div>
        </div>

        {/* ================= HÁTLAP (MEGOLDÁS + BORÍTÓ + APPLE MUSIC LYRICS) ================= */}
        <div
          className="absolute inset-0 w-full h-full rounded-[32px] bg-gradient-to-b from-neutral-900 via-neutral-900 to-neutral-950 border-2 border-amber-500/40 p-4 sm:p-5 flex flex-col justify-between shadow-[0_0_50px_rgba(245,158,11,0.2)] overflow-hidden"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          {/* Felső info sáv */}
          <div className="flex justify-between items-center text-xs pb-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Megoldás
            </span>
            <span className="text-[11px] font-mono text-neutral-500">#{track.id}</span>
          </div>

          {/* ALBUM BORÍTÓ */}
          <div className="relative w-full flex items-center justify-center my-0.5">
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-neutral-700 shadow-2xl bg-neutral-950 flex items-center justify-center">
              {track.coverUrl ? (
                <img
                  src={track.coverUrl}
                  alt={track.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-amber-600/40 via-rose-600/30 to-violet-600/40 flex flex-col items-center justify-center p-2 text-center">
                  <Disc3 className="w-8 h-8 text-amber-400 mb-1" />
                  <span className="text-[10px] font-black uppercase text-neutral-300 line-clamp-1">
                    {track.artist}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ADATOK & DINAMIKUS KIEMELÉSEK */}
          <div className="flex flex-col gap-1.5 text-center my-1">
            {/* 1. ÉVSZÁM */}
            <motion.div
              animate={highlight === "year" ? { scale: [1, 1.05, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
              className={`py-1 px-3 rounded-xl transition-all ${
                highlight === "year"
                  ? "bg-amber-500/20 border-2 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.4)]"
                  : "bg-neutral-950/60 border border-neutral-800"
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <Calendar className={`w-3.5 h-3.5 ${highlight === "year" ? "text-amber-400" : "text-neutral-500"}`} />
                <span className={`text-xl sm:text-2xl font-black tracking-tight ${highlight === "year" ? "text-amber-300" : "text-white"}`}>
                  {track.year}
                </span>
              </div>
            </motion.div>

            {/* 2. DAL CÍME */}
            <motion.div
              animate={highlight === "title" ? { scale: [1, 1.03, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
              className={`py-1 px-3 rounded-xl transition-all ${
                highlight === "title"
                  ? "bg-cyan-500/20 border-2 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                  : "bg-neutral-950/40 border border-neutral-800/60"
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <Music className={`w-3.5 h-3.5 ${highlight === "title" ? "text-cyan-400" : "text-neutral-500"}`} />
                <h4 className={`text-xs sm:text-sm font-black uppercase tracking-wide truncate ${highlight === "title" ? "text-cyan-300" : "text-white"}`}>
                  {track.title}
                </h4>
              </div>
            </motion.div>

            {/* 3. ELŐADÓ */}
            <motion.div
              animate={highlight === "artist" ? { scale: [1, 1.03, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
              className={`py-1 px-3 rounded-xl transition-all ${
                highlight === "artist"
                  ? "bg-rose-500/20 border-2 border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.4)]"
                  : "bg-neutral-950/40 border border-neutral-800/40"
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <Mic2 className={`w-3.5 h-3.5 ${highlight === "artist" ? "text-rose-400" : "text-neutral-500"}`} />
                <p className={`text-[11px] sm:text-xs font-bold uppercase truncate ${highlight === "artist" ? "text-rose-300" : "text-neutral-400"}`}>
                  {track.artist}
                </p>
              </div>
            </motion.div>
          </div>

          {/* ================= APPLE MUSIC VIBE DALSZÖVEG SZEKCIÓ ================= */}
          {track.lyrics && (
            <div className="relative w-full bg-neutral-950/90 border border-neutral-800/90 rounded-2xl p-2.5 my-1 shadow-inner overflow-hidden">
              <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-amber-400 mb-1.5 px-1">
                <span className="flex items-center gap-1">
                  <Mic className="w-3 h-3 text-amber-400" /> Karaoke / Dalszöveg
                </span>
                <span className="text-neutral-500 font-mono text-[8px]">Apple Music Sync</span>
              </div>

              {/* Fentről-lentről sötétedő maszkolt görgetősáv */}
              <div
                ref={lyricsContainerRef}
                className="w-full max-h-24 sm:max-h-28 overflow-y-auto flex flex-col gap-2 py-3 px-1 scrollbar-none [mask-image:linear-gradient(to_bottom,transparent_0%,black_15%,black_85%,transparent_100%)]"
              >
                {parsedLyrics.length > 0 ? (
                  parsedLyrics.map((line, idx) => {
                    const isActive = idx === activeIndex;
                    return (
                      <p
                        key={idx}
                        ref={isActive ? activeLineRef : null}
                        className={`text-center transition-all duration-300 font-bold leading-relaxed ${
                          isActive
                            ? "text-amber-300 text-xs sm:text-sm font-black scale-105 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)] opacity-100"
                            : "text-neutral-500 text-[11px] sm:text-xs opacity-35 blur-[0.3px]"
                        }`}
                      >
                        {line.text}
                      </p>
                    );
                  })
                ) : (
                  <p className="text-xs text-neutral-300 italic text-center leading-relaxed">
                    "{track.lyrics}"
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="text-center text-[10px] text-neutral-600 font-bold uppercase tracking-wider pt-0.5">
            Kattints az elrejtéshez
          </div>
        </div>
      </motion.div>
    </div>
  );
};