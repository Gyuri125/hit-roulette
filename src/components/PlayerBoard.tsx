"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, RotateCcw, Plus, Trash2, Trophy, Disc, X, Smartphone, Eraser, LayoutGrid } from "lucide-react";
import confetti from "canvas-confetti";
import { Category } from "./RouletteWheel";

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
  isOnline?: boolean;
}

export const createEmptyGrid = () =>
  Array(5)
    .fill(null)
    .map(() => Array(5).fill(false));

export const checkBingo = (grid: boolean[][]): boolean => {
  for (let r = 0; r < 5; r++) {
    if (grid[r].every(Boolean)) return true;
  }
  for (let c = 0; c < 5; c++) {
    if ([0, 1, 2, 3, 4].every((r) => grid[r][c])) return true;
  }
  if ([0, 1, 2, 3, 4].every((i) => grid[i][i])) return true;
  if ([0, 1, 2, 3, 4].every((i) => grid[i][4 - i])) return true;

  return false;
};

const getWinningCells = (grid: boolean[][]): Set<string> => {
  const winning = new Set<string>();
  for (let r = 0; r < 5; r++) {
    if (grid[r].every(Boolean)) [0, 1, 2, 3, 4].forEach((c) => winning.add(`${r}-${c}`));
  }
  for (let c = 0; c < 5; c++) {
    if ([0, 1, 2, 3, 4].every((r) => grid[r][c])) [0, 1, 2, 3, 4].forEach((r) => winning.add(`${r}-${c}`));
  }
  if ([0, 1, 2, 3, 4].every((i) => grid[i][i])) [0, 1, 2, 3, 4].forEach((i) => winning.add(`${i}-${i}`));
  if ([0, 1, 2, 3, 4].every((i) => grid[i][4 - i])) [0, 1, 2, 3, 4].forEach((i) => winning.add(`${i}-${4 - i}`));
  return winning;
};

// ================= SINGLETON WEB AUDIO MOTOR =================
export const getSharedAudioContext = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  const win = window as any;
  if (!win.__hitsterAudioCtx) {
    const AudioCtx = window.AudioContext || win.webkitAudioContext;
    if (AudioCtx) {
      win.__hitsterAudioCtx = new AudioCtx();
    }
  }
  if (win.__hitsterAudioCtx && win.__hitsterAudioCtx.state === "suspended") {
    win.__hitsterAudioCtx.resume().catch(() => {});
  }
  return win.__hitsterAudioCtx || null;
};

