"use client";

import React, { useState } from "react";
import { Users, RotateCcw, Plus, Trash2, Trophy, Disc, X } from "lucide-react";
import confetti from "canvas-confetti";

const TILE_COLORS = [
  "#f59e0b", // Sárga
  "#10b981", // Zöld
  "#ec4899", // Rózsaszín
  "#8b5cf6", // Lila
  "#06b6d4", // Kék
];

export interface PlayerData {
  id: string;
  name: string;
  notes: string;
  grid: boolean[][];
  hasWon: boolean;
}

const createEmptyGrid = () =>
  Array(5)
    .fill(null)
    .map(() => Array(5).fill(false));

// Hitster Bingo ellenőrzése: Sor, Oszlop vagy Átló teljesülése
const checkBingo = (grid: boolean[][]): boolean => {
  // Sorok ellenőrzése
  for (let r = 0; r < 5; r++) {
    if (grid[r].every(Boolean)) return true;
  }
  // Oszlopok ellenőrzése
  for (let c = 0; c < 5; c++) {
    if ([0, 1, 2, 3, 4].every((r) => grid[r][c])) return true;
  }
  // Átlók ellenőrzése
  if ([0, 1, 2, 3, 4].every((i) => grid[i][i])) return true;
  if ([0, 1, 2, 3, 4].every((i) => grid[i][4 - i])) return true;

  return false;
};

interface PlayerBoardProps {
  onStartSpinAndMusic?: () => void;
  isPlayingMusic?: boolean;
}

