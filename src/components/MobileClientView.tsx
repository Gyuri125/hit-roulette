"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  CheckCircle2,
  Crown,
  Dices,
  Disc,
  Download,
  Eraser,
  Eye,
  Flame,
  Lightbulb,
  Lock,
  Play,
  Send,
  ShieldCheck,
  Shuffle,
  SkipForward,
  Sparkles,
  Swords,
  Timer,
  Tv,
  X,
} from "lucide-react";
import { Category } from "@/components/RouletteWheel";
import { TILE_COLORS, getCategoryColorIndex } from "@/components/PlayerBoard";
import { getMatchPointCells, isOneAwayFromBingo } from "@/lib/bingoLogic";
import {
  FractionalPointsRate,
  PersonalRoundFeedback,
  RemoteCommand,
  RoundHint,
  SoundEffectType,
  TieBreakerState,
  getFractionalThreshold,
} from "@/types/game";

export interface MobileRoundPhase {
  isPlaying: boolean;
  isFlipped: boolean;
  timeLeft: number;
  selectedDuration: number;
  syncedAt: number;
}

interface MobileClientViewProps {
  playerName: string;
  roomCode: string;
  wakeLockActive: boolean;
  activeCategory: Category | null;
  doubleOrNothingEnabled: boolean;
  strictQuizMode: boolean;
  fractionalPointsRate: FractionalPointsRate;
  hostYearRange: { min: number; max: number } | null;
  roundPhase: MobileRoundPhase;
  personalFeedback: PersonalRoundFeedback | null;
  onDismissFeedback: () => void;
  tieBreaker: TieBreakerState | null;
  activeHint?: RoundHint | null;
  clientGrid: boolean[][];
  clientColorGrid: number[][];
  clientNotes: string;
  clientCredits: number;
  clientJokerCredits: number;
  clientPartialPoints: number;
  clientPenaltyDebt: number;
  clientRewardBanner: string | null;
  clientGuessYear: number;
  clientGuessText: string;
  clientGuessArtist: string;
  clientGuessTitle: string;
  clientRiskDouble: boolean;
  isGuessLocked: boolean;
  isRemoteOpen: boolean;
  setIsRemoteOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setClientGuessYear: React.Dispatch<React.SetStateAction<number>>;
  setClientGuessText: (val: string) => void;
  setClientGuessArtist: (val: string) => void;
  setClientGuessTitle: (val: string) => void;
  setClientRiskDouble: React.Dispatch<React.SetStateAction<boolean>>;
  setIsGuessLocked: (val: boolean) => void;
  onLockPinGate: () => void;
  onLeave: () => void;
  onSendRemoteCommand: (cmd: RemoteCommand) => void;
  onSendReaction: (emoji: string, sound?: SoundEffectType) => void;
  onSubmitGuess: () => void;
  onBuzzer: () => void;
  onTileClick: (r: number, c: number) => void;
  onNotesChange: (notes: string) => void;
  onNotesBroadcast: (notes: string) => void;
  onRerollColors: () => void;
}

const DECADE_SHORTCUTS = [
  { label: "70s", year: 1975 },
  { label: "80s", year: 1985 },
  { label: "90s", year: 1995 },
  { label: "00s", year: 2005 },
  { label: "10s", year: 2015 },
  { label: "20s", year: 2022 },
];

