"use client";

import React from "react";
import { motion } from "framer-motion";
import { Disc3, Calendar, Mic2, Music2, Sparkles } from "lucide-react";
import { Track } from "@/types/track";

interface MusicCardProps {
  track: Track;
  isFlipped: boolean;
  onFlip: () => void;
}

export const MusicCard: React.FC<MusicCardProps> = ({ track, isFlipped, onFlip }) => {
  return (
    <div className="relative w-80 h-[460px] cursor-pointer select-none" style={{ perspective: 1200 }} onClick={onFlip}>
      <motion.div
        className="w-full h-full relative"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.7, type: "spring", stiffness: 260, damping: 22 }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* KÁRTYA ELEJE (Lefordított zene) */}
        <div
          className="absolute inset-0 w-full h-full rounded-3xl bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 border border-neutral-800/80 shadow-2xl p-6 flex flex-col items-center justify-between overflow-hidden"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="w-full flex justify-between items-center text-xs font-semibold tracking-wider text-neutral-500 uppercase">
            <span>Hitster Edition</span>
            <span className="text-amber-500 font-mono">#{track.id}</span>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="relative flex items-center justify-center w-28 h-28 rounded-full bg-gradient-to-tr from-amber-500/20 to-violet-500/20 border border-neutral-700 shadow-inner mb-6">
              <Disc3 className="w-14 h-14 text-amber-400 animate-[spin_10s_linear_infinite]" />
            </div>
            <h3 className="text-2xl font-black tracking-tight text-white mb-2">Találd ki az évet!</h3>
            <p className="text-sm text-neutral-400 max-w-[200px]">Hallgasd meg a részletet, majd nyomj Space-t a felfedéshez.</p>
          </div>

          <div className="text-[11px] text-neutral-600 font-medium">Kattints vagy nyomj SPACE-t</div>
        </div>

        {/* KÁRTYA HÁTULJA (A felfedett válasz) */}
        <div
          className="absolute inset-0 w-full h-full rounded-3xl bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 border border-amber-500/40 shadow-[0_0_50px_-12px_rgba(245,158,11,0.25)] p-6 flex flex-col justify-between overflow-hidden"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold tracking-widest text-amber-400 uppercase bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              {track.genre}
            </span>
            <span className="text-xs font-mono text-neutral-500">#{track.id}</span>
          </div>

          <div className="flex flex-col items-center text-center my-auto">
            <div className="flex items-center gap-2 text-amber-400 mb-2">
              <Calendar className="w-6 h-6" />
              <span className="text-5xl font-black tracking-tight text-white drop-shadow-md">
                {track.year}
              </span>
            </div>

            <h2 className="text-2xl font-bold text-neutral-100 line-clamp-2 mt-2 leading-tight">
              {track.title}
            </h2>

            <div className="flex items-center gap-2 mt-2 text-neutral-400 font-medium">
              <Mic2 className="w-4 h-4 text-neutral-500" />
              <span>{track.artist}</span>
            </div>

            {track.event && (
              <div className="mt-4 px-3 py-2 rounded-xl bg-neutral-800/60 border border-neutral-700/50 text-xs text-neutral-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{track.event}</span>
              </div>
            )}
          </div>

          <div className="text-center text-[11px] text-neutral-500">
            Kész vagy a következőre?
          </div>
        </div>
      </motion.div>
    </div>
  );
};