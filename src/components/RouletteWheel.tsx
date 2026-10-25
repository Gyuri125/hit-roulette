"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Trophy, Settings2, Plus, Trash2, Copy, RotateCcw, X, Layers, Palette, Maximize2, Minimize2 } from "lucide-react";
import confetti from "canvas-confetti";
import { getSharedAudioContext } from "./PlayerBoard";

export type TargetHighlight = "year" | "title" | "artist" | "all";

export interface Category {
  id: string;
  label: string;
  lines: [string, string];
  desc: string;
  targetType: TargetHighlight;
  colors: [string, string];
  accent: string;
}

export interface PresetPack {
  name: string;
  categories: Category[];
}

export const CATEGORIES: Category[] = [
  {
    id: "year",
    label: "Évszám",
    lines: ["MEGJELENÉS", "ÉVE"],
    desc: "Találd el a megjelenés évét!",
    targetType: "year",
    colors: ["#d97706", "#b45309"],
    accent: "#f59e0b",
  },
  {
    id: "title",
    label: "Dal címe",
    lines: ["PONTOS", "DALCÍM"],
    desc: "Mi a szám pontos címe?",
    targetType: "title",
    colors: ["#059669", "#047857"],
    accent: "#10b981",
  },
  {
    id: "artist",
    label: "Előadó",
    lines: ["ELŐADÓ", "NEVE"],
    desc: "Ki énekli a dalt?",
    targetType: "artist",
    colors: ["#db2777", "#9d174d"],
    accent: "#ec4899",
  },
  {
    id: "all",
    label: "Mindent bele",
    lines: ["MINDENT", "BELE!"],
    desc: "Év, cím és előadó egyszerre!",
    targetType: "all",
    colors: ["#7c3aed", "#5b21b6"],
    accent: "#8b5cf6",
  },
  {
    id: "bonus",
    label: "Szabad tipp",
    lines: ["SZABAD", "TIPP"],
    desc: "Válassz egy tetszőleges mezőt!",
    targetType: "year",
    colors: ["#0284c7", "#0369a1"],
    accent: "#06b6d4",
  },
];

export const CHALLENGE_PRESETS: Record<string, PresetPack> = {
  boardClassic: {
    name: "Táblázat Színek (Hivatalos 5 Szín)",
    categories: CATEGORIES,
  },
  partyMaster: {
    name: "Teljes Buli Kvíz (Haladó)",
    categories: [
      { id: "c_exact_year", label: "Pontos Évszám", lines: ["PONTOS", "ÉVSZÁM"], desc: "Hajszálpontos évszám szükséges!", targetType: "year", colors: ["#d97706", "#b45309"], accent: "#f59e0b" },
      { id: "c_title", label: "Pontos Dalcím", lines: ["PONTOS", "DALCÍM"], desc: "Mi a dal hivatalos címe?", targetType: "title", colors: ["#059669", "#047857"], accent: "#10b981" },
      { id: "c_artist", label: "Előadó Neve", lines: ["ELŐADÓ", "NEVE"], desc: "Ki énekli a dalt?", targetType: "artist", colors: ["#db2777", "#9d174d"], accent: "#ec4899" },
      { id: "c_all", label: "Mindent bele", lines: ["MINDENT", "BELE!"], desc: "Év, cím és előadó egyszerre!", targetType: "all", colors: ["#7c3aed", "#5b21b6"], accent: "#8b5cf6" },
      { id: "c_bonus", label: "Szabad tipp", lines: ["SZABAD", "TIPP"], desc: "Válassz egy mezőt!", targetType: "year", colors: ["#0284c7", "#0369a1"], accent: "#06b6d4" },
      { id: "c_year_2", label: "Évszám (±2 év)", lines: ["ÉVSZÁM", "±2 ÉV"], desc: "Max 2 év tévedés megengedett", targetType: "year", colors: ["#ea580c", "#c2410c"], accent: "#f97316" },
      { id: "c_decade", label: "Melyik Évtized?", lines: ["MELYIK", "ÉVTIZED?"], desc: "Csak az évtized kell (pl. 80-asok)", targetType: "year", colors: ["#4f46e5", "#3730a3"], accent: "#6366f1" },
    ],
  },
  yearFocus: {
    name: "Csak Évszám Kihívások",
    categories: [
      { id: "y_exact", label: "Pontos Évszám", lines: ["PONTOS", "ÉVSZÁM"], desc: "Telitalálat kell!", targetType: "year", colors: ["#d97706", "#b45309"], accent: "#f59e0b" },
      { id: "y_2", label: "Évszám (±2 év)", lines: ["ÉVSZÁM", "±2 ÉV"], desc: "Max 2 év eltérés", targetType: "year", colors: ["#ea580c", "#c2410c"], accent: "#f97316" },
      { id: "y_5", label: "Évszám (±5 év)", lines: ["ÉVSZÁM", "±5 ÉV"], desc: "Max 5 év eltérés", targetType: "year", colors: ["#db2777", "#9d174d"], accent: "#ec4899" },
      { id: "y_dec", label: "Melyik Évtized?", lines: ["MELYIK", "ÉVTIZED?"], desc: "Csak a korszak kell", targetType: "year", colors: ["#7c3aed", "#5b21b6"], accent: "#8b5cf6" },
      { id: "y_2000", label: "2000 Előtt / Után?", lines: ["2000 ELŐTT", "VAGY UTÁN?"], desc: "Ezredforduló előtti vagy utáni?", targetType: "year", colors: ["#0284c7", "#0369a1"], accent: "#06b6d4" },
    ],
  },
};

