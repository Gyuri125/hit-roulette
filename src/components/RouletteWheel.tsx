"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Trophy } from "lucide-react";
import confetti from "canvas-confetti";

export interface Category {
  id: string;
  label: string;
  lines: [string, string];
  yearRange: string;
  colors: [string, string];
  accent: string;
}

export const CATEGORIES: Category[] = [
  { id: "70s", label: "60-as & 70-es", lines: ["60-AS ÉS", "70-ES ÉVEK"], yearRange: "1960–1979", colors: ["#d97706", "#b45309"], accent: "#f59e0b" },
  { id: "80s", label: "80-as Évek", lines: ["80-AS", "ÉVEK"], yearRange: "1980–1989", colors: ["#db2777", "#9d174d"], accent: "#ec4899" },
  { id: "90s", label: "90-es Évek", lines: ["90-ES", "ÉVEK"], yearRange: "1990–1999", colors: ["#7c3aed", "#5b21b6"], accent: "#8b5cf6" },
  { id: "00s", label: "2000-es Évek", lines: ["2000-ES", "ÉVEK"], yearRange: "2000–2009", colors: ["#0284c7", "#0369a1"], accent: "#06b6d4" },
  { id: "retro", label: "Magyar Retró", lines: ["MAGYAR", "RETRÓ"], yearRange: "Klasszikusok", colors: ["#059669", "#047857"], accent: "#10b981" },
  { id: "rock", label: "Rock Himnuszok", lines: ["ROCK", "HIMNUSZOK"], yearRange: "Örökzöld Rock", colors: ["#dc2626", "#991b1b"], accent: "#ef4444" },
];

interface RouletteWheelProps {
  onSpinEnd?: (selectedCategory: Category) => void;
}

