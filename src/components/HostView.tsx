"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  CalendarRange,
  ChevronDown,
  Dices,
  Disc,
  Flame,
  History,
  Keyboard,
  LayoutGrid,
  Lightbulb,
  Lock,
  Maximize2,
  Minimize2,
  MoveHorizontal,
  QrCode,
  RefreshCw,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Swords,
  Timer,
  Trophy,
  Tv,
  X,
  Zap,
} from "lucide-react";
import { MusicCard, GuessTarget } from "@/components/MusicCard";
import { RouletteWheel, Category } from "@/components/RouletteWheel";
import { PlayerBoard, PlayerData } from "@/components/PlayerBoard";
import { AudioPlayerFooter } from "@/components/AudioPlayer";
import { FilterBar, TvLayoutModal } from "@/components/SettingsModal";
import { PodiumModal } from "@/components/PodiumModal";
import { PendingMarksModal, HostQrModal } from "@/components/HostModals";
import { HistoryDrawer } from "@/components/HistoryDrawer";
import { TieBreakerModal } from "@/components/TieBreakerModal";
import { GuessTimeline } from "@/components/GuessTimeline";
import { LiveScoreboardStrip } from "@/components/LiveScoreboardStrip";
import { isOneAwayFromBingo } from "@/lib/bingoLogic";
import { Track } from "@/types/track";
import {
  EvaluatedGuess,
  FloatingReaction,
  FractionalPointsRate,
  MusicFilter,
  PlayerGuess,
  PlayerSessionStats,
  RoundHint,
  RoundHistoryEntry,
  TieBreakerState,
  TvTheme,
  getFractionalThreshold,
} from "@/types/game";

const TIME_OPTIONS = [15, 30, 45, 60, 0];

interface HostViewProps {
  mounted: boolean;
  isTvMode: boolean;
  tvScale: number;
  tvTheme: TvTheme;
  onSelectTheme: (theme: TvTheme) => void;
  tvHeaderScale: number;
  tvWheelSize: number;
  tvCardWidth: number;
  tvGap: number;
  isDraggingGap: boolean;
  isDraggingWheel: boolean;
  isDraggingCard: boolean;
  isFullscreen: boolean;
  wakeLockActive: boolean;
  isSupabaseConfigured: boolean;
  currentAccent: string;
  floatingReactions: FloatingReaction[];
  activeTab: "boards" | "game";
  setActiveTab: React.Dispatch<React.SetStateAction<"boards" | "game">>;
  smartIntroSkip: boolean;
  setSmartIntroSkip: React.Dispatch<React.SetStateAction<boolean>>;
  strictQuizMode: boolean;
  toggleStrictQuizMode: () => void;
  doubleOrNothingEnabled: boolean;
  toggleDoubleOrNothing: () => void;
  fractionalPointsRate: FractionalPointsRate;
  cycleFractionalPointsRate: () => void;
  showFilters: boolean;
  setShowFilters: React.Dispatch<React.SetStateAction<boolean>>;
  toggleFullscreen: () => void;
  toggleTvMode: () => void;
  isLayoutMenuOpen: boolean;
  setIsLayoutMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isScaleDropdownOpen: boolean;
  setIsScaleDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  adjustScale: (delta: number) => void;
  setSpecificScale: (scale: number) => void;
  saveTvLayout: (wheel: number, card: number, gap: number, headerScale?: number) => void;
  applyLayoutPreset: (type: "cinema" | "balanced" | "compact") => void;
  handleStartDragWheel: (e: React.MouseEvent) => void;
  handleStartDragCard: (e: React.MouseEvent) => void;
  handleStartDragGap: (e: React.MouseEvent) => void;
  handleStartTouchDragGap: (e: React.TouchEvent) => void;
  handleCreateRoom: () => void;
  roomCode: string;
  joinUrl: string;
  onlinePlayers: PlayerData[];
  handleOpenPodium: () => void;
  onLockPinGate: () => void;
  selectedDuration: number;
  timeLeft: number;
  handleDurationChange: (sec: number) => void;
  // Filter props
  musicFilter: MusicFilter;
  setMusicFilter: (f: MusicFilter) => void;
  selectedGenre: string;
  setSelectedGenre: (g: string) => void;
  availableGenres: string[];
  onlyWithLyrics: boolean;
  setOnlyWithLyrics: (v: boolean) => void;
  minYear: number;
  maxYear: number;
  absoluteMinYear: number;
  absoluteMaxYear: number;
  setMinYear: (y: number) => void;
  setMaxYear: (y: number) => void;
  playedIds: Array<string | number>;
  filteredTracks: Track[];
  allTracksCount: number;
  currentTrack: Track | undefined;
  isLoadingTracks: boolean;
  tracksError: string | null;
  onRetryLoadTracks: () => void;
  onResetFilters: () => void;
  // Round & Guessing props
  autoPlayCountdown: number | null;
  buzzedPlayer: string | null;
  setBuzzedPlayer: React.Dispatch<React.SetStateAction<string | null>>;
  grantManualCreditToPlayer: (name: string) => void;
  grantManualJokerCreditToPlayer: (name: string) => void;
  revokeManualJokerCreditFromPlayer: (name: string) => void;
  activeCategory: Category | null;
  isFlipped: boolean;
  guessTarget: GuessTarget;
  roundGuesses: Record<string, PlayerGuess>;
  evaluatedGuesses: EvaluatedGuess[];
  players: PlayerData[];
  setPlayers: React.Dispatch<React.SetStateAction<PlayerData[]>>;
  activePlayerIdx: number;
  setActivePlayerIdx: (idx: number) => void;
  pendingPlayers: PlayerData[];
  pendingMarksModalOpen: boolean;
  setPendingMarksModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handlePingPendingPlayers: () => void;
  handleAttemptSpin: (force?: boolean) => boolean;
  handleSpinEnd: (cat: Category) => void;
  // Audio props
  isPlaying: boolean;
  currentTime: number;
  progressPercent: number;
  audioError: string | null;
  liveSpectrum: number[];
  hasLiveSpectrum: boolean;
  musicVolume: number;
  onMusicVolumeChange: (v: number) => void;
  sfxVolume: number;
  onSfxVolumeChange: (v: number) => void;
  sfxMuted: boolean;
  onToggleSfxMuted: () => void;
  onPlayToggle: () => void;
  onFlipAndShow: () => void;
  onNextTrack: () => void;
  onSeek: (time: number) => void;
  // Modals & Drawers
  isPodiumOpen: boolean;
  setIsPodiumOpen: React.Dispatch<React.SetStateAction<boolean>>;
  sessionStats: Record<string, PlayerSessionStats>;
  isHostModalOpen: boolean;
  setIsHostModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onResetSession: () => void;
  isHistoryOpen: boolean;
  setIsHistoryOpen: React.Dispatch<React.SetStateAction<boolean>>;
  roundHistory: RoundHistoryEntry[];
  onClearHistory: () => void;
  tieBreaker: TieBreakerState | null;
  isTieBreakerOpen: boolean;
  onOpenTieBreaker: (contenders: string[]) => void;
  onCloseTieBreaker: () => void;
  onCrownTieBreakerWinner: (winnerName: string) => void;
  // Hints
  activeHint: RoundHint | null;
  onRevealNextHint: () => void;
}

const THEME_CONFIG: Record<
  TvTheme,
  {
    bgClass: string;
    orbOne: string;
    orbTwo: string;
    brandGradient: string;
    subtitle: string;
  }