export const playMarkerSound = (isMarking: boolean) => {
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (isMarking) {
      osc.type = "sine";
      osc.frequency.setValueAtTime(460, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    } else {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    }
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch (_) {}
};

interface PlayerBoardProps {
  players: PlayerData[];
  setPlayers: React.Dispatch<React.SetStateAction<PlayerData[]>>;
  activePlayerIdx: number;
  setActivePlayerIdx: (idx: number) => void;
  onStartSpinAndMusic?: () => void;
  isPlayingMusic?: boolean;
  activeCategory?: Category | null;
}

export const PlayerBoard: React.FC<PlayerBoardProps> = ({
  players,
  setPlayers,
  activePlayerIdx,
  setActivePlayerIdx,
  onStartSpinAndMusic,
  isPlayingMusic,
}) => {
  const [winnerAlert, setWinnerAlert] = useState<string | null>(null);
  const [showAllBoards, setShowAllBoards] = useState<boolean>(false);

  const currentPlayer = players[activePlayerIdx] || players[0];

  const toggleCell = (targetPlayerIdx: number, rIdx: number, cIdx: number) => {
    const targetPlayer = players[targetPlayerIdx];
    if (!targetPlayer) return;
    const willBeMarked = !targetPlayer.grid[rIdx][cIdx];

    playMarkerSound(willBeMarked);

    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(willBeMarked ? 35 : 15);
      } catch (_) {}
    }

    setPlayers((prev) =>
      prev.map((player, pIdx) => {
        if (pIdx !== targetPlayerIdx) return player;

        const newGrid = player.grid.map((row, r) =>
          row.map((cell, c) => (r === rIdx && c === cIdx ? !cell : cell))
        );

        const won = checkBingo(newGrid);

        if (won && !player.hasWon) {
          setWinnerAlert(player.name);
          confetti({
            particleCount: 130,
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
    setPlayers((prev) => prev.map((p, idx) => (idx === activePlayerIdx ? { ...p, name } : p)));
  };

  const updateNotes = (notes: string) => {
    setPlayers((prev) => prev.map((p, idx) => (idx === activePlayerIdx ? { ...p, notes } : p)));
  };

  const addPlayer = () => {
    if (players.length >= 10) return;
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
      prev.map((p, idx) => (idx === activePlayerIdx ? { ...p, grid: createEmptyGrid(), hasWon: false } : p))
    );
  };

  if (!currentPlayer) return null;

  const winningCells = getWinningCells(currentPlayer.grid);
  const score = currentPlayer.grid.flat().filter(Boolean).length;

  return (
    <div className="w-full max-w-5xl flex flex-col items-center gap-4 px-2">
      {winnerAlert && (
        <div className="w-full max-w-xl bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-violet-500/20 border-2 border-amber-400 p-4 rounded-2xl flex items-center justify-between shadow-2xl backdrop-blur-md animate-bounce">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-amber-400 shrink-0" />
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

      <div className="w-full max-w-xl flex flex-col gap-3">
        {onStartSpinAndMusic && (
          <button
            onClick={onStartSpinAndMusic}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-violet-600 text-neutral-950 font-black text-xs sm:text-sm uppercase tracking-widest shadow-lg shadow-rose-500/20 hover:scale-[1.01] active:scale-95 transition flex items-center justify-center gap-3"
          >
            <Disc className={`w-5 h-5 ${isPlayingMusic ? "animate-spin text-white" : ""}`} />
            <span>{isPlayingMusic ? "Zene szól • Új Rulett Pörgetés" : "Kör Indítása: Pörgetés & Zene"}</span>
          </button>
        )}

        <div className="w-full flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-1">
            {players.map((p, idx) => {
              const pScore = p.grid.flat().filter(Boolean).length;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setActivePlayerIdx(idx);
                    setShowAllBoards(false);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap border ${
                    !showAllBoards && activePlayerIdx === idx
                      ? "bg-amber-500 text-neutral-950 border-amber-400 shadow-md"
                      : "bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white"
                  }`}
                >
                  {p.isOnline ? <Smartphone className="w-3.5 h-3.5 text-cyan-400" /> : <Users className="w-3.5 h-3.5" />}
                  <span>{p.name}</span>
                  <span className="text-[10px] opacity-75 font-mono">({pScore})</span>
                  {p.hasWon && <Trophy className="w-3.5 h-3.5 text-amber-300 fill-current" />}
                </button>
              );
            })}

            {players.length < 10 && (
              <button
                onClick={addPlayer}
                className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-white transition shrink-0"
                title="Helyi játékos hozzáadása"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>

          {players.length > 1 && (
            <button
              onClick={() => setShowAllBoards((prev) => !prev)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 shrink-0 ${
                showAllBoards
                  ? "bg-violet-600 text-white border-violet-400 shadow-lg"
                  : "bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white"
              }`}
              title="Minden játékos táblájának megjelenítése egyszerre a TV-n"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Összes tábla ({players.length})</span>
            </button>
          )}
        </div>
      </div>

      {showAllBoards ? (
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {players.map((player, pIdx) => {
            const pScore = player.grid.flat().filter(Boolean).length;
            const pWinCells = getWinningCells(player.grid);
            return (
              <div
                key={player.id}
                onClick={() => {
                  setActivePlayerIdx(pIdx);
                  setShowAllBoards(false);
                }}
                className={`cursor-pointer rounded-3xl bg-neutral-900/90 border-2 p-4 flex flex-col gap-3 transition hover:scale-[1.01] shadow-xl ${
                  player.hasWon ? "border-amber-400 shadow-amber-500/10" : "border-neutral-800 hover:border-neutral-700"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    {player.isOnline && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                    <span className="font-black text-sm uppercase text-amber-400 truncate max-w-[150px]">
                      {player.name}
                    </span>
                    {player.hasWon && <Trophy className="w-4 h-4 text-amber-300" />}
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-neutral-950 border border-neutral-800 text-neutral-300">
                    {pScore}/25
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-1.5 bg-neutral-950 p-2 rounded-2xl border border-neutral-800">
                  {player.grid.map((row, r) =>
                    row.map((isMarked, c) => {
                      const isWinTile = pWinCells.has(`${r}-${c}`);
                      return (
                        <button
                          key={`${r}-${c}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCell(pIdx, r, c);
                          }}
                          className={`aspect-square rounded-lg flex items-center justify-center font-black text-lg text-neutral-950 transition ${
                            isWinTile ? "ring-2 ring-white scale-105 z-10" : ""
                          }`}
                          style={{ backgroundColor: TILE_COLORS[(r + c) % TILE_COLORS.length] }}
                        >
                          {isMarked ? "✕" : ""}
                        </button>
                      );
                    })
                  )}
                </div>

                {player.notes && (
                  <div className="bg-neutral-100 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-neutral-800 truncate">
                    📝 {player.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="relative w-full max-w-sm rounded-[32px] bg-neutral-900 border-4 border-neutral-800 shadow-[0_20px_50px_rgba(0,0,0,0.9)] p-4 sm:p-5 flex flex-col items-center gap-3.5">
          <div className="w-full flex justify-between items-center px-1">
            <div className="flex items-center gap-1.5">
              {currentPlayer.isOnline && (
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" title="Mobilról csatlakozva" />
              )}
              <input
                type="text"
                value={currentPlayer.name}
                onChange={(e) => updatePlayerName(e.target.value)}
                className="bg-transparent text-base font-black uppercase tracking-wider text-amber-400 focus:outline-none border-b border-dashed border-neutral-700 focus:border-amber-400 w-40"
                placeholder="Játékos neve"
              />
            </div>

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

          <div className="grid grid-cols-5 gap-2 w-full bg-neutral-950 p-2.5 rounded-2xl border border-neutral-800/80">
            {currentPlayer.grid.map((row, r) =>
              row.map((isMarked, c) => {
                const color = TILE_COLORS[(r + c) % TILE_COLORS.length];
                const isWinCell = winningCells.has(`${r}-${c}`);
                return (
                  <button
                    key={`${r}-${c}`}
                    onClick={() => toggleCell(activePlayerIdx, r, c)}
                    className={`aspect-square rounded-xl flex items-center justify-center relative transition transform active:scale-90 shadow select-none overflow-hidden ${
                      isWinCell ? "ring-4 ring-white shadow-[0_0_15px_#ffffff] scale-105 z-10" : ""
                    }`}
                    style={{ backgroundColor: color }}
                  >
                    <AnimatePresence>
                      {isMarked && (
                        <motion.span
                          initial={{ scale: 0, rotate: -45, opacity: 0 }}
                          animate={{ scale: [1.35, 1], rotate: 0, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 25 }}
                          className="text-2xl sm:text-3xl font-black text-neutral-950 select-none drop-shadow-sm pointer-events-none"
                        >
                          ✕
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                );
              })
            )}
          </div>

          <div className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">
            HITSTER BINGO {currentPlayer.isOnline ? "• ÉLŐ MOBIL SZINKRON" : ""}
          </div>

          <div className="w-full bg-neutral-100 rounded-2xl p-2.5 shadow-inner border border-neutral-300 flex flex-col">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] uppercase font-bold text-neutral-500 tracking-wider">
                Fehértábla (Tippek, évek):
              </span>
              {currentPlayer.notes && (
                <button
                  onClick={() => updateNotes("")}
                  className="flex items-center gap-1 text-[10px] font-bold text-neutral-500 hover:text-rose-600 transition px-1 py-0.5 rounded"
                >
                  <Eraser className="w-3 h-3 text-rose-500" />
                  <span>Jegyzet törlése</span>
                </button>
              )}
            </div>
            <textarea
              value={currentPlayer.notes}
              onChange={(e) => updateNotes(e.target.value)}
              placeholder="Pl. Queen - 1975, Michael Jackson - 1982..."
              rows={2}
              className="w-full bg-transparent text-neutral-900 font-semibold text-xs focus:outline-none resize-none font-sans"
            />
          </div>

          <div className="w-full flex justify-between items-center text-[10px] text-neutral-500 px-1 pt-0.5">
            <span>Kattints az X-eléshez</span>
            <button
              onClick={resetCurrentGrid}
              className="hover:text-rose-400 flex items-center gap-1 transition"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Tábla (X-ek) ürítése</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};