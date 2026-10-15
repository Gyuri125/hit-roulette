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
  isPlaying?: boolean;
  accentColor?: string;
}

export const MusicCard: React.FC<MusicCardProps> = ({
  track,
  isFlipped,
  onFlip,
  highlight = "year",
  currentTime = 0,
  onSeek,
  isPlaying = false,
  accentColor = "#f59e0b",
}) => {
  const [showFrontLyrics, setShowFrontLyrics] = useState(true);
  const [eqBars, setEqBars] = useState<number[]>(Array(20).fill(15));

  // 3D Holografikus Tilt & Glare állapotok
  const [tilt, setTilt] = useState<{ rx: number; ry: number; gx: number; gy: number; active: boolean }>({
    rx: 0,
    ry: 0,
    gx: 50,
    gy: 50,
    active: false,
  });

  const frontContainerRef = useRef<HTMLDivElement | null>(null);
  const backContainerRef = useRef<HTMLDivElement | null>(null);
  const frontLyricsRef = useRef<HTMLParagraphElement | null>(null);
  const backLyricsRef = useRef<HTMLParagraphElement | null>(null);

  // Kártyán belüli Neon Audio Visualizer animáció
  useEffect(() => {
    if (!isPlaying) {
      setEqBars(Array(20).fill(12));
      return;
    }
    const interval = setInterval(() => {
      setEqBars(
        Array.from({ length: 20 }, (_, i) => {
          const centerWeight = 1 - Math.abs(i - 9.5) / 11;
          return Math.max(15, Math.min(100, Math.floor((Math.random() * 75 + 25) * centerWeight)));
        })
      );
    }, 110);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const parsedLyrics = useMemo(() => {
    return parseLrc(track.lyrics || "");
  }, [track.lyrics]);

  const isSynced = useMemo(() => {
    return parsedLyrics.some((l) => l.time >= 0);
  }, [parsedLyrics]);

  const activeIndex = useMemo(() => {
    if (!isSynced || !parsedLyrics.length) return -1;
    let idx = -1;
    for (let i = 0; i < parsedLyrics.length; i++) {
      if (currentTime >= parsedLyrics[i].time) {
        idx = i;
      } else {
        break;
      }
    }
    return idx;
  }, [parsedLyrics, currentTime, isSynced]);

  // Dalváltáskor a görgetés azonnal visszaugrik a legtetejére
  useEffect(() => {
    if (frontContainerRef.current) {
      frontContainerRef.current.scrollTop = 0;
    }
    if (backContainerRef.current) {
      backContainerRef.current.scrollTop = 0;
    }
  }, [track.id]);

  // Aktív sor középre görgetése
  useEffect(() => {
    if (!isSynced) return;
    const container = isFlipped ? backContainerRef.current : frontContainerRef.current;
    const target = isFlipped ? backLyricsRef.current : frontLyricsRef.current;

    if (!container) return;

    if (activeIndex <= 0) {
      container.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (target) {
      const targetTop = target.offsetTop - container.offsetTop;
      const centerOffset = targetTop - container.clientHeight / 2 + target.clientHeight / 2;
      container.scrollTo({ top: Math.max(0, centerOffset), behavior: "smooth" });
    }
  }, [activeIndex, isFlipped, showFrontLyrics, isSynced]);

  // 3D egérkövető kalkuláció
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const px = x / rect.width;
    const py = y / rect.height;

    const rx = (0.5 - py) * 16; // Függőleges billenés (-8° .. +8°)
    const ry = (px - 0.5) * 16; // Vízszintes billenés (-8° .. +8°)

    setTilt({
      rx,
      ry,
      gx: Math.round(px * 100),
      gy: Math.round(py * 100),
      active: true,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ rx: 0, ry: 0, gx: 50, gy: 50, active: false });
  };

  return (
    <div
      onClick={onFlip}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-[310px] sm:w-[370px] h-[510px] sm:h-[580px] cursor-pointer select-none perspective-[1400px]"
    >
      {/* Basszusra lüktető neon aura a kártya mögött */}
      {isPlaying && (
        <div
          className="absolute -inset-3 rounded-[42px] blur-2xl opacity-35 transition-all duration-300 pointer-events-none animate-pulse"
          style={{ backgroundColor: accentColor }}
        />
      )}

      {/* KÜLSŐ 3D HOLOGRAFIKUS DŐLÉS (TILT) KERET */}
      <motion.div
        className="w-full h-full relative"
        animate={{
          rotateX: tilt.active ? tilt.rx : isPlaying ? [0, 2, 0, -2, 0] : 0,
          rotateY: tilt.active ? tilt.ry : isPlaying ? [0, -2.5, 0, 2.5, 0] : 0,
          y: isPlaying && !tilt.active ? [0, -4, 0] : 0,
        }}
        transition={
          tilt.active
            ? { type: "spring", stiffness: 300, damping: 22 }
            : { duration: 5, repeat: Infinity, ease: "easeInOut" }
        }
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* BELSŐ 180°-OS KÁRTYAFORDÍTÓ (FLIP) KERET */}
        <motion.div
          className="w-full h-full relative"
          initial={false}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* ===================== ELŐLAP =========================== */}
          <div
            className="absolute inset-0 w-full h-full rounded-[34px] bg-gradient-to-b from-neutral-900 via-neutral-950 to-neutral-950 border-2 p-5 flex flex-col justify-between shadow-[0_25px_60px_rgba(0,0,0,0.85)] backdrop-blur-xl overflow-hidden transition-colors duration-500"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              borderColor: isPlaying ? `${accentColor}80` : "#262626",
              boxShadow: isPlaying ? `0 0 35px ${accentColor}25` : undefined,
            }}
          >
            {/* ✨ HOLOGRAFIKUS PRÉMIUM "FOIL" CSILLOGÁS RÉTEG */}
            <div
              className="pointer-events-none absolute inset-0 rounded-[34px] transition-opacity duration-300 z-20"
              style={{
                opacity: tilt.active ? 0.32 : isPlaying ? 0.16 : 0.06,
                background: `
                  radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,255,255,0.55) 0%, transparent 50%),
                  linear-gradient(125deg, transparent 20%, rgba(245,158,11,0.22) 36%, rgba(236,72,153,0.22) 48%, rgba(6,182,212,0.22) 60%, transparent 80%)
                `,
                mixBlendMode: "screen",
              }}
            />

            <div className="flex justify-between items-center z-10">
              <div className="flex items-center gap-2">
                <span
                  className="px-3 py-1 rounded-full border font-extrabold uppercase tracking-wider text-[11px]"
                  style={{
                    backgroundColor: `${accentColor}15`,
                    borderColor: `${accentColor}40`,
                    color: accentColor,
                  }}
                >
                  Hitster Kártya
                </span>
              </div>

              {track.lyrics && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowFrontLyrics((prev) => !prev);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold transition shadow-sm z-30 ${
                    showFrontLyrics
                      ? "bg-amber-500/20 border-amber-400/50 text-amber-300"
                      : "bg-neutral-800/80 border-neutral-700 text-neutral-400 hover:text-white"
                  }`}
                  title="Dalszöveg elrejtése vagy megjelenítése (Bakelit lemezjátszó nézet)"
                >
                  {showFrontLyrics ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  <span>Szöveg: {showFrontLyrics ? "BE" : "KI"}</span>
                </button>
              )}
            </div>

            <div className="flex flex-col items-center justify-center my-auto w-full gap-2.5 z-10">
              {showFrontLyrics && track.lyrics ? (
                <div className="w-full flex flex-col items-center">
                  <div className="flex items-center gap-2 mb-2 text-neutral-400">
                    <Disc3
                      className={`w-4 h-4 ${isPlaying ? "animate-[spin_4s_linear_infinite]" : ""}`}
                      style={{ color: accentColor }}
                    />
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                      {isSynced ? "Énekelj velünk! (Kattints a sorra)" : "Dalszöveg (Olvasó mód)"}
                    </span>
                  </div>

                  <div
                    ref={frontContainerRef}
                    className="w-full h-56 sm:h-68 bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-4 overflow-y-auto scrollbar-none [mask-image:linear-gradient(to_bottom,transparent_0%,black_12%,black_88%,transparent_100%)] flex flex-col gap-3 py-6"
                  >
                    {parsedLyrics.map((line, idx) => {
                      const isActive = isSynced && idx === activeIndex;
                      return (
                        <p
                          key={idx}
                          ref={isActive ? frontLyricsRef : null}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (line.time >= 0 && onSeek) onSeek(line.time);
                          }}
                          className={`text-center transition-all duration-300 font-bold leading-relaxed ${
                            isActive
                              ? "text-amber-300 text-sm sm:text-base font-black scale-105 drop-shadow-[0_0_12px_rgba(251,191,36,0.9)] opacity-100 cursor-pointer"
                              : isSynced
                              ? "text-neutral-500 text-xs sm:text-sm opacity-40 hover:opacity-100 cursor-pointer"
                              : "text-neutral-200 text-xs sm:text-sm opacity-90"
                          }`}
                        >
                          {line.text}
                        </p>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* 💿 BAKELIT LEMEZJÁTSZÓ & FIZIKAILAG MOZGÓ LEMEZJÁTSZÓ-KAR (TONEARM) */
                <div className="flex flex-col items-center gap-5 py-4 w-full">
                  <div className="relative w-48 h-48 sm:w-52 sm:h-52 flex items-center justify-center">
                    {/* Háttérfény a lemez alatt */}
                    <div
                      className="absolute inset-2 rounded-full blur-2xl transition-opacity duration-500"
                      style={{
                        backgroundColor: accentColor,
                        opacity: isPlaying ? 0.35 : 0.12,
                      }}
                    />

                    {/* Lemezjátszó alaplap keret */}
                    <div className="relative w-44 h-44 sm:w-48 sm:h-48 rounded-full bg-neutral-950 border-4 border-neutral-800/90 flex items-center justify-center shadow-[0_15px_35px_rgba(0,0,0,0.9)]">
                      {/* Forgó bakelitlemez valósághű barázdákkal és fénytöréssel */}
                      <motion.div
                        animate={isPlaying ? { rotate: 360 } : {}}
                        transition={isPlaying ? { repeat: Infinity, duration: 3.5, ease: "linear" } : {}}
                        className="relative w-40 h-40 sm:w-44 sm:h-44 rounded-full flex items-center justify-center overflow-hidden shadow-inner"
                        style={{
                          background: `
                            conic-gradient(from 40deg, transparent 0deg, rgba(255,255,255,0.08) 45deg, transparent 90deg, transparent 180deg, rgba(255,255,255,0.08) 225deg, transparent 270deg),
                            repeating-radial-gradient(circle at center, #0a0a0a 0px, #0a0a0a 2px, #171717 3px, #0a0a0a 4px)
                          `,
                        }}
                      >
                        {/* Középső színes bakelit címke */}
                        <div
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 flex items-center justify-center shadow-md relative"
                          style={{
                            background: `radial-gradient(circle, ${accentColor} 0%, #171717 95%)`,
                            borderColor: `${accentColor}90`,
                          }}
                        >
                          <div className="w-3.5 h-3.5 rounded-full bg-neutral-950 border border-neutral-700" />
                        </div>
                      </motion.div>
                    </div>

                    {/* 🎚️ ANIMÁLT LEMEZJÁTSZÓ-KAR (TONEARM) */}
                    <div className="absolute -top-2 -right-3 w-28 h-44 pointer-events-none z-20">
                      {/* Kar forgáspont (Pivot bázis) */}
                      <div className="absolute top-2 right-2 w-9 h-9 rounded-full bg-neutral-800 border-2 border-neutral-600 shadow-lg flex items-center justify-center">
                        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-neutral-300 to-neutral-500 shadow-inner" />
                      </div>

                      {/* Mozgó kar elem */}
                      <motion.div
                        initial={false}
                        animate={{ rotate: isPlaying ? 26 : -6 }}
                        transition={{ type: "spring", stiffness: 75, damping: 14 }}
                        style={{ transformOrigin: "calc(100% - 24px) 24px" }}
                        className="w-full h-full relative"
                      >
                        <svg viewBox="0 0 110 170" className="w-full h-full overflow-visible drop-shadow-[0_6px_8px_rgba(0,0,0,0.85)]">
                          {/* Ellensúly a kar tetején */}
                          <rect x="78" y="4" width="16" height="12" rx="3" fill="#525252" stroke="#262626" strokeWidth="1.5" />
                          {/* Fém csőkar */}
                          <path
                            d="M 86 24 L 86 88 Q 86 110 68 128 L 52 144"
                            fill="none"
                            stroke="#d4d4d4"
                            strokeWidth="4"
                            strokeLinecap="round"
                          />
                          {/* Hangszedő fej (Headshell) */}
                          <g transform="translate(46, 142) rotate(42)">
                            <rect x="-6" y="-4" width="12" height="18" rx="2" fill="#171717" stroke={accentColor} strokeWidth="1.5" />
                            <rect x="-2" y="14" width="4" height="3" fill={accentColor} />
                          </g>
                        </svg>

                        {/* Világító tűfény, amikor a lemezen van */}
                        {isPlaying && (
                          <div
                            className="absolute bottom-5 left-9 w-3 h-3 rounded-full blur-[4px] animate-pulse"
                            style={{ backgroundColor: accentColor }}
                          />
                        )}
                      </motion.div>
                    </div>
                  </div>

                  <div className="text-center px-4">
                    <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-white">
                      {isPlaying ? "Forog a bakelit!" : "Zene megállítva"}
                    </h3>
                    <p className="text-xs text-neutral-400 mt-1">
                      Kattints a kártyára vagy nyomj Space-t a felfedéshez.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* KÁRTYA ALJA: NEON SPEKTRUM ANALIZÁTOR SÁV */}
            <div className="w-full flex flex-col items-center gap-1.5 z-10">
              <div className="w-full h-7 flex items-end justify-center gap-1 px-2">
                {eqBars.map((height, idx) => (
                  <div
                    key={idx}
                    className="flex-1 rounded-t-full transition-all duration-100"
                    style={{
                      height: `${isPlaying ? height : 12}%`,
                      backgroundColor: accentColor,
                      opacity: isPlaying ? 0.85 : 0.2,
                      boxShadow: isPlaying ? `0 0 8px ${accentColor}` : "none",
                    }}
                  />
                ))}
              </div>
              <div className="text-center text-[10px] uppercase font-extrabold tracking-widest text-neutral-500">
                Kattints vagy nyomj Space-t a felfedéshez ↷
              </div>
            </div>
          </div>

          {/* ================= HÁTLAP =========================== */}
          <div
            className="absolute inset-0 w-full h-full rounded-[34px] bg-gradient-to-b from-neutral-900 via-neutral-950 to-neutral-950 border-2 border-amber-500/50 p-5 flex flex-col justify-between shadow-[0_0_60px_rgba(245,158,11,0.25)] overflow-hidden"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            {/* ✨ HOLOGRAFIKUS PRÉMIUM "FOIL" CSILLOGÁS A HÁTLAPON IS */}
            <div
              className="pointer-events-none absolute inset-0 rounded-[34px] transition-opacity duration-300 z-20"
              style={{
                opacity: tilt.active ? 0.28 : 0.1,
                background: `
                  radial-gradient(circle at ${100 - tilt.gx}% ${tilt.gy}%, rgba(255,255,255,0.45) 0%, transparent 50%),
                  linear-gradient(135deg, transparent 25%, rgba(251,191,36,0.2) 45%, rgba(236,72,153,0.2) 55%, transparent 75%)
                `,
                mixBlendMode: "screen",
              }}
            />

            <div className="flex justify-between items-center text-xs pb-1 border-b border-neutral-800/80 z-10">
              <span className="text-[11px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Megoldás
              </span>
              <span className="text-[10px] font-mono text-neutral-500 truncate max-w-[140px]">#{track.id}</span>
            </div>

            <div className="flex flex-col items-center gap-2 my-auto w-full z-10">
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-neutral-700 shadow-2xl bg-neutral-950 flex items-center justify-center shrink-0">
                {track.coverUrl ? (
                  <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-amber-600/30 to-violet-600/30 flex flex-col items-center justify-center p-2 text-center">
                    <Disc3 className="w-9 h-9 text-amber-400 mb-1" />
                    <span className="text-[9px] font-bold uppercase text-neutral-400 line-clamp-1">{track.artist}</span>
                  </div>
                )}
              </div>

              <div className="w-full flex flex-col gap-1.5 text-center">
                <motion.div
                  animate={highlight === "year" || highlight === "all" ? { scale: [1, 1.03, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className={`py-1 px-4 rounded-2xl transition-all ${
                    highlight === "year" || highlight === "all"
                      ? "bg-amber-500/20 border-2 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.3)]"
                      : "bg-neutral-900/80 border border-neutral-800"
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Calendar className={`w-4 h-4 ${highlight === "year" || highlight === "all" ? "text-amber-400" : "text-neutral-500"}`} />
                    <span className={`text-2xl sm:text-3xl font-black tracking-tight ${highlight === "year" || highlight === "all" ? "text-amber-300" : "text-white"}`}>
                      {track.year}
                    </span>
                  </div>
                </motion.div>

                <motion.div
                  animate={highlight === "title" || highlight === "all" ? { scale: [1, 1.02, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className={`py-1 px-3 rounded-xl transition-all ${
                    highlight === "title" || highlight === "all"
                      ? "bg-emerald-500/20 border-2 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                      : "bg-neutral-900/50 border border-neutral-800/80"
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <Music className={`w-3.5 h-3.5 shrink-0 ${highlight === "title" || highlight === "all" ? "text-emerald-400" : "text-neutral-500"}`} />
                    <h4 className={`text-xs sm:text-sm font-extrabold uppercase tracking-wide truncate ${highlight === "title" || highlight === "all" ? "text-emerald-300" : "text-white"}`}>
                      {track.title}
                    </h4>
                  </div>
                </motion.div>

                <motion.div
                  animate={highlight === "artist" || highlight === "all" ? { scale: [1, 1.02, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className={`py-1 px-3 rounded-xl transition-all ${
                    highlight === "artist" || highlight === "all"
                      ? "bg-rose-500/20 border-2 border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                      : "bg-neutral-900/50 border border-neutral-800/80"
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <Mic2 className={`w-3.5 h-3.5 shrink-0 ${highlight === "artist" || highlight === "all" ? "text-rose-400" : "text-neutral-500"}`} />
                    <p className={`text-xs font-bold uppercase truncate ${highlight === "artist" || highlight === "all" ? "text-rose-300" : "text-neutral-300"}`}>
                      {track.artist}
                    </p>
                  </div>
                </motion.div>
              </div>

              {track.lyrics && (
                <div className="w-full bg-neutral-900/80 border border-neutral-800 rounded-2xl p-2 shadow-inner overflow-hidden">
                  <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-amber-400 mb-1 px-1">
                    <span className="flex items-center gap-1">
                      <Mic className="w-3 h-3 text-amber-400" /> Karaoke
                    </span>
                    <span className="text-neutral-500 font-mono text-[8px]">
                      {isSynced ? "Sync" : "Olvasó mód"}
                    </span>
                  </div>

                  <div
                    ref={backContainerRef}
                    className="w-full h-16 sm:h-20 overflow-y-auto flex flex-col gap-1.5 py-1.5 px-1 scrollbar-none [mask-image:linear-gradient(to_bottom,transparent_0%,black_20%,black_80%,transparent_100%)]"
                  >
                    {parsedLyrics.map((line, idx) => {
                      const isActive = isSynced && idx === activeIndex;
                      return (
                        <p
                          key={idx}
                          ref={isActive ? backLyricsRef : null}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (line.time >= 0 && onSeek) onSeek(line.time);
                          }}
                          className={`text-center transition-all duration-300 font-bold leading-tight ${
                            isActive
                              ? "text-amber-300 text-xs font-black scale-105 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)] opacity-100 cursor-pointer"
                              : isSynced
                              ? "text-neutral-500 text-[11px] opacity-40 hover:opacity-80 cursor-pointer"
                              : "text-neutral-200 text-[11px] opacity-90"
                          }`}
                        >
                          {line.text}
                        </p>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="text-center text-[10px] text-neutral-500 font-extrabold uppercase tracking-wider pt-0.5 z-10">
              Kattints a visszazáráshoz ↷
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};