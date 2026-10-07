"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Disc3, Trophy } from "lucide-react";
import confetti from "canvas-confetti";

interface Category {
  id: string;
  label: string;
  yearRange: string;
  bgGradient: [string, string];
  accent: string;
}

const CATEGORIES: Category[] = [
  { id: "70s", label: "60-as & 70-es", yearRange: "1960–1979", bgGradient: ["#f59e0b", "#b45309"], accent: "#fbbf24" },
  { id: "80s", label: "80-as Évek", yearRange: "1980–1989", bgGradient: ["#ec4899", "#9d174d"], accent: "#f472b6" },
  { id: "90s", label: "90-es Évek", yearRange: "1990–1999", bgGradient: ["#8b5cf6", "#5b21b6"], accent: "#a78bfa" },
  { id: "00s", label: "2000-es Évek", yearRange: "2000–2009", bgGradient: ["#06b6d4", "#0e7490"], accent: "#22d3ee" },
  { id: "retro", label: "Magyar Retró", yearRange: "Klasszikusok", bgGradient: ["#10b981", "#047857"], accent: "#34d399" },
  { id: "rock", label: "Rock Himnuszok", yearRange: "Örökzöld Rock", bgGradient: ["#ef4444", "#991b1b"], accent: "#f87171" },
];

interface RouletteWheelProps {
  onSpinEnd?: (selectedCategory: Category) => void;
}