export const MobileClientView: React.FC<MobileClientViewProps> = ({
  playerName,
  roomCode,
  wakeLockActive,
  activeCategory,
  doubleOrNothingEnabled,
  strictQuizMode,
  fractionalPointsRate,
  hostYearRange,
  roundPhase,
  personalFeedback,
  onDismissFeedback,
  tieBreaker,
  activeHint = null,
  clientGrid,
  clientColorGrid,
  clientNotes,
  clientCredits,
  clientJokerCredits,
  clientPartialPoints,
  clientPenaltyDebt,
  clientRewardBanner,
  clientGuessYear,
  clientGuessText,
  clientGuessArtist,
  clientGuessTitle,
  clientRiskDouble,
  isGuessLocked,
  isRemoteOpen,
  setIsRemoteOpen,
  setClientGuessYear,
  setClientGuessText,
  setClientGuessArtist,
  setClientGuessTitle,
  setClientRiskDouble,
  setIsGuessLocked,
  onLockPinGate,
  onLeave,
  onSendRemoteCommand,
  onSendReaction,
  onSubmitGuess,
  onBuzzer,
  onTileClick,
  onNotesChange,
  onNotesBroadcast,
  onRerollColors,
}) => {
  const minSliderYear = hostYearRange?.min ?? 1950;
  const maxSliderYear = hostYearRange?.max ?? 2026;
  const notesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [liveTimeLeft, setLiveTimeLeft] = useState<number>(roundPhase.timeLeft);
  const [showPwaHint, setShowPwaHint] = useState<boolean>(false);

  // PWA standalone ellenőrzés
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    const dismissed = localStorage.getItem("hit_pwa_hint_dismissed") === "true";
    if (!isStandalone && !dismissed) {
      setShowPwaHint(true);
    }
  }, []);

  // Szinkronizált visszaszámláló sima kliens-oldali interpolációja
  useEffect(() => {
    const computeRemaining = () => {
      if (!roundPhase.isPlaying || roundPhase.selectedDuration <= 0) {
        return roundPhase.timeLeft;
      }
      const elapsedSec = Math.floor((Date.now() - roundPhase.syncedAt) / 1000);
      return Math.max(0, roundPhase.timeLeft - Math.max(0, elapsedSec));
    };

    setLiveTimeLeft(computeRemaining());
    if (!roundPhase.isPlaying || roundPhase.selectedDuration <= 0) return;

    const timer = setInterval(() => {
      setLiveTimeLeft(computeRemaining());
    }, 500);
    return () => clearInterval(timer);
  }, [roundPhase]);

  useEffect(() => {
    return () => {
      if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    };
  }, []);

  const handleNotesInput = (value: string) => {
    onNotesChange(value);
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    notesTimerRef.current = setTimeout(() => {
      onNotesBroadcast(value);
    }, 300);
  };

  const matchPointCells = useMemo(() => getMatchPointCells(clientGrid), [clientGrid]);
  const isNearBingo = useMemo(() => isOneAwayFromBingo(clientGrid), [clientGrid]);

  const progressPercent =
    roundPhase.selectedDuration > 0
      ? Math.max(0, Math.min(100, (liveTimeLeft / roundPhase.selectedDuration) * 100))
      : 100;

  const isInTieBreaker = Boolean(
    tieBreaker?.active &&
      tieBreaker.contenders.some((c) => c.trim().toLowerCase() === playerName.trim().toLowerCase())
  );

  const stepYear = (delta: number) => {
    setIsGuessLocked(false);
    setClientGuessYear((y) => Math.max(minSliderYear, Math.min(maxSliderYear, y + delta)));
  };

  return (
    <main className="min-h-[100dvh] bg-neutral-950 text-white flex flex-col items-center justify-between p-3 sm:p-4 select-none">
      <header className="w-full max-w-sm flex justify-between items-center py-2 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <h1 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider truncate max-w-[140px]">
              {playerName}
            </h1>
            {wakeLockActive && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                🔆 Ébren
              </span>
            )}
          </div>
          <p className="text-[10px] text-neutral-500 font-mono">
            SZOBA: {roomCode} • PONT: {clientGrid.flat().filter(Boolean).length}/25
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsRemoteOpen((prev) => !prev)}
            className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg border transition ${
              isRemoteOpen
                ? "bg-amber-500 text-neutral-950 border-amber-400 shadow-lg"
                : "bg-neutral-900 text-amber-400 border-neutral-800"
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>TV Vezérlő</span>
          </button>

          <button
            onClick={onLockPinGate}
            className="text-xs text-neutral-500 hover:text-amber-400 p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 transition"
            title="PIN Zárolás"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onLeave}
            className="text-xs text-neutral-500 hover:text-rose-400 px-2 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 transition"
          >
            Kilép
          </button>
        </div>
      </header>

      {/* PWA Teljes képernyős telepítési tipp */}
      {showPwaHint && (
        <div className="w-full max-w-sm mt-1.5 px-3 py-2 rounded-xl bg-neutral-900/90 border border-cyan-500/40 text-[10px] text-cyan-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Download className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>
              <b>Tipp:</b> Add hozzá a kezdőképernyőhöz (Megosztás / Menü → Főképernyőre) teljes képernyős módhoz!
            </span>
          </div>
          <button
            onClick={() => {
              setShowPwaHint(false);
              localStorage.setItem("hit_pwa_hint_dismissed", "true");
            }}
            className="p-1 text-neutral-400 hover:text-white shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Szinkronizált visszaszámláló és körfázis sáv */}
      <div className="w-full max-w-sm mt-1.5 rounded-xl bg-neutral-900/80 border border-neutral-800 px-3 py-1.5 overflow-hidden relative">
        <div className="flex items-center justify-between text-[10px] font-bold">
          <span
            className={`flex items-center gap-1.5 ${
              roundPhase.isFlipped
                ? "text-amber-300"
                : roundPhase.isPlaying
                ? "text-emerald-300"
                : "text-neutral-400"
            }`}
          >
            <Disc className={`w-3.5 h-3.5 ${roundPhase.isPlaying ? "animate-spin text-amber-400" : ""}`} />
            <span>
              {roundPhase.isFlipped
                ? "✨ Eredményhirdetés a TV-n"
                : roundPhase.isPlaying
                ? "🎵 Zene szól — Tippelj!"
                : "⏸️ Várakozás / Szünet"}
            </span>
          </span>
          <span className="font-mono font-black text-amber-400 flex items-center gap-1">
            <Timer className="w-3 h-3" />
            {roundPhase.selectedDuration === 0 ? "∞" : `${liveTimeLeft} mp`}
          </span>
        </div>
        {roundPhase.selectedDuration > 0 && (
          <div className="w-full h-1 bg-neutral-800 rounded-full mt-1.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 via-rose-500 to-violet-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>

      {/* Szuperdöntő (Tie-Breaker) riasztás */}
      {tieBreaker?.active && (
        <div
          className={`w-full max-w-sm mt-1.5 px-3 py-2 rounded-2xl border-2 text-xs font-black flex items-center justify-between gap-2 ${
            isInTieBreaker
              ? "bg-gradient-to-r from-rose-600/30 to-amber-500/25 border-amber-400 text-amber-200 animate-pulse"
              : "bg-neutral-900 border-amber-500/40 text-amber-300"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Swords className="w-4 h-4 text-amber-400" />
            <span>
              {isInTieBreaker
                ? "⚔️ SZUPERDÖNTŐBEN VAGY! Nyomd a Buzzert vagy tippelj pontosabban!"
                : `🏆 Szuperdöntő: ${tieBreaker.contenders.join(" vs ")}`}
            </span>
          </span>
        </div>
      )}

      {/* Meccslabda riasztás */}
      {isNearBingo && (
        <div className="w-full max-w-sm mt-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600/25 to-amber-500/25 border border-amber-400 text-amber-200 text-xs font-black text-center animate-pulse">
          🔥 MECCSLABDA! Már csak 1 X-re vagy a Bingótól!
        </div>
      )}

      {isRemoteOpen && (
        <div className="w-full max-w-sm bg-neutral-900/95 border-2 border-amber-500/40 rounded-2xl p-3 my-1.5 shadow-2xl flex flex-col gap-2">
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-amber-400">
            <span className="flex items-center gap-1">
              <Crown className="w-3.5 h-3.5" /> Házigazda TV Távirányító
            </span>
            <button
              onClick={() => onSendRemoteCommand("open_podium")}
              className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/50 text-amber-300 font-bold"
            >
              🏆 Díjátadó a TV-n
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => onSendRemoteCommand("spin")}
              className="py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-neutral-950 font-black text-xs flex items-center justify-center gap-1.5 active:scale-95 transition"
            >
              <Disc className="w-3.5 h-3.5" />
              <span>Rulett Pörgetés</span>
            </button>
            <button
              onClick={() => onSendRemoteCommand("toggle_play")}
              className="py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-neutral-700 active:scale-95 transition"
            >
              <Play className="w-3.5 h-3.5 text-amber-400" />
              <span>Zene / Szünet</span>
            </button>
            <button
              onClick={() => onSendRemoteCommand("flip")}
              className="py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-neutral-700 active:scale-95 transition"
            >
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              <span>Kártya Fordítás</span>
            </button>
            <button
              onClick={() => onSendRemoteCommand("next")}
              className="py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-neutral-700 active:scale-95 transition"
            >
              <SkipForward className="w-3.5 h-3.5 text-emerald-400" />
              <span>Következő Dal</span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => onSendRemoteCommand("switch_tab")}
              className="py-1.5 px-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-300 text-[11px] font-bold flex items-center justify-center gap-1.5 active:scale-95 transition"
            >
              <Tv className="w-3.5 h-3.5 text-violet-400" />
              <span>TV Nézet Váltása</span>
            </button>
            <button
              onClick={() => onSendRemoteCommand("reveal_hint")}
              className="py-1.5 px-2 rounded-xl bg-amber-500/15 border border-amber-400/50 text-amber-200 text-[11px] font-bold flex items-center justify-center gap-1.5 active:scale-95 transition"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-300" />
              <span>💡 Segítség TV-re</span>
            </button>
          </div>
        </div>
      )}

      {activeCategory && (
        <div
          className="w-full max-w-sm py-1.5 px-3 rounded-2xl border text-center font-black text-xs uppercase tracking-wider my-1 shadow-lg transition-all"
          style={{
            backgroundColor: `${activeCategory.accent}20`,
            borderColor: activeCategory.accent,
            color: activeCategory.accent,
          }}
        >
          🎯 Feladvány: {activeCategory.label} ({activeCategory.desc})
        </div>
      )}

      {/* Aktív Segítség (TV Hint) szinkron kártya */}
      <AnimatePresence>
        {activeHint && !roundPhase.isFlipped && (
          <motion.div
            key={activeHint.level}
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 280, damping: 22 }}
            className="w-full max-w-sm my-1 px-3 py-2 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-neutral-900 border border-amber-400/70 shadow-lg flex flex-col gap-0.5"
          >
            <span className="text-[9px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1">
              <Lightbulb className="w-3 h-3 text-amber-300" />
              {activeHint.badge}
            </span>
            <p className="text-xs font-bold text-amber-50 leading-snug">{activeHint.text}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saját részletes kör-értékelő kártya */}
      {personalFeedback && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-sm my-1 p-3 rounded-2xl bg-neutral-900/95 border-2 border-amber-400/70 shadow-xl flex flex-col gap-1.5 text-xs"
        >
          <div className="flex items-center justify-between border-b border-neutral-800 pb-1">
            <span className="font-black uppercase text-amber-300 text-[11px]">
              📊 Saját Eredményed • {personalFeedback.artist} – {personalFeedback.title}
            </span>
            <button onClick={onDismissFeedback} className="text-neutral-400 hover:text-white p-0.5">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-neutral-300">
              Tipped: <b className="font-mono text-white">{personalFeedback.guessedYear}</b> • Valós:{" "}
              <b className="font-mono text-amber-400">{personalFeedback.actualYear}</b>
            </span>
            <span
              className={`font-mono font-black ${
                personalFeedback.yearDiff === 0
                  ? "text-amber-300"
                  : personalFeedback.yearDiff <= 2
                  ? "text-emerald-400"
                  : "text-neutral-400"
              }`}
            >
              {personalFeedback.yearDiff === 0 ? "🎯 Pontos!" : `±${personalFeedback.yearDiff} év`}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
            {personalFeedback.earnedCredits > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-black">
                +{personalFeedback.earnedCredits} X kredit
              </span>
            )}
            {personalFeedback.deltaJokerCredits > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-400 text-amber-200 font-black">
                +{personalFeedback.deltaJokerCredits} Joker X ⭐
              </span>
            )}
            {personalFeedback.penalty > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-500 text-rose-300 font-black">
                -{personalFeedback.penalty} X büntetés 💀
              </span>
            )}
            {(personalFeedback.streak ?? 0) >= 2 && (
              <span className="px-2 py-0.5 rounded-md bg-orange-500/25 border border-orange-400/60 text-orange-200 font-black flex items-center gap-1">
                <Flame className="w-3 h-3 text-orange-300" />
                🔥 {personalFeedback.streak}× Nyerő Széria!
              </span>
            )}
            {personalFeedback.secondaryReasons.map((reason) => (
              <span
                key={reason}
                className="px-2 py-0.5 rounded-md bg-amber-400/15 border border-amber-500/40 text-amber-200 font-bold"
              >
                {reason} ✓
              </span>
            ))}
            {personalFeedback.earnedCredits === 0 &&
              personalFeedback.penalty === 0 &&
              personalFeedback.secondaryReasons.length === 0 && (
                <span className="text-neutral-500 italic">Ebben a körben nem járt pont.</span>
              )}
          </div>
        </motion.div>
      )}

      {clientRewardBanner && (
        <div className="w-full max-w-sm py-2 px-3 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-300 text-xs font-black text-center animate-bounce my-1">
          {clientRewardBanner}
        </div>
      )}

      <div className="w-full max-w-sm flex flex-col gap-2 my-auto">
        <div className="w-full bg-neutral-900 border-2 border-neutral-800 rounded-2xl p-3 shadow-xl flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
              🎯 Titkos Tipp a TV-re (Ékezettűrő)
            </span>
            {isGuessLocked ? (
              <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Beküldve!
              </span>
            ) : hostYearRange ? (
              <span className="text-[9px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-1.5 py-0.5 rounded">
                {hostYearRange.min}–{hostYearRange.max}
              </span>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-1.5 bg-neutral-950 p-1.5 rounded-xl border border-neutral-800">
            <button
              onClick={() => stepYear(-5)}
              className="px-2 h-8 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 font-black text-xs active:scale-90"
              title="-5 év"
            >
              -5
            </button>
            <button
              onClick={() => stepYear(-1)}
              className="w-8 h-8 rounded-lg bg-neutral-800 text-white font-black text-base active:scale-90"
              title="-1 év"
            >
              -
            </button>
            <div className="flex flex-col items-center flex-1">
              <span className="text-[9px] text-neutral-500 uppercase font-bold">Tippelt Évszám</span>
              <span className="text-lg font-black font-mono text-amber-400">{clientGuessYear}</span>
            </div>
            <button
              onClick={() => stepYear(1)}
              className="w-8 h-8 rounded-lg bg-neutral-800 text-white font-black text-base active:scale-90"
              title="+1 év"
            >
              +
            </button>
            <button
              onClick={() => stepYear(5)}
              className="px-2 h-8 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 font-black text-xs active:scale-90"
              title="+5 év"
            >
              +5
            </button>
          </div>

          {/* Évtized gyorsgombok */}
          <div className="grid grid-cols-6 gap-1">
            {DECADE_SHORTCUTS.map((d) => {
              const target = Math.max(minSliderYear, Math.min(maxSliderYear, d.year));
              const isInDecade = Math.floor(clientGuessYear / 10) === Math.floor(d.year / 10);
              return (
                <button
                  key={d.label}
                  onClick={() => {
                    setIsGuessLocked(false);
                    setClientGuessYear(target);
                  }}
                  className={`py-1 rounded-lg text-[10px] font-black font-mono border transition active:scale-90 ${
                    isInDecade
                      ? "bg-amber-500/20 border-amber-400 text-amber-300"
                      : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white"
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>

          <input
            type="range"
            min={minSliderYear}
            max={maxSliderYear}
            value={Math.max(minSliderYear, Math.min(maxSliderYear, clientGuessYear))}
            onChange={(e) => {
              setIsGuessLocked(false);
              setClientGuessYear(Number(e.target.value));
            }}
            className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />

          {doubleOrNothingEnabled && (
            <button
              type="button"
              onClick={() => {
                setIsGuessLocked(false);
                setClientRiskDouble((prev) => !prev);
              }}
              className={`w-full py-1.5 px-3 rounded-xl border text-[11px] font-black uppercase tracking-wider flex items-center justify-between transition ${
                clientRiskDouble
                  ? "bg-gradient-to-r from-purple-600 to-rose-600 border-amber-300 text-white shadow-lg"
                  : "bg-neutral-950 border-neutral-800 text-neutral-400"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Dices className="w-4 h-4 text-amber-300" />
                <span>🎲 Dupla vagy Semmi!</span>
              </span>
              <span className="text-[10px] font-mono">
                {clientRiskDouble ? "AKTÍV (+2 X / -1 X)" : "Kikapcsolva"}
              </span>
            </button>
          )}

          {fractionalPointsRate !== "off" ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[10px] text-amber-300 font-bold px-1">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Részpont mezők ({fractionalPointsRate} Joker X-ért):</span>
                </span>
                <span className="text-neutral-400 font-mono text-[9px]">külön mezők a pontosságért</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="text"
                  value={clientGuessArtist}
                  onChange={(e) => {
                    setIsGuessLocked(false);
                    setClientGuessArtist(e.target.value);
                  }}
                  placeholder="🎤 Előadó..."
                  className="bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
                <input
                  type="text"
                  value={clientGuessTitle}
                  onChange={(e) => {
                    setIsGuessLocked(false);
                    setClientGuessTitle(e.target.value);
                  }}
                  placeholder="🎵 Dalcím..."
                  className="bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={clientGuessText}
                  onChange={(e) => {
                    setIsGuessLocked(false);
                    setClientGuessText(e.target.value);
                  }}
                  placeholder="vagy egyben mindkettő..."
                  className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-neutral-300 focus:outline-none focus:border-amber-400"
                />
                <button
                  onClick={onSubmitGuess}
                  className={`px-3.5 py-1.5 rounded-xl font-black text-xs uppercase flex items-center gap-1 transition active:scale-95 ${
                    isGuessLocked
                      ? "bg-emerald-500 text-neutral-950"
                      : "bg-amber-500 hover:bg-amber-400 text-neutral-950"
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isGuessLocked ? "Frissít" : "Küldés"}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-1.5">
              <input
                type="text"
                value={clientGuessText}
                onChange={(e) => {
                  setIsGuessLocked(false);
                  setClientGuessText(e.target.value);
                }}
                placeholder="Előadó / Dalcím (ékezet nélkül is jó)..."
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              />
              <button
                onClick={onSubmitGuess}
                className={`px-3.5 py-2 rounded-xl font-black text-xs uppercase flex items-center gap-1 transition active:scale-95 ${
                  isGuessLocked
                    ? "bg-emerald-500 text-neutral-950"
                    : "bg-amber-500 hover:bg-amber-400 text-neutral-950"
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isGuessLocked ? "Frissít" : "Küldés"}</span>
              </button>
            </div>
          )}
        </div>

        <div className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-2 flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-1">
            {["🔥", "💃", "🤯", "😂", "🍅"].map((emoji) => (
              <button
                key={emoji}
                onClick={() => onSendReaction(emoji)}
                className="flex-1 py-1.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-lg active:scale-90 transition"
              >
                {emoji}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-1">
            <button
              onClick={() => onSendReaction("🎺", "airhorn")}
              className="py-1 px-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-[10px] font-bold text-amber-300 active:scale-95 flex items-center justify-center gap-1"
            >
              <span>🎺 Duda</span>
            </button>
            <button
              onClick={() => onSendReaction("🦗", "crickets")}
              className="py-1 px-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-[10px] font-bold text-emerald-300 active:scale-95 flex items-center justify-center gap-1"
            >
              <span>🦗 Tücsök</span>
            </button>
            <button
              onClick={() => onSendReaction("📉", "trombone")}
              className="py-1 px-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-[10px] font-bold text-rose-300 active:scale-95 flex items-center justify-center gap-1"
            >
              <span>📉 Bukta</span>
            </button>
            <button
              onClick={() => onSendReaction("🥁", "drumroll")}
              className="py-1 px-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-[10px] font-bold text-cyan-300 active:scale-95 flex items-center justify-center gap-1"
            >
              <span>🥁 Pergés</span>
            </button>
          </div>
        </div>

        <button
          onClick={onBuzzer}
          className="w-full py-2 px-4 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-600/30 active:scale-95 transition flex items-center justify-center gap-2"
        >
          <Bell className="w-4 h-4 fill-current animate-bounce" />
          <span>🔔 TUDOM! (Buzzer megnyomása)</span>
        </button>

        <div className="bg-neutral-900 border-2 border-neutral-800 rounded-3xl p-2.5 shadow-2xl flex flex-col gap-2">
          {strictQuizMode && (
            <div className="flex items-center justify-between px-2 py-1 rounded-xl bg-neutral-950 border border-neutral-800 text-[11px] font-bold">
              <span className="flex items-center gap-1 text-neutral-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Szigorú Kvíz Mód:</span>
              </span>
              {clientPenaltyDebt > 0 ? (
                <span className="text-rose-400 font-black animate-pulse">
                  ⚠️ Radírozz le {clientPenaltyDebt} db X-et!
                </span>
              ) : clientCredits > 0 ? (
                <span className="text-emerald-400 font-black">✅ {clientCredits} db szabad X lépésed van!</span>
              ) : (
                <span className="text-amber-400/90 font-mono text-[10px]">
                  🔒 0 X kredit (Találd el a dalt!)
                </span>
              )}
            </div>
          )}

          {fractionalPointsRate !== "off" && (
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-neutral-950 border border-amber-500/30 text-[11px]">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Részpont haladás:</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {Array.from({ length: getFractionalThreshold(fractionalPointsRate) }).map((_, i) => (
                    <span
                      key={i}
                      className={`w-2.5 h-2.5 rounded-full border transition ${
                        i < clientPartialPoints
                          ? "bg-amber-400 border-amber-300 shadow-[0_0_6px_rgba(245,158,11,0.8)]"
                          : "bg-neutral-800 border-neutral-700"
                      }`}
                    />
                  ))}
                </div>
                <span className="font-mono font-black text-xs text-amber-300">
                  {clientPartialPoints}/{getFractionalThreshold(fractionalPointsRate)} ⭐
                </span>
              </div>
            </div>
          )}

          {clientJokerCredits > 0 && (
            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/30 to-yellow-500/20 border-2 border-amber-400 text-xs font-black text-amber-200 animate-pulse">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>⭐ {clientJokerCredits} JOKER X ELÉRHETŐ!</span>
              </span>
              <span className="text-[10px] uppercase tracking-wider bg-amber-400 text-neutral-950 px-2 py-0.5 rounded-lg shadow-sm">
                Bármely színre teheted!
              </span>
            </div>
          )}

          {activeCategory && (
            <div className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs">
              <span className="text-neutral-400 font-medium">Pörgetett szín:</span>
              <span
                className="font-black uppercase flex items-center gap-1.5"
                style={{ color: activeCategory.accent }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block shadow-sm"
                  style={{ backgroundColor: activeCategory.accent }}
                />
                {activeCategory.label}
              </span>
            </div>
          )}

          <div className="grid grid-cols-5 gap-2 w-full bg-neutral-950 p-2 rounded-2xl border border-neutral-800">
            {clientGrid.map((row, r) =>
              row.map((isMarked, c) => {
                const colorIdx = clientColorGrid?.[r]?.[c] ?? ((r + c) % TILE_COLORS.length);
                const targetColorIdx = getCategoryColorIndex(activeCategory);
                const hasJoker = clientJokerCredits > 0;
                const isTargetColor = targetColorIdx === -1 || colorIdx === targetColorIdx || hasJoker;
                const isMatchCell = !isMarked && matchPointCells.has(`${r}-${c}`);
                const isHighlight = !isMarked && (hasJoker || (targetColorIdx !== -1 && isTargetColor));
                const isDimmed = !isMarked && !hasJoker && targetColorIdx !== -1 && !isTargetColor;

                return (
                  <button
                    key={`${r}-${c}`}
                    onClick={() => onTileClick(r, c)}
                    className={`aspect-square rounded-xl flex items-center justify-center relative shadow select-none active:scale-90 transition overflow-hidden ${
                      isMatchCell
                        ? "ring-4 ring-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.95)]"
                        : isHighlight
                        ? "ring-2 ring-white shadow-[0_0_12px_rgba(255,255,255,0.7)] animate-pulse scale-[1.02]"
                        : ""
                    } ${isDimmed ? "opacity-35 cursor-not-allowed" : ""}`}
                    style={{ backgroundColor: TILE_COLORS[colorIdx] }}
                  >
                    {!isMarked && isMatchCell && (
                      <span className="absolute top-0.5 right-0.5 text-[10px] pointer-events-none">🔥</span>
                    )}
                    {isMarked && (
                      <motion.span
                        initial={{ scale: 0, rotate: -25 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 450, damping: 18 }}
                        className="font-black text-2xl text-neutral-950 select-none"
                      >
                        ✕
                      </motion.span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          <div className="w-full flex justify-between items-center px-1 pt-1 text-[10px] text-neutral-400">
            <button
              onClick={onRerollColors}
              className="flex items-center gap-1 font-bold text-neutral-400 hover:text-amber-400 transition"
              title="A táblád színeinek újrakeverése"
            >
              <Shuffle className="w-3 h-3 text-amber-400" />
              <span>Színek újrakeverése</span>
            </button>
            <span>5x5 Hitster Bingo</span>
          </div>
        </div>

        <div className="w-full bg-neutral-100 rounded-2xl p-2 shadow-inner border border-neutral-300 flex flex-col">
          <div className="flex justify-between items-center mb-0.5">
            <span className="text-[9px] uppercase font-bold text-neutral-600 tracking-wider">
              Fehértábla (Jegyzetek):
            </span>
            {clientNotes && (
              <button
                onClick={() => handleNotesInput("")}
                className="flex items-center gap-1 text-[10px] font-bold text-neutral-500 hover:text-rose-600 transition"
              >
                <Eraser className="w-3 h-3 text-rose-500" />
                <span>Törlés</span>
              </button>
            )}
          </div>
          <textarea
            value={clientNotes}
            onChange={(e) => handleNotesInput(e.target.value)}
            placeholder="Írd ide a dalok címeit, éveit..."
            rows={1}
            className="w-full bg-transparent text-neutral-900 font-bold text-xs focus:outline-none resize-none font-sans"
          />
        </div>
      </div>

      <footer className="text-center text-[10px] text-neutral-500 pb-1 flex items-center gap-1.5 justify-center">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        <span>Élő szinkron aktív • Hit-Roulette</span>
      </footer>
    </main>
  );
};
