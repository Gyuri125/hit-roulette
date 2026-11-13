"use client";

import React from "react";
import { motion } from "framer-motion";
import { Flame, Sparkles, Trophy } from "lucide-react";
import { Category } from "@/components/RouletteWheel";
import { PlayerData, getCategoryColorIndex } from "@/components/PlayerBoard";
import {
  TILE_COLORS,
  getMatchPointCells,
  isOneAwayFromBingo,
} from "@/lib/bingoLogic";
import { PlayerGuess, PlayerSessionStats } from "@/types/game";

interface LiveScoreboardStripProps {
  players: PlayerData[];
  roundGuesses: Record<string, PlayerGuess>;
  sessionStats: Record<string, PlayerSessionStats>;
  activeCategory: Category | null;
  isFlipped: boolean;
  onSelectPlayerBoard: (playerIndex: number) => void;
}

export const LiveScoreboardStrip: React.FC<LiveScoreboardStripProps> = ({
  players,
  roundGuesses,
  sessionStats,
  activeCategory,
  isFlipped,
  onSelectPlayerBoard,
}) => {
  if (!players.length) return null;

  const guessValues = Object.values(roundGuesses);
  const activeCount = players.filter(
    (p) => p.isOnline || p.id !== "host" || guessValues.some((g) => g.playerName.toLowerCase() === p.name.toLowerCase())
  ).length || players.length;

  const ranked = players
    .map((p, originalIdx) => {
      const markedCount = p.grid.flat().filter(Boolean).length;
      return {
        player: p,
        originalIdx,
        markedCount,
        isMatchPoint: !p.hasWon && isOneAwayFromBingo(p.grid),
        matchCells: !p.hasWon ? getMatchPointCells(p.grid) : new Set<string>(),
        streak: sessionStats[p.name]?.currentStreak || 0,
        guess: guessValues.find(
          (g) => g.playerName.trim().toLowerCase() === p.name.trim().toLowerCase()
        ),
      };
    })
    .sort(
      (a, b) =>
        Number(b.player.hasWon) - Number(a.player.hasWon) ||
        b.markedCount - a.markedCount ||
        a.originalIdx - b.originalIdx
    );

  const targetColorIdx = getCategoryColorIndex(activeCategory);

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-[1600px] bg-neutral-900/75 border border-neutral-800/90 rounded-3xl p-3 sm:p-4 backdrop-blur-md shadow-2xl"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 px-1">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-neutral-100">
            📊 Élő Játékállás & Mini-Táblák
          </h3>
          <span className="text-[10px] sm:text-xs font-mono px-2 py-0.5 rounded-full bg-neutral-950 border border-neutral-800 text-emerald-300 font-bold">
            {guessValues.length}/{activeCount} tipp beérkezett
          </span>
        </div>

        <div className="flex items-center gap-3 text-[10px] font-bold text-neutral-400">
          <span className="flex items-center gap-1">🔥 Meccslabda</span>
          <span className="flex items-center gap-1">✅ Tippelt</span>
          <span className="flex items-center gap-1">⭐ Joker</span>
          <span className="hidden sm:inline text-neutral-500 italic">Kattints a játékosra a táblához</span>
        </div>
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-neutral-700">
        {ranked.map(({ player, originalIdx, markedCount, isMatchPoint, matchCells, streak, guess }, rankIdx) => {
          const pendingCredits = (player.credits ?? 0) + (player.jokerCredits ?? 0);

          return (
            <motion.button
              key={player.id}
              type="button"
              layout
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectPlayerBoard(originalIdx)}
              className={`min-w-[215px] max-w-[260px] shrink-0 text-left p-2.5 rounded-2xl border transition flex items-center gap-2.5 ${
                player.hasWon
                  ? "bg-gradient-to-br from-amber-500/20 to-neutral-950 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                  : isMatchPoint
                  ? "bg-gradient-to-br from-rose-500/15 to-neutral-950 border-amber-400/75 shadow-[0_0_14px_rgba(245,158,11,0.18)]"
                  : "bg-neutral-950/90 border-neutral-800 hover:border-neutral-600"
              }`}
              title={`${player.name} teljes 5x5 táblájának megnyitása`}
            >
              {/* Mini 5x5 Bingo tábla */}
              <div className="grid grid-cols-5 gap-[2px] w-10 h-10 shrink-0 p-1 rounded-xl bg-neutral-900 border border-neutral-800">
                {player.grid.map((row, r) =>
                  row.map((marked, c) => {
                    const colorIdx = player.colorGrid?.[r]?.[c] ?? ((r + c) % TILE_COLORS.length);
                    const isCellMatch = !marked && matchCells.has(`${r}-${c}`);
                    const isCategoryTarget = !marked && targetColorIdx !== -1 && colorIdx === targetColorIdx;
                    return (
                      <span
                        key={`${r}-${c}`}
                        className={`rounded-[2px] flex items-center justify-center ${
                          isCellMatch
                            ? "ring-1 ring-amber-300 animate-pulse"
                            : isCategoryTarget
                            ? "ring-1 ring-white/60"
                            : ""
                        }`}
                        style={{
                          backgroundColor: TILE_COLORS[colorIdx],
                          opacity: marked ? 1 : isCategoryTarget || isCellMatch ? 0.85 : 0.35,
                        }}
                      >
                        {marked && <span className="w-1 h-1 rounded-full bg-neutral-950 shadow-sm" />}
                      </span>
                    );
                  })
                )}
              </div>

              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="text-[10px] font-mono font-black text-neutral-500">#{rankIdx + 1}</span>
                    {player.isOnline && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
                    <span className="text-xs font-black text-white truncate">{player.name}</span>
                  </div>
                  <span className="text-[10px] font-mono font-black text-amber-400 shrink-0">
                    {markedCount}/25
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1 text-[9px] font-bold">
                  {player.hasWon && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-400 text-neutral-950 font-black">
                      🏆 BINGO!
                    </span>
                  )}
                  {isMatchPoint && (
                    <span className="px-1.5 py-0.5 rounded bg-rose-500/25 border border-amber-400/60 text-amber-200 animate-pulse">
                      🔥 Meccslabda
                    </span>
                  )}
                  {streak >= 2 && (
                    <span className="px-1.5 py-0.5 rounded bg-orange-500/20 border border-orange-400/40 text-orange-300 flex items-center gap-0.5">
                      <Flame className="w-2.5 h-2.5" />
                      {streak}×
                    </span>
                  )}
                  {(player.jokerCredits ?? 0) > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5" />
                      {player.jokerCredits}⭐
                    </span>
                  )}
                  {pendingCredits > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
                      +{pendingCredits} X vár
                    </span>
                  )}
                </div>

                {!isFlipped && (
                  <div className="text-[9px] font-bold mt-0.5">
                    {guess ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <span>✅ Tippelt</span>
                        {guess.riskDouble && <span className="text-amber-300">🎲2x</span>}
                      </span>
                    ) : (
                      <span className="text-neutral-500">⏳ Gondolkodik</span>
                    )}
                  </div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.section>
  );
};