export const PlayerBoard: React.FC<PlayerBoardProps> = ({
  onStartSpinAndMusic,
  isPlayingMusic,
}) => {
  const [players, setPlayers] = useState<PlayerData[]>([
    { id: "1", name: "Peti", notes: "2010's", grid: createEmptyGrid(), hasWon: false },
    { id: "2", name: "Evelin", notes: "Rock", grid: createEmptyGrid(), hasWon: false },
    { id: "3", name: "Gyuri", notes: "", grid: createEmptyGrid(), hasWon: false },
  ]);
  const [activePlayerIdx, setActivePlayerIdx] = useState(0);
  const [winnerAlert, setWinnerAlert] = useState<string | null>(null);

  const currentPlayer = players[activePlayerIdx] || players[0];

  const toggleCell = (rIdx: number, cIdx: number) => {
    setPlayers((prev) =>
      prev.map((player, pIdx) => {
        if (pIdx !== activePlayerIdx) return player;

        const newGrid = player.grid.map((row, r) =>
          row.map((cell, c) => (r === rIdx && c === cIdx ? !cell : cell))
        );

        const won = checkBingo(newGrid);

        // Ha most nyert először (friss Bingo)
        if (won && !player.hasWon) {
          setWinnerAlert(player.name);
          confetti({
            particleCount: 120,
            spread: 90,
            origin: { y: 0.5 },
            colors: ["#fbbf24", "#ec4899", "#3b82f6", "#10b981"],
          });
        }

        return { ...player, grid: newGrid, hasWon: won };
      })
    );
  };

  const updatePlayerName = (name: string) => {
    setPlayers((prev) =>
      prev.map((p, idx) => (idx === activePlayerIdx ? { ...p, name } : p))
    );
  };

  const updateNotes = (notes: string) => {
    setPlayers((prev) =>
      prev.map((p, idx) => (idx === activePlayerIdx ? { ...p, notes } : p))
    );
  };

  const addPlayer = () => {
    if (players.length >= 8) return;
    const newIdx = players.length + 1;
    const newPlayer: PlayerData = {
      id: String(Date.now()),
      name: `Játékos ${newIdx}`,
      notes: "",
      grid: createEmptyGrid(),
      hasWon: false,
    };
    setPlayers((prev) => [...prev, newPlayer]);
    setActivePlayerIdx(players.length);
  };

  const removePlayer = (idxToRemove: number) => {
    if (players.length <= 1) return;
    setPlayers((prev) => prev.filter((_, idx) => idx !== idxToRemove));
    setActivePlayerIdx(0);
  };

  const resetCurrentGrid = () => {
    setPlayers((prev) =>
      prev.map((p, idx) =>
        idx === activePlayerIdx
          ? { ...p, grid: createEmptyGrid(), hasWon: false, notes: "" }
          : p
      )
    );
  };

  const score = currentPlayer.grid.flat().filter(Boolean).length;

  return (
    <div className="w-full max-w-xl flex flex-col items-center gap-5 px-2">
      {/* GYŐZELMI ÉRTESÍTŐ MODAL (NEM ZÁRJA LE A JÁTÉKOT, BÁRMIKOR ELTÜNTETHETŐ) */}
      {winnerAlert && (
        <div className="w-full bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-violet-500/20 border-2 border-amber-400 p-4 rounded-2xl flex items-center justify-between shadow-2xl backdrop-blur-md animate-bounce">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-amber-400" />
            <div>
              <h3 className="text-sm font-black text-amber-300 uppercase tracking-wider">
                🎉 BINGO! GYŐZTES: {winnerAlert}!
              </h3>
              <p className="text-[11px] text-neutral-300">
                Kirakta az 5-ös sort/oszlopot! A játék folytatódhat a többi helyezésért.
              </p>
            </div>
          </div>
          <button
            onClick={() => setWinnerAlert(null)}
            className="p-1 rounded-lg bg-neutral-900/60 hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* GYORS PÖRGETÉS GOMB KÖZVETLENÜL A TÁBLÁBÓL */}
      {onStartSpinAndMusic && (
        <button
          onClick={onStartSpinAndMusic}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-violet-600 text-neutral-950 font-black text-sm uppercase tracking-widest shadow-lg shadow-rose-500/20 hover:scale-[1.01] active:scale-95 transition flex items-center justify-center gap-3"
        >
          <Disc className={`w-5 h-5 ${isPlayingMusic ? "animate-spin text-white" : ""}`} />
          <span>{isPlayingMusic ? "Zene szól • Új Rulett Pörgetés" : "Kör Indítása: Pörgetés & Zene"}</span>
        </button>
      )}

      {/* JÁTÉKOS VÁLASZTÓ TABS */}
      <div className="w-full flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {players.map((p, idx) => (
          <button
            key={p.id}
            onClick={() => setActivePlayerIdx(idx)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap border ${
              activePlayerIdx === idx
                ? "bg-amber-500 text-neutral-950 border-amber-400 shadow-md"
                : "bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{p.name}</span>
            {p.hasWon && <Trophy className="w-3 h-3 text-neutral-950" />}
          </button>
        ))}

        {players.length < 8 && (
          <button
            onClick={addPlayer}
            className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
            title="Új játékos"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* A FIZIKAI HITSTER TÁBLA DÍZÁJNJA */}
      <div className="relative w-full max-w-sm rounded-[32px] bg-neutral-900 border-4 border-neutral-800 shadow-[0_20px_50px_rgba(0,0,0,0.9)] p-4 sm:p-5 flex flex-col items-center gap-4">
        
        {/* Névadás és pontszám */}
        <div className="w-full flex justify-between items-center px-1">
          <input
            type="text"
            value={currentPlayer.name}
            onChange={(e) => updatePlayerName(e.target.value)}
            className="bg-transparent text-base font-black uppercase tracking-wider text-amber-400 focus:outline-none border-b border-dashed border-neutral-700 focus:border-amber-400 w-44"
            placeholder="Játékos neve"
          />

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-neutral-950 border border-neutral-800 text-neutral-300">
              {score} / 25
            </span>
            {players.length > 1 && (
              <button
                onClick={() => removePlayer(activePlayerIdx)}
                className="text-neutral-600 hover:text-rose-400 transition"
                title="Játékos törlése"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 5x5 SZÍNES HITSTER BINGO RÁCS */}
        <div className="grid grid-cols-5 gap-2 w-full bg-neutral-950 p-2.5 rounded-2xl border border-neutral-800/80">
          {currentPlayer.grid.map((row, r) =>
            row.map((isMarked, c) => {
              const color = TILE_COLORS[(r + c) % TILE_COLORS.length];
              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => toggleCell(r, c)}
                  className="aspect-square rounded-lg flex items-center justify-center relative transition transform active:scale-90 shadow"
                  style={{ backgroundColor: color }}
                >
                  {isMarked && (
                    <span className="text-2xl sm:text-3xl font-black text-neutral-950 select-none">
                      ✕
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        <div className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">
          HITSTER BINGO {currentPlayer.hasWon && "• NYERTES TÁBLA"}
        </div>

        {/* FEHÉRTÁBLÁS JEGYZET MEZŐ */}
        <div className="w-full bg-neutral-100 rounded-xl p-2.5 shadow-inner border border-neutral-300 flex flex-col">
          <span className="text-[9px] uppercase font-bold text-neutral-500 tracking-wider">
            Fehértábla (Tippek, évek):
          </span>
          <textarea
            value={currentPlayer.notes}
            onChange={(e) => updateNotes(e.target.value)}
            placeholder="Pl. Queen - 1975, Michael Jackson - 1982..."
            rows={2}
            className="w-full bg-transparent text-neutral-900 font-semibold text-xs focus:outline-none resize-none"
          />
        </div>

        {/* Törlés gomb */}
        <div className="w-full flex justify-between items-center text-[10px] text-neutral-500 px-1">
          <span>Kattints a négyzetekre az X-eléshez</span>
          <button
            onClick={resetCurrentGrid}
            className="hover:text-rose-400 flex items-center gap-1 transition"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Tábla ürítése</span>
          </button>
        </div>
      </div>
    </div>
  );
};