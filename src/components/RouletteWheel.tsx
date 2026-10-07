"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Disc, Sparkles } from "lucide-react";

const CATEGORIES = [
  { label: "60-as & 70-es", color: "#f59e0b" },
  { label: "80-as évek", color: "#ec4899" },
  { label: "90-es évek", color: "#8b5cf6" },
  { label: "2000-es évek", color: "#3b82f6" },
  { label: "Magyar Retró", color: "#10b981" },
  { label: "Rock Himnuszok", color: "#ef4444" },
];

interface RouletteWheelProps {
  onSpinEnd?: (selectedCategory: string) => void;
}

export const RouletteWheel: React.FC<RouletteWheelProps> = ({ onSpinEnd }) => {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);

  const spin = () => {
    if (isSpinning) return;
    setIsSpinning(true);

    const extraRounds = 5 + Math.floor(Math.random() * 4); // 5-8 teljes kör
    const randomCategoryIndex = Math.floor(Math.random() * CATEGORIES.length);
    const sliceAngle = 360 / CATEGORIES.length;
    const targetAngle = rotation + (extraRounds * 360) + (randomCategoryIndex * sliceAngle);

    setRotation(targetAngle);

    setTimeout(() => {
      setIsSpinning(false);
      const chosen = CATEGORIES[randomCategoryIndex].label;
      setCurrentCategory(chosen);
      if (onSpinEnd) onSpinEnd(chosen);
    }, 3200);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-56 h-56 flex items-center justify-center">
        {/* Felső jelölő nyíl */}
        <div className="absolute -top-3 z-20 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[18px] border-t-amber-400 drop-shadow-md" />

        {/* Pörgő kerék */}
        <motion.div
          className="w-full h-full rounded-full border-4 border-neutral-800 shadow-2xl relative overflow-hidden bg-neutral-900 flex items-center justify-center"
          animate={{ rotate: rotation }}
          transition={{ duration: 3.2, ease: [0.15, 0.9, 0.2, 1] }}
        >
          {CATEGORIES.map((cat, idx) => {
            const angle = (360 / CATEGORIES.length) * idx;
            return (
              <div
                key={idx}
                className="absolute w-full h-full flex justify-center items-start pt-2 text-[10px] font-black uppercase tracking-wider"
                style={{
                  transform: `rotate(${angle}deg)`,
                  color: cat.color,
                }}
              >
                {cat.label}
              </div>
            );
          })}
          {/* Középső mag */}
          <div className="w-16 h-16 rounded-full bg-neutral-950 border-2 border-neutral-700 flex items-center justify-center shadow-inner z-10">
            <Disc className="w-6 h-6 text-neutral-400 animate-spin" />
          </div>
        </motion.div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <button
          onClick={spin}
          disabled={isSpinning}
          className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-neutral-950 font-black tracking-wide text-xs uppercase transition transform active:scale-95 disabled:opacity-50 shadow-lg shadow-rose-500/20"
        >
          <Sparkles className="w-4 h-4 fill-current" />
          <span>{isSpinning ? "Pörgésben..." : "Rulett Pörgetés"}</span>
        </button>

        {currentCategory && (
          <span className="text-xs font-semibold text-neutral-400 animate-fade-in">
            Kategória: <strong className="text-amber-400">{currentCategory}</strong>
          </span>
        )}
      </div>
    </div>
  );
};