const COLOR_PRESETS: Array<{ label: string; colors: [string, string]; accent: string }> = [
  { label: "Borostyán", colors: ["#d97706", "#b45309"], accent: "#f59e0b" },
  { label: "Smaragd", colors: ["#059669", "#047857"], accent: "#10b981" },
  { label: "Rózsaszín", colors: ["#db2777", "#9d174d"], accent: "#ec4899" },
  { label: "Lila", colors: ["#7c3aed", "#5b21b6"], accent: "#8b5cf6" },
  { label: "Cián", colors: ["#0284c7", "#0369a1"], accent: "#06b6d4" },
  { label: "Narancs", colors: ["#ea580c", "#c2410c"], accent: "#f97316" },
  { label: "Indigó", colors: ["#4f46e5", "#3730a3"], accent: "#6366f1" },
];

const splitLabelToLines = (text: string): [string, string] => {
  const parts = text.trim().split(" ");
  if (parts.length <= 1) return [text.toUpperCase(), ""];
  const mid = Math.ceil(parts.length / 2);
  return [parts.slice(0, mid).join(" ").toUpperCase(), parts.slice(mid).join(" ").toUpperCase()];
};

const playClickTone = () => {
  try {
    const audioCtx = getSharedAudioContext();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(650 + Math.random() * 150, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.035);
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.035);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.035);
  } catch (_) {}
};

const playFanfareTone = () => {
  try {
    const audioCtx = getSharedAudioContext();
    if (!audioCtx) return;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const startTime = audioCtx.currentTime + idx * 0.09;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.45);
    });
  } catch (_) {}
};

interface RouletteWheelProps {
  onSpinEnd?: (selectedCategory: Category) => void;
  onBeforeSpin?: () => boolean;
  tvMode?: boolean;
  tvScale?: number;
  customWheelSize?: number;
}