export const RouletteWheel: React.FC<RouletteWheelProps> = ({ onSpinEnd }) => {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<Category | null>(null);

  const numSlices = CATEGORIES.length;
  const sliceAngle = 360 / numSlices; // 60 fok cikkenként

  const spin = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setWinner(null);

    // Véletlen nyertes kiválasztása
    const randomIndex = Math.floor(Math.random() * numSlices);
    const selected = CATEGORIES[randomIndex];

    // Számítás: a kiválasztott körcikk közepe pont a 12 óránál lévő mutató alá érkezzen
    const targetSliceCenter = (randomIndex + 0.5) * sliceAngle;
    const extraRounds = 360 * (6 + Math.floor(Math.random() * 3)); // 6-8 teljes fordulat
    
    // A jelenlegi elforduláshoz hozzáadjuk a következő pörgést úgy, hogy a mutatónál álljon meg
    const currentModulo = rotation % 360;
    const neededOffset = (360 - targetSliceCenter) - currentModulo;
    const finalRotation = rotation + extraRounds + (neededOffset >= 0 ? neededOffset : 360 + neededOffset);

    setRotation(finalRotation);

    // Animáció befejezése (4.5 másodperc múlva)
    setTimeout(() => {
      setIsSpinning(false);
      setWinner(selected);
      if (onSpinEnd) onSpinEnd(selected);

      // Ünnepi konfetti robbanás a kipörgetett színben
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.7 },
        colors: [selected.accent, "#ffffff", "#f59e0b"],
      });
    }, 4500);
  };

  // SVG körcikk rajzoló segédfüggvény
  const createSlicePath = (index: number) => {
    const startAngle = (index * sliceAngle - 90) * (Math.PI / 180);
    const endAngle = ((index + 1) * sliceAngle - 90) * (Math.PI / 180);
    const r = 180;
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
      {/* KERÉK KONTÉNER (ÓRIÁS MÉRET + KÜLSŐ NEON RAGYOGÁS) */}
      <div className="relative w-80 h-80 sm:w-96 sm:h-96 flex items-center justify-center">
        
        {/* Háttér neon aura (pulzál) */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-500/20 via-rose-500/20 to-violet-600/30 blur-2xl animate-pulse" />

        {/* FELSŐ MUTATÓ (Mechanikus kilengéssel és árnyékkal) */}
        <div className="absolute -top-4 z-30 flex flex-col items-center drop-shadow-[0_10px_15px_rgba(0,0,0,0.8)]">
          <motion.div
            animate={isSpinning ? { rotate: [0, -12, 10, -6, 0] } : { rotate: 0 }}
            transition={isSpinning ? { repeat: Infinity, duration: 0.18 } : { duration: 0.3 }}
            className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[28px] border-t-amber-400 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.9)]"
          />
          <div className="w-3 h-3 rounded-full bg-amber-200 border-2 border-neutral-900 -mt-7" />
        </div>

        {/* KÜLSŐ PEREM ÉS KERÉK TEST */}
        <div className="relative w-full h-full rounded-full p-3 bg-neutral-900 border-4 border-neutral-800 shadow-[0_0_50px_rgba(0,0,0,0.9),inset_0_0_20px_rgba(0,0,0,0.8)]">
          
          {/* Perem menti világító LED-égők (24 darab) */}
          {Array.from({ length: 24 }).map((_, i) => {
            const angle = (360 / 24) * i;
            return (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-colors duration-300"
                style={{
                  top: `${50 - 47 * Math.cos((angle * Math.PI) / 180)}%`,
                  left: `${50 + 47 * Math.sin((angle * Math.PI) / 180)}%`,
                  backgroundColor: isSpinning ? (i % 2 === 0 ? "#fbbf24" : "#f43f5e") : "#fef08a",
                  boxShadow: `0 0 8px ${isSpinning ? "#f43f5e" : "#fef08a"}`,
                }}
              />
            );
          })}

          {/* FORGÓ SVG KERÉK */}
          <motion.div
            className="w-full h-full rounded-full overflow-hidden"
            animate={{ rotate: rotation }}
            transition={{
              duration: 4.5,
              ease: [0.12, 0.95, 0.2, 1], // Realisztikus csillapítás (lassulás)
            }}
          >
            <svg viewBox="0 0 400 400" className="w-full h-full">
              <defs>
                {CATEGORIES.map((cat, idx) => (
                  <radialGradient id={`grad-${idx}`} key={idx} cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor={cat.bgGradient[0]} />
                    <stop offset="100%" stopColor={cat.bgGradient[1]} />
                  </radialGradient>
                ))}
              </defs>

              {/* Körcikkek */}
              {CATEGORIES.map((cat, idx) => (
                <g key={cat.id}>
                  <path
                    d={createSlicePath(idx)}
                    fill={`url(#grad-${idx})`}
                    stroke="#0a0a0a"
                    strokeWidth="3"
                  />
                  {/* Cikkek szövege (Középre irányítva a sugár mentén) */}
                  <g
                    transform={`translate(200, 200) rotate(${idx * sliceAngle + sliceAngle / 2})`}
                  >
                    <text
                      x="95"
                      y="4"
                      fill="#ffffff"
                      fontSize="11"
                      fontWeight="900"
                      textAnchor="middle"
                      letterSpacing="1px"
                      transform="rotate(90, 95, 4)"
                      className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] uppercase font-sans"
                    >
                      {cat.label}
                    </text>
                  </g>
                </g>
              ))}

              {/* KÖZÉPSŐ BAKELIT LEMEZ MAG */}
              <circle cx="200" cy="200" r="48" fill="#111111" stroke="#262626" strokeWidth="4" />
              <circle cx="200" cy="200" r="42" fill="none" stroke="#262626" strokeWidth="1" strokeDasharray="3 3" />
              <circle cx="200" cy="200" r="36" fill="none" stroke="#333333" strokeWidth="1" />
              <circle cx="200" cy="200" r="14" fill="#fbbf24" />
              <circle cx="200" cy="200" r="6" fill="#000000" />
            </svg>
          </motion.div>
        </div>
      </div>

      {/* INDÍTÓ GOMB (MASSZÍV 3D PARTY GOMB) */}
      <button
        onClick={spin}
        disabled={isSpinning}
        className="group relative px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-violet-600 p-[2px] transition transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_25px_rgba(245,158,11,0.3)] hover:shadow-[0_0_35px_rgba(236,72,153,0.5)]"
      >
        <div className="flex items-center gap-3 px-6 py-2.5 rounded-[14px] bg-neutral-950/90 group-hover:bg-neutral-950/70 transition">
          <Sparkles className="w-5 h-5 text-amber-400 animate-spin" />
          <span className="text-base font-black tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-rose-300 to-white">
            {isSpinning ? "PÖRGÉS FOLYAMATBAN..." : "RULETT PÖRGETÉS"}
          </span>
        </div>
      </button>

      {/* NYERTES KATEGÓRIA POPUP KIJELZŐ */}
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