"use client";

import React from "react";
import { motion } from "framer-motion";
import { Track } from "../types/track";
import { Disc3, Calendar, Mic2, Music, Sparkles } from "lucide-react";

export type GuessTarget = "year" | "title" | "artist" | "all";

interface MusicCardProps {
  track: Track;
  isFlipped: boolean;
  onFlip: () => void;
  highlight?: GuessTarget;
}

export const MusicCard: React.FC<MusicCardProps> = ({
  track,
  isFlipped,
  onFlip,
  highlight = "year",
}) => {
  return (
    <div
      onClick={onFlip}
      className="relative w-72 sm:w-80 h-[430px] cursor-pointer select-none perspective-[1200px]"
    >
      <motion.div
        className="w-full h-full relative"
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* ================= ELŐLAP (KÉRDŐJEL / TIPPELŐS OLDAL) ================= */}
        <div
          className="absolute inset-0 w-full h-full rounded-[32px] bg-gradient-to-b from-neutral-900 via-neutral-900 to-neutral-950 border-2 border-neutral-800 p-6 flex flex-col justify-between shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-md"
          style={{ backfaceVisibility: "hidden" }}
        >
          {/* Felső kis léc */}
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold uppercase tracking-wider">
              Hitster Kártya
            </span>
            <span className="text-neutral-500">#{track.id}</span>
          </div>

          {/* Középső bakelit korong animációval */}
          <div className="flex flex-col items-center justify-center gap-4 my-auto">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-amber-500/10 blur-xl animate-pulse" />
              <div className="relative w-full h-full rounded-full bg-neutral-950 border-4 border-neutral-800 flex items-center justify-center shadow-2xl">
                <div className="w-24 h-24 rounded-full border border-neutral-800 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                    <Disc3 className="w-8 h-8 text-amber-400 animate-[spin_8s_linear_infinite]" />
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <h3 className="text-lg font-black uppercase tracking-wider text-white">
                Hallgasd meg a dalt!
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                Kattints a kártyára vagy nyomj Space-t a felfedéshez.
              </p>
            </div>
          </div>

          {/* Alsó jelzés */}
          <div className="text-center text-[10px] uppercase font-bold tracking-widest text-neutral-600">
            Kattints a megfordításhoz ↷
          </div>
        </div>

        {/* ================= HÁTLAP (MEGOLDÁS + ALBUM BORÍTÓ) ================= */}
        <div
          className="absolute inset-0 w-full h-full rounded-[32px] bg-gradient-to-b from-neutral-900 via-neutral-900 to-neutral-950 border-2 border-amber-500/40 p-5 flex flex-col justify-between shadow-[0_0_50px_rgba(245,158,11,0.2)]"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          {/* Felső info sáv */}
          <div className="flex justify-between items-center text-xs">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Megoldás
            </span>
            <span className="text-[11px] font-mono text-neutral-500">#{track.id}</span>
          </div>

          {/* ALBUM BORÍTÓKÉP + KICSÚSZÓ BAKELIT */}
          <div className="relative w-full flex items-center justify-center my-1">
            <div className="relative w-36 h-36 rounded-2xl overflow-hidden border-2 border-neutral-700 shadow-2xl bg-neutral-950 flex items-center justify-center group">
              {track.coverUrl ? (
                <img
                  src={track.coverUrl}
                  alt={track.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                /* Fallback stilizált borító, ha nincs még kép a dalhoz */
                <div className="w-full h-full bg-gradient-to-tr from-amber-600/40 via-rose-600/30 to-violet-600/40 flex flex-col items-center justify-center p-2 text-center">
                  <Disc3 className="w-12 h-12 text-amber-400 mb-1" />
                  <span className="text-[10px] font-black uppercase text-neutral-300 line-clamp-1">
                    {track.artist}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ADATOK & DINAMIKUS KIEMELÉSEK */}
          <div className="flex flex-col gap-2.5 text-center">
            {/* 1. ÉVSZÁM KIEMELÉS */}
            <motion.div
              animate={highlight === "year" ? { scale: [1, 1.06, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
              className={`py-1.5 px-3 rounded-2xl transition-all ${
                highlight === "year"
                  ? "bg-amber-500/20 border-2 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.4)]"
                  : "bg-neutral-950/60 border border-neutral-800"
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <Calendar className={`w-4 h-4 ${highlight === "year" ? "text-amber-400" : "text-neutral-500"}`} />
                <span className={`text-2xl font-black tracking-tight ${highlight === "year" ? "text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" : "text-white"}`}>
                  {track.year}
                </span>
              </div>
            </motion.div>

            {/* 2. DAL CÍME KIEMELÉS */}
            <motion.div
              animate={highlight === "title" ? { scale: [1, 1.04, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
              className={`py-1.5 px-3 rounded-2xl transition-all ${
                highlight === "title"
                  ? "bg-cyan-500/20 border-2 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                  : "bg-neutral-950/40 border border-neutral-800/60"
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <Music className={`w-3.5 h-3.5 ${highlight === "title" ? "text-cyan-400" : "text-neutral-500"}`} />
                <h4 className={`text-sm font-black uppercase tracking-wide truncate ${highlight === "title" ? "text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" : "text-white"}`}>
                  {track.title}
                </h4>
              </div>
            </motion.div>

            {/* 3. ELŐADÓ KIEMELÉS */}
            <motion.div
              animate={highlight === "artist" ? { scale: [1, 1.04, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
              className={`py-1 px-3 rounded-2xl transition-all ${
                highlight === "artist"
                  ? "bg-rose-500/20 border-2 border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.4)]"
                  : "bg-neutral-950/40 border border-neutral-800/40"
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <Mic2 className={`w-3.5 h-3.5 ${highlight === "artist" ? "text-rose-400" : "text-neutral-500"}`} />
                <p className={`text-xs font-bold uppercase truncate ${highlight === "artist" ? "text-rose-300 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]" : "text-neutral-400"}`}>
                  {track.artist}
                </p>
              </div>
            </motion.div>
          </div>

          <div className="text-center text-[10px] text-neutral-600 font-bold uppercase tracking-wider">
            Kattints az elrejtéshez
          </div>
        </div>
      </motion.div>
    </div>
  );
};