export const RouletteWheel: React.FC<RouletteWheelProps> = ({ onSpinEnd }) => {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<Category | null>(null);

  const numSlices = CATEGORIES.length;
  const sliceAngle = 360 / numSlices; // 60 fok

  const spin = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setWinner(null);

    const randomIndex = Math.floor(Math.random() * numSlices);
    const selected = CATEGORIES[randomIndex];

    // Számítás: a kiválasztott körcikk közepe pontosan a 12 óránál lévő mutató alá érkezzen
    const targetSliceCenter = (randomIndex + 0.5) * sliceAngle;
    const extraRounds = 360 * (6 + Math.floor(Math.random() * 3));
    
    const currentModulo = rotation % 360;
    const neededOffset = (360 - targetSliceCenter) - currentModulo;
    const finalRotation = rotation + extraRounds + (neededOffset >= 0 ? neededOffset : 360 + neededOffset);

    setRotation(finalRotation);

    setTimeout(() => {
      setIsSpinning(false);
      setWinner(selected);
      if (onSpinEnd) onSpinEnd(selected);

      confetti({
        particleCount: 80,
        spread: 65,
        origin: { y: 0.65 },
        colors: [selected.accent, "#ffffff", "#fbbf24"],
      });
    }, 4200);
  };

  // SVG cikkely ív rajzolása 12 órától kezdve
  const createSlicePath = (index: number) => {
    const startAngle = (index * sliceAngle - 90) * (Math.PI / 180);
    const endAngle = ((index + 1) * sliceAngle - 90) * (Math.PI / 180);
    const r = 182;
    const cx = 200;
    const cy = 200;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);

    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md select-none">
      {/* NAGY KERÉK KONTÉNER */}
      <div className="relative w-80 h-80 sm:w-96 sm:h-96 flex items-center justify-center">
        
        {/* Háttér neon aura */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-500/20 via-rose-500/20 to-violet-600/30 blur-2xl animate-pulse" />

        {/* FELSŐ MUTATÓ */}
        <div className="absolute -top-4 z-30 flex flex-col items-center drop-shadow-[0_10px_15px_rgba(0,0,0,0.9)]">
          <motion.div
            animate={isSpinning ? { rotate: [0, -12, 10, -6, 0] } : { rotate: 0 }}
            transition={isSpinning ? { repeat: Infinity, duration: 0.16 } : { duration: 0.25 }}
            className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[28px] border-t-amber-400 filter drop-shadow-[0_0_10px_rgba(251,191,36,0.9)]"
          />
          <div className="w-3.5 h-3.5 rounded-full bg-amber-200 border-2 border-neutral-900 -mt-7" />
        </div>

        {/* KÜLSŐ PEREM ÉS KERÉK TEST */}
        <div className="relative w-full h-full rounded-full p-2.5 bg-neutral-900 border-4 border-neutral-800 shadow-[0_0_50px_rgba(0,0,0,0.95)]">
          
          {/* 24 darab világító LED égő a peremen */}
          {Array.from({ length: 24 }).map((_, i) => {
            const angle = (360 / 24) * i;
            return (
              <div
                key={i}
                className="absolute w-2.5 h-2.5 rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-colors duration-300 z-20"
                style={{
                  top: `${50 - 47.5 * Math.cos((angle * Math.PI) / 180)}%`,
                  left: `${50 + 47.5 * Math.sin((angle * Math.PI) / 180)}%`,
                  backgroundColor: isSpinning ? (i % 2 === 0 ? "#fbbf24" : "#f43f5e") : "#fef08a",
                  boxShadow: `0 0 8px ${isSpinning ? "#f43f5e" : "#fef08a"}`,
                }}
              />
            );
          })}

          {/* FORGÓ KERÉK */}
          <motion.div
            className="w-full h-full rounded-full overflow-hidden"
            animate={{ rotate: rotation }}
            transition={{
              duration: 4.2,
              ease: [0.12, 0.95, 0.2, 1],
            }}
          >
            <svg viewBox="0 0 400 400" className="w-full h-full">
              <defs>
                {CATEGORIES.map((cat, idx) => (
                  <radialGradient id={`grad-slice-${idx}`} key={idx} cx="50%" cy="50%" r="50%">
                    <stop offset="30%" stopColor={cat.colors[0]} />
                    <stop offset="100%" stopColor={cat.colors[1]} />
                  </radialGradient>
                ))}
              </defs>

              {/* Körcikkek */}
              {CATEGORIES.map((cat, idx) => (
                <path
                  key={cat.id}
                  d={createSlicePath(idx)}
                  fill={`url(#grad-slice-${idx})`}
                  stroke="#111111"
                  strokeWidth="3.5"
                />
              ))}

              {/* Szövegek pontosan a szögfelezőkre illesztve */}
              {CATEGORIES.map((cat, idx) => (
                <g key={`text-${cat.id}`} transform={`rotate(${idx * sliceAngle + sliceAngle / 2}, 200, 200)`}>
                  <text
                    x="200"
                    y="76"
                    fill="#ffffff"
                    fontSize="11"
                    fontWeight="900"
                    textAnchor="middle"
                    className="uppercase tracking-wider font-sans drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
                  >
                    {cat.lines[0]}
                  </text>
                  <text
                    x="200"
                    y="92"
                    fill="#ffffff"
                    fontSize="10"
                    fontWeight="900"
                    textAnchor="middle"
                    className="uppercase tracking-wider font-sans drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] opacity-95"
                  >
                    {cat.lines[1]}
                  </text>
                </g>
              ))}

              {/* KÖZÉPSŐ BAKELIT LEMEZ MAG */}
              <circle cx="200" cy="200" r="48" fill="#0f0f0f" stroke="#262626" strokeWidth="4" />
              <circle cx="200" cy="200" r="40" fill="none" stroke="#222222" strokeWidth="1" strokeDasharray="4 4" />
              <circle cx="200" cy="200" r="14" fill="#fbbf24" stroke="#d97706" strokeWidth="2" />
              <circle cx="200" cy="200" r="6" fill="#000000" />
            </svg>
          </motion.div>
        </div>
      </div>

      {/* PÖRGETŐ GOMB */}
      <button
        onClick={spin}
        disabled={isSpinning}
        className="group relative px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-violet-600 p-[2px] transition transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_25px_rgba(245,158,11,0.3)] hover:shadow-[0_0_35px_rgba(236,72,153,0.5)]"
      >
        <div className="flex items-center gap-3 px-6 py-2.5 rounded-[14px] bg-neutral-950/90 group-hover:bg-neutral-950/70 transition">
          <Sparkles className="w-5 h-5 text-amber-400 animate-spin" />
          <span className="text-sm sm:text-base font-black tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-rose-300 to-white">
            {isSpinning ? "PÖRGÉS FOLYAMATBAN..." : "RULETT PÖRGETÉS"}
          </span>
        </div>
      </button>

      {/* NYERTES TÉMA KIJELZŐ */}
      <AnimatePresence>
        {winner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-3 px-6 py-3 rounded-2xl border-2 backdrop-blur-md shadow-2xl"
            style={{
              backgroundColor: `${winner.accent}15`,
              borderColor: winner.accent,
              boxShadow: `0 0 25px ${winner.accent}40`,
            }}
          >
            <Trophy className="w-6 h-6" style={{ color: winner.accent }} />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">Kipörgetett téma:</span>
              <span className="text-base font-black uppercase tracking-wide" style={{ color: winner.accent }}>
                {winner.label} ({winner.yearRange})
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};