export const RouletteWheel: React.FC<RouletteWheelProps> = ({
  onSpinEnd,
  onBeforeSpin,
  tvMode = false,
  tvScale = 100,
  customWheelSize,
}) => {
  const [categories, setCategories] = useState<Category[]>(CATEGORIES);
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<Category | null>(null);
  const [discoStep, setDiscoStep] = useState(0);
  const [isStudioMaximized, setIsStudioMaximized] = useState(false);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSpinning) {
      interval = setInterval(() => {
        setDiscoStep((prev) => (prev + 1) % 5);
      }, 90);
    }
    return () => clearInterval(interval);
  }, [isSpinning]);

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newTargetType, setNewTargetType] = useState<TargetHighlight>("year");
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);

  const numSlices = categories.length;
  const sliceAngle = numSlices > 0 ? 360 / numSlices : 360;

  const spin = () => {
    if (isSpinning || categories.length === 0) return;
    if (onBeforeSpin && !onBeforeSpin()) return;

    getSharedAudioContext();

    setIsSpinning(true);
    setWinner(null);

    const randomIndex = Math.floor(Math.random() * numSlices);
    const selected = categories[randomIndex];

    const targetSliceCenter = (randomIndex + 0.5) * sliceAngle;
    const extraRounds = 360 * (6 + Math.floor(Math.random() * 3));

    const currentModulo = rotation % 360;
    const neededOffset = 360 - targetSliceCenter - currentModulo;
    const finalRotation = rotation + extraRounds + (neededOffset >= 0 ? neededOffset : 360 + neededOffset);

    setRotation(finalRotation);

    const delays = [
      60, 110, 160, 210, 260, 310, 360, 420, 480, 550, 630, 720, 820, 930, 1050, 1200, 1400, 1650, 1950, 2300, 2700, 3150, 3650
    ];
    delays.forEach((d) => {
      if (d < 4000) {
        setTimeout(() => {
          playClickTone();
        }, d);
      }
    });

    setTimeout(() => {
      setIsSpinning(false);
      setWinner(selected);
      playFanfareTone();
      if (onSpinEnd) onSpinEnd(selected);

      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.65 },
        colors: [selected.accent, "#ffffff", "#fbbf24"],
      });
    }, 4200);
  };

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

    const largeArcFlag = sliceAngle > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

  const getFontSize = () => {
    const scaleMult = tvMode ? (tvScale ? tvScale / 100 : 1.25) : 1;
    if (numSlices <= 5) {
      return {
        line1: Math.round(13.5 * scaleMult * 10) / 10,
        line2: Math.round(12 * scaleMult * 10) / 10,
        y1: tvMode ? 70 : 76,
        y2: tvMode ? 90 : 94,
      };
    }
    if (numSlices <= 8) {
      return {
        line1: Math.round(11 * scaleMult * 10) / 10,
        line2: Math.round(10 * scaleMult * 10) / 10,
        y1: tvMode ? 66 : 72,
        y2: tvMode ? 84 : 86,
      };
    }
    return {
      line1: Math.round(9.5 * scaleMult * 10) / 10,
      line2: Math.round(8.5 * scaleMult * 10) / 10,
      y1: tvMode ? 64 : 68,
      y2: tvMode ? 78 : 80,
    };
  };
  const fontConfig = getFontSize();

  const handleAddCustomCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;
    if (categories.length >= 14) {
      alert("Legfeljebb 14 szelet fér el kényelmesen a keréken!");
      return;
    }

    const preset = COLOR_PRESETS[selectedColorIdx];
    const newCat: Category = {
      id: `custom-${Date.now()}`,
      label: newLabel.trim(),
      lines: splitLabelToLines(newLabel),
      desc: newDesc.trim() || "Egyedi játékszabály",
      targetType: newTargetType,
      colors: preset.colors,
      accent: preset.accent,
    };

    setCategories((prev) => [...prev, newCat]);
    setNewLabel("");
    setNewDesc("");
  };

  const renderWheelSvg = (previewMode = false) => (
    <svg viewBox="0 0 400 400" className="w-full h-full">
      <defs>
        {categories.map((cat, idx) => (
          <radialGradient id={`dyn-grad-${idx}${previewMode ? "-prev" : ""}`} key={idx} cx="50%" cy="50%" r="50%">
            <stop offset="30%" stopColor={cat.colors[0]} />
            <stop offset="100%" stopColor={cat.colors[1]} />
          </radialGradient>
        ))}
      </defs>

      {categories.map((cat, idx) => (
        <path
          key={`path-${cat.id}-${idx}`}
          d={createSlicePath(idx)}
          fill={`url(#dyn-grad-${idx}${previewMode ? "-prev" : ""})`}
          stroke="#111111"
          strokeWidth="3"
        />
      ))}

      {categories.map((cat, idx) => (
        <g key={`text-${cat.id}-${idx}`} transform={`rotate(${idx * sliceAngle + sliceAngle / 2}, 200, 200)`}>
          <text
            x="200"
            y={fontConfig.y1}
            fill="#ffffff"
            fontSize={fontConfig.line1}
            fontWeight="900"
            textAnchor="middle"
            className="uppercase font-sans"
            style={{
              filter: "drop-shadow(0px 2px 4px rgba(0,0,0,1)) drop-shadow(0px 0px 3px rgba(0,0,0,0.95))",
              letterSpacing: tvMode ? "0.06em" : "0.03em",
            }}
          >
            {cat.lines[0]}
          </text>
          {cat.lines[1] && (
            <text
              x="200"
              y={fontConfig.y2}
              fill="#ffffff"
              fontSize={fontConfig.line2}
              fontWeight="900"
              textAnchor="middle"
              className="uppercase font-sans opacity-95"
              style={{
                filter: "drop-shadow(0px 2px 4px rgba(0,0,0,1)) drop-shadow(0px 0px 3px rgba(0,0,0,0.95))",
                letterSpacing: tvMode ? "0.06em" : "0.03em",
              }}
            >
              {cat.lines[1]}
            </text>
          )}
        </g>
      ))}

      <circle cx="200" cy="200" r="46" fill="#0f0f0f" stroke="#262626" strokeWidth="4" />
      <circle cx="200" cy="200" r="38" fill="none" stroke="#222222" strokeWidth="1" strokeDasharray="4 4" />
      <circle cx="200" cy="200" r="14" fill="#fbbf24" stroke="#d97706" strokeWidth="2" />
      <circle cx="200" cy="200" r="6" fill="#000000" />
    </svg>
  );

  const discoColors = ["#f59e0b", "#10b981", "#ec4899", "#8b5cf6", "#06b6d4"];

  return (
    <div
      className={`flex flex-col items-center gap-4 w-full select-none transition-all duration-300 ${tvMode ? "max-w-xl" : "max-w-md"}`}
      style={customWheelSize ? { maxWidth: `${customWheelSize + 80}px` } : undefined}
    >
      <div
        onClick={spin}
        className={`relative flex items-center justify-center cursor-pointer group transition-all duration-300 ${
          customWheelSize
            ? ""
            : tvMode
            ? "w-80 h-80 sm:w-96 sm:h-96 lg:w-[460px] lg:h-[460px] xl:w-[500px] xl:h-[500px]"
            : "w-72 h-72 sm:w-84 sm:h-84 lg:w-92 lg:h-92"
        }`}
        style={customWheelSize ? { width: `${customWheelSize}px`, height: `${customWheelSize}px` } : undefined}
        title="Kattints a kerékre a pörgetéshez!"
      >
        <div
          className="absolute inset-0 rounded-full blur-3xl transition-all duration-300 pointer-events-none"
          style={{
            backgroundColor: isSpinning
              ? `${discoColors[discoStep]}45`
              : winner
              ? `${winner.accent}35`
              : "rgba(245, 158, 11, 0.2)",
            transform: isSpinning ? "scale(1.12)" : "scale(1)",
          }}
        />

        <div className="absolute -top-4 z-30 flex flex-col items-center drop-shadow-[0_10px_15px_rgba(0,0,0,0.9)]">
          <motion.div
            animate={isSpinning ? { rotate: [0, -14, 12, -8, 0] } : { rotate: 0 }}
            transition={isSpinning ? { repeat: Infinity, duration: 0.14 } : { duration: 0.25 }}
            className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[28px] border-t-amber-400 filter drop-shadow-[0_0_12px_rgba(251,191,36,0.95)]"
          />
          <div className="w-3.5 h-3.5 rounded-full bg-amber-200 border-2 border-neutral-900 -mt-7" />
        </div>

        <div className="relative w-full h-full rounded-full p-2.5 bg-neutral-900 border-4 border-neutral-800 shadow-[0_0_50px_rgba(0,0,0,0.95)] group-hover:border-neutral-700 transition">
          {Array.from({ length: 24 }).map((_, i) => {
            const angle = (360 / 24) * i;
            const ledColor = isSpinning
              ? discoColors[(i + discoStep) % discoColors.length]
              : winner
              ? winner.accent
              : i % 2 === 0
              ? "#fbbf24"
              : "#ffffff";

            return (
              <div
                key={i}
                className="absolute w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-all duration-150 z-20"
                style={{
                  top: `${50 - 47.5 * Math.cos((angle * Math.PI) / 180)}%`,
                  left: `${50 + 47.5 * Math.sin((angle * Math.PI) / 180)}%`,
                  backgroundColor: ledColor,
                  boxShadow: `0 0 10px ${ledColor}`,
                  transform: isSpinning ? "translate(-50%, -50%) scale(1.2)" : "translate(-50%, -50%) scale(1)",
                }}
              />
            );
          })}

          <motion.div
            className="w-full h-full rounded-full overflow-hidden"
            animate={{ rotate: rotation }}
            transition={{
              duration: 4.2,
              ease: [0.12, 0.95, 0.2, 1],
            }}
          >
            {renderWheelSvg(false)}
          </motion.div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 w-full justify-center">
        <button
          id="roulette-spin-btn"
          onClick={spin}
          disabled={isSpinning}
          className="group relative flex-1 max-w-xs px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-violet-600 p-[2px] transition transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_25px_rgba(245,158,11,0.3)] hover:shadow-[0_0_35px_rgba(236,72,153,0.5)]"
        >
          <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-[14px] bg-neutral-950/90 group-hover:bg-neutral-950/70 transition">
            <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
            <span className="text-xs sm:text-sm font-black tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-rose-300 to-white">
              {isSpinning ? "DISCO PÖRGÉS..." : "RULETT PÖRGETÉS (R)"}
            </span>
          </div>
        </button>

        <button
          onClick={() => setIsEditorOpen(true)}
          className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-white transition active:scale-95 shadow-lg"
          title="Kerék Stúdió & Feladványok szerkesztése"
        >
          <Settings2 className="w-5 h-5" />
        </button>
      </div>

      <AnimatePresence>
        {winner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85 }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-2xl border-2 backdrop-blur-md shadow-2xl text-left"
            style={{
              backgroundColor: `${winner.accent}15`,
              borderColor: winner.accent,
              boxShadow: `0 0 25px ${winner.accent}40`,
            }}
          >
            <Trophy className="w-5 h-5 shrink-0" style={{ color: winner.accent }} />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">Kipörgetett Feladvány:</span>
              <span className="text-xs sm:text-sm font-black uppercase tracking-wide" style={{ color: winner.accent }}>
                {winner.label} — {winner.desc}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {isEditorOpen && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/92 backdrop-blur-xl overflow-y-auto">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className={`w-full bg-neutral-900/95 border-2 border-amber-500/40 rounded-[32px] p-4 sm:p-6 md:p-8 shadow-[0_0_80px_rgba(245,158,11,0.2)] flex flex-col gap-6 my-auto max-h-[95vh] overflow-y-auto transition-all duration-300 ${
                    isStudioMaximized || tvMode ? "max-w-[1550px] w-[95vw]" : "max-w-5xl"
                  }`}
                >
                  <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
                        <Settings2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-2xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                          <span>Kerék Stúdió & Feladvány-kezelő</span>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            PRO TV NÉZET
                          </span>
                        </h3>
                        <p className="text-xs sm:text-sm text-neutral-400">
                          Szerkeszd a feladványokat és figyeld az élő óriás előnézetet valós időben!
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsStudioMaximized((prev) => !prev)}
                        className="p-2.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition"
                        title={isStudioMaximized ? "Normál méret" : "Teljes stúdió kiterjesztés"}
                      >
                        {isStudioMaximized ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => setIsEditorOpen(false)}
                        className="p-2.5 rounded-2xl bg-neutral-800 hover:bg-rose-500/20 text-neutral-400 hover:text-rose-300 transition"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col lg:flex-row items-stretch gap-6 lg:gap-8">
                    {/* BAL OLDAL: ÓRIÁS ÉLŐ ELŐNÉZET KERÉK */}
                    <div className="w-full lg:w-[420px] xl:w-[480px] shrink-0 flex flex-col items-center justify-between p-5 rounded-3xl bg-neutral-950 border border-neutral-800/80 shadow-2xl">
                      <div className="flex items-center justify-between w-full mb-3 px-2">
                        <span className="text-xs sm:text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4" /> Élő Óriás Előnézet
                        </span>
                        <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-200">
                          {categories.length} szelet
                        </span>
                      </div>

                      <div className="relative w-64 h-64 sm:w-80 sm:h-80 lg:w-[360px] lg:h-[360px] xl:w-[420px] xl:h-[420px] rounded-full p-2.5 bg-neutral-900 border-4 border-neutral-800 shadow-[0_0_50px_rgba(0,0,0,0.85)] my-auto shrink-0 flex items-center justify-center">
                        <div className="absolute -top-3.5 left-1/2 transform -translate-x-1/2 z-20 w-0 h-0 border-l-[11px] border-l-transparent border-r-[11px] border-r-transparent border-t-[20px] border-t-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.9)]" />
                        <div className="w-full h-full rounded-full overflow-hidden">
                          {renderWheelSvg(true)}
                        </div>
                      </div>

                      <p className="text-[11px] sm:text-xs text-neutral-500 text-center mt-3 font-medium">
                        A feladványok azonnal megjelennek a TV képernyőn is mentés után.
                      </p>
                    </div>

                    {/* JOBB OLDAL: CSOMAGOK, HOZZÁADÁS ÉS FELADVÁNYLISTA */}
                    <div className="flex-1 flex flex-col gap-5 min-w-0">
                      <div className="flex flex-col gap-2">
                        <span className="text-xs font-black text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-amber-400" /> Kész Játékcsomagok (1-kattintásos váltás)
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          {Object.entries(CHALLENGE_PRESETS).map(([key, pack]) => (
                            <button
                              key={key}
                              onClick={() => setCategories(pack.categories)}
                              className="p-3 sm:p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 hover:border-amber-400/60 hover:bg-neutral-800/40 text-left transition flex flex-col gap-0.5 group"
                            >
                              <strong className="text-amber-300 group-hover:text-amber-200 font-extrabold text-xs sm:text-sm truncate w-full">
                                {pack.name}
                              </strong>
                              <span className="text-[11px] text-neutral-400">{pack.categories.length} feladvány szelet</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* SAJÁT FELADVÁNY ŰRLAP */}
                      <form onSubmit={handleAddCustomCategory} className="flex flex-col gap-3 bg-neutral-950 p-4 sm:p-5 rounded-2xl border border-neutral-800/90 shadow-inner">
                        <span className="text-xs font-black text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Plus className="w-4 h-4 text-amber-400" /> Saját Feladvány Hozzáadása
                        </span>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <input
                            type="text"
                            placeholder="Feladvány neve (pl. 2000 Után? vagy Dupla Évszám)"
                            value={newLabel}
                            onChange={(e) => setNewLabel(e.target.value)}
                            className="bg-neutral-900 text-xs sm:text-sm px-4 py-2.5 sm:py-3 rounded-xl text-white border border-neutral-800 focus:outline-none focus:border-amber-400 transition"
                          />
                          <input
                            type="text"
                            placeholder="Szabály / Pontozási leírás (pl. +1 X ha helyes)"
                            value={newDesc}
                            onChange={(e) => setNewDesc(e.target.value)}
                            className="bg-neutral-900 text-xs sm:text-sm px-4 py-2.5 sm:py-3 rounded-xl text-white border border-neutral-800 focus:outline-none focus:border-amber-400 transition"
                          />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-800/60">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-neutral-400 font-bold">Kártya Cél:</span>
                            <select
                              value={newTargetType}
                              onChange={(e) => setNewTargetType(e.target.value as TargetHighlight)}
                              className="bg-neutral-900 text-xs sm:text-sm text-white border border-neutral-800 rounded-xl px-3 py-1.5 focus:outline-none focus:border-amber-400"
                            >
                              <option value="year">📅 Évszám</option>
                              <option value="title">🎵 Dalcím</option>
                              <option value="artist">🎤 Előadó</option>
                              <option value="all">✨ Mindent bele</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Palette className="w-4 h-4 text-neutral-400 mr-1" />
                            {COLOR_PRESETS.map((p, idx) => (
                              <button
                                key={p.label}
                                type="button"
                                onClick={() => setSelectedColorIdx(idx)}
                                className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full transition transform ${
                                  selectedColorIdx === idx ? "scale-125 ring-2 ring-white shadow-lg" : "opacity-75 hover:opacity-100"
                                }`}
                                style={{ backgroundColor: p.accent }}
                                title={p.label}
                              />
                            ))}
                          </div>

                          <button
                            type="submit"
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-neutral-950 font-black text-xs sm:text-sm flex items-center gap-1.5 transition shadow-lg ml-auto active:scale-95"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Beszúrás</span>
                          </button>
                        </div>
                      </form>

                      {/* FELADVÁNYOK TÁBLÁZATA / LISTÁJA */}
                      <div className="flex flex-col gap-2 max-h-56 sm:max-h-72 lg:max-h-84 overflow-y-auto pr-1">
                        {categories.map((cat, idx) => (
                          <div
                            key={`${cat.id}-${idx}`}
                            className="flex items-center justify-between p-3 rounded-2xl bg-neutral-950/90 border border-neutral-800/80 hover:border-neutral-700 text-xs sm:text-sm transition"
                          >
                            <div className="flex items-center gap-3 truncate">
                              <div className="w-4 h-4 rounded-full shrink-0 shadow-md" style={{ backgroundColor: cat.accent }} />
                              <div className="flex flex-col truncate">
                                <span className="font-extrabold text-white uppercase truncate text-xs sm:text-sm">{cat.label}</span>
                                <span className="text-[11px] text-neutral-400 truncate">{cat.desc}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 ml-3">
                              <button
                                onClick={() => {
                                  if (categories.length >= 14) return alert("Maximum 14 szelet engedélyezett!");
                                  setCategories((prev) => [...prev, { ...cat, id: `${cat.id}-${Date.now()}` }]);
                                }}
                                className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-amber-300 transition"
                                title="Másolás"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (categories.length <= 2) return alert("Legalább 2 szeletnek maradnia kell!");
                                  setCategories((prev) => prev.filter((_, i) => i !== idx));
                                }}
                                className="p-2 rounded-xl bg-neutral-900 hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400 transition"
                                title="Törlés"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* LÁBLÉC: MENTÉS ÉS VISSZAÁLLÍTÁS */}
                      <div className="flex justify-between items-center pt-3 border-t border-neutral-800 text-xs sm:text-sm mt-auto">
                        <button
                          onClick={() => setCategories(CATEGORIES)}
                          className="text-neutral-400 hover:text-amber-400 flex items-center gap-1.5 font-bold transition py-2 px-3 rounded-xl hover:bg-neutral-800/60"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Alapértelmezett (5 Szín)</span>
                        </button>

                        <button
                          onClick={() => setIsEditorOpen(false)}
                          className="px-8 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-neutral-950 font-black text-sm sm:text-base shadow-2xl hover:scale-105 active:scale-95 transition"
                        >
                          Kész (Mentés)
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};