"use client";

import React from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Bell, CheckCircle2, Disc3, Play, SkipForward, Swords, Trophy, X } from "lucide-react";
import { Track } from "@/types/track";
import { PlayerGuess } from "@/types/game";

interface TieBreakerModalProps {
  mounted: boolean;
  isOpen: boolean;
  contenders: string[];
  winner: string | null;
  currentTrack: Track | undefined;
  isPlaying: boolean;
  isFlipped: boolean;
  buzzedPlayer: string | null;
  roundGuesses: Record<string, PlayerGuess>;
  onClose: () => void;
  onPlayToggle: () => void;
  onNextTrack: () => void;
  onRevealTrack: () => void;
  onCrownWinner: (winnerName: string) => void;
}

export const TieBreakerModal: React.FC<TieBreakerModalProps> = ({
  mounted,
  isOpen,
  contenders,
  winner,
  currentTrack,
  isPlaying,
  isFlipped,
  buzzedPlayer,
  roundGuesses,
  onClose,
  onPlayToggle,
  onNextTrack,
  onRevealTrack,
  onCrownWinner,
}) => {
  if (!mounted || !isOpen) return null;

  const contenderGuesses = contenders.map((name) => {
    const key = Object.keys(roundGuesses).find(
      (k) => k.trim().toLowerCase() === name.trim().toLowerCase()
    );
    const guess = key ? roundGuesses[key] : undefined;
    const yearDiff = guess && currentTrack ? Math.abs(guess.year - currentTrack.year) : null;
    return { name, guess, yearDiff };
  });

  // Rendezzük évszámeltérés szerint ha felfordult a kártya
  const sortedContenders = [...contenderGuesses].sort((a, b) => {
    if (!isFlipped) return 0;
    const diffA = a.yearDiff ?? 9999;
    const diffB = b.yearDiff ?? 9999;
    return diffA - diffB || (a.guess?.submittedAt ?? Infinity) - (b.guess?.submittedAt ?? Infinity);
  });

  const bestAutoCandidate =
    isFlipped && sortedContenders[0]?.guess ? sortedContenders[0].name : null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-2xl bg-gradient-to-b from-neutral-900 via-neutral-950 to-neutral-950 border-2 border-amber-400 rounded-[32px] p-6 shadow-[0_0_90px_rgba(245,158,11,0.45)] flex flex-col gap-5 text-white relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-rose-500/30 to-amber-500/20 border border-amber-400/50 text-amber-400 animate-pulse">
              <Swords className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-rose-400 to-amber-300">
                🏆 Hirtelen Halál Szuperdöntő!
              </h2>
              <p className="text-xs text-neutral-400">
                Holtverseny a Bingónál! 1 dal dönt: ki tippel pontosabban vagy csap le előbb a Buzzerre?
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {winner ? (
          <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500/25 via-yellow-500/15 to-amber-500/25 border-2 border-amber-400 text-center flex flex-col items-center gap-3">
            <Trophy className="w-14 h-14 text-amber-300 animate-bounce" />
            <div className="text-xs font-black uppercase tracking-widest text-amber-300">
              A Szuperdöntő Abszolút Győztese
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white uppercase tracking-wide">
              👑 {winner}!
            </div>
            <button
              onClick={onClose}
              className="mt-2 px-6 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs uppercase tracking-wider"
            >
              Vissza a játékhoz
            </button>
          </div>
        ) : (
          <>
            {/* Párbaj dal vezérlő */}
            <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Disc3 className={`w-9 h-9 text-amber-400 ${isPlaying ? "animate-spin" : ""}`} />
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                    Párbaj Dal
                  </div>
                  <div className="text-sm font-black text-white">
                    {isFlipped && currentTrack
                      ? `${currentTrack.year} • ${currentTrack.artist} – ${currentTrack.title}`
                      : "🎵 Dal elrejtve — Hallgassátok és tippeljetek!"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onPlayToggle}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isPlaying ? "Szünet" : "Indítás"}</span>
                </button>
                <button
                  onClick={onNextTrack}
                  className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs flex items-center gap-1"
                  title="Másik párbaj dal"
                >
                  <SkipForward className="w-3.5 h-3.5 text-amber-400" />
                  <span>Másik dal</span>
                </button>
                <button
                  onClick={onRevealTrack}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 font-black text-xs"
                >
                  {isFlipped ? "Elrejt" : "Felfedés"}
                </button>
              </div>
            </div>

            {buzzedPlayer && contenders.some((c) => c.toLowerCase() === buzzedPlayer.toLowerCase()) && (
              <div className="p-3 rounded-2xl bg-rose-500/20 border-2 border-rose-400 flex items-center justify-between animate-pulse">
                <span className="font-black text-sm text-rose-200 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-rose-400" />
                  🔔 {buzzedPlayer} csapott le először a Buzzerre!
                </span>
                <button
                  onClick={() => onCrownWinner(buzzedPlayer)}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-black text-xs"
                >
                  👑 Koronázás
                </button>
              </div>
            )}

            {/* Döntősök kártyái */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sortedContenders.map(({ name, guess, yearDiff }) => {
                const isSuggested = bestAutoCandidate === name;
                return (
                  <div
                    key={name}
                    className={`p-4 rounded-2xl border-2 flex flex-col gap-2 transition ${
                      isSuggested
                        ? "bg-amber-500/15 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.3)]"
                        : "bg-neutral-950 border-neutral-800"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-base text-amber-300 uppercase">{name}</span>
                      {guess ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Tippelt
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-neutral-500">⏳ Még nem tippelt</span>
                      )}
                    </div>

                    {isFlipped && guess ? (
                      <div className="text-xs text-neutral-300 bg-neutral-900 p-2 rounded-xl border border-neutral-800">
                        <div className="font-black font-mono text-amber-400 text-base">
                          {guess.year}{" "}
                          <span className="text-xs text-neutral-400">
                            ({yearDiff === 0 ? "🎯 TELITALÁLAT!" : `±${yearDiff} év`})
                          </span>
                        </div>
                        {(guess.artistGuess || guess.titleGuess || guess.text) && (
                          <div className="text-[11px] text-neutral-400 mt-0.5 truncate">
                            {guess.artistGuess || guess.titleGuess
                              ? `${guess.artistGuess || "-"} – ${guess.titleGuess || "-"}`
                              : guess.text}
                          </div>
                        )}
                      </div>
                    ) : null}

                    <button
                      onClick={() => onCrownWinner(name)}
                      className="mt-auto w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-neutral-950 font-black text-xs uppercase tracking-wider transition active:scale-95"
                    >
                      👑 {name} nyerte a párbajt!
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </motion.div>
    </div>,
    document.body
  );
};

