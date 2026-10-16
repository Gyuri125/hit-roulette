"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Trophy, Settings2, Plus, Trash2, Copy, RotateCcw, X, Layers, Palette } from "lucide-react";
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
}

export const RouletteWheel: React.FC<RouletteWheelProps> = ({ onSpinEnd }) => {
  const [categories, setCategories] = useState<Category[]>(CATEGORIES);
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<Category | null>(null);
  const [discoStep, setDiscoStep] = useState(0);

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
    if (numSlices <= 5) return { line1: 12, line2: 11, y1: 76, y2: 94 };
    if (numSlices <= 8) return { line1: 10, line2: 9, y1: 72, y2: 86 };
    return { line1: 8.5, line2: 7.5, y1: 68, y2: 80 };
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
            className="uppercase tracking-wider font-sans drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
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
              className="uppercase tracking-wider font-sans drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] opacity-95"
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
    <div className="flex flex-col items-center gap-4 w-full max-w-md select-none">
      <div
        onClick={spin}
        className="relative w-72 h-72 sm:w-84 sm:h-84 lg:w-92 lg:h-92 flex items-center justify-center cursor-pointer group"
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
              <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md overflow-y-auto">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="w-full max-w-4xl bg-neutral-900 border-2 border-neutral-800 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col gap-5 my-auto max-h-[92vh] overflow-y-auto"
                >
                  <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <Settings2 className="w-5 h-5 text-amber-400" />
                      <div>
                        <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                          Kerék Stúdió & Feladvány-kezelő
                        </h3>
                        <p className="text-[11px] text-neutral-400">
                          Szerkeszd a feladványokat és figyeld az élő előnézetet!
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsEditorOpen(false)}
                      className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex flex-col md:flex-row items-stretch gap-6">
                    <div className="w-full md:w-[260px] shrink-0 flex flex-col items-center justify-center p-4 rounded-2xl bg-neutral-950 border border-neutral-800/80 shadow-inner">
                      <div className="flex items-center justify-between w-full mb-2 px-1">
                        <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" /> Élő Előnézet
                        </span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-300">
                          {categories.length} szelet
                        </span>
                      </div>

                      <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-full p-2 bg-neutral-900 border-4 border-neutral-800 shadow-2xl my-2 shrink-0">
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-20 w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-t-[16px] border-t-amber-400" />
                        <div className="w-full h-full rounded-full overflow-hidden">
                          {renderWheelSvg(true)}
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col gap-4 min-w-0">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                          <Layers className="w-3 h-3 text-amber-400" /> Kész Csomagok
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {Object.entries(CHALLENGE_PRESETS).map(([key, pack]) => (
                            <button
                              key={key}
                              onClick={() => setCategories(pack.categories)}
                              className="p-2 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-amber-400/50 hover:bg-neutral-800/40 text-left transition flex flex-col"
                            >
                              <strong className="text-amber-300 font-bold text-xs truncate w-full">{pack.name}</strong>
                              <span className="text-[10px] text-neutral-500">{pack.categories.length} feladvány</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <form onSubmit={handleAddCustomCategory} className="flex flex-col gap-2.5 bg-neutral-950 p-3 rounded-2xl border border-neutral-800">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                          <Plus className="w-3 h-3 text-amber-400" /> Saját Feladvány Hozzáadása
                        </span>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Feladvány neve (pl. 2000 Után?)"
                            value={newLabel}
                            onChange={(e) => setNewLabel(e.target.value)}
                            className="bg-neutral-900 text-xs px-3 py-2 rounded-xl text-white border border-neutral-800 focus:outline-none focus:border-amber-400"
                          />
                          <input
                            type="text"
                            placeholder="Szabály / Pontozási leírás"
                            value={newDesc}
                            onChange={(e) => setNewDesc(e.target.value)}
                            className="bg-neutral-900 text-xs px-3 py-2 rounded-xl text-white border border-neutral-800 focus:outline-none focus:border-amber-400"
                          />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-neutral-800/60">
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span className="text-neutral-500 font-bold">Kártya:</span>
                            <select
                              value={newTargetType}
                              onChange={(e) => setNewTargetType(e.target.value as TargetHighlight)}
                              className="bg-neutral-900 text-xs text-white border border-neutral-800 rounded-lg px-2 py-1 focus:outline-none"
                            >
                              <option value="year">📅 Évszám</option>
                              <option value="title">🎵 Dalcím</option>
                              <option value="artist">🎤 Előadó</option>
                              <option value="all">✨ Mindent bele</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-1">
                            <Palette className="w-3.5 h-3.5 text-neutral-500 mr-0.5" />
                            {COLOR_PRESETS.map((p, idx) => (
                              <button
                                key={p.label}
                                type="button"
                                onClick={() => setSelectedColorIdx(idx)}
                                className={`w-4 h-4 rounded-full transition transform ${
                                  selectedColorIdx === idx ? "scale-125 ring-2 ring-white" : "opacity-70 hover:opacity-100"
                                }`}
                                style={{ backgroundColor: p.accent }}
                              />
                            ))}
                          </div>

                          <button
                            type="submit"
                            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs flex items-center gap-1 transition shadow ml-auto"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Beszúrás</span>
                          </button>
                        </div>
                      </form>

                      <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
                        {categories.map((cat, idx) => (
                          <div
                            key={`${cat.id}-${idx}`}
                            className="flex items-center justify-between p-2 rounded-xl bg-neutral-950 border border-neutral-800/80 text-xs"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.accent }} />
                              <div className="flex flex-col truncate">
                                <span className="font-bold text-white uppercase truncate">{cat.label}</span>
                                <span className="text-[10px] text-neutral-500 truncate">{cat.desc}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0 ml-2">
                              <button
                                onClick={() => {
                                  if (categories.length >= 14) return alert("Maximum 14 szelet engedélyezett!");
                                  setCategories((prev) => [...prev, { ...cat, id: `${cat.id}-${Date.now()}` }]);
                                }}
                                className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-amber-300 transition"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => {
                                  if (categories.length <= 2) return alert("Legalább 2 szeletnek maradnia kell!");
                                  setCategories((prev) => prev.filter((_, i) => i !== idx));
                                }}
                                className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-rose-400 transition"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-neutral-800 text-xs mt-auto">
                        <button
                          onClick={() => setCategories(CATEGORIES)}
                          className="text-neutral-500 hover:text-amber-400 flex items-center gap-1 transition"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Alapértelmezett (5 Szín)</span>
                        </button>

                        <button
                          onClick={() => setIsEditorOpen(false)}
                          className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black transition"
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