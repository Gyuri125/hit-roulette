"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { Track } from "../types/track";
import { Disc3, Calendar, Mic2, Music, Sparkles, Mic, Eye, EyeOff } from "lucide-react";

export type GuessTarget = "year" | "title" | "artist" | "all";

interface LyricLine {
  time: number;
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
  currentTime?: number;
  onSeek?: (time: number) => void;
}

export const MusicCard: React.FC<MusicCardProps> = ({
  track,
  isFlipped,
  onFlip,
  highlight = "year",
  currentTime = 0,
  onSeek,
}) => {
  const [showFrontLyrics, setShowFrontLyrics] = useState(true);

  // Zárt belső konténerek és cél-sorok referenciái
  const frontContainerRef = useRef<HTMLDivElement | null>(null);
  const backContainerRef = useRef<HTMLDivElement | null>(null);
  const frontLyricsRef = useRef<HTMLParagraphElement | null>(null);
  const backLyricsRef = useRef<HTMLParagraphElement | null>(null);

  const parsedLyrics = useMemo(() => {
    return parseLrc(track.lyrics || "");
  }, [track.lyrics]);

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

  // Kizárólag a belső dobozt görgeti simán, a böngésző ablakát soha nem rántja le
  useEffect(() => {
    const container = isFlipped ? backContainerRef.current : frontContainerRef.current;
    const target = isFlipped ? backLyricsRef.current : frontLyricsRef.current;

    if (container && target) {
      const targetTop = target.offsetTop - container.offsetTop;
      const centerOffset = targetTop - container.clientHeight / 2 + target.clientHeight / 2;
      container.scrollTo({ top: centerOffset, behavior: "smooth" });
    }
  }, [activeIndex, isFlipped, showFrontLyrics]);

  return (
    <div
      onClick={onFlip}
      className="relative w-80 sm:w-[380px] h-[580px] sm:h-[620px] cursor-pointer select-none perspective-[1400px]"
    >
      <motion.div
        className="w-full h-full relative"
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* ===================== ELŐLAP (TIPPELŐS OLDAL) =========================== */}
        <div
          className="absolute inset-0 w-full h-full rounded-[36px] bg-gradient-to-b from-neutral-900 via-neutral-950 to-neutral-950 border-2 border-neutral-800 p-5 flex flex-col justify-between shadow-[0_25px_60px_rgba(0,0,0,0.85)] backdrop-blur-xl overflow-hidden"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
        >
          {/* Felső sáv: Címke + Dalszöveg Ki/Be kapcsoló */}
          <div className="flex justify-between items-center z-10">
            <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-extrabold uppercase tracking-wider text-[11px]">
              Hitster Kártya
            </span>

            {track.lyrics && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFrontLyrics((prev) => !prev);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold transition shadow-sm ${
                  showFrontLyrics
                    ? "bg-amber-500/20 border-amber-400/50 text-amber-300"
                    : "bg-neutral-800/80 border-neutral-700 text-neutral-400 hover:text-white"
                }`}
                title="Dalszöveg elrejtése vagy megjelenítése tippelés közben"
              >
                {showFrontLyrics ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                <span>Dalszöveg: {showFrontLyrics ? "BE" : "KI"}</span>
              </button>
            )}
          </div>

          {/* KÖZÉPSŐ RÉSZ: Dinamikus nézet (Bakelit VAGY Élő Karaoke) */}
          <div className="flex flex-col items-center justify-center my-auto w-full gap-3">
            {showFrontLyrics && track.lyrics ? (
              <div className="w-full flex flex-col items-center">
                <div className="flex items-center gap-2 mb-2 text-neutral-400">
                  <Disc3 className="w-4 h-4 text-amber-400 animate-[spin_6s_linear_infinite]" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                    Énekelj velünk! (Kattints sorra az odaugráshoz)
                  </span>
                </div>

                {/* Zárt görgetősáv - nem mozdítja el a képernyőt */}
                <div
                  ref={frontContainerRef}
                  className="w-full h-64 sm:h-72 bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-4 overflow-y-auto scrollbar-none [mask-image:linear-gradient(to_bottom,transparent_0%,black_15%,black_85%,transparent_100%)] flex flex-col gap-3.5 py-6"
                >
                  {parsedLyrics.map((line, idx) => {
                    const isActive = idx === activeIndex;
                    return (
                      <p
                        key={idx}
                        ref={isActive ? frontLyricsRef : null}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (line.time >= 0 && onSeek) onSeek(line.time);
                        }}
                        className={`text-center cursor-pointer transition-all duration-300 font-bold leading-relaxed hover:opacity-100 ${
                          isActive
                            ? "text-amber-300 text-sm sm:text-base font-black scale-105 drop-shadow-[0_0_12px_rgba(251,191,36,0.9)] opacity-100"
                            : "text-neutral-500 text-xs sm:text-sm opacity-35 blur-[0.2px] hover:blur-none"
                        }`}
                      >
                        {line.text}
                      </p>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="relative w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-amber-500/10 blur-2xl animate-pulse" />
                  <div className="relative w-full h-full rounded-full bg-neutral-950 border-4 border-neutral-800 flex items-center justify-center shadow-2xl">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border border-neutral-800 flex items-center justify-center">
                      <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                        <Disc3 className="w-7 h-7 sm:w-9 sm:h-9 text-amber-400 animate-[spin_8s_linear_infinite]" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center px-4">
                  <h3 className="text-lg sm:text-xl font-black uppercase tracking-wider text-white">
                    Hallgasd meg a dalt!
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    Kattints a kártyára a megoldás felfedéséhez.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="text-center text-[10px] uppercase font-extrabold tracking-widest text-neutral-500 pt-1">
            Kattints vagy nyomj Space-t a felfedéshez ↷
          </div>
        </div>

        {/* ================= HÁTLAP (NAGY MEGOLDÁS + BORÍTÓ + LYRICS) ================ */}
        <div
          className="absolute inset-0 w-full h-full rounded-[36px] bg-gradient-to-b from-neutral-900 via-neutral-950 to-neutral-950 border-2 border-amber-500/50 p-5 flex flex-col justify-between shadow-[0_0_60px_rgba(245,158,11,0.25)] overflow-hidden"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          {/* Felső információs csík */}
          <div className="flex justify-between items-center text-xs pb-1 border-b border-neutral-800/80">
            <span className="text-[11px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> Eredmény & Megoldás
            </span>
            <span className="text-[11px] font-mono text-neutral-500">#{track.id}</span>
          </div>

          {/* KÖZÉP: BORÍTÓKÉP ÉS NAGY ADATOK */}
          <div className="flex flex-col items-center gap-2.5 my-auto w-full">
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-2 border-neutral-700 shadow-2xl bg-neutral-950 flex items-center justify-center shrink-0">
              {track.coverUrl ? (
                <img
                  src={track.coverUrl}
                  alt={track.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-amber-600/30 to-violet-600/30 flex flex-col items-center justify-center p-2 text-center">
                  <Disc3 className="w-10 h-10 text-amber-400 mb-1" />
                  <span className="text-[10px] font-bold uppercase text-neutral-400 line-clamp-1">
                    {track.artist}
                  </span>
                </div>
              )}
            </div>

            <div className="w-full flex flex-col gap-1.5 text-center">
              {/* 1. ÉVSZÁM */}
              <motion.div
                animate={highlight === "year" ? { scale: [1, 1.04, 1] } : {}}
                transition={{ repeat: Infinity, duration: 2 }}
                className={`py-1.5 px-4 rounded-2xl transition-all ${
                  highlight === "year"
                    ? "bg-amber-500/20 border-2 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.35)]"
                    : "bg-neutral-900/80 border border-neutral-800"
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Calendar className={`w-4 h-4 ${highlight === "year" ? "text-amber-400" : "text-neutral-500"}`} />
                  <span className={`text-2xl sm:text-3xl font-black tracking-tight ${highlight === "year" ? "text-amber-300" : "text-white"}`}>
                    {track.year}
                  </span>
                </div>
              </motion.div>

              {/* 2. DAL CÍME */}
              <motion.div
                animate={highlight === "title" ? { scale: [1, 1.02, 1] } : {}}
                transition={{ repeat: Infinity, duration: 2 }}
                className={`py-1 px-3 rounded-xl transition-all ${
                  highlight === "title"
                    ? "bg-cyan-500/20 border-2 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.35)]"
                    : "bg-neutral-900/50 border border-neutral-800/80"
                }`}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <Music className={`w-3.5 h-3.5 ${highlight === "title" ? "text-cyan-400" : "text-neutral-500"}`} />
                  <h4 className={`text-sm sm:text-base font-extrabold uppercase tracking-wide truncate ${highlight === "title" ? "text-cyan-300" : "text-white"}`}>
                    {track.title}
                  </h4>
                </div>
              </motion.div>

              {/* 3. ELŐADÓ */}
              <motion.div
                animate={highlight === "artist" ? { scale: [1, 1.02, 1] } : {}}
                transition={{ repeat: Infinity, duration: 2 }}
                className={`py-1 px-3 rounded-xl transition-all ${
                  highlight === "artist"
                    ? "bg-rose-500/20 border-2 border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.35)]"
                    : "bg-neutral-900/50 border border-neutral-800/80"
                }`}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <Mic2 className={`w-3.5 h-3.5 ${highlight === "artist" ? "text-rose-400" : "text-neutral-500"}`} />
                  <p className={`text-xs sm:text-sm font-bold uppercase truncate ${highlight === "artist" ? "text-rose-300" : "text-neutral-300"}`}>
                    {track.artist}
                  </p>
                </div>
              </motion.div>
            </div>

            {/* DALSZÖVEG SING-ALONG SZEKCIÓ A HÁTLAPON */}
            {track.lyrics && (
              <div className="w-full bg-neutral-900/80 border border-neutral-800 rounded-2xl p-2.5 shadow-inner overflow-hidden">
                <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-amber-400 mb-1 px-1">
                  <span className="flex items-center gap-1">
                    <Mic className="w-3 h-3 text-amber-400" /> Karaoke / Dalszöveg
                  </span>
                  <span className="text-neutral-500 font-mono text-[8px]">Sync</span>
                </div>

                <div
                  ref={backContainerRef}
                  className="w-full h-20 sm:h-24 overflow-y-auto flex flex-col gap-2 py-2 px-1 scrollbar-none [mask-image:linear-gradient(to_bottom,transparent_0%,black_20%,black_80%,transparent_100%)]"
                >
                  {parsedLyrics.length > 0 ? (
                    parsedLyrics.map((line, idx) => {
                      const isActive = idx === activeIndex;
                      return (
                        <p
                          key={idx}
                          ref={isActive ? backLyricsRef : null}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (line.time >= 0 && onSeek) onSeek(line.time);
                          }}
                          className={`text-center cursor-pointer transition-all duration-300 font-bold leading-tight hover:opacity-100 ${
                            isActive
                              ? "text-amber-300 text-xs sm:text-sm font-black scale-105 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)] opacity-100"
                              : "text-neutral-500 text-[11px] opacity-35 hover:opacity-80"
                          }`}
                        >
                          {line.text}
                        </p>
                      );
                    })
                  ) : (
                    <p className="text-xs text-neutral-300 italic text-center">
                      "{track.lyrics}"
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="text-center text-[10px] text-neutral-500 font-extrabold uppercase tracking-wider pt-0.5">
            Kattints a kártyára a visszazáráshoz ↷
          </div>
        </div>
      </motion.div>
    </div>
  );
};