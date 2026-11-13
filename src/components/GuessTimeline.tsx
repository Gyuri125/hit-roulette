"use client";

import React from "react";
import { motion } from "framer-motion";
import { EvaluatedGuess } from "@/types/game";

interface GuessTimelineProps {
  actualYear: number;
  guesses: EvaluatedGuess[];
  minYear?: number;
  maxYear?: number;
}

export const GuessTimeline: React.FC<GuessTimelineProps> = ({
  actualYear,
  guesses,
  minYear = 1960,
  maxYear = 2026,
}) => {
  if (!guesses.length) return null;

  const minBound = Math.min(minYear, actualYear - 5, ...guesses.map((g) => g.year));
  const maxBound = Math.max(maxYear, actualYear + 5, ...guesses.map((g) => g.year));
  const span = Math.max(10, maxBound - minBound);
  const toPercent = (y: number) => Math.max(2, Math.min(98, ((y - minBound) / span) * 100));

  const sweetLeft = toPercent(actualYear - 2);
  const sweetRight = toPercent(actualYear + 2);
  const actualPos = toPercent(actualYear);

  return (
    <div className="w-full rounded-2xl bg-neutral-950/90 border border-neutral-800 px-4 pt-4 pb-6 mb-3 relative">
      <div className="flex items-center justify-between text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-6">
        <span>📊 Tipp-Idővonal ({minBound} – {maxBound})</span>
        <span className="text-amber-300 font-mono">
          Valós év: {actualYear} (±2 év zóna zölddel)
        </span>
      </div>

      <div className="relative h-2.5 w-full rounded-full bg-neutral-800">
        {/* ±2 év sikeres zóna */}
        <div
          className="absolute top-0 bottom-0 rounded-full bg-emerald-500/35 border border-emerald-400/60"
          style={{
            left: `${sweetLeft}%`,
            width: `${Math.max(2, sweetRight - sweetLeft)}%`,
          }}
        />

        {/* Valós évszám arany jelölője */}
        <motion.div
          initial={{ scale: 0, y: -10 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 20 }}
          className="absolute -top-3.5 -translate-x-1/2 flex flex-col items-center z-20"
          style={{ left: `${actualPos}%` }}
        >
          <span className="px-1.5 py-0.5 rounded-md bg-amber-400 text-neutral-950 font-black text-[10px] font-mono shadow-[0_0_10px_rgba(251,191,36,0.9)]">
            {actualYear}
          </span>
          <span className="w-1 h-4 bg-amber-400 rounded-full" />
        </motion.div>

        {/* Játékosok tippjei az idővonalon */}
        {guesses.map((g, idx) => {
          const left = toPercent(g.year);
          const isExact = g.yearDiff === 0;
          const isClose = g.yearDiff <= 2;
          // Kis függőleges eltolás ütközések enyhítésére
          const staggerBelow = idx % 2 === 0;

          return (
            <motion.div
              key={g.playerName}
              initial={{ opacity: 0, scale: 0.4, y: staggerBelow ? 12 : -12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: idx * 0.07, type: "spring", stiffness: 260, damping: 20 }}
              className="absolute -translate-x-1/2 flex flex-col items-center z-10"
              style={{
                left: `${left}%`,
                top: staggerBelow ? "10px" : "-20px",
              }}
              title={`${g.playerName}: ${g.year} (±${g.yearDiff} év)`}
            >
              <span
                className={`w-3 h-3 rounded-full border-2 shadow ${
                  isExact
                    ? "bg-amber-400 border-white scale-110"
                    : isClose
                    ? "bg-emerald-400 border-neutral-950"
                    : g.yearDiff <= 5
                    ? "bg-cyan-400 border-neutral-950"
                    : "bg-rose-500 border-neutral-950"
                }`}
              />
              <span
                className={`text-[9px] font-black whitespace-nowrap px-1 rounded bg-neutral-900/95 border ${
                  isExact
                    ? "text-amber-300 border-amber-500/60"
                    : isClose
                    ? "text-emerald-300 border-emerald-500/40"
                    : "text-neutral-300 border-neutral-800"
                }`}
              >
                {g.playerName.slice(0, 8)} ({g.year})
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