> = {
  gala: {
    bgClass: "bg-neutral-950",
    orbOne: "",
    orbTwo: "rgba(245, 158, 11, 0.14)",
    brandGradient: "from-amber-400 via-rose-400 to-violet-500",
    subtitle: "A HITSTER PARTI KIADÁS • KLASSZIKUS GÁLA",
  },
  synthwave: {
    bgClass: "bg-[#090414]",
    orbOne: "#d946ef",
    orbTwo: "rgba(6, 182, 212, 0.25)",
    brandGradient: "from-cyan-300 via-fuchsia-400 to-amber-300",
    subtitle: "80s NEON SYNTHWAVE EDITION",
  },
  retro: {
    bgClass: "bg-[#0f0c08]",
    orbOne: "#14b8a6",
    orbTwo: "rgba(250, 204, 21, 0.22)",
    brandGradient: "from-yellow-300 via-emerald-400 to-cyan-400",
    subtitle: "90s RETRO MTV PARTY EDITION",
  },
};

export const HostView: React.FC<HostViewProps> = ({
  mounted,
  isTvMode,
  tvScale,
  tvTheme,
  onSelectTheme,
  tvHeaderScale,
  tvWheelSize,
  tvCardWidth,
  tvGap,
  isDraggingGap,
  isDraggingWheel,
  isDraggingCard,
  isFullscreen,
  wakeLockActive,
  isSupabaseConfigured,
  currentAccent,
  floatingReactions,
  activeTab,
  setActiveTab,
  smartIntroSkip,
  setSmartIntroSkip,
  strictQuizMode,
  toggleStrictQuizMode,
  doubleOrNothingEnabled,
  toggleDoubleOrNothing,
  fractionalPointsRate,
  cycleFractionalPointsRate,
  showFilters,
  setShowFilters,
  toggleFullscreen,
  toggleTvMode,
  isLayoutMenuOpen,
  setIsLayoutMenuOpen,
  isScaleDropdownOpen,
  setIsScaleDropdownOpen,
  adjustScale,
  setSpecificScale,
  saveTvLayout,
  applyLayoutPreset,
  handleStartDragWheel,
  handleStartDragCard,
  handleStartDragGap,
  handleStartTouchDragGap,
  handleCreateRoom,
  roomCode,
  joinUrl,
  onlinePlayers,
  handleOpenPodium,
  onLockPinGate,
  selectedDuration,
  timeLeft,
  handleDurationChange,
  musicFilter,
  setMusicFilter,
  selectedGenre,
  setSelectedGenre,
  availableGenres,
  onlyWithLyrics,
  setOnlyWithLyrics,
  minYear,
  maxYear,
  absoluteMinYear,
  absoluteMaxYear,
  setMinYear,
  setMaxYear,
  playedIds,
  filteredTracks,
  allTracksCount,
  currentTrack,
  isLoadingTracks,
  tracksError,
  onRetryLoadTracks,
  onResetFilters,
  autoPlayCountdown,
  buzzedPlayer,
  setBuzzedPlayer,
  grantManualCreditToPlayer,
  grantManualJokerCreditToPlayer,
  revokeManualJokerCreditFromPlayer,
  activeCategory,
  isFlipped,
  guessTarget,
  roundGuesses,
  evaluatedGuesses,
  players,
  setPlayers,
  activePlayerIdx,
  setActivePlayerIdx,
  pendingPlayers,
  pendingMarksModalOpen,
  setPendingMarksModalOpen,
  handlePingPendingPlayers,
  handleAttemptSpin,
  handleSpinEnd,
  isPlaying,
  currentTime,
  progressPercent,
  audioError,
  liveSpectrum,
  hasLiveSpectrum,
  musicVolume,
  onMusicVolumeChange,
  sfxVolume,
  onSfxVolumeChange,
  sfxMuted,
  onToggleSfxMuted,
  onPlayToggle,
  onFlipAndShow,
  onNextTrack,
  onSeek,
  isPodiumOpen,
  setIsPodiumOpen,
  sessionStats,
  isHostModalOpen,
  setIsHostModalOpen,
  onResetSession,
  isHistoryOpen,
  setIsHistoryOpen,
  roundHistory,
  onClearHistory,
  tieBreaker,
  isTieBreakerOpen,
  onOpenTieBreaker,
  onCloseTieBreaker,
  onCrownTieBreakerWinner,
  activeHint,
  onRevealNextHint,
}) => {
  const [isStudioMenuOpen, setIsStudioMenuOpen] = useState(false);
  const [showLiveScoreboard, setShowLiveScoreboard] = useState(true);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  const themeStyle = THEME_CONFIG[tvTheme] || THEME_CONFIG.gala;
  const guessList = Object.values(roundGuesses);

  // Élő "Ki tippelt már?" lista az aktív/online játékosokkal
  const trackedPlayerNames = Array.from(
    new Set([
      ...players
        .filter((p) => p.isOnline || p.id !== "host")
        .map((p) => p.name),
      ...guessList.map((g) => g.playerName),
    ])
  ).filter((name) => name.trim().toLowerCase() !== "házigazda" || guessList.some((g) => g.playerName === name));

  const matchPointPlayers = players.filter((p) => !p.hasWon && isOneAwayFromBingo(p.grid));
  const bingoWinners = players.filter((p) => p.hasWon);

  return (
    <main
      className={`min-h-[100dvh] ${themeStyle.bgClass} text-white flex flex-col items-center justify-between p-2.5 sm:p-5 select-none relative overflow-x-hidden transition-colors duration-500 ${
        isTvMode ? "w-full max-w-[1920px] mx-auto px-3 sm:px-6" : ""
      }`}
      style={isTvMode && tvScale !== 100 ? { zoom: `${tvScale}%` } : undefined}
    >
      {/* Dinamikus háttérfény a témához és a kipörgetett kategória színéhez igazítva */}
      <div
        className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[560px] rounded-full blur-[160px] opacity-25 pointer-events-none transition-colors duration-700"
        style={{ backgroundColor: themeStyle.orbOne || currentAccent }}
      />
      <div
        className="fixed bottom-0 right-10 w-[420px] h-[420px] rounded-full blur-[150px] pointer-events-none transition-colors duration-700"
        style={{ backgroundColor: themeStyle.orbTwo }}
      />

      {/* Lebegő Emoji Ágyú */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        <AnimatePresence>
          {floatingReactions.map((r) => (
            <motion.div
              key={r.id}
              initial={{ y: "92vh", opacity: 1, scale: 0.6 }}
              animate={{ y: "8vh", opacity: [1, 1, 0], scale: [0.8, 1.25, 1] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 3.2, ease: "easeOut" }}
              style={{ left: `${r.leftPercent}%` }}
              className="absolute flex flex-col items-center"
            >
              <span className="text-4xl sm:text-5xl drop-shadow-[0_6px_15px_rgba(0,0,0,0.8)]">{r.emoji}</span>
              <span className="text-[10px] font-black uppercase tracking-wider bg-neutral-900/90 text-amber-300 px-2 py-0.5 rounded-full border border-neutral-700 shadow">
                {r.playerName}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* FEJLÉC — Átlátható 3-zónás Stúdió Sáv */}
      <header
        style={tvHeaderScale !== 100 ? { zoom: `${tvHeaderScale}%` } : undefined}
        className={`w-full flex flex-col gap-2 py-2 border-b border-neutral-800/80 z-30 transition-all ${
          isTvMode ? "max-w-[1900px]" : "max-w-6xl"
        }`}
      >
        <div className="w-full flex flex-wrap justify-between items-center gap-2">
          {/* BAL ZÓNA: Márka + Szoba QR */}
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1
                  className={`text-lg sm:text-2xl font-black tracking-widest bg-clip-text text-transparent bg-gradient-to-r ${themeStyle.brandGradient}`}
                >
                  HIT-ROULETTE
                </h1>
                {wakeLockActive && (
                  <span
                    className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold"
                    title="Képernyő-ébrentartás aktív (nem alszik el a TV és a telefon)"
                  >
                    🔆 Ébren
                  </span>
                )}
                {!isSupabaseConfigured && (
                  <span
                    className="text-[9px] px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-300 font-bold"
                    title="Supabase Realtime nincs konfigurálva (.env.local hiányzik)"
                  >
                    Offline mód
                  </span>
                )}
              </div>
              <p className="text-[9px] sm:text-[10px] text-neutral-500 tracking-wider">{themeStyle.subtitle}</p>
            </div>

            <button
              onClick={handleCreateRoom}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-gradient-to-r from-violet-600 to-rose-600 text-white text-xs font-bold shadow-lg hover:scale-105 active:scale-95 transition"
              title="Mobil csatlakozási QR-kód & szobakód"
            >
              <QrCode className="w-3.5 h-3.5 text-amber-300" />
              <span>{roomCode ? `Szoba: ${roomCode}` : "📱 Mobil"}</span>
              {onlinePlayers.length > 0 && (
                <span className="flex items-center gap-1 bg-emerald-500/30 text-emerald-300 text-[10px] px-1.5 py-0.5 rounded-full border border-emerald-400/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {onlinePlayers.length}
                </span>
              )}
            </button>
          </div>

          {/* KÖZÉPSŐ ZÓNA: Színpadváltó + Élő Állás + Súgó + Szűrők */}
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="relative flex items-center gap-1 bg-neutral-900 p-1 rounded-2xl border border-neutral-800">
              <button
                onClick={() => setActiveTab("boards")}
                className={`relative z-10 flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeTab === "boards" ? "text-neutral-950 font-black" : "text-neutral-400 hover:text-white"
                }`}
              >
                {activeTab === "boards" && (
                  <motion.span
                    layoutId="hostStageTab"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    className="absolute inset-0 rounded-xl bg-amber-500 shadow-md -z-10"
                  />
                )}
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Táblák</span>
              </button>

              <button
                onClick={() => setActiveTab("game")}
                className={`relative z-10 flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeTab === "game" ? "text-neutral-950 font-black" : "text-neutral-400 hover:text-white"
                }`}
              >
                {activeTab === "game" && (
                  <motion.span
                    layoutId="hostStageTab"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    className="absolute inset-0 rounded-xl bg-amber-500 shadow-md -z-10"
                  />
                )}
                <Disc className="w-3.5 h-3.5" />
                <span>Rulett & Kártya</span>
              </button>
            </div>

            {activeTab === "game" && (
              <button
                onClick={() => setShowLiveScoreboard((prev) => !prev)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-2xl border text-xs font-bold transition ${
                  showLiveScoreboard
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                    : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                }`}
                title="Élő játékállás és mini-táblák sáv elrejtése/megjelenítése"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Élő Állás</span>
              </button>
            )}

            <button
              onClick={onRevealNextHint}
              disabled={(activeHint?.level || 0) >= 3 || isFlipped}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-2xl border text-xs font-bold transition ${
                (activeHint?.level || 0) > 0
                  ? "bg-amber-500/20 border-amber-400 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                  : "bg-neutral-900 border-neutral-800 text-amber-300 hover:border-amber-500/50"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
              title="Progresszív körsúgó felfedése (I): 1. Korszak → 2. Monogram → 3. Dalszöveg"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Segítség</span>
              <span className="font-mono text-[10px] px-1 rounded bg-neutral-950/70">
                {activeHint?.level || 0}/3
              </span>
            </button>

            <button
              onClick={() => setShowFilters((prev) => !prev)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-2xl border text-xs font-bold transition ${
                showFilters
                  ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300"
                  : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
              }`}
              title="Dal- és műfajszűrők sáv"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Szűrők</span>
            </button>
          </div>

          {/* JOBB ZÓNA: Szabályok & TV Stúdió Popover + Előzmények + Díjátadó + Időzítő */}
          <div className="flex flex-wrap items-center gap-1.5">
            {bingoWinners.length >= 2 && (
              <button
                onClick={() => onOpenTieBreaker(bingoWinners.map((w) => w.name))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-500 text-white text-xs font-black shadow-lg animate-pulse hover:scale-105 transition"
                title="Holtverseny Szuperdöntő indítása"
              >
                <Swords className="w-3.5 h-3.5" />
                <span>Szuperdöntő</span>
              </button>
            )}

            <div className="relative">
              <button
                onClick={() => setIsStudioMenuOpen((prev) => !prev)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-xs font-bold transition ${
                  isStudioMenuOpen
                    ? "bg-amber-500/20 border-amber-400 text-amber-200"
                    : "bg-neutral-900 border-neutral-800 text-neutral-200 hover:border-neutral-600"
                }`}
                title="Játékszabályok, TV mód és vizuális beállítások"
              >
                <Settings2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Szabályok & TV</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${isStudioMenuOpen ? "rotate-180" : ""}`}
                />
              </button>

              {isStudioMenuOpen && (
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsStudioMenuOpen(false)}
                />
              )}

              <AnimatePresence>
                {isStudioMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                    transition={{ duration: 0.16 }}
                    className="absolute right-0 top-full mt-2 w-80 bg-neutral-900/98 backdrop-blur-2xl border-2 border-amber-500/40 rounded-3xl p-4 shadow-[0_20px_60px_rgba(0,0,0,0.85)] z-50 flex flex-col gap-3"
                  >
                    <div className="text-[10px] font-black uppercase tracking-wider text-amber-400 border-b border-neutral-800 pb-1.5 flex items-center justify-between">
                      <span>⚙️ Játékszabályok & Stúdió</span>
                      <button
                        onClick={() => setIsStudioMenuOpen(false)}
                        className="text-neutral-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-1.5 text-xs">
                      <button
                        onClick={toggleStrictQuizMode}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl border font-bold transition ${
                          strictQuizMode
                            ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-300"
                            : "bg-neutral-950 border-neutral-800 text-neutral-400"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4" />
                          <span>Szigorú Kvíz Mód</span>
                        </span>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-black/40">
                          {strictQuizMode ? "BE" : "KI"}
                        </span>
                      </button>

                      <button
                        onClick={toggleDoubleOrNothing}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl border font-bold transition ${
                          doubleOrNothingEnabled
                            ? "bg-purple-500/15 border-purple-500/50 text-purple-300"
                            : "bg-neutral-950 border-neutral-800 text-neutral-400"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Dices className="w-4 h-4" />
                          <span>Dupla vagy Semmi</span>
                        </span>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-black/40">
                          {doubleOrNothingEnabled ? "BE" : "KI"}
                        </span>
                      </button>

                      <button
                        onClick={cycleFractionalPointsRate}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl border font-bold transition ${
                          fractionalPointsRate !== "off"
                            ? "bg-amber-500/15 border-amber-400/60 text-amber-300"
                            : "bg-neutral-950 border-neutral-800 text-neutral-400"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          <span>Részpont → Joker X</span>
                        </span>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-black/40">
                          {fractionalPointsRate === "off" ? "KI" : fractionalPointsRate}
                        </span>
                      </button>

                      <button
                        onClick={() => setSmartIntroSkip((prev) => !prev)}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl border font-bold transition ${
                          smartIntroSkip
                            ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                            : "bg-neutral-950 border-neutral-800 text-neutral-400"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Zap className="w-4 h-4" />
                          <span>Okos Intro Átugrás</span>
                        </span>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-black/40">
                          {smartIntroSkip ? "BE" : "KI"}
                        </span>
                      </button>
                    </div>

                    <div className="border-t border-neutral-800 pt-2.5 flex flex-col gap-2">
                      <button
                        onClick={toggleTvMode}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-bold transition ${
                          isTvMode
                            ? "bg-amber-500/20 border-amber-400 text-amber-300"
                            : "bg-neutral-950 border-neutral-800 text-neutral-400"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Tv className="w-4 h-4" />
                          <span>16:9 TV Mód</span>
                        </span>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-black/40">
                          {isTvMode ? "BE" : "KI"}
                        </span>
                      </button>

                      <div className="flex items-center justify-between bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs">
                        <span className="text-neutral-300 font-bold">TV Méretarány</span>
                        <div className="relative flex items-center gap-1">
                          <button
                            onClick={() => adjustScale(-10)}
                            disabled={tvScale <= 90}
                            className="px-2 py-0.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 font-black"
                          >
                            -
                          </button>
                          <button
                            onClick={() => setIsScaleDropdownOpen((prev) => !prev)}
                            className="px-2 py-0.5 font-mono font-black text-amber-400"
                          >
                            {tvScale}%
                          </button>
                          <button
                            onClick={() => adjustScale(10)}
                            disabled={tvScale >= 160}
                            className="px-2 py-0.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 font-black"
                          >
                            +
                          </button>
                          {isScaleDropdownOpen && (
                            <div className="absolute right-0 bottom-full mb-2 z-50 bg-neutral-900 border border-amber-500/40 rounded-2xl p-1.5 shadow-2xl flex flex-col gap-1 min-w-[110px]">
                              {[100, 115, 125, 140, 155].map((s) => (
                                <button
                                  key={s}
                                  onClick={() => setSpecificScale(s)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold text-left ${
                                    tvScale === s
                                      ? "bg-amber-500 text-neutral-950 font-black"
                                      : "text-neutral-300 hover:bg-neutral-800"
                                  }`}
                                >
                                  {s}%
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setIsStudioMenuOpen(false);
                          setIsLayoutMenuOpen(true);
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-cyan-500/15 border border-amber-400/50 text-amber-200 font-black text-xs flex items-center justify-center gap-2 hover:bg-amber-500/30 transition"
                      >
                        <MoveHorizontal className="w-4 h-4 text-amber-400" />
                        <span>Méret & Vizuális Téma Stúdió</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={() => setIsHistoryOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-amber-300 hover:border-amber-500/40 text-xs font-bold transition"
              title="Az este során lejátszott dalok előzményei"
            >
              <History className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xl:inline">Előzmények</span>
              <span className="text-[10px] font-mono bg-neutral-800 px-1.5 py-0.5 rounded-full text-amber-300">
                {roundHistory.length}
              </span>
            </button>

            <button
              onClick={handleOpenPodium}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 text-neutral-950 text-xs font-black shadow-lg hover:scale-105 active:scale-95 transition"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Díjátadó</span>
            </button>

            <div className="flex items-center gap-1.5 text-xs font-mono">
              <div className="flex items-center gap-0.5 bg-neutral-900 p-1 rounded-xl border border-neutral-800">
                <Timer className="w-3.5 h-3.5 text-amber-400 ml-1 mr-0.5" />
                {TIME_OPTIONS.map((sec) => (
                  <button
                    key={sec}
                    onClick={() => handleDurationChange(sec)}
                    className={`px-1.5 py-0.5 rounded-lg font-bold transition text-[11px] ${
                      selectedDuration === sec ? "bg-amber-500 text-neutral-950 shadow" : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    {sec === 0 ? "∞" : `${sec}s`}
                  </button>
                ))}
              </div>
              <span className="text-amber-400 font-bold px-2 py-1 rounded-lg bg-neutral-900 border border-neutral-800 min-w-9 text-center">
                {selectedDuration === 0 ? "∞" : `${timeLeft}s`}
              </span>
            </div>

            <button
              onClick={() => setIsShortcutsOpen(true)}
              className="p-2 rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-amber-300 hover:border-amber-500/40 text-xs font-bold transition"
              title="Billentyűparancsok súgója"
            >
              <Keyboard className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={toggleFullscreen}
              className={`p-2 rounded-2xl border text-xs font-bold transition ${
                isFullscreen
                  ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-300"
                  : "bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white"
              }`}
              title="Teljes Képernyő / Mozimód (F)"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={onLockPinGate}
              className="p-2 rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-rose-400 hover:border-rose-500/40 text-xs font-bold transition shadow active:scale-95"
              title="PIN Zárolás"
            >
              <Lock className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Kompakt Aktív Szabályok Status-sáv */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold px-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={toggleStrictQuizMode}
              className={`px-2 py-0.5 rounded-full border transition flex items-center gap-1 ${
                strictQuizMode
                  ? "bg-emerald-500/10 border-emerald-500/35 text-emerald-300"
                  : "bg-neutral-900 border-neutral-800 text-neutral-500"
              }`}
            >
              <ShieldCheck className="w-3 h-3" />
              <span>Szigorú Kvíz: {strictQuizMode ? "BE" : "KI"}</span>
            </button>

            <button
              onClick={toggleDoubleOrNothing}
              className={`px-2 py-0.5 rounded-full border transition flex items-center gap-1 ${
                doubleOrNothingEnabled
                  ? "bg-purple-500/10 border-purple-500/35 text-purple-300"
                  : "bg-neutral-900 border-neutral-800 text-neutral-500"
              }`}
            >
              <Dices className="w-3 h-3" />
              <span>Dupla/Semmi: {doubleOrNothingEnabled ? "BE" : "KI"}</span>
            </button>

            <button
              onClick={cycleFractionalPointsRate}
              className={`px-2 py-0.5 rounded-full border transition flex items-center gap-1 ${
                fractionalPointsRate !== "off"
                  ? "bg-amber-500/10 border-amber-500/35 text-amber-300"
                  : "bg-neutral-900 border-neutral-800 text-neutral-500"
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Részpont: {fractionalPointsRate === "off" ? "KI" : fractionalPointsRate}</span>
            </button>

            <button
              onClick={() => setSmartIntroSkip((prev) => !prev)}
              className={`px-2 py-0.5 rounded-full border transition flex items-center gap-1 ${
                smartIntroSkip
                  ? "bg-cyan-500/10 border-cyan-500/35 text-cyan-300"
                  : "bg-neutral-900 border-neutral-800 text-neutral-500"
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>Intro Skip: {smartIntroSkip ? "BE" : "KI"}</span>
            </button>

            <button
              onClick={toggleTvMode}
              className={`px-2 py-0.5 rounded-full border transition flex items-center gap-1 ${
                isTvMode
                  ? "bg-amber-400/15 border-amber-400/40 text-amber-200"
                  : "bg-neutral-900 border-neutral-800 text-neutral-500"
              }`}
            >
              <Tv className="w-3 h-3" />
              <span>16:9 TV ({tvScale}%)</span>
            </button>
          </div>

          <span className="text-neutral-500 font-mono hidden md:inline">
            Pakli: {playedIds.length}/{filteredTracks.length} dal • Téma: {tvTheme.toUpperCase()}
          </span>
        </div>
      </header>

      {showFilters && (
        <FilterBar
          isTvMode={isTvMode}
          musicFilter={musicFilter}
          setMusicFilter={setMusicFilter}
          selectedGenre={selectedGenre}
          setSelectedGenre={setSelectedGenre}
          availableGenres={availableGenres}
          onlyWithLyrics={onlyWithLyrics}
          setOnlyWithLyrics={setOnlyWithLyrics}
          minYear={minYear}
          maxYear={maxYear}
          absoluteMinYear={absoluteMinYear}
          absoluteMaxYear={absoluteMaxYear}
          setMinYear={setMinYear}
          setMaxYear={setMaxYear}
          playedCount={playedIds.length}
          totalFilteredCount={filteredTracks.length}
        />
      )}

      {/* Dramatikus 3-2-1 Visszaszámláló Overlay */}
      <AnimatePresence>
        {autoPlayCountdown !== null && (
          <motion.div
            key="countdown-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center bg-black/25 backdrop-blur-[2px]"
          >
            <motion.div
              key={autoPlayCountdown}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 20 }}
              className="flex flex-col items-center gap-2 px-10 py-6 rounded-[36px] bg-neutral-900/95 border-2 border-amber-400 shadow-[0_0_80px_rgba(245,158,11,0.55)]"
            >
              <span className="text-xs font-black uppercase tracking-[0.25em] text-amber-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 fill-current" />
                Feladvány rögzítve! Zene indul
              </span>
              <span className="text-6xl sm:text-7xl font-black font-mono text-white drop-shadow-[0_0_25px_rgba(251,191,36,0.9)]">
                {autoPlayCountdown}
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {buzzedPlayer && (
        <div className="fixed top-24 z-50 flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-500 text-white font-black shadow-[0_0_40px_rgba(244,63,94,0.8)] animate-bounce border-2 border-white">
          <Bell className="w-6 h-6 fill-current" />
          <span className="text-sm sm:text-base uppercase tracking-wider">
            🔔 {buzzedPlayer} CSENGETETT ELSŐKÉNT!
          </span>
          {strictQuizMode && (
            <button
              onClick={() => {
                grantManualCreditToPlayer(buzzedPlayer);
                setBuzzedPlayer(null);
              }}
              className="px-3 py-1 rounded-xl bg-emerald-500 text-neutral-950 text-xs font-black hover:bg-emerald-400 transition"
            >
              ✅ Helyes (+1 X küldése)
            </button>
          )}
          <button onClick={() => setBuzzedPlayer(null)} className="ml-1 p-1 rounded-lg bg-black/30 hover:bg-black/50">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* FŐ TARTALOM */}
      <div className="w-full flex flex-col items-center my-auto py-2 z-10">
        {/* Meccslabda TV Banner */}
        {matchPointPlayers.length > 0 && (
          <div className="mb-2.5 px-5 py-1.5 rounded-full bg-gradient-to-r from-rose-600/25 via-amber-500/25 to-rose-600/25 border border-amber-400/70 text-amber-200 text-xs font-black flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.25)] animate-pulse">
            <span>🔥 MECCSLABDA RADAR:</span>
            <span className="text-white uppercase">
              {matchPointPlayers.map((p) => p.name).join(", ")}
            </span>
            <span className="text-rose-200">már csak 1 X-re van a Bingótól!</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
          {activeCategory && (
            <div
              className="flex items-center gap-2.5 px-5 py-2 rounded-2xl border-2 backdrop-blur-md shadow-2xl transition-all"
              style={{
                backgroundColor: `${activeCategory.accent}20`,
                borderColor: activeCategory.accent,
                boxShadow: `0 0 25px ${activeCategory.accent}35`,
              }}
            >
              <Sparkles className="w-4 h-4 shrink-0" style={{ color: activeCategory.accent }} />
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-300">
                  Szabály:
                </span>
                <span className="text-sm font-black uppercase tracking-wide" style={{ color: activeCategory.accent }}>
                  {activeCategory.label}
                </span>
                <span className="text-xs text-neutral-300 font-mono hidden sm:inline">
                  ({activeCategory.desc})
                </span>
              </div>
            </div>
          )}

          {/* Élő "Ki tippelt már?" státuszsor */}
          {!isFlipped && trackedPlayerNames.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-neutral-900/90 border border-neutral-700/80 text-xs">
              <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="font-bold text-neutral-300">Tippek:</span>
              <div className="flex flex-wrap gap-1.5">
                {trackedPlayerNames.map((name) => {
                  const foundGuess = guessList.find(
                    (g) => g.playerName.trim().toLowerCase() === name.trim().toLowerCase()
                  );
                  if (foundGuess) {
                    return (
                      <span
                        key={name}
                        className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-black text-[11px] flex items-center gap-1"
                      >
                        <span>✅ {foundGuess.playerName}</span>
                        {foundGuess.riskDouble && (
                          <span className="text-amber-300 font-extrabold" title="Dupla vagy Semmit kockáztatott!">
                            🎲2x
                          </span>
                        )}
                      </span>
                    );
                  }
                  return (
                    <span
                      key={name}
                      className="px-2.5 py-0.5 rounded-full bg-neutral-950 border border-neutral-800 text-neutral-400 font-bold text-[11px] flex items-center gap-1"
                    >
                      <span>⏳ {name}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Aktív Körsúgó (Hint HUD) */}
        <AnimatePresence>
          {activeHint && !isFlipped && (
            <motion.div
              key={activeHint.level}
              initial={{ opacity: 0, y: -10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
              className="mb-3 w-full max-w-2xl px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-neutral-900/95 border-2 border-amber-400/75 shadow-[0_0_30px_rgba(245,158,11,0.2)] flex items-center justify-between gap-3"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-300 shrink-0">
                  <Lightbulb className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 block">
                    {activeHint.badge}
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-white leading-snug">{activeHint.text}</p>
                </div>
              </div>
              {activeHint.level < 3 && (
                <button
                  onClick={onRevealNextHint}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-[11px] font-black shrink-0 transition active:scale-95"
                >
                  Következő súgó ({activeHint.level + 1}/3)
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* KÖR KIÉRTÉKELÉS + 📊 TIPP-IDŐVONAL */}
        <AnimatePresence>
          {isFlipped && evaluatedGuesses.length > 0 && currentTrack && (
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="w-full max-w-3xl bg-neutral-900/95 border-2 border-amber-400 rounded-3xl p-4 mb-4 shadow-[0_0_50px_rgba(245,158,11,0.25)]"
            >
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <h3 className="text-sm font-black uppercase tracking-wider text-amber-300">
                    Kör Kiértékelés • Helyes évszám: {currentTrack.year}
                  </h3>
                </div>
                <span className="text-xs font-mono text-neutral-400">
                  {currentTrack.artist} – {currentTrack.title}
                </span>
              </div>

              <GuessTimeline
                actualYear={currentTrack.year}
                guesses={evaluatedGuesses}
                minYear={minYear}
                maxYear={maxYear}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {evaluatedGuesses.map((g, idx) => {
                  const isExact = g.yearDiff === 0;
                  const isClose2 = g.yearDiff > 0 && g.yearDiff <= 2;
                  const isClose5 = g.yearDiff > 2 && g.yearDiff <= 5;
                  const playerObj = players.find(
                    (p) => p.name.trim().toLowerCase() === g.playerName.trim().toLowerCase()
                  );
                  const playerStreak = sessionStats[g.playerName]?.currentStreak || 0;
                  const threshold = getFractionalThreshold(fractionalPointsRate);
                  const hasSecondary = (g.secondaryReasons?.length || 0) > 0;

                  return (
                    <motion.div
                      key={g.playerName}
                      initial={{ opacity: 0, y: 12, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: idx * 0.06, type: "spring", stiffness: 280, damping: 22 }}
                      className={`flex flex-col p-3 rounded-2xl border transition ${
                        isExact || g.earnedCredits > 0
                          ? "bg-amber-500/15 border-amber-400/80 text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
                          : isClose2
                          ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-200"
                          : isClose5
                          ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-200"
                          : "bg-neutral-950/90 border-neutral-800 text-neutral-400"
                      }`}
                    >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {isExact ? "🥇" : isClose2 ? "🥈" : isClose5 ? "🥉" : "❌"}
                        </span>
                        <div>
                          <div className="font-black text-xs uppercase text-white flex items-center gap-1.5 flex-wrap">
                            <span>
                              {idx + 1}. {g.playerName}
                            </span>
                            {playerStreak >= 2 && (
                              <span className="px-1.5 py-0.5 rounded-md bg-orange-500/25 border border-orange-400/60 text-orange-200 text-[9px] font-black flex items-center gap-0.5">
                                <Flame className="w-2.5 h-2.5 text-orange-300" />
                                {playerStreak}× SZÉRIA
                              </span>
                            )}
                            {g.riskDouble ? (
                              <span
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                                  g.wonDouble
                                    ? "bg-gradient-to-r from-amber-400 to-yellow-400 text-neutral-950 shadow"
                                    : "bg-rose-600 text-white shadow"
                                }`}
                              >
                                {g.wonDouble ? "🎰 2× DUPLA SIKER!" : "💀 -1 X DUPLA BUKTA"}
                              </span>
                            ) : g.earnedCredits > 0 ? (
                              <span className="px-2 py-0.5 rounded-lg bg-emerald-500 text-neutral-950 text-[10px] font-black shadow-sm">
                                ✅ 1× X ({activeCategory?.label || "Kötött szín"})
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-500 text-[9px] font-bold">
                                Nincs nagypont
                              </span>
                            )}
                          </div>
                          {(g.artistGuess || g.titleGuess || g.text) && (
                            <div className="text-[10px] text-neutral-300 mt-0.5">
                              {g.artistGuess || g.titleGuess ? (
                                <span>
                                  🎤 {g.artistGuess || "-"} • 🎵 {g.titleGuess || "-"}
                                </span>
                              ) : (
                                <span>Tipp: „{g.text}”</span>
                              )}
                              {(g.titleMatch || g.artistMatch) && (
                                <span className="text-emerald-400 font-bold ml-1">🎯</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right font-mono">
                          <div className="text-sm font-black">{g.year}</div>
                          <div className={`text-[10px] font-bold ${isExact ? "text-amber-400" : "text-neutral-400"}`}>
                            {isExact ? "🎯 PONTOS ÉV!" : `±${g.yearDiff} év`}
                          </div>
                        </div>

                        {g.riskDouble ? (
                          g.wonDouble ? (
                            <div className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 text-neutral-950 font-black text-xs shadow-md">
                              +2 X
                            </div>
                          ) : (
                            <div className="px-2.5 py-1 rounded-xl bg-rose-600 text-white font-black text-xs shadow-md">
                              -1 X
                            </div>
                          )
                        ) : g.earnedCredits > 0 ? (
                          <div className="px-2.5 py-1 rounded-xl bg-emerald-500 text-neutral-950 font-black text-xs shadow-md">
                            +1 X
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {fractionalPointsRate !== "off" && (
                      <div className="mt-2.5 p-2.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-neutral-950 border border-amber-500/30 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black uppercase text-amber-300 flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                              <span>Részpont ({fractionalPointsRate}):</span>
                            </span>
                            {hasSecondary ? (
                              <span className="px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-200 text-[10px] font-bold border border-amber-400/40">
                                +{g.earnedPartialUnits}× ({g.secondaryReasons.join(" • ")})
                              </span>
                            ) : (
                              <span className="text-[10px] text-neutral-500 italic">Nincs másodlagos találat</span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-amber-300 bg-neutral-900/90 px-2 py-0.5 rounded-lg border border-neutral-800">
                              <span>Haladás:</span>
                              <span className="text-white font-black">
                                {playerObj?.partialPoints ?? 0}/{threshold}
                              </span>
                              <span>⭐</span>
                            </div>
                            {(playerObj?.jokerCredits ?? 0) > 0 && (
                              <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 text-neutral-950 text-[10px] font-black shadow flex items-center gap-1 animate-pulse">
                                <span>🃏 {playerObj?.jokerCredits} db Joker X</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-[9px] text-neutral-400 flex items-center justify-between border-t border-neutral-800/60 pt-1">
                          <span>
                            💡 <b>Mi a Részpont?</b> A dal egyéb adataiért (előadó/cím) jár. {threshold} db
                            gyűjtésével kapsz 1 <b>Joker X</b>-et!
                          </span>
                          {(playerObj?.jokerCredits ?? 0) > 0 && (
                            <span className="text-amber-300 font-bold ml-2 shrink-0">
                              ✨ A Joker X bármely színre letehető a táblán!
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {strictQuizMode && (
                      <div className="mt-2 pt-1.5 border-t border-neutral-800/60 flex items-center justify-between text-[10px]">
                        <span className="text-neutral-500 font-medium text-[9px] uppercase tracking-wider">
                          Házigazda kézi korrekció:
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => grantManualCreditToPlayer(g.playerName)}
                            className="px-2 py-0.5 rounded-lg bg-neutral-900 hover:bg-emerald-500 hover:text-neutral-950 border border-neutral-700 hover:border-emerald-500 text-neutral-300 font-bold transition text-[10px]"
                            title="Kézi +1 Kötött X küldése (pl. ha a játékos élőszóban bemondta)"
                          >
                            +1 Kötött X
                          </button>
                          <button
                            onClick={() => grantManualJokerCreditToPlayer(g.playerName)}
                            className="px-2 py-0.5 rounded-lg bg-neutral-900 hover:bg-amber-400 hover:text-neutral-950 border border-neutral-700 hover:border-amber-400 text-amber-300 font-bold transition text-[10px] flex items-center gap-1"
                            title="Kézi +1 Szabad Joker X küldése (bármelyik színre leteheti a tábláján)"
                          >
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>+1 Joker X</span>
                          </button>
                          {(playerObj?.jokerCredits ?? 0) > 0 && (
                            <button
                              onClick={() => revokeManualJokerCreditFromPlayer(g.playerName)}
                              className="px-1.5 py-0.5 rounded-lg bg-neutral-900 hover:bg-rose-900/60 border border-neutral-800 hover:border-rose-500 text-neutral-400 hover:text-rose-300 font-bold transition text-[10px]"
                              title="Tévesen kiosztott Joker X visszavonása (-1 Joker X)"
                            >
                              -1 Joker
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* TÁBLÁK NÉZET */}
        <div className={activeTab === "boards" ? "w-full flex justify-center" : "hidden"}>
          <PlayerBoard
            players={players}
            setPlayers={setPlayers}
            activePlayerIdx={activePlayerIdx}
            setActivePlayerIdx={setActivePlayerIdx}
            onStartSpinAndMusic={() => handleAttemptSpin(false)}
            isPlayingMusic={isPlaying}
            activeCategory={activeCategory}
            tvMode={isTvMode}
            tvScale={tvScale}
          />
        </div>

        {/* RULETT & KÁRTYA NÉZET */}
        <div
          className={
            activeTab === "game"
              ? `w-full flex flex-col items-center gap-6 ${isTvMode ? "max-w-[1900px]" : "max-w-5xl"}`
              : "hidden"
          }
        >
          <div
            className={`w-full ${
              isTvMode
                ? "flex flex-col xl:flex-row items-center justify-center relative"
                : "grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-center justify-items-center"
            }`}
            style={isTvMode ? { gap: `${tvGap}px` } : undefined}
          >
            <div
              className={`relative flex flex-col items-center justify-center p-5 rounded-3xl bg-neutral-900/40 border border-neutral-800/60 backdrop-blur-md shadow-2xl transition-all duration-200 group ${
                isTvMode ? "" : "w-full max-w-md"
              }`}
              style={isTvMode ? { width: `${tvWheelSize + 50}px`, maxWidth: "100%" } : undefined}
            >
              {isTvMode && (
                <div
                  className="hidden xl:flex absolute -left-4 top-1/2 -translate-y-1/2 flex-col items-center justify-center py-6 px-2 group cursor-ew-resize select-none z-30"
                  title="Húzd a kerék méretének állításához!"
                  onMouseDown={handleStartDragWheel}
                >
                  <div
                    className={`w-1.5 h-28 rounded-full transition-all duration-300 ${
                      isDraggingWheel
                        ? "opacity-100 bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.9)]"
                        : "opacity-0 group-hover:opacity-100 bg-neutral-800 group-hover:bg-amber-400 group-hover:shadow-[0_0_12px_rgba(251,191,36,0.9)]"
                    }`}
                  />
                  <div
                    className={`absolute transition-all duration-300 pointer-events-auto -left-16 flex items-center gap-1 bg-neutral-900/95 border border-neutral-700 px-2 py-0.5 rounded-full shadow-2xl text-[10px] font-mono text-amber-300 ${
                      isDraggingWheel ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        saveTvLayout(Math.max(380, tvWheelSize - 20), tvCardWidth, tvGap);
                      }}
                      className="hover:text-white px-1"
                    >
                      -
                    </button>
                    <span>{tvWheelSize}px</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        saveTvLayout(Math.min(650, tvWheelSize + 20), tvCardWidth, tvGap);
                      }}
                      className="hover:text-white px-1"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              <RouletteWheel
                onSpinEnd={handleSpinEnd}
                onBeforeSpin={() => handleAttemptSpin(false)}
                currentCategory={activeCategory}
                tvMode={isTvMode}
                tvScale={tvScale}
                customWheelSize={isTvMode ? tvWheelSize : undefined}
              />

              {pendingPlayers.length > 0 && (
                <button
                  onClick={() => setPendingMarksModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/50 text-rose-300 text-xs font-bold animate-pulse hover:bg-rose-500/30 transition shadow-lg mt-3"
                  title="Kattints a részletekhez"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>X behúzása hiányzik ({pendingPlayers.length} játékos)</span>
                </button>
              )}
            </div>

            {isTvMode && (
              <div
                className="hidden xl:flex flex-col items-center justify-center relative select-none py-8 px-4 group cursor-col-resize z-20 shrink-0 w-12"
                title="Húzd az elemek közti távolság (rés) állításához!"
                onMouseDown={handleStartDragGap}
                onTouchStart={handleStartTouchDragGap}
              >
                <div
                  className={`transition-opacity duration-300 flex flex-col items-center justify-center w-full h-full relative ${
                    isDraggingGap ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  }`}
                >
                  <div
                    className={`w-1.5 h-44 rounded-full transition-all duration-200 ${
                      isDraggingGap
                        ? "bg-amber-400 shadow-[0_0_20px_rgba(251,191,36,1)] scale-110"
                        : "bg-neutral-700 group-hover:bg-amber-400 group-hover:shadow-[0_0_15px_rgba(251,191,36,0.9)]"
                    }`}
                  />
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-neutral-900 border-2 transition-all shadow-2xl flex items-center justify-center ${
                      isDraggingGap
                        ? "border-amber-400 text-amber-300 scale-125 shadow-[0_0_20px_rgba(251,191,36,0.8)]"
                        : "border-neutral-600 group-hover:border-amber-400 text-neutral-300 group-hover:text-amber-300"
                    }`}
                  >
                    <MoveHorizontal className="w-4 h-4" />
                  </div>

                  <div className="absolute -bottom-8 pointer-events-auto flex items-center gap-1.5 bg-neutral-900/95 border border-neutral-700 px-2.5 py-0.5 rounded-full shadow-2xl text-[10px] font-mono whitespace-nowrap text-amber-300">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        saveTvLayout(tvWheelSize, tvCardWidth, Math.max(8, tvGap - 8));
                      }}
                      className="hover:text-white px-1 font-bold"
                      title="Hézag csökkentése (-8px)"
                    >
                      -
                    </button>
                    <span>Hézag: {tvGap}px</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        saveTvLayout(tvWheelSize, tvCardWidth, Math.min(160, tvGap + 8));
                      }}
                      className="hover:text-white px-1 font-bold"
                      title="Hézag növelése (+8px)"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div
              className={`relative flex flex-col items-center justify-center group ${
                isTvMode ? "" : "w-full max-w-sm"
              }`}
              style={isTvMode ? { width: `${tvCardWidth}px`, maxWidth: "100%" } : undefined}
            >
              {isLoadingTracks ? (
                <div className="w-80 h-96 rounded-3xl border border-neutral-800 bg-neutral-900/60 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-neutral-400 gap-3 shadow-2xl animate-pulse">
                  <Disc className="w-12 h-12 text-amber-400 animate-spin" />
                  <p className="text-sm font-bold text-neutral-200">Dalok betöltése a felhőből...</p>
                  <p className="text-[11px] text-neutral-500 font-mono">Dalkatalógus és dalszövegek előkészítése</p>
                </div>
              ) : filteredTracks.length > 0 && currentTrack ? (
                <MusicCard
                  track={currentTrack}
                  isFlipped={isFlipped}
                  onFlip={onFlipAndShow}
                  highlight={guessTarget}
                  currentTime={currentTime}
                  onSeek={onSeek}
                  isPlaying={isPlaying}
                  accentColor={currentAccent}
                  tvMode={isTvMode}
                  tvScale={tvScale}
                  customCardWidth={isTvMode ? tvCardWidth : undefined}
                  liveSpectrum={liveSpectrum}
                />
              ) : allTracksCount === 0 ? (
                <div className="w-80 h-96 rounded-3xl border-2 border-dashed border-rose-500/40 bg-rose-950/10 flex flex-col items-center justify-center p-6 text-center text-neutral-300 gap-3">
                  <AlertTriangle className="w-12 h-12 text-rose-400" />
                  <p className="text-sm font-black text-rose-200">
                    {tracksError ? "Nem sikerült betölteni a dallistát!" : "A dallista még nincs betöltve"}
                  </p>
                  {tracksError && (
                    <p className="text-[11px] text-rose-300/80 leading-relaxed max-w-[240px]">{tracksError}</p>
                  )}
                  <button
                    onClick={onRetryLoadTracks}
                    className="mt-1 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition active:scale-95 shadow-lg"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Dalok betöltése</span>
                  </button>
                </div>
              ) : (
                <div className="w-80 h-96 rounded-3xl border-2 border-dashed border-neutral-800 flex flex-col items-center justify-center p-6 text-center text-neutral-500 gap-3">
                  <CalendarRange className="w-12 h-12 text-neutral-700" />
                  <p className="text-sm font-bold text-neutral-300">Nincs dal ebben a szűrésben!</p>
                  <button
                    onClick={onResetFilters}
                    className="mt-1 px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-300 text-xs font-bold border border-neutral-700 transition active:scale-95"
                  >
                    Szűrők visszaállítása
                  </button>
                </div>
              )}

              {isTvMode && (
                <div
                  className="hidden xl:flex absolute -right-4 top-1/2 -translate-y-1/2 flex-col items-center justify-center py-6 px-2 group cursor-ew-resize select-none z-30"
                  title="Húzd a kártya méretének állításához!"
                  onMouseDown={handleStartDragCard}
                >
                  <div
                    className={`w-1.5 h-28 rounded-full transition-all duration-300 ${
                      isDraggingCard
                        ? "opacity-100 bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.9)]"
                        : "opacity-0 group-hover:opacity-100 bg-neutral-800 group-hover:bg-amber-400 group-hover:shadow-[0_0_12px_rgba(251,191,36,0.9)]"
                    }`}
                  />
                  <div
                    className={`absolute transition-all duration-300 pointer-events-auto -right-16 flex items-center gap-1 bg-neutral-900/95 border border-neutral-700 px-2 py-0.5 rounded-full shadow-2xl text-[10px] font-mono text-amber-300 ${
                      isDraggingCard ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        saveTvLayout(tvWheelSize, Math.max(360, tvCardWidth - 20), tvGap);
                      }}
                      className="hover:text-white px-1"
                    >
                      -
                    </button>
                    <span>{tvCardWidth}px</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        saveTvLayout(tvWheelSize, Math.min(580, tvCardWidth + 20), tvGap);
                      }}
                      className="hover:text-white px-1"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {showLiveScoreboard && (
            <LiveScoreboardStrip
              players={players}
              roundGuesses={roundGuesses}
              sessionStats={sessionStats}
              activeCategory={activeCategory}
              isFlipped={isFlipped}
              onSelectPlayerBoard={(idx) => {
                setActivePlayerIdx(idx);
                setActiveTab("boards");
              }}
            />
          )}
        </div>
      </div>

      <AudioPlayerFooter
        isPlaying={isPlaying}
        isFlipped={isFlipped}
        activeTab={activeTab}
        selectedDuration={selectedDuration}
        progressPercent={progressPercent}
        accentColor={currentAccent}
        audioError={audioError}
        liveSpectrum={liveSpectrum}
        hasLiveSpectrum={hasLiveSpectrum}
        musicVolume={musicVolume}
        onMusicVolumeChange={onMusicVolumeChange}
        sfxVolume={sfxVolume}
        onSfxVolumeChange={onSfxVolumeChange}
        sfxMuted={sfxMuted}
        onToggleSfxMuted={onToggleSfxMuted}
        onPlayToggle={onPlayToggle}
        onFlip={onFlipAndShow}
        onNextTrack={onNextTrack}
      />

      <PodiumModal
        mounted={mounted}
        isOpen={isPodiumOpen}
        onClose={() => setIsPodiumOpen(false)}
        players={players}
        sessionStats={sessionStats}
      />

      <PendingMarksModal
        mounted={mounted}
        isOpen={pendingMarksModalOpen}
        pendingPlayers={pendingPlayers}
        onClose={() => setPendingMarksModalOpen(false)}
        onPingPlayers={handlePingPendingPlayers}
        onForceSpin={() => {
          setPendingMarksModalOpen(false);
          handleAttemptSpin(true);
        }}
      />

      <HostQrModal
        mounted={mounted}
        isOpen={isHostModalOpen}
        roomCode={roomCode}
        joinUrl={joinUrl}
        onlinePlayers={onlinePlayers}
        onClose={() => setIsHostModalOpen(false)}
        onResetSession={onResetSession}
      />

      <TvLayoutModal
        mounted={mounted}
        isOpen={isLayoutMenuOpen}
        onClose={() => setIsLayoutMenuOpen(false)}
        tvGap={tvGap}
        tvWheelSize={tvWheelSize}
        tvCardWidth={tvCardWidth}
        tvHeaderScale={tvHeaderScale}
        tvTheme={tvTheme}
        onSelectTheme={onSelectTheme}
        onSaveLayout={saveTvLayout}
        onApplyPreset={applyLayoutPreset}
      />

      <HistoryDrawer
        mounted={mounted}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={roundHistory}
        onClearHistory={onClearHistory}
      />

      <TieBreakerModal
        mounted={mounted}
        isOpen={isTieBreakerOpen}
        contenders={tieBreaker?.contenders || []}
        winner={tieBreaker?.winner || null}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        isFlipped={isFlipped}
        buzzedPlayer={buzzedPlayer}
        roundGuesses={roundGuesses}
        onClose={onCloseTieBreaker}
        onPlayToggle={onPlayToggle}
        onNextTrack={onNextTrack}
        onRevealTrack={onFlipAndShow}
        onCrownWinner={onCrownTieBreakerWinner}
      />

      {mounted &&
        isShortcutsOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsShortcutsOpen(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md bg-neutral-900 border-2 border-amber-400/70 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <Keyboard className="w-5 h-5 text-amber-400" />
                  <h3 className="text-sm font-black uppercase tracking-wider text-amber-300">
                    Billentyűparancsok
                  </h3>
                </div>
                <button
                  onClick={() => setIsShortcutsOpen(false)}
                  className="p-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2 text-xs">
                {[
                  { key: "Space", desc: "Kártya fordítás / Zene indítás-szünet" },
                  { key: "P", desc: "Zene lejátszás / szüneteltetés" },
                  { key: "R", desc: "Rulett kerék pörgetése" },
                  { key: "→", desc: "Következő dal sorsolása" },
                  { key: "I", desc: "Következő súgó (Hint) felfedése (1/3–3/3)" },
                  { key: "F", desc: "Teljes képernyő (Mozimód)" },
                  { key: "T", desc: "16:9 TV elrendezés ki/be" },
                  { key: "Esc", desc: "Megnyitott ablakok bezárása" },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800"
                  >
                    <span className="text-neutral-300 font-medium">{item.desc}</span>
                    <kbd className="px-2.5 py-1 rounded-lg bg-neutral-800 border border-neutral-700 font-mono font-black text-amber-300 text-[11px]">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setIsShortcutsOpen(false)}
                className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs uppercase tracking-wider transition"
              >
                Bezárás
              </button>
            </motion.div>
          </div>,
          document.body
        )}
    </main>
  );
};

