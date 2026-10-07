"use client";

import React, { useState } from "react";
import { Users, RotateCcw, Plus, Trash2 } from "lucide-react";

// Az 5 Hitster alapszín a 2. kép mintájára
const TILE_COLORS = [
  "#f59e0b", // Sárga
  "#10b981", // Zöld
  "#ec4899", // Rózsaszín
  "#8b5cf6", // Lila
  "#06b6d4", // Ciánkék
];

interface TeamData {
  id: string;
  name: string;
  notes: string;
  // 5x5 mátrix a beikszelt mezőknek (true / false)
  grid: boolean[][];
}

const createInitialGrid = () =>
  Array(5)
    .fill(null)
    .map(() => Array(5).fill(false));

export const PlayerBoard: React.FC = () => {
  const [teams, setTeams] = useState<TeamData[]>([
    { id: "1", name: "1. Csapat", notes: "2010's", grid: createInitialGrid() },
    { id: "2", name: "2. Csapat", notes: "", grid: createInitialGrid() },
  ]);
  const [activeTeamIdx, setActiveTeamIdx] = useState(0);

  const currentTeam = teams[activeTeamIdx] || teams[0];

  const toggleCell = (rIdx: number, cIdx: number) => {
    setTeams((prev) =>
      prev.map((t, idx) => {
        if (idx !== activeTeamIdx) return t;
        const newGrid = t.grid.map((row, r) =>
          row.map((val, c) => (r === rIdx && c === cIdx ? !val : val))
        );
        return { ...t, grid: newGrid };
      })
    );
  };

  const handleNameChange = (name: string) => {
    setTeams((prev) =>
      prev.map((t, idx) => (idx === activeTeamIdx ? { ...t, name } : t))
    );
  };

  const handleNotesChange = (notes: string) => {
    setTeams((prev) =>
      prev.map((t, idx) => (idx === activeTeamIdx ? { ...t, notes } : t))
    );
  };

  const resetCurrentGrid = () => {
    if (!confirm("Biztosan törölni szeretnéd a tábla összes ikszét?")) return;
    setTeams((prev) =>
      prev.map((t, idx) =>
        idx === activeTeamIdx ? { ...t, grid: createInitialGrid(), notes: "" } : t
      )
    );
  };

  const addTeam = () => {
    if (teams.length >= 6) return;
    const newId = String(teams.length + 1);
    setTeams((prev) => [
      ...prev,
      { id: newId, name: `${newId}. Csapat`, notes: "", grid: createInitialGrid() },
    ]);
    setActiveTeamIdx(teams.length);
  };

  // Kiszámoljuk hány darab iksz van lerakva
  const score = currentTeam.grid.flat().filter(Boolean).length;

  return (
    <div className="w-full max-w-xl flex flex-col items-center gap-6">
      {/* Csapatválasztó gombok */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {teams.map((t, idx) => (
          <button
            key={t.id}
            onClick={() => setActiveTeamIdx(idx)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border ${
              activeTeamIdx === idx
                ? "bg-amber-500 text-neutral-950 border-amber-400 shadow-lg shadow-amber-500/20"
                : "bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{t.name}</span>
          </button>
        ))}

        {teams.length < 6 && (
          <button
            onClick={addTeam}
            className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-white text-xs font-bold transition"
            title="Új csapat hozzáadása"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* A FIZIKAI TÁBLA DÍZÁJNJA (2. KÉP MINTÁJÁRA) */}
      <div className="relative w-80 sm:w-96 rounded-[28px] bg-neutral-900 border-4 border-neutral-800 shadow-[0_20px_50px_rgba(0,0,0,0.9)] p-5 flex flex-col items-center gap-4">
        
        {/* Felső csapatsáv és pontszám */}
        <div className="w-full flex justify-between items-center px-1">
          <input
            type="text"
            value={currentTeam.name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="bg-transparent text-sm font-black uppercase tracking-wider text-amber-400 focus:outline-none focus:border-b border-amber-400 w-36"
          />
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-neutral-950 border border-neutral-800 text-neutral-300">
            Pont: <strong className="text-amber-400">{score}</strong> / 25
          </span>
        </div>

        {/* 5x5 SZÍNES HITSTER BINGO RÁCS */}
        <div className="grid grid-cols-5 gap-2.5 w-full bg-neutral-950 p-3 rounded-2xl border border-neutral-800">
          {currentTeam.grid.map((row, r) =>
            row.map((isMarked, c) => {
              // Soronként és oszloponként váltakozó partiszínek
              const color = TILE_COLORS[(r + c) % TILE_COLORS.length];
              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => toggleCell(r, c)}
                  className="aspect-square rounded-lg flex items-center justify-center relative transition transform active:scale-90 shadow-md"
                  style={{ backgroundColor: color }}
                >
                  {isMarked && (
                    <span className="text-2xl sm:text-3xl font-black text-neutral-950 select-none drop-shadow-md">
                      ✕
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* HITSTER LOGÓ ELVÁLASZTÓ */}
        <div className="text-xs font-black tracking-widest text-neutral-500 uppercase">
          HITSTER BINGO
        </div>

        {/* ALSÓ FEHÉRTÁBLA (DRY-ERASE WHITEBOARD MEZŐ) */}
        <div className="w-full bg-neutral-100 rounded-xl p-3 shadow-inner border border-neutral-300 flex flex-col">
          <span className="text-[9px] uppercase font-bold text-neutral-400 tracking-wider">
            Fehértábla / Jegyzetek:
          </span>
          <textarea
            value={currentTeam.notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Írd ide a tippeket, éveket..."
            rows={2}
            className="w-full bg-transparent text-neutral-900 font-medium text-xs focus:outline-none resize-none font-sans"
          />
        </div>

        {/* Törlés gomb */}
        <button
          onClick={resetCurrentGrid}
          className="self-end text-[10px] text-neutral-500 hover:text-rose-400 flex items-center gap-1 transition"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Tábla törlése</span>
        </button>
      </div>
    </div>
  );
};