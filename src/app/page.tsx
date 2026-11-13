"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import confetti from "canvas-confetti";
import { GuessTarget } from "../components/MusicCard";
import { Category } from "../components/RouletteWheel";
import {
  PlayerData,
  createEmptyGrid,
  generateRandomColorGrid,
  getCategoryColorIndex,
  checkBingo,
} from "../components/PlayerBoard";
import { JoinRoomScreen } from "../components/HostModals";
import { HostView } from "../components/HostView";
import { MobileClientView, MobileRoundPhase } from "../components/MobileClientView";
import { useAudioPlayer } from "../hooks/useAudioPlayer";
import { Track } from "../types/track";
import {
  MusicFilter,
  SoundEffectType,
  FractionalPointsRate,
  RemoteCommand,
  PlayerGuess,
  FloatingReaction,
  PlayerSessionStats,
  TvTheme,
  RoundHint,
  RoundHistoryEntry,
  PersonalRoundFeedback,
  TieBreakerState,
  getFractionalThreshold,
} from "../types/game";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { PinGate, getPinAuthToken, lockPinGate } from "../components/PinGate";
import {
  getSharedAudioContext,
  playMarkerSound,
  playBuzzerSound,
  playPartySoundEffect,
  getSmartStartTime,
  triggerHaptic,
} from "../lib/audioEffects";
import { evaluatePlayerGuesses } from "../lib/fuzzyMatch";
import { buildRoundHint } from "../lib/hintHelper";

interface WakeLockSentinelLike {
  release: () => Promise<void>;
  addEventListener: (type: "release", listener: () => void) => void;
}

export default function Home() {
  const [allTracks, setAllTracks] = useState<Track[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState<boolean>(true);

  const { absoluteMinYear, absoluteMaxYear } = useMemo(() => {
    const validYears = allTracks
      .map((t) => t.year)
      .filter((y) => typeof y === "number" && y >= 1950 && y <= 2030);
    if (!validYears.length) return { absoluteMinYear: 1960, absoluteMaxYear: 2026 };
    return {
      absoluteMinYear: Math.min(...validYears),
      absoluteMaxYear: Math.max(...validYears),
    };
  }, [allTracks]);

  const availableGenres = useMemo(() => {
    const set = new Set<string>();
    allTracks.forEach((t) => {
      if (t.genre && t.genre.trim()) {
        set.add(t.genre.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "hu"));
  }, [allTracks]);

  const [musicFilter, setMusicFilter] = useState<MusicFilter>("all");
  const [selectedGenre, setSelectedGenre] = useState<string>("all");
  const [onlyWithLyrics, setOnlyWithLyrics] = useState<boolean>(false);
  const [minYear, setMinYear] = useState<number>(absoluteMinYear);
  const [maxYear, setMaxYear] = useState<number>(absoluteMaxYear);
  const [smartIntroSkip, setSmartIntroSkip] = useState<boolean>(true);
  const [showFilters, setShowFilters] = useState<boolean>(true);
  const [doubleOrNothingEnabled, setDoubleOrNothingEnabled] = useState<boolean>(true);
  const [strictQuizMode, setStrictQuizMode] = useState<boolean>(true);
  const [fractionalPointsRate, setFractionalPointsRate] = useState<FractionalPointsRate>("1/3");

  // Wake Lock & Fullscreen
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(false);
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // 16:9 TV & Layout Méretezés + Téma
  const [isTvMode, setIsTvMode] = useState<boolean>(false);
  const [tvTheme, setTvTheme] = useState<TvTheme>("gala");
  const [tvScale, setTvScale] = useState<number>(120);
  const [isScaleDropdownOpen, setIsScaleDropdownOpen] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [tvWheelSize, setTvWheelSize] = useState<number>(530);
  const [tvCardWidth, setTvCardWidth] = useState<number>(470);
  const [tvGap, setTvGap] = useState<number>(28);
  const [tvHeaderScale, setTvHeaderScale] = useState<number>(100);
  const [isLayoutMenuOpen, setIsLayoutMenuOpen] = useState<boolean>(false);
  const [isDraggingGap, setIsDraggingGap] = useState<boolean>(false);
  const [isDraggingWheel, setIsDraggingWheel] = useState<boolean>(false);
  const [isDraggingCard, setIsDraggingCard] = useState<boolean>(false);

  const handleSelectTheme = (theme: TvTheme) => {
    setTvTheme(theme);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("hit_tv_theme", theme);
      } catch {
        // ignore
      }
    }
  };

  const toggleTvMode = () => {
    setIsTvMode((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("hit_host_tv_mode", String(next));
      }
      return next;
    });
  };

  const adjustScale = (delta: number) => {
    setTvScale((prev) => {
      const next = Math.max(90, Math.min(160, prev + delta));
      if (typeof window !== "undefined") {
        localStorage.setItem("hit_host_tv_scale", String(next));
      }
      return next;
    });
  };

  const setSpecificScale = (scale: number) => {
    setTvScale(scale);
    setIsScaleDropdownOpen(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("hit_host_tv_scale", String(scale));
    }
  };

  const saveTvLayout = (wheel: number, card: number, gap: number, headerScale?: number) => {
    const safeWheel = Math.max(380, Math.min(650, wheel));
    const safeCard = Math.max(360, Math.min(580, card));
    const safeGap = Math.max(8, Math.min(160, gap));
    const safeHeader = headerScale !== undefined ? Math.max(85, Math.min(150, headerScale)) : tvHeaderScale;
    setTvWheelSize(safeWheel);
    setTvCardWidth(safeCard);
    setTvGap(safeGap);
    if (headerScale !== undefined) setTvHeaderScale(safeHeader);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          "hit_tv_layout_prefs",
          JSON.stringify({ wheelSize: safeWheel, cardWidth: safeCard, gap: safeGap, headerScale: safeHeader })
        );
        localStorage.setItem("hit_tv_header_scale", String(safeHeader));
      } catch {
        // ignore storage quota errors
      }
    }
  };

  const applyLayoutPreset = (type: "cinema" | "balanced" | "compact") => {
    if (type === "cinema") {
      saveTvLayout(580, 510, 24, 125);
    } else if (type === "balanced") {
      saveTvLayout(520, 460, 36, 110);
    } else {
      saveTvLayout(450, 410, 20, 100);
    }
  };

  const handleStartDragGap = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingGap(true);
    const startX = e.clientX;
    const startGap = tvGap;
    let currentGap = startGap;

    const onMouseMove = (moveEvt: MouseEvent) => {
      const delta = moveEvt.clientX - startX;
      currentGap = Math.max(8, Math.min(160, Math.round(startGap + delta)));
      setTvGap(currentGap);
    };

    const onMouseUp = () => {
      setIsDraggingGap(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      saveTvLayout(tvWheelSize, tvCardWidth, currentGap);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const handleStartTouchDragGap = (e: React.TouchEvent) => {
    if (!e.touches[0]) return;
    setIsDraggingGap(true);
    const startX = e.touches[0].clientX;
    const startGap = tvGap;
    let currentGap = startGap;

    const onTouchMove = (moveEvt: TouchEvent) => {
      if (!moveEvt.touches[0]) return;
      const delta = moveEvt.touches[0].clientX - startX;
      currentGap = Math.max(8, Math.min(160, Math.round(startGap + delta)));
      setTvGap(currentGap);
    };

    const onTouchEnd = () => {
      setIsDraggingGap(false);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      saveTvLayout(tvWheelSize, tvCardWidth, currentGap);
    };

    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onTouchEnd);
  };

  const handleStartDragWheel = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingWheel(true);
    const startX = e.clientX;
    const startWheel = tvWheelSize;
    let currentWheel = startWheel;

    const onMouseMove = (moveEvt: MouseEvent) => {
      const delta = startX - moveEvt.clientX;
      currentWheel = Math.max(380, Math.min(650, Math.round(startWheel + delta)));
      setTvWheelSize(currentWheel);
    };

    const onMouseUp = () => {
      setIsDraggingWheel(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      saveTvLayout(currentWheel, tvCardWidth, tvGap);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const handleStartDragCard = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingCard(true);
    const startX = e.clientX;
    const startCard = tvCardWidth;
    let currentCard = startCard;

    const onMouseMove = (moveEvt: MouseEvent) => {
      const delta = moveEvt.clientX - startX;
      currentCard = Math.max(360, Math.min(580, Math.round(startCard + delta)));
      setTvCardWidth(currentCard);
    };

    const onMouseUp = () => {
      setIsDraggingCard(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      saveTvLayout(tvWheelSize, currentCard, tvGap);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  useEffect(() => {
    setMinYear(absoluteMinYear);
    setMaxYear(absoluteMaxYear);
  }, [absoluteMinYear, absoluteMaxYear]);

  const filteredTracks = useMemo(() => {
    return allTracks.filter((t) => {
      const isHu = t.language === "hu";
      if (musicFilter === "hungarian" && !isHu) return false;
      if (musicFilter === "international" && isHu) return false;
      if (selectedGenre !== "all" && (t.genre || "").trim() !== selectedGenre) return false;
      if (onlyWithLyrics && !t.lyrics?.trim()) return false;
      if (typeof t.year === "number") {
        if (t.year < minYear || t.year > maxYear) return false;
      }
      return true;
    });
  }, [allTracks, musicFilter, selectedGenre, onlyWithLyrics, minYear, maxYear]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextPreloadIndex, setNextPreloadIndex] = useState<number>(1);
  const [playedIds, setPlayedIds] = useState<(string | number)[]>([]);

  const [isFlipped, setIsFlipped] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [autoPlayCountdown, setAutoPlayCountdown] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"boards" | "game">("boards");
  const [guessTarget, setGuessTarget] = useState<GuessTarget>("year");

  const currentTrack = filteredTracks[currentIndex] || filteredTracks[0] || allTracks[0];
  const nextPreloadTrack = filteredTracks[nextPreloadIndex] || filteredTracks[0] || allTracks[0];
  const currentAccent = activeCategory?.accent || "#f59e0b";

  // Audió motor hook (CORS előellenőrzés + FFT AnalyserNode + zene/SFX hangerő + fade)
  const {
    audioRef,
    consecutiveAudioErrorsRef,
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    selectedDuration,
    timeLeft,
    setTimeLeft,
    audioError,
    setAudioError,
    musicVolume,
    setMusicVolume,
    sfxVolume,
    setSfxVolume,
    sfxMuted,
    toggleSfxMuted,
    corsAudioEnabled,
    hasLiveSpectrum,
    spectrum,
    ensureAnalyserConnected,
    fadeIn,
    fadeOut,
    handleStop,
    handleSeek: seekAudio,
    handleDurationChange: changeAudioDuration,
  } = useAudioPlayer(currentTrack?.audioUrl);

  const [players, setPlayers] = useState<PlayerData[]>([
    {
      id: "host",
      name: "Házigazda",
      notes: "",
      grid: createEmptyGrid(),
      colorGrid: generateRandomColorGrid(),
      hasWon: false,
    },
  ]);
  const [activePlayerIdx, setActivePlayerIdx] = useState(0);

  // Multiplayer, Buzzer, Host Remote & Mobil Kliens állapotok
  const [roomCode, setRoomCode] = useState<string>("");
  const [isHostModalOpen, setIsHostModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [isJoinedAsClient, setIsJoinedAsClient] = useState(false);
  const [clientGrid, setClientGrid] = useState<boolean[][]>(createEmptyGrid());
  const [clientColorGrid, setClientColorGrid] = useState<number[][]>(() => generateRandomColorGrid());
  const [clientNotes, setClientNotes] = useState<string>("");
  const [buzzedPlayer, setBuzzedPlayer] = useState<string | null>(null);
  const [hostYearRange, setHostYearRange] = useState<{ min: number; max: number } | null>(null);

  // Mobil Kliens Távirányító & Tipp & Szinkron fázis
  const [isRemoteOpen, setIsRemoteOpen] = useState<boolean>(false);
  const [clientGuessYear, setClientGuessYear] = useState<number>(1995);
  const [clientGuessText, setClientGuessText] = useState<string>("");
  const [clientGuessArtist, setClientGuessArtist] = useState<string>("");
  const [clientGuessTitle, setClientGuessTitle] = useState<string>("");
  const [clientRiskDouble, setClientRiskDouble] = useState<boolean>(false);
  const [isGuessLocked, setIsGuessLocked] = useState<boolean>(false);

  const [roundPhase, setRoundPhase] = useState<MobileRoundPhase>({
    isPlaying: false,
    isFlipped: false,
    timeLeft: 30,
    selectedDuration: 30,
    syncedAt: 0,
  });
  const [personalFeedback, setPersonalFeedback] = useState<PersonalRoundFeedback | null>(null);
  const [clientTieBreaker, setClientTieBreaker] = useState<TieBreakerState | null>(null);
  const [clientActiveHint, setClientActiveHint] = useState<RoundHint | null>(null);

  // Mobil Kliens Kreditek, Joker X & Részpontok
  const [clientCredits, setClientCredits] = useState<number>(0);
  const [clientJokerCredits, setClientJokerCredits] = useState<number>(0);
  const [clientPartialPoints, setClientPartialPoints] = useState<number>(0);
  const [clientPenaltyDebt, setClientPenaltyDebt] = useState<number>(0);
  const [clientRewardBanner, setClientRewardBanner] = useState<string | null>(null);

  // Élő refek a Supabase eseménykezelőkben való stale closure elkerüléséhez
  const clientCreditsRef = useRef<number>(0);
  const clientJokerCreditsRef = useRef<number>(0);
  const clientPartialPointsRef = useRef<number>(0);
  const clientPenaltyDebtRef = useRef<number>(0);
  const clientGridRef = useRef<boolean[][]>(clientGrid);
  const clientColorGridRef = useRef<number[][]>(clientColorGrid);
  const clientNotesRef = useRef<string>(clientNotes);
  const playersRef = useRef<PlayerData[]>(players);

  useEffect(() => {
    clientCreditsRef.current = clientCredits;
  }, [clientCredits]);
  useEffect(() => {
    clientJokerCreditsRef.current = clientJokerCredits;
  }, [clientJokerCredits]);
  useEffect(() => {
    clientPartialPointsRef.current = clientPartialPoints;
  }, [clientPartialPoints]);
  useEffect(() => {
    clientPenaltyDebtRef.current = clientPenaltyDebt;
  }, [clientPenaltyDebt]);
  useEffect(() => {
    clientGridRef.current = clientGrid;
  }, [clientGrid]);
  useEffect(() => {
    clientColorGridRef.current = clientColorGrid;
  }, [clientColorGrid]);
  useEffect(() => {
    clientNotesRef.current = clientNotes;
  }, [clientNotes]);
  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  // TV-n beérkezett Kahoot tippek, Előzmények, Súgó & Szuperdöntő
  const [roundGuesses, setRoundGuesses] = useState<Record<string, PlayerGuess>>({});
  const [hintLevel, setHintLevel] = useState<number>(0);
  const [roundHistory, setRoundHistory] = useState<RoundHistoryEntry[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [tieBreaker, setTieBreaker] = useState<TieBreakerState | null>(null);
  const [isTieBreakerOpen, setIsTieBreakerOpen] = useState<boolean>(false);

  // Parti Effektek & Díjátadó
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [sessionStats, setSessionStats] = useState<Record<string, PlayerSessionStats>>({});
  const [isPodiumOpen, setIsPodiumOpen] = useState<boolean>(false);
  const [pendingMarksModalOpen, setPendingMarksModalOpen] = useState<boolean>(false);
  const roundStartTimeRef = useRef<number>(Date.now());
  const scoredTrackIdRef = useRef<string | number | null>(null);
  const tieBreakerPromptedKeyRef = useRef<string>("");
  const hostHydratedRef = useRef<boolean>(false);

  const pendingPlayers = useMemo(() => {
    return players.filter((p) => (p.credits ?? 0) > 0 || (p.jokerCredits ?? 0) > 0 || (p.debt ?? 0) > 0);
  }, [players]);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const activeCategoryRef = useRef<Category | null>(null);
  const doubleOrNothingRef = useRef<boolean>(true);
  const strictQuizModeRef = useRef<boolean>(true);
  const fractionalPointsRateRef = useRef<FractionalPointsRate>("1/3");
  const yearRangeRef = useRef<{ min: number; max: number }>({ min: minYear, max: maxYear });
  const isPlayingRef = useRef<boolean>(isPlaying);
  const isFlippedRef = useRef<boolean>(isFlipped);
  const timeLeftRef = useRef<number>(timeLeft);
  const selectedDurationRef = useRef<number>(selectedDuration);
  const tieBreakerRef = useRef<TieBreakerState | null>(tieBreaker);
  const activeHintRef = useRef<RoundHint | null>(null);

  const activeHint = useMemo(() => buildRoundHint(currentTrack, hintLevel), [currentTrack, hintLevel]);

  useEffect(() => {
    activeHintRef.current = activeHint;
  }, [activeHint]);

  useEffect(() => {
    activeCategoryRef.current = activeCategory;
  }, [activeCategory]);
  useEffect(() => {
    doubleOrNothingRef.current = doubleOrNothingEnabled;
  }, [doubleOrNothingEnabled]);
  useEffect(() => {
    strictQuizModeRef.current = strictQuizMode;
  }, [strictQuizMode]);
  useEffect(() => {
    fractionalPointsRateRef.current = fractionalPointsRate;
  }, [fractionalPointsRate]);
  useEffect(() => {
    yearRangeRef.current = { min: minYear, max: maxYear };
  }, [minYear, maxYear]);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
  useEffect(() => {
    isFlippedRef.current = isFlipped;
  }, [isFlipped]);
  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);
  useEffect(() => {
    selectedDurationRef.current = selectedDuration;
  }, [selectedDuration]);
  useEffect(() => {
    tieBreakerRef.current = tieBreaker;
  }, [tieBreaker]);

  const broadcastGameState = useCallback(
    (overrides?: {
      activeCategory?: Category | null;
      doubleOrNothingEnabled?: boolean;
      strictQuizMode?: boolean;
      fractionalPointsRate?: FractionalPointsRate;
      resetRound?: boolean;
      isPlaying?: boolean;
      isFlipped?: boolean;
      timeLeft?: number;
      selectedDuration?: number;
      tieBreaker?: TieBreakerState | null;
      activeHint?: RoundHint | null;
    }) => {
      if (!channelRef.current) return;
      const cat = overrides?.activeCategory !== undefined ? overrides.activeCategory : activeCategoryRef.current;
      channelRef.current.send({
        type: "broadcast",
        event: "game_state",
        payload: {
          activeCategory: cat,
          targetType: cat?.targetType || "year",
          doubleOrNothingEnabled:
            overrides?.doubleOrNothingEnabled !== undefined
              ? overrides.doubleOrNothingEnabled
              : doubleOrNothingRef.current,
          strictQuizMode:
            overrides?.strictQuizMode !== undefined ? overrides.strictQuizMode : strictQuizModeRef.current,
          fractionalPointsRate:
            overrides?.fractionalPointsRate !== undefined
              ? overrides.fractionalPointsRate
              : fractionalPointsRateRef.current,
          minYear: yearRangeRef.current.min,
          maxYear: yearRangeRef.current.max,
          roundPhase: {
            isPlaying: overrides?.isPlaying !== undefined ? overrides.isPlaying : isPlayingRef.current,
            isFlipped: overrides?.isFlipped !== undefined ? overrides.isFlipped : isFlippedRef.current,
            timeLeft: overrides?.timeLeft !== undefined ? overrides.timeLeft : timeLeftRef.current,
            selectedDuration:
              overrides?.selectedDuration !== undefined ? overrides.selectedDuration : selectedDurationRef.current,
            syncedAt: Date.now(),
          },
          ...(overrides?.activeHint !== undefined
            ? { activeHint: overrides.activeHint }
            : activeHintRef.current
            ? { activeHint: activeHintRef.current }
            : {}),
          ...(overrides?.tieBreaker !== undefined ? { tieBreaker: overrides.tieBreaker } : {}),
          ...(overrides?.resetRound ? { resetRound: true } : {}),
        },
      });
    },
    []
  );

  const handleRevealNextHint = useCallback(() => {
    if (isFlippedRef.current) return;
    setHintLevel((prev) => {
      const next = Math.min(3, prev + 1);
      if (next !== prev) {
        playMarkerSound(true);
        const nextHint = buildRoundHint(currentTrack, next);
        activeHintRef.current = nextHint;
        broadcastGameState({ activeHint: nextHint });
      }
      return next;
    });
  }, [currentTrack, broadcastGameState]);

  const handleAttemptSpin = (force = false): boolean => {
    if (!force && pendingPlayers.length > 0) {
      setPendingMarksModalOpen(true);
      return false;
    }
    setPendingMarksModalOpen(false);
    setActiveTab("game");
    setIsFlipped(false);
    setTimeout(() => {
      document.querySelector<HTMLButtonElement>("#roulette-spin-btn")?.click();
    }, 150);
    return true;
  };

  const handlePingPendingPlayers = () => {
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "ping_pending_marks",
        payload: {},
      });
    }
  };

  const remoteHandlersRef = useRef<{
    playToggle: () => void;
    flip: () => void;
    next: () => void;
    spin: () => void;
    switchTab: () => void;
    openPodium: () => void;
    revealHint: () => void;
  }>({
    playToggle: () => {},
    flip: () => {},
    next: () => {},
    spin: () => {},
    switchTab: () => {},
    openPodium: () => {},
    revealHint: () => {},
  });

  const cycleFractionalPointsRate = () => {
    const rates: FractionalPointsRate[] = ["off", "1/3", "1/5", "1/10"];
    const curIdx = rates.indexOf(fractionalPointsRate);
    const nextRate = rates[(curIdx + 1) % rates.length];
    setFractionalPointsRate(nextRate);
    fractionalPointsRateRef.current = nextRate;
    try {
      localStorage.setItem("hit_host_fractional_rate", nextRate);
    } catch {
      // ignore
    }
    broadcastGameState({ fractionalPointsRate: nextRate });
  };

  // Dal-előre-töltés a háttérben
  const preloadedAudioElementRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!nextPreloadTrack?.audioUrl || isJoinedAsClient || isJoinModalOpen) return;

    try {
      if (!preloadedAudioElementRef.current) {
        preloadedAudioElementRef.current = new Audio();
      }
      const pre = preloadedAudioElementRef.current;
      pre.preload = "auto";
      if (pre.src !== nextPreloadTrack.audioUrl) {
        pre.src = nextPreloadTrack.audioUrl;
        pre.load();
      }
    } catch {
      // ignore audio preload errors
    }

    if (nextPreloadTrack.coverUrl) {
      try {
        const img = new Image();
        img.src = nextPreloadTrack.coverUrl;
      } catch {
        // ignore
      }
    }
  }, [nextPreloadTrack?.audioUrl, nextPreloadTrack?.coverUrl, isJoinedAsClient, isJoinModalOpen]);

  // Wake Lock & Visibility Reconnect
  const requestWakeLock = useCallback(async () => {
    if (typeof navigator !== "undefined" && "wakeLock" in navigator) {
      try {
        const nav = navigator as Navigator & {
          wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
        };
        if (!nav.wakeLock) return;
        wakeLockRef.current = await nav.wakeLock.request("screen");
        setWakeLockActive(true);
        wakeLockRef.current.addEventListener("release", () => {
          setWakeLockActive(false);
        });
      } catch {
        setWakeLockActive(false);
      }
    }
  }, []);

  useEffect(() => {
    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        requestWakeLock();
        if (isJoinedAsClient && channelRef.current && playerName) {
          channelRef.current.send({
            type: "broadcast",
            event: "sync_request",
            payload: { playerName },
          });
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
    };
  }, [isJoinedAsClient, playerName, requestWakeLock]);

  // Anti-Refresh Mentés visszatöltése
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const urlRoom = params.get("room");

    const savedName = localStorage.getItem("hit_player_name");
    const savedRoom = localStorage.getItem("hit_room_code");
    const savedGrid = localStorage.getItem("hit_player_grid");
    const savedColorGrid = localStorage.getItem("hit_player_color_grid");
    const savedNotes = localStorage.getItem("hit_player_notes");
    const savedCredits = localStorage.getItem("hit_player_credits");
    const savedJokerCredits = localStorage.getItem("hit_client_joker_credits");
    const savedPartialPoints = localStorage.getItem("hit_client_partial_points");
    const savedDebt = localStorage.getItem("hit_player_debt");

    if (savedCredits !== null) setClientCredits(Math.max(0, parseInt(savedCredits, 10) || 0));
    if (savedJokerCredits !== null) setClientJokerCredits(Math.max(0, parseInt(savedJokerCredits, 10) || 0));
    if (savedPartialPoints !== null) setClientPartialPoints(Math.max(0, parseInt(savedPartialPoints, 10) || 0));
    if (savedDebt !== null) setClientPenaltyDebt(Math.max(0, parseInt(savedDebt, 10) || 0));

    if (savedColorGrid) {
      try {
        const parsed = JSON.parse(savedColorGrid);
        if (Array.isArray(parsed) && parsed.length === 5) setClientColorGrid(parsed);
      } catch {
        // ignore
      }
    }

    if (urlRoom) {
      setRoomCode(urlRoom.toUpperCase());
      if (savedName) setPlayerName(savedName);
      if (savedGrid) {
        try {
          setClientGrid(JSON.parse(savedGrid));
        } catch {
          // ignore
        }
      }
      if (savedNotes) setClientNotes(savedNotes);
      setIsJoinModalOpen(true);
      hostHydratedRef.current = true;
      return;
    }

    if (savedRoom && savedName) {
      setRoomCode(savedRoom);
      setPlayerName(savedName);
      if (savedGrid) {
        try {
          setClientGrid(JSON.parse(savedGrid));
        } catch {
          // ignore
        }
      }
      if (savedNotes) setClientNotes(savedNotes);
      setIsJoinedAsClient(true);
      hostHydratedRef.current = true;
      return;
    }

    const hostRoom = localStorage.getItem("hit_host_room_code");
    const hostPlayers = localStorage.getItem("hit_host_players");
    const hostPlayed = localStorage.getItem("hit_host_played_ids");
    const hostStats = localStorage.getItem("hit_host_session_stats");
    const hostHistory = localStorage.getItem("hit_host_history");
    const hostStrict = localStorage.getItem("hit_host_strict_mode");
    const hostTvMode = localStorage.getItem("hit_host_tv_mode");
    const hostTvTheme = localStorage.getItem("hit_tv_theme");
    const hostTvScale = localStorage.getItem("hit_host_tv_scale");
    const hostLayout = localStorage.getItem("hit_tv_layout_prefs");

    if (hostLayout) {
      try {
        const parsed = JSON.parse(hostLayout);
        if (parsed.wheelSize) setTvWheelSize(parsed.wheelSize);
        if (parsed.cardWidth) setTvCardWidth(parsed.cardWidth);
        if (parsed.gap !== undefined) setTvGap(parsed.gap);
        if (parsed.headerScale !== undefined) setTvHeaderScale(parsed.headerScale);
      } catch {
        // ignore
      }
    }
    const hostHeaderScale = localStorage.getItem("hit_tv_header_scale");
    if (hostHeaderScale) {
      const parsedH = parseInt(hostHeaderScale, 10);
      if (parsedH >= 80 && parsedH <= 160) setTvHeaderScale(parsedH);
    }

    if (hostRoom) setRoomCode(hostRoom);
    if (hostPlayers) {
      try {
        const parsed = JSON.parse(hostPlayers);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hydrated = parsed.map((p: PlayerData) => ({
            ...p,
            isOnline: false,
            colorGrid: !p.colorGrid || p.colorGrid.length !== 5 ? generateRandomColorGrid() : p.colorGrid,
          }));
          setPlayers(hydrated);
        }
      } catch {
        // ignore
      }
    }
    if (hostPlayed) {
      try {
        setPlayedIds(JSON.parse(hostPlayed));
      } catch {
        // ignore
      }
    }
    if (hostStats) {
      try {
        setSessionStats(JSON.parse(hostStats));
      } catch {
        // ignore
      }
    }
    if (hostHistory) {
      try {
        const parsedHist = JSON.parse(hostHistory);
        if (Array.isArray(parsedHist)) setRoundHistory(parsedHist);
      } catch {
        // ignore
      }
    }
    if (hostStrict !== null) {
      setStrictQuizMode(hostStrict === "true");
    }
    if (hostTvMode !== null) {
      setIsTvMode(hostTvMode === "true");
    } else if (typeof window !== "undefined" && window.innerWidth >= 1200) {
      setIsTvMode(true);
    }
    if (hostTvTheme && ["gala", "synthwave", "retro"].includes(hostTvTheme)) {
      setTvTheme(hostTvTheme as TvTheme);
    }
    if (hostTvScale) {
      const parsedScale = parseInt(hostTvScale, 10);
      if (parsedScale >= 80 && parsedScale <= 170) setTvScale(parsedScale);
    }
    const hostFractional = localStorage.getItem("hit_host_fractional_rate");
    if (hostFractional && ["off", "1/3", "1/5", "1/10"].includes(hostFractional)) {
      setFractionalPointsRate(hostFractional as FractionalPointsRate);
      fractionalPointsRateRef.current = hostFractional as FractionalPointsRate;
    }

    hostHydratedRef.current = true;
  }, []);

  // tracks.json lekérése az API végpontról (csak TV Host számára)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const isMobileUrl = Boolean(params.get("room"));
      const isMobileSaved = Boolean(localStorage.getItem("hit_room_code") && localStorage.getItem("hit_player_name"));
      if (
        isJoinedAsClient ||
        isJoinModalOpen ||
        (isMobileUrl && !isHostModalOpen) ||
        (isMobileSaved && !isHostModalOpen && !allTracks.length)
      ) {
        setIsLoadingTracks(false);
        return;
      }
    }

    if (allTracks.length > 0) return;

    setIsLoadingTracks(true);
    const token = getPinAuthToken();
    fetch("/api/tracks", {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
      .then((res) => {
        if (res.status === 401) {
          lockPinGate();
          throw new Error("Lejárt vagy érvénytelen PIN munkamenet");
        }
        if (!res.ok) throw new Error("Hálózati hiba a dalok lekérésekor");
        return res.json();
      })
      .then((data: Track[]) => {
        setAllTracks(data);
        setIsLoadingTracks(false);
      })
      .catch((err) => {
        console.error("Hiba a dalok betöltésekor:", err);
        setIsLoadingTracks(false);
      });
  }, [isJoinedAsClient, isJoinModalOpen, isHostModalOpen, allTracks.length]);

  // Házigazda állapot folyamatos mentése
  useEffect(() => {
    if (!hostHydratedRef.current || isJoinedAsClient || isJoinModalOpen || typeof window === "undefined") return;
    if (roomCode) localStorage.setItem("hit_host_room_code", roomCode);
    localStorage.setItem("hit_host_players", JSON.stringify(players));
    localStorage.setItem("hit_host_played_ids", JSON.stringify(playedIds));
    localStorage.setItem("hit_host_session_stats", JSON.stringify(sessionStats));
    try {
      localStorage.setItem("hit_host_history", JSON.stringify(roundHistory));
    } catch {
      // ignore quota
    }
    localStorage.setItem("hit_host_strict_mode", String(strictQuizMode));
    localStorage.setItem("hit_host_fractional_rate", fractionalPointsRate);
    localStorage.setItem("hit_host_tv_mode", String(isTvMode));
    localStorage.setItem("hit_tv_theme", tvTheme);
    localStorage.setItem("hit_host_tv_scale", String(tvScale));
    localStorage.setItem(
      "hit_tv_layout_prefs",
      JSON.stringify({ wheelSize: tvWheelSize, cardWidth: tvCardWidth, gap: tvGap, headerScale: tvHeaderScale })
    );
    localStorage.setItem("hit_tv_header_scale", String(tvHeaderScale));
  }, [
    roomCode,
    players,
    playedIds,
    sessionStats,
    roundHistory,
    strictQuizMode,
    fractionalPointsRate,
    isTvMode,
    tvTheme,
    tvScale,
    tvWheelSize,
    tvCardWidth,
    tvGap,
    tvHeaderScale,
    isJoinedAsClient,
    isJoinModalOpen,
  ]);

  // Automatikus Szuperdöntő (Tie-Breaker) detektálása, ha 2+ játékos ugyanabban a körben éri el a Bingót
  useEffect(() => {
    if (isJoinedAsClient || isJoinModalOpen) return;
    const winners = players.filter((p) => p.hasWon || checkBingo(p.grid)).map((p) => p.name);
    if (winners.length >= 2) {
      const key = [...winners].sort().join("|");
      if (tieBreakerPromptedKeyRef.current !== key && !tieBreaker?.active && !tieBreaker?.winner) {
        tieBreakerPromptedKeyRef.current = key;
        const nextTb: TieBreakerState = { active: true, contenders: winners, winner: null };
        setTieBreaker(nextTb);
        setIsTieBreakerOpen(true);
        playPartySoundEffect("airhorn");
        broadcastGameState({ tieBreaker: nextTb });
      }
    }
  }, [players, isJoinedAsClient, isJoinModalOpen, tieBreaker?.active, tieBreaker?.winner, broadcastGameState]);

  const handleOpenTieBreaker = (contenders: string[]) => {
    const clean = contenders.length >= 2 ? contenders : players.slice(0, 2).map((p) => p.name);
    const nextTb: TieBreakerState = { active: true, contenders: clean, winner: null };
    setTieBreaker(nextTb);
    setIsTieBreakerOpen(true);
    playPartySoundEffect("drumroll");
    broadcastGameState({ tieBreaker: nextTb });
  };

  const handleCloseTieBreaker = () => {
    setIsTieBreakerOpen(false);
    setTieBreaker((prev) => {
      const next = prev?.winner ? { ...prev, active: false } : null;
      broadcastGameState({ tieBreaker: next });
      return next;
    });
  };

  const handleCrownTieBreakerWinner = (winnerName: string) => {
    const resolved: TieBreakerState = {
      active: false,
      contenders: tieBreaker?.contenders || [winnerName],
      winner: winnerName,
    };
    setTieBreaker(resolved);
    setIsTieBreakerOpen(false);
    playPartySoundEffect("fanfare");
    confetti({
      particleCount: 160,
      spread: 110,
      origin: { y: 0.5 },
      colors: ["#fbbf24", "#ec4899", "#10b981", "#8b5cf6"],
    });
    broadcastGameState({ tieBreaker: resolved });
  };

  // ================= KÖVETKEZŐ DAL SORSOLÁSA ÉS PRELOAD =================
  const computeCandidateIndex = (
    pool: Track[],
    excludeIds: (string | number)[],
    currentId?: string | number
  ): { index: number; deckReset: boolean } => {
    if (!pool.length) return { index: 0, deckReset: false };
    if (pool.length === 1) return { index: 0, deckReset: false };

    let unplayed = pool.filter((t) => !excludeIds.includes(t.id));
    let deckReset = false;
    if (unplayed.length === 0) {
      deckReset = true;
      unplayed = pool.filter((t) => t.id !== currentId);
    }
    const candidates = unplayed.length > 0 ? unplayed : pool;
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    const idx = pool.findIndex((t) => t.id === chosen.id);
    return { index: idx !== -1 ? idx : 0, deckReset };
  };

  const isInitialTrackPickedRef = useRef<boolean>(false);
  useEffect(() => {
    if (filteredTracks.length > 0) {
      if (!isInitialTrackPickedRef.current || playedIds.length === 0) {
        isInitialTrackPickedRef.current = true;
        const rndIdx = Math.floor(Math.random() * filteredTracks.length);
        const firstId = filteredTracks[rndIdx].id;
        setCurrentIndex(rndIdx);
        setPlayedIds([firstId]);
        const { index: preloadIdx } = computeCandidateIndex(filteredTracks, [firstId], firstId);
        setNextPreloadIndex(preloadIdx);
        handleStop(true);
        setIsFlipped(false);
      }
    }
  }, [filteredTracks, playedIds.length, handleStop]);

  // Ha szűrő változik a hostnál, értesítjük a mobilokat az új év-tartományról
  useEffect(() => {
    if (!isJoinedAsClient && !isJoinModalOpen) {
      broadcastGameState();
    }
  }, [minYear, maxYear, isJoinedAsClient, isJoinModalOpen, broadcastGameState]);

  const handleCreateRoom = () => {
    if (!roomCode) {
      const code = Math.random().toString(36).substring(2, 6).toUpperCase();
      setRoomCode(code);
    }
    setIsHostModalOpen(true);
  };

  const handleResetHostSession = () => {
    const newCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    setRoomCode(newCode);
    setPlayers([
      {
        id: "host",
        name: "Házigazda",
        notes: "",
        grid: createEmptyGrid(),
        colorGrid: generateRandomColorGrid(),
        hasWon: false,
      },
    ]);
    setSessionStats({});
    setRoundGuesses({});
    setRoundHistory([]);
    setTieBreaker(null);
    setIsTieBreakerOpen(false);
    tieBreakerPromptedKeyRef.current = "";
    localStorage.removeItem("hit_host_players");
    localStorage.removeItem("hit_host_session_stats");
    localStorage.removeItem("hit_host_history");
    localStorage.setItem("hit_host_room_code", newCode);
  };

  // ================= REALTIME SUPABASE BROADCAST & PRESENCE =================
  useEffect(() => {
    if (!roomCode || !supabase) return;

    const cleanSelfName = playerName.trim();
    const presenceKey = isJoinedAsClient && cleanSelfName ? cleanSelfName.toLowerCase() : "host";

    const channel = supabase.channel(`room_${roomCode}`, {
      config: {
        broadcast: { self: false },
        presence: { key: presenceKey },
      },
    });
    channelRef.current = channel;

    const syncOnlinePresence = () => {
      if (isJoinedAsClient) return;
      const state = channel.presenceState<{ role?: string; playerName?: string }>();
      const onlineNames = new Set<string>();
      Object.values(state).forEach((entries) => {
        entries.forEach((entry) => {
          if (entry?.role === "player" && entry?.playerName) {
            onlineNames.add(String(entry.playerName).trim().toLowerCase());
          }
        });
      });
      setPlayers((prev) =>
        prev.map((p) => {
          if (p.id === "host" || p.name.trim().toLowerCase() === "házigazda") return p;
          const isNowOnline = onlineNames.has(p.name.trim().toLowerCase());
          return p.isOnline === isNowOnline ? p : { ...p, isOnline: isNowOnline };
        })
      );
    };

    channel.on("presence", { event: "sync" }, syncOnlinePresence);
    channel.on("presence", { event: "join" }, syncOnlinePresence);
    channel.on("presence", { event: "leave" }, syncOnlinePresence);

    const sendCurrentState = (targetPlayerName?: string) => {
      channel.send({
        type: "broadcast",
        event: "game_state",
        payload: {
          activeCategory: activeCategoryRef.current,
          targetType: activeCategoryRef.current?.targetType || "year",
          doubleOrNothingEnabled: doubleOrNothingRef.current,
          strictQuizMode: strictQuizModeRef.current,
          fractionalPointsRate: fractionalPointsRateRef.current,
          minYear: yearRangeRef.current.min,
          maxYear: yearRangeRef.current.max,
          roundPhase: {
            isPlaying: isPlayingRef.current,
            isFlipped: isFlippedRef.current,
            timeLeft: timeLeftRef.current,
            selectedDuration: selectedDurationRef.current,
            syncedAt: Date.now(),
          },
          ...(activeHintRef.current ? { activeHint: activeHintRef.current } : {}),
          ...(tieBreakerRef.current ? { tieBreaker: tieBreakerRef.current } : {}),
        },
      });

      if (targetPlayerName) {
        const normalizedTarget = targetPlayerName.trim().toLowerCase();
        const matchedPlayer = playersRef.current.find((p) => p.name.trim().toLowerCase() === normalizedTarget);
        if (matchedPlayer) {
          channel.send({
            type: "broadcast",
            event: "player_state_snapshot",
            payload: {
              targetPlayerName: matchedPlayer.name,
              credits: matchedPlayer.credits ?? 0,
              jokerCredits: matchedPlayer.jokerCredits ?? 0,
              partialPoints: matchedPlayer.partialPoints ?? 0,
              debt: matchedPlayer.debt ?? 0,
            },
          });
        }
      }
    };

    channel.on("broadcast", { event: "player_sync" }, ({ payload }) => {
      if (!payload?.name) return;
      const incomingName = String(payload.name).trim();
      setPlayers((prev) => {
        const existingIdx = prev.findIndex((p) => p.name.toLowerCase() === incomingName.toLowerCase());
        if (existingIdx !== -1) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            grid: payload.grid || updated[existingIdx].grid,
            colorGrid: payload.colorGrid || updated[existingIdx].colorGrid || generateRandomColorGrid(),
            notes: payload.notes !== undefined ? payload.notes : updated[existingIdx].notes,
            hasWon: payload.hasWon !== undefined ? payload.hasWon : updated[existingIdx].hasWon,
            isOnline: true,
            credits: payload.credits !== undefined ? payload.credits : updated[existingIdx].credits,
            jokerCredits:
              payload.jokerCredits !== undefined ? payload.jokerCredits : updated[existingIdx].jokerCredits,
            partialPoints:
              payload.partialPoints !== undefined ? payload.partialPoints : updated[existingIdx].partialPoints,
            debt: payload.debt !== undefined ? payload.debt : updated[existingIdx].debt,
          };
          return updated;
        }
        return [
          ...prev,
          {
            id: payload.id || String(Date.now()),
            name: incomingName,
            notes: payload.notes || "",
            grid: payload.grid || createEmptyGrid(),
            colorGrid: payload.colorGrid || generateRandomColorGrid(),
            hasWon: payload.hasWon || false,
            isOnline: true,
            credits: payload.credits ?? 0,
            jokerCredits: payload.jokerCredits ?? 0,
            partialPoints: payload.partialPoints ?? 0,
            debt: payload.debt ?? 0,
          },
        ];
      });

      if (!isJoinedAsClient) {
        sendCurrentState();
      }
    });

    channel.on("broadcast", { event: "sync_request" }, ({ payload }) => {
      if (!isJoinedAsClient) {
        const requester = payload?.playerName ? String(payload.playerName).trim() : undefined;
        sendCurrentState(requester);
      }
    });

    channel.on("broadcast", { event: "player_state_snapshot" }, ({ payload }) => {
      if (!isJoinedAsClient || !payload?.targetPlayerName) return;
      if (String(payload.targetPlayerName).trim().toLowerCase() !== cleanSelfName.toLowerCase()) return;

      const syncedCredits = Math.max(0, Number(payload.credits) || 0);
      const syncedJokers = Math.max(0, Number(payload.jokerCredits) || 0);
      const syncedPartial = Math.max(0, Number(payload.partialPoints) || 0);
      const syncedDebt = Math.max(0, Number(payload.debt) || 0);

      const changed =
        syncedCredits !== clientCreditsRef.current ||
        syncedJokers !== clientJokerCreditsRef.current ||
        syncedPartial !== clientPartialPointsRef.current ||
        syncedDebt !== clientPenaltyDebtRef.current;

      setClientCredits(syncedCredits);
      clientCreditsRef.current = syncedCredits;
      localStorage.setItem("hit_player_credits", String(syncedCredits));

      setClientJokerCredits(syncedJokers);
      clientJokerCreditsRef.current = syncedJokers;
      localStorage.setItem("hit_client_joker_credits", String(syncedJokers));

      setClientPartialPoints(syncedPartial);
      clientPartialPointsRef.current = syncedPartial;
      localStorage.setItem("hit_client_partial_points", String(syncedPartial));

      setClientPenaltyDebt(syncedDebt);
      clientPenaltyDebtRef.current = syncedDebt;
      localStorage.setItem("hit_player_debt", String(syncedDebt));

      if (changed && (syncedCredits > 0 || syncedJokers > 0 || syncedDebt > 0)) {
        setClientRewardBanner(
          `🔄 Szinkronizálva (${syncedCredits} X • ${syncedJokers} ⭐${syncedDebt > 0 ? ` • ${syncedDebt} radír` : ""})`
        );
      }
    });

    channel.on("broadcast", { event: "game_state" }, ({ payload }) => {
      if (payload.activeCategory) {
        setActiveCategory(payload.activeCategory);
        setGuessTarget(payload.targetType || payload.activeCategory.targetType);
      }
      if (typeof payload.doubleOrNothingEnabled === "boolean") {
        setDoubleOrNothingEnabled(payload.doubleOrNothingEnabled);
        if (!payload.doubleOrNothingEnabled) setClientRiskDouble(false);
      }
      if (typeof payload.strictQuizMode === "boolean") {
        setStrictQuizMode(payload.strictQuizMode);
      }
      if (payload.fractionalPointsRate) {
        setFractionalPointsRate(payload.fractionalPointsRate);
        fractionalPointsRateRef.current = payload.fractionalPointsRate;
      }
      if (typeof payload.minYear === "number" && typeof payload.maxYear === "number") {
        setHostYearRange({ min: payload.minYear, max: payload.maxYear });
        setClientGuessYear((prev) => Math.max(payload.minYear, Math.min(payload.maxYear, prev)));
      }
      if (payload.roundPhase) {
        setRoundPhase(payload.roundPhase);
      }
      if (payload.tieBreaker !== undefined) {
        setClientTieBreaker(payload.tieBreaker);
      }
      if (payload.activeHint !== undefined) {
        setClientActiveHint(payload.activeHint);
      }
      if (payload.resetRound) {
        setIsGuessLocked(false);
        setClientGuessText("");
        setClientGuessArtist("");
        setClientGuessTitle("");
        setClientRiskDouble(false);
        setClientRewardBanner(null);
        setPersonalFeedback(null);
        setClientActiveHint(null);
      }
    });

    channel.on("broadcast", { event: "round_feedback" }, ({ payload }) => {
      if (!isJoinedAsClient || !payload?.feedbackByPlayer) return;
      const normalizedSelf = playerName.trim().toLowerCase();
      const matched =
        payload.feedbackByPlayer[playerName] ||
        Object.entries(payload.feedbackByPlayer).find(
          ([k]) => k.trim().toLowerCase() === normalizedSelf
        )?.[1];
      if (matched) {
        setPersonalFeedback(matched as PersonalRoundFeedback);
      }
    });

    // Élő refekből olvas, így sosem stale closure!
    channel.on("broadcast", { event: "ping_pending_marks" }, () => {
      if (!isJoinedAsClient) return;
      if (
        clientCreditsRef.current > 0 ||
        clientJokerCreditsRef.current > 0 ||
        clientPenaltyDebtRef.current > 0
      ) {
        setClientRewardBanner("⚠️ Figyelem! Még be kell húznod a kapott X-et a tábládra!");
        triggerHaptic("warning_pulse");
        playMarkerSound(true);
      }
    });

    channel.on("broadcast", { event: "award_credits" }, ({ payload }) => {
      if (!isJoinedAsClient || !payload?.awards) return;
      const normalizedSelf = playerName.trim().toLowerCase();
      const matchedEntry =
        payload.awards[playerName] ||
        Object.entries(payload.awards).find(([k]) => k.trim().toLowerCase() === normalizedSelf)?.[1];
      if (!matchedEntry) return;

      const myAward = matchedEntry;
      const deltaCr = myAward.deltaCredits ?? 0;
      const deltaJoker = myAward.deltaJokerCredits ?? 0;
      const earnedUnits = myAward.earnedPartialUnits ?? 0;

      if (deltaCr > 0 || deltaJoker !== 0 || earnedUnits > 0) {
        let bannerText = "";
        if (deltaCr > 0) {
          setClientCredits((prev) => {
            const next = prev + deltaCr;
            clientCreditsRef.current = next;
            localStorage.setItem("hit_player_credits", String(next));
            return next;
          });
          bannerText += `🎉 +${deltaCr} X a feladvány színére! `;
        }

        if (deltaJoker !== 0) {
          setClientJokerCredits((prev) => {
            const next = Math.max(0, prev + deltaJoker);
            clientJokerCreditsRef.current = next;
            localStorage.setItem("hit_client_joker_credits", String(next));
            return next;
          });
          if (deltaJoker > 0) {
            bannerText += `⭐ +${deltaJoker} JOKER X (bármely színre)! `;
          } else {
            bannerText += `ℹ️ Joker X módosítva (${deltaJoker} db)! `;
          }
        }

        if (typeof myAward.totalPartialPoints === "number") {
          setClientPartialPoints(myAward.totalPartialPoints);
          localStorage.setItem("hit_client_partial_points", String(myAward.totalPartialPoints));
          if (earnedUnits > 0 && deltaJoker === 0) {
            bannerText += `⭐ +${earnedUnits} részpont (${myAward.totalPartialPoints}/${myAward.fractionalThreshold} ⭐)`;
          }
        }

        setClientRewardBanner(bannerText || `🎉 Sikeres kör! (${myAward.reason})`);
        if (deltaJoker > 0) {
          triggerHaptic("joker_win");
        } else if (deltaCr > 0) {
          triggerHaptic("festive_win");
        } else {
          triggerHaptic("tap");
        }
        playMarkerSound(true);
      } else if (myAward.penalty > 0) {
        setClientCredits((prev) => {
          if (prev >= myAward.penalty) {
            const next = prev - myAward.penalty;
            clientCreditsRef.current = next;
            localStorage.setItem("hit_player_credits", String(next));
            setClientRewardBanner("💀 Dupla vagy Semmi bukta: -1 X kredit levonva!");
            return next;
          }
          const markedCount = clientGridRef.current.flat().filter(Boolean).length;
          if (markedCount === 0) {
            setClientRewardBanner("💀 Dupla vagy Semmi bukta! (Még nincs leradírozható X-ed)");
            return prev;
          }
          setClientPenaltyDebt((d) => {
            const nextDebt = d + 1;
            clientPenaltyDebtRef.current = nextDebt;
            localStorage.setItem("hit_player_debt", String(nextDebt));
            return nextDebt;
          });
          setClientRewardBanner("💀 Dupla vagy Semmi bukta: Radírozz le 1 X-et a tábládról!");
          return prev;
        });
        triggerHaptic("risk_loss");
      }
    });

    channel.on("broadcast", { event: "buzzer_ring" }, ({ payload }) => {
      if (!isJoinedAsClient && payload?.playerName) {
        const buzzerName = String(payload.playerName).trim();
        setBuzzedPlayer((prev) => {
          if (!prev) {
            playBuzzerSound();
            remoteHandlersRef.current.playToggle();
            setSessionStats((st) => {
              const cur = st[buzzerName] || {
                guessesCount: 0,
                totalYearDiff: 0,
                maxYearDiff: 0,
                exactYearCount: 0,
                buzzerCount: 0,
                riskCount: 0,
                riskWonCount: 0,
                riskLostCount: 0,
                editCount: 0,
                totalResponseTimeMs: 0,
                fastestResponseTimeMs: 999999,
              };
              return {
                ...st,
                [buzzerName]: { ...cur, buzzerCount: cur.buzzerCount + 1 },
              };
            });
            return buzzerName;
          }
          return prev;
        });
      }
    });

    channel.on("broadcast", { event: "submit_guess" }, ({ payload }) => {
      if (!isJoinedAsClient && payload?.playerName) {
        const gName = String(payload.playerName).trim();
        const now = Date.now();
        const responseTimeMs = Math.max(500, now - roundStartTimeRef.current);

        setRoundGuesses((prev) => {
          const isEdit = Boolean(prev[gName]);

          setSessionStats((st) => {
            const cur = st[gName] || {
              guessesCount: 0,
              totalYearDiff: 0,
              maxYearDiff: 0,
              exactYearCount: 0,
              buzzerCount: 0,
              riskCount: 0,
              riskWonCount: 0,
              riskLostCount: 0,
              editCount: 0,
              totalResponseTimeMs: 0,
              fastestResponseTimeMs: 999999,
            };

            return {
              ...st,
              [gName]: {
                ...cur,
                editCount: (cur.editCount || 0) + (isEdit ? 1 : 0),
                totalResponseTimeMs: (cur.totalResponseTimeMs || 0) + responseTimeMs,
                fastestResponseTimeMs: Math.min(cur.fastestResponseTimeMs ?? 999999, responseTimeMs),
              },
            };
          });

          return {
            ...prev,
            [gName]: {
              playerName: gName,
              year: Number(payload.year),
              text: String(payload.text || "").trim(),
              artistGuess: payload.artistGuess ? String(payload.artistGuess).trim() : undefined,
              titleGuess: payload.titleGuess ? String(payload.titleGuess).trim() : undefined,
              riskDouble: Boolean(payload.riskDouble),
              submittedAt: now,
            },
          };
        });
      }
    });

    channel.on("broadcast", { event: "party_reaction" }, ({ payload }) => {
      if (isJoinedAsClient) return;
      if (payload?.emoji) {
        const id = `${Date.now()}-${Math.random()}`;
        const leftPercent = Math.floor(Math.random() * 76) + 12;
        setFloatingReactions((prev) => [
          ...prev,
          { id, emoji: payload.emoji, playerName: payload.playerName || "Vendég", leftPercent },
        ]);
        setTimeout(() => {
          setFloatingReactions((prev) => prev.filter((item) => item.id !== id));
        }, 3400);
      }
      if (payload?.sound) {
        playPartySoundEffect(payload.sound as SoundEffectType);
      }
    });

    channel.on("broadcast", { event: "remote_control" }, ({ payload }) => {
      if (isJoinedAsClient) return;
      const cmd = payload?.command;
      if (cmd === "toggle_play") remoteHandlersRef.current.playToggle();
      if (cmd === "flip") remoteHandlersRef.current.flip();
      if (cmd === "next") remoteHandlersRef.current.next();
      if (cmd === "spin") remoteHandlersRef.current.spin();
      if (cmd === "switch_tab") remoteHandlersRef.current.switchTab();
      if (cmd === "open_podium") remoteHandlersRef.current.openPodium();
      if (cmd === "reveal_hint") remoteHandlersRef.current.revealHint();
    });

    channel.subscribe(async (status) => {
      if (status !== "SUBSCRIBED") return;
      if (isJoinedAsClient && cleanSelfName) {
        try {
          await channel.track({
            role: "player",
            playerName: cleanSelfName,
            onlineAt: Date.now(),
          });
        } catch {
          // ignore presence track error
        }
        channel.send({
          type: "broadcast",
          event: "player_sync",
          payload: {
            id: cleanSelfName,
            name: cleanSelfName,
            grid: clientGridRef.current,
            colorGrid: clientColorGridRef.current,
            notes: clientNotesRef.current,
            hasWon: checkBingo(clientGridRef.current),
          },
        });
        channel.send({
          type: "broadcast",
          event: "sync_request",
          payload: { playerName: cleanSelfName },
        });
      } else {
        syncOnlinePresence();
      }
    });
    return () => {
      supabase?.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomCode, isJoinedAsClient, playerName]);

  const toggleDoubleOrNothingHost = () => {
    const nextVal = !doubleOrNothingEnabled;
    setDoubleOrNothingEnabled(nextVal);
    doubleOrNothingRef.current = nextVal;
    broadcastGameState({ doubleOrNothingEnabled: nextVal });
  };

  const toggleStrictQuizModeHost = () => {
    const nextVal = !strictQuizMode;
    setStrictQuizMode(nextVal);
    strictQuizModeRef.current = nextVal;
    broadcastGameState({ strictQuizMode: nextVal });
  };

  const grantManualCreditToPlayer = (targetPlayerName: string) => {
    const normalized = targetPlayerName.trim().toLowerCase();
    setPlayers((prev) =>
      prev.map((p) =>
        p.name.trim().toLowerCase() === normalized ? { ...p, credits: (p.credits ?? 0) + 1 } : p
      )
    );
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "award_credits",
        payload: {
          awards: {
            [targetPlayerName]: {
              deltaCredits: 1,
              deltaJokerCredits: 0,
              penalty: 0,
              reason: "Házigazda jóváhagyás (+1 X)",
            },
          },
        },
      });
    }
  };

  const grantManualJokerCreditToPlayer = (targetPlayerName: string) => {
    const normalized = targetPlayerName.trim().toLowerCase();
    setPlayers((prev) =>
      prev.map((p) =>
        p.name.trim().toLowerCase() === normalized ? { ...p, jokerCredits: (p.jokerCredits ?? 0) + 1 } : p
      )
    );
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "award_credits",
        payload: {
          awards: {
            [targetPlayerName]: {
              deltaCredits: 0,
              deltaJokerCredits: 1,
              penalty: 0,
              reason: "Házigazda Joker X (+1 Joker X)",
            },
          },
        },
      });
    }
  };

  const revokeManualJokerCreditFromPlayer = (targetPlayerName: string) => {
    const normalized = targetPlayerName.trim().toLowerCase();
    setPlayers((prev) =>
      prev.map((p) =>
        p.name.trim().toLowerCase() === normalized
          ? { ...p, jokerCredits: Math.max(0, (p.jokerCredits ?? 0) - 1) }
          : p
      )
    );
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "award_credits",
        payload: {
          awards: {
            [targetPlayerName]: {
              deltaCredits: 0,
              deltaJokerCredits: -1,
              penalty: 0,
              reason: "Házigazda Joker X korrekció (-1)",
            },
          },
        },
      });
    }
  };

  const sendRemoteCommand = (command: RemoteCommand) => {
    triggerHaptic("tap");
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "remote_control",
        payload: { command, by: playerName },
      });
    }
  };

  const sendClientReaction = (emoji: string, sound?: SoundEffectType) => {
    triggerHaptic("subtle");
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "party_reaction",
        payload: { playerName, emoji, sound },
      });
    }
  };

  const handleClientSubmitGuess = () => {
    triggerHaptic("tap");
    setIsGuessLocked(true);
    const combined = [clientGuessArtist, clientGuessTitle].filter(Boolean).join(" - ") || clientGuessText;
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "submit_guess",
        payload: {
          playerName: playerName.trim(),
          year: clientGuessYear,
          text: combined,
          artistGuess: clientGuessArtist,
          titleGuess: clientGuessTitle,
          riskDouble: doubleOrNothingEnabled ? clientRiskDouble : false,
        },
      });
    }
  };

  const handleClientBuzzer = () => {
    triggerHaptic("festive_win");
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "buzzer_ring",
        payload: { playerName: playerName.trim() },
      });
    }
  };

  const handleClientTileClick = (r: number, c: number) => {
    const isCurrentlyMarked = clientGrid[r][c];
    const willBeMarked = !isCurrentlyMarked;
    const markedCount = clientGrid.flat().filter(Boolean).length;

    const hasJoker = clientJokerCredits > 0;
    const targetColorIdx = getCategoryColorIndex(activeCategory);
    const tileColorIdx = clientColorGrid?.[r]?.[c] ?? ((r + c) % 5);

    if (willBeMarked && !hasJoker && targetColorIdx !== -1 && tileColorIdx !== targetColorIdx) {
      setClientRewardBanner(`⛔ Csak a pörgetett színre (${activeCategory?.label || "Aktív szín"}) tehetsz X-et!`);
      triggerHaptic("risk_loss");
      return;
    }

    let newCredits = clientCredits;
    let newJokerCredits = clientJokerCredits;
    let newDebt = clientPenaltyDebt;

    // Ha 0 X van a táblán, a büntetés adósság automatikusan törlődik
    if (newDebt > 0 && markedCount === 0) {
      newDebt = 0;
      setClientPenaltyDebt(0);
      localStorage.setItem("hit_player_debt", "0");
    }

    if (strictQuizMode) {
      if (willBeMarked) {
        if (newDebt > 0 && markedCount > 0) {
          setClientRewardBanner("⚠️ Elbuktad a Dupla vagy Semmit! Először radírozz le 1 meglévő X-et!");
          triggerHaptic("risk_loss");
          return;
        }
        if (newCredits <= 0 && newJokerCredits <= 0) {
          setClientRewardBanner("🔒 Nincs szabad X lépésed! Találd el a feladványt az X feloldásához!");
          triggerHaptic("risk_loss");
          return;
        }

        if (hasJoker && (targetColorIdx === -1 || tileColorIdx !== targetColorIdx)) {
          newJokerCredits = Math.max(0, newJokerCredits - 1);
          setClientJokerCredits(newJokerCredits);
          try {
            localStorage.setItem("hit_client_joker_credits", String(newJokerCredits));
          } catch {
            // ignore
          }
        } else if (newCredits > 0) {
          newCredits = Math.max(0, newCredits - 1);
          setClientCredits(newCredits);
          try {
            localStorage.setItem("hit_player_credits", String(newCredits));
          } catch {
            // ignore
          }
        } else if (newJokerCredits > 0) {
          newJokerCredits = Math.max(0, newJokerCredits - 1);
          setClientJokerCredits(newJokerCredits);
          try {
            localStorage.setItem("hit_client_joker_credits", String(newJokerCredits));
          } catch {
            // ignore
          }
        }
      } else {
        if (newDebt > 0) {
          newDebt = Math.max(0, newDebt - 1);
          setClientPenaltyDebt(newDebt);
          localStorage.setItem("hit_player_debt", String(newDebt));
          setClientRewardBanner("✅ Büntetés letudva (1 X leradírozva)!");
        } else if (!hasJoker && targetColorIdx !== -1 && tileColorIdx !== targetColorIdx) {
          newJokerCredits = newJokerCredits + 1;
          setClientJokerCredits(newJokerCredits);
          localStorage.setItem("hit_client_joker_credits", String(newJokerCredits));
        } else {
          newCredits = newCredits + 1;
          setClientCredits(newCredits);
          localStorage.setItem("hit_player_credits", String(newCredits));
        }
      }
    }

    playMarkerSound(willBeMarked);
    triggerHaptic(willBeMarked ? "tap" : "subtle");

    const newGrid = clientGrid.map((row, rIdx) =>
      row.map((cell, cIdx) => (rIdx === r && cIdx === c ? !cell : cell))
    );
    setClientGrid(newGrid);
    localStorage.setItem("hit_player_grid", JSON.stringify(newGrid));

    const hasWon = checkBingo(newGrid);
    if (hasWon) {
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
      triggerHaptic("festive_win");
    }

    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "player_sync",
        payload: {
          id: playerName.trim(),
          name: playerName.trim(),
          grid: newGrid,
          colorGrid: clientColorGrid,
          notes: clientNotes,
          hasWon,
          credits: newCredits,
          jokerCredits: newJokerCredits,
          partialPoints: clientPartialPoints,
          debt: newDebt,
        },
      });
    }
  };

  const handleClientNotesChange = (notes: string) => {
    setClientNotes(notes);
    localStorage.setItem("hit_player_notes", notes);
  };

  const broadcastClientNotes = (notes: string) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "player_sync",
        payload: {
          id: playerName.trim(),
          name: playerName.trim(),
          grid: clientGrid,
          colorGrid: clientColorGrid,
          notes,
          hasWon: checkBingo(clientGrid),
        },
      });
    }
  };

  const handleClientRerollColors = () => {
    const newColors = generateRandomColorGrid();
    setClientColorGrid(newColors);
    localStorage.setItem("hit_player_color_grid", JSON.stringify(newColors));

    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "player_sync",
        payload: {
          id: playerName.trim(),
          name: playerName.trim(),
          grid: clientGrid,
          colorGrid: newColors,
          notes: clientNotes,
          hasWon: checkBingo(clientGrid),
        },
      });
    }
  };

  const handleJoinGame = () => {
    const cleanName = playerName.trim();
    if (!cleanName) {
      setJoinError("Kérlek írd be a neved!");
      return;
    }
    setJoinError(null);
    setPlayerName(cleanName);
    localStorage.setItem("hit_player_name", cleanName);
    localStorage.setItem("hit_room_code", roomCode);
    setIsJoinModalOpen(false);
    setIsJoinedAsClient(true);
    requestWakeLock();

    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "player_sync",
        payload: {
          id: cleanName,
          name: cleanName,
          grid: clientGrid,
          colorGrid: clientColorGrid,
          notes: clientNotes,
          hasWon: checkBingo(clientGrid),
        },
      });
    }
  };

  const handleClientLeave = () => {
    if (channelRef.current) {
      channelRef.current.untrack().catch(() => {});
    }
    localStorage.removeItem("hit_player_name");
    localStorage.removeItem("hit_room_code");
    localStorage.removeItem("hit_player_grid");
    localStorage.removeItem("hit_player_color_grid");
    localStorage.removeItem("hit_player_notes");
    localStorage.removeItem("hit_player_credits");
    localStorage.removeItem("hit_client_joker_credits");
    localStorage.removeItem("hit_client_partial_points");
    localStorage.removeItem("hit_player_debt");
    setClientGrid(createEmptyGrid());
    setClientColorGrid(generateRandomColorGrid());
    setClientNotes("");
    setClientCredits(0);
    setClientJokerCredits(0);
    setClientPartialPoints(0);
    setClientPenaltyDebt(0);
    setClientRewardBanner(null);
    setPersonalFeedback(null);
    setClientTieBreaker(null);
    setClientActiveHint(null);
    setIsGuessLocked(false);
    setIsRemoteOpen(false);
    setHostYearRange(null);
    setIsJoinedAsClient(false);
    setRoomCode(localStorage.getItem("hit_host_room_code") || "");
    if (typeof window !== "undefined" && window.location.search.includes("room=")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  };

  // Időzítő visszaszámláló
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlaying && selectedDuration > 0 && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev === 3 && audioRef.current) {
            fadeOut(audioRef.current, 2800);
          }
          if (prev <= 1) {
            handleStop(true);
            broadcastGameState({ isPlaying: false, timeLeft: 0 });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, timeLeft, selectedDuration, fadeOut, handleStop, audioRef, setTimeLeft, broadcastGameState]);

  const handleDurationChange = (seconds: number) => {
    changeAudioDuration(seconds);
    broadcastGameState({
      selectedDuration: seconds,
      timeLeft: !isPlaying ? seconds : timeLeft,
    });
  };

  const handleSpinEnd = (cat: Category) => {
    scoredTrackIdRef.current = null;
    setActiveCategory(cat);
    activeCategoryRef.current = cat;
    setGuessTarget(cat.targetType);
    setBuzzedPlayer(null);
    setRoundGuesses({});
    setHintLevel(0);
    activeHintRef.current = null;
    setAutoPlayCountdown(3);

    broadcastGameState({
      activeCategory: cat,
      resetRound: true,
      activeHint: null,
      isPlaying: false,
      isFlipped: false,
      timeLeft: selectedDuration,
      selectedDuration,
    });
  };

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (autoPlayCountdown !== null && autoPlayCountdown > 0) {
      timer = setTimeout(() => {
        setAutoPlayCountdown((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);
    } else if (autoPlayCountdown === 0) {
      setAutoPlayCountdown(null);
      roundStartTimeRef.current = Date.now();
      if (audioRef.current) {
        ensureAnalyserConnected();
        const smartStart = smartIntroSkip ? getSmartStartTime(currentTrack?.lyrics) : 0;
        audioRef.current.currentTime = smartStart;
        setCurrentTime(smartStart);
        fadeIn(audioRef.current, 1.0, 1500);
        audioRef.current
          .play()
          .then(() => {
            setAudioError(null);
            setIsPlaying(true);
            broadcastGameState({ isPlaying: true, isFlipped: false, timeLeft: selectedDuration });
          })
          .catch(() => {});
        setTimeLeft(selectedDuration);
      }
    }
    return () => clearTimeout(timer);
  }, [
    autoPlayCountdown,
    selectedDuration,
    smartIntroSkip,
    currentTrack,
    fadeIn,
    ensureAnalyserConnected,
    audioRef,
    setAudioError,
    setCurrentTime,
    setIsPlaying,
    setTimeLeft,
    broadcastGameState,
  ]);

  const handleSeek = (time: number) => {
    seekAudio(time);
    if (audioRef.current && !isPlaying) {
      ensureAnalyserConnected();
      fadeIn(audioRef.current, 1.0, 1000);
      audioRef.current
        .play()
        .then(() => {
          setAudioError(null);
          setIsPlaying(true);
          broadcastGameState({ isPlaying: true });
        })
        .catch(() => {});
    }
  };

  const guessList = useMemo(() => Object.values(roundGuesses), [roundGuesses]);

  const evaluatedGuesses = useMemo(
    () => evaluatePlayerGuesses(guessList, currentTrack, activeCategory, guessTarget, fractionalPointsRate),
    [guessList, currentTrack, activeCategory, guessTarget, fractionalPointsRate]
  );

  const handleFlipAndShow = () => {
    const nextFlipped = !isFlipped;
    setIsFlipped(nextFlipped);
    if (nextFlipped) {
      handleStop(false);
      broadcastGameState({ isFlipped: true, isPlaying: false });
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });

      if (currentTrack && scoredTrackIdRef.current !== currentTrack.id) {
        scoredTrackIdRef.current = currentTrack.id;

        const roundWinners = evaluatedGuesses.filter((g) => g.earnedCredits > 0).map((g) => g.playerName);
        setRoundHistory((prev) => [
          {
            id: `${currentTrack.id}-${Date.now()}`,
            track: currentTrack,
            categoryLabel: activeCategory?.label || "Szabad kör",
            categoryAccent: activeCategory?.accent || "#f59e0b",
            winners: roundWinners,
            playedAt: Date.now(),
          },
          ...prev,
        ].slice(0, 100));

        if (evaluatedGuesses.length > 0) {
          const threshold = getFractionalThreshold(fractionalPointsRate);
          const awards: Record<
            string,
            {
              deltaCredits: number;
              penalty: number;
              reason: string;
              deltaJokerCredits: number;
              earnedPartialUnits: number;
              totalPartialPoints: number;
              fractionalThreshold: number;
              secondaryReasons: string[];
            }
          > = {};
          const feedbackByPlayer: Record<string, PersonalRoundFeedback> = {};

          evaluatedGuesses.forEach((g) => {
            const playerObj = players.find(
              (p) => p.name.trim().toLowerCase() === g.playerName.trim().toLowerCase()
            );
            const curPartial = playerObj?.partialPoints ?? 0;
            const earnedPartial = fractionalPointsRate !== "off" ? g.earnedPartialUnits : 0;
            const totalUnits = curPartial + earnedPartial;
            const deltaJokerCredits =
              fractionalPointsRate !== "off" && threshold > 0 ? Math.floor(totalUnits / threshold) : 0;
            const nextPartial =
              fractionalPointsRate !== "off" && threshold > 0 ? totalUnits % threshold : curPartial;
            const prevStreak = sessionStats[g.playerName]?.currentStreak || 0;
            const nextStreak = g.earnedCredits > 0 ? prevStreak + 1 : 0;

            feedbackByPlayer[g.playerName] = {
              trackId: currentTrack.id,
              artist: currentTrack.artist,
              title: currentTrack.title,
              actualYear: currentTrack.year,
              guessedYear: g.year,
              yearDiff: g.yearDiff,
              earnedCredits: g.earnedCredits,
              deltaJokerCredits,
              penalty: g.penalty,
              earnedPartialUnits: earnedPartial,
              secondaryReasons: g.secondaryReasons,
              artistMatch: g.artistMatch,
              titleMatch: g.titleMatch,
              streak: nextStreak,
            };

            if (g.earnedCredits > 0 || g.penalty > 0 || earnedPartial > 0 || deltaJokerCredits > 0) {
              awards[g.playerName] = {
                deltaCredits: g.earnedCredits,
                penalty: g.penalty,
                reason: g.wonDouble
                  ? "Dupla vagy Semmi telitalálat!"
                  : g.earnedRegularWin
                  ? "Helyes feladvány tipp!"
                  : "Részpont találat!",
                deltaJokerCredits,
                earnedPartialUnits: earnedPartial,
                totalPartialPoints: nextPartial,
                fractionalThreshold: threshold,
                secondaryReasons: g.secondaryReasons,
              };
            }
          });

          setSessionStats((prev) => {
            const next = { ...prev };
            evaluatedGuesses.forEach((g) => {
              const cur = next[g.playerName] || {
                guessesCount: 0,
                totalYearDiff: 0,
                maxYearDiff: 0,
                exactYearCount: 0,
                buzzerCount: 0,
                riskCount: 0,
                riskWonCount: 0,
                riskLostCount: 0,
                editCount: 0,
                totalResponseTimeMs: 0,
                fastestResponseTimeMs: 999999,
                partialUnitsTotal: 0,
                jokerCreditsTotal: 0,
                currentStreak: 0,
                maxStreak: 0,
              };

              const isExact = g.yearDiff === 0;
              const isNewMax = g.yearDiff > (cur.maxYearDiff || 0);
              const playerAward = awards[g.playerName];
              const nextStreak = g.earnedCredits > 0 ? (cur.currentStreak || 0) + 1 : 0;
              const nextMaxStreak = Math.max(cur.maxStreak || 0, nextStreak);

              next[g.playerName] = {
                ...cur,
                guessesCount: cur.guessesCount + 1,
                totalYearDiff: cur.totalYearDiff + g.yearDiff,
                maxYearDiff: isNewMax ? g.yearDiff : cur.maxYearDiff,
                maxYearDiffSong: isNewMax
                  ? `${currentTrack.artist} - ${currentTrack.title} (${currentTrack.year} vs ${g.year})`
                  : cur.maxYearDiffSong,
                exactYearCount: (cur.exactYearCount || 0) + (isExact ? 1 : 0),
                riskCount: cur.riskCount + (g.riskDouble ? 1 : 0),
                riskWonCount: (cur.riskWonCount || 0) + (g.wonDouble ? 1 : 0),
                riskLostCount: (cur.riskLostCount || 0) + (g.riskDouble && !g.wonDouble ? 1 : 0),
                partialUnitsTotal: (cur.partialUnitsTotal || 0) + (playerAward?.earnedPartialUnits ?? 0),
                jokerCreditsTotal: (cur.jokerCreditsTotal || 0) + (playerAward?.deltaJokerCredits ?? 0),
                currentStreak: nextStreak,
                maxStreak: nextMaxStreak,
              };
            });
            return next;
          });

          setPlayers((prev) =>
            prev.map((p) => {
              const award =
                awards[p.name] ||
                Object.entries(awards).find(
                  ([k]) => k.trim().toLowerCase() === p.name.trim().toLowerCase()
                )?.[1];
              if (!award) return p;
              const hasMarks = p.grid.flat().filter(Boolean).length > 0;
              const canTakeDebt = hasMarks || (p.credits ?? 0) >= award.penalty;
              const nextCredits = Math.max(
                0,
                (p.credits ?? 0) +
                  award.deltaCredits -
                  (award.penalty > 0 && (p.credits ?? 0) >= award.penalty ? award.penalty : 0)
              );
              const addDebt =
                award.penalty > 0 && (p.credits ?? 0) < award.penalty && canTakeDebt ? award.penalty : 0;
              return {
                ...p,
                credits: nextCredits,
                debt: (p.debt ?? 0) + addDebt,
                jokerCredits: (p.jokerCredits ?? 0) + (award.deltaJokerCredits || 0),
                partialPoints: award.totalPartialPoints ?? p.partialPoints ?? 0,
              };
            })
          );

          if (channelRef.current) {
            if (Object.keys(awards).length > 0) {
              channelRef.current.send({
                type: "broadcast",
                event: "award_credits",
                payload: { awards, trackId: currentTrack.id },
              });
            }
            channelRef.current.send({
              type: "broadcast",
              event: "round_feedback",
              payload: { feedbackByPlayer },
            });
          }
        }
      }
    } else {
      broadcastGameState({ isFlipped: false });
    }
  };

  const handlePlayToggle = () => {
    if (!audioRef.current) return;
    getSharedAudioContext();
    if (isPlaying) {
      handleStop(false);
      broadcastGameState({ isPlaying: false });
    } else {
      ensureAnalyserConnected();
      const audio = audioRef.current;
      const smartStart = smartIntroSkip ? getSmartStartTime(currentTrack?.lyrics) : 0;
      if (audio.currentTime === 0 && smartIntroSkip) {
        audio.currentTime = smartStart;
        setCurrentTime(smartStart);
      }
      if (audio.currentTime <= smartStart + 1) {
        roundStartTimeRef.current = Date.now();
      }
      fadeIn(audio, 1.0, 1500);
      audio
        .play()
        .then(() => {
          setAudioError(null);
          setIsPlaying(true);
          broadcastGameState({ isPlaying: true });
        })
        .catch(() => {});
    }
  };

  const handleNextTrack = () => {
    scoredTrackIdRef.current = null;
    roundStartTimeRef.current = Date.now();
    setIsFlipped(false);
    setBuzzedPlayer(null);
    setRoundGuesses({});
    setHintLevel(0);
    activeHintRef.current = null;
    handleStop(true);
    setAutoPlayCountdown(null);
    setTimeLeft(selectedDuration);
    setAudioError(null);

    const hasValidPreload = nextPreloadIndex >= 0 && nextPreloadIndex < filteredTracks.length;
    const candidate = hasValidPreload
      ? { index: nextPreloadIndex, deckReset: playedIds.length >= filteredTracks.length }
      : computeCandidateIndex(filteredTracks, playedIds, currentTrack?.id);

    const chosenTrack = filteredTracks[candidate.index];
    const updatedPlayed = chosenTrack
      ? candidate.deckReset
        ? [chosenTrack.id]
        : [...playedIds, chosenTrack.id]
      : playedIds;

    setPlayedIds(updatedPlayed);
    setCurrentIndex(candidate.index);

    const { index: upcomingIdx } = computeCandidateIndex(filteredTracks, updatedPlayed, chosenTrack?.id);
    setNextPreloadIndex(upcomingIdx);

    if (audioRef.current && chosenTrack) {
      const smartStart = smartIntroSkip ? getSmartStartTime(chosenTrack.lyrics) : 0;
      audioRef.current.currentTime = smartStart;
      setCurrentTime(smartStart);
    }

    broadcastGameState({
      resetRound: true,
      activeHint: null,
      isPlaying: false,
      isFlipped: false,
      timeLeft: selectedDuration,
      selectedDuration,
    });
  };

  const handleOpenPodium = () => {
    setIsPodiumOpen(true);
    playPartySoundEffect("drumroll");
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.5 },
      colors: ["#fbbf24", "#ec4899", "#10b981", "#8b5cf6"],
    });
  };

  useEffect(() => {
    remoteHandlersRef.current = {
      playToggle: handlePlayToggle,
      flip: () => {
        setActiveTab("game");
        handleFlipAndShow();
      },
      next: handleNextTrack,
      spin: () => handleAttemptSpin(false),
      switchTab: () => {
        setActiveTab((prev) => (prev === "boards" ? "game" : "boards"));
      },
      openPodium: handleOpenPodium,
      revealHint: handleRevealNextHint,
    };
  });

  // PC / Laptop billentyűparancsok
  useEffect(() => {
    if (isJoinedAsClient || isJoinModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.code === "Escape") {
        setIsLayoutMenuOpen(false);
        setIsHostModalOpen(false);
        setIsPodiumOpen(false);
        setPendingMarksModalOpen(false);
        setIsHistoryOpen(false);
        setIsTieBreakerOpen(false);
      } else if (e.code === "Space") {
        e.preventDefault();
        if (activeTab === "game") {
          handleFlipAndShow();
        } else {
          handlePlayToggle();
        }
      } else if (e.code === "KeyP") {
        e.preventDefault();
        handlePlayToggle();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        handleNextTrack();
      } else if (e.code === "KeyR") {
        e.preventDefault();
        remoteHandlersRef.current.spin();
      } else if (e.code === "KeyF") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.code === "KeyT") {
        e.preventDefault();
        toggleTvMode();
      } else if (e.code === "KeyI") {
        e.preventDefault();
        handleRevealNextHint();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const progressPercent =
    selectedDuration > 0 ? Math.max(0, Math.min(100, (timeLeft / selectedDuration) * 100)) : 100;

  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "https://hit-roulette-party.vercel.app";
  const joinUrl = `${baseUrl}?room=${roomCode}`;
  const onlinePlayers = players.filter((p) => p.isOnline);

  return (
    <PinGate>
      {isJoinModalOpen ? (
        <JoinRoomScreen
          roomCode={roomCode}
          playerName={playerName}
          setPlayerName={setPlayerName}
          onJoin={handleJoinGame}
          errorMsg={joinError}
        />
      ) : isJoinedAsClient ? (
        <MobileClientView
          playerName={playerName}
          roomCode={roomCode}
          wakeLockActive={wakeLockActive}
          activeCategory={activeCategory}
          doubleOrNothingEnabled={doubleOrNothingEnabled}
          strictQuizMode={strictQuizMode}
          fractionalPointsRate={fractionalPointsRate}
          hostYearRange={hostYearRange}
          roundPhase={roundPhase}
          personalFeedback={personalFeedback}
          onDismissFeedback={() => setPersonalFeedback(null)}
          tieBreaker={clientTieBreaker}
          activeHint={clientActiveHint}
          clientGrid={clientGrid}
          clientColorGrid={clientColorGrid}
          clientNotes={clientNotes}
          clientCredits={clientCredits}
          clientJokerCredits={clientJokerCredits}
          clientPartialPoints={clientPartialPoints}
          clientPenaltyDebt={clientPenaltyDebt}
          clientRewardBanner={clientRewardBanner}
          clientGuessYear={clientGuessYear}
          clientGuessText={clientGuessText}
          clientGuessArtist={clientGuessArtist}
          clientGuessTitle={clientGuessTitle}
          clientRiskDouble={clientRiskDouble}
          isGuessLocked={isGuessLocked}
          isRemoteOpen={isRemoteOpen}
          setIsRemoteOpen={setIsRemoteOpen}
          setClientGuessYear={setClientGuessYear}
          setClientGuessText={setClientGuessText}
          setClientGuessArtist={setClientGuessArtist}
          setClientGuessTitle={setClientGuessTitle}
          setClientRiskDouble={setClientRiskDouble}
          setIsGuessLocked={setIsGuessLocked}
          onLockPinGate={lockPinGate}
          onLeave={handleClientLeave}
          onSendRemoteCommand={sendRemoteCommand}
          onSendReaction={sendClientReaction}
          onSubmitGuess={handleClientSubmitGuess}
          onBuzzer={handleClientBuzzer}
          onTileClick={handleClientTileClick}
          onNotesChange={handleClientNotesChange}
          onNotesBroadcast={broadcastClientNotes}
          onRerollColors={handleClientRerollColors}
        />
      ) : (
        <>
          {/* AUDIÓ LEJÁTSZÓ MOTOR */}
          <audio
            ref={audioRef}
            crossOrigin={corsAudioEnabled ? "anonymous" : undefined}
            src={currentTrack?.audioUrl}
            onCanPlay={() => {
              consecutiveAudioErrorsRef.current = 0;
              setAudioError(null);
            }}
            onLoadedMetadata={() => {
              if (audioRef.current && smartIntroSkip) {
                const smartStart = getSmartStartTime(currentTrack?.lyrics);
                if (smartStart > 0) {
                  audioRef.current.currentTime = smartStart;
                  setCurrentTime(smartStart);
                }
              }
            }}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onEnded={() => {
              setIsPlaying(false);
              setCurrentTime(0);
              broadcastGameState({ isPlaying: false, timeLeft: 0 });
            }}
            onError={() => {
              consecutiveAudioErrorsRef.current += 1;
              if (consecutiveAudioErrorsRef.current >= 3) {
                handleStop(true);
                setAudioError(
                  "Nem sikerült betölteni a hangfájlokat (ellenőrizd az internetkapcsolatot, vagy válassz másik dalt)."
                );
                return;
              }
              handleNextTrack();
            }}
          />

          {nextPreloadTrack && nextPreloadTrack.id !== currentTrack?.id && (
            <audio preload="auto" src={nextPreloadTrack.audioUrl} className="hidden" />
          )}

          <HostView
            mounted={mounted}
            isTvMode={isTvMode}
            tvScale={tvScale}
            tvTheme={tvTheme}
            onSelectTheme={handleSelectTheme}
            tvHeaderScale={tvHeaderScale}
            tvWheelSize={tvWheelSize}
            tvCardWidth={tvCardWidth}
            tvGap={tvGap}
            isDraggingGap={isDraggingGap}
            isDraggingWheel={isDraggingWheel}
            isDraggingCard={isDraggingCard}
            isFullscreen={isFullscreen}
            wakeLockActive={wakeLockActive}
            isSupabaseConfigured={isSupabaseConfigured}
            currentAccent={currentAccent}
            floatingReactions={floatingReactions}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            smartIntroSkip={smartIntroSkip}
            setSmartIntroSkip={setSmartIntroSkip}
            strictQuizMode={strictQuizMode}
            toggleStrictQuizMode={toggleStrictQuizModeHost}
            doubleOrNothingEnabled={doubleOrNothingEnabled}
            toggleDoubleOrNothing={toggleDoubleOrNothingHost}
            fractionalPointsRate={fractionalPointsRate}
            cycleFractionalPointsRate={cycleFractionalPointsRate}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
            toggleFullscreen={toggleFullscreen}
            toggleTvMode={toggleTvMode}
            isLayoutMenuOpen={isLayoutMenuOpen}
            setIsLayoutMenuOpen={setIsLayoutMenuOpen}
            isScaleDropdownOpen={isScaleDropdownOpen}
            setIsScaleDropdownOpen={setIsScaleDropdownOpen}
            adjustScale={adjustScale}
            setSpecificScale={setSpecificScale}
            saveTvLayout={saveTvLayout}
            applyLayoutPreset={applyLayoutPreset}
            handleStartDragWheel={handleStartDragWheel}
            handleStartDragCard={handleStartDragCard}
            handleStartDragGap={handleStartDragGap}
            handleStartTouchDragGap={handleStartTouchDragGap}
            handleCreateRoom={handleCreateRoom}
            roomCode={roomCode}
            joinUrl={joinUrl}
            onlinePlayers={onlinePlayers}
            handleOpenPodium={handleOpenPodium}
            onLockPinGate={lockPinGate}
            selectedDuration={selectedDuration}
            timeLeft={timeLeft}
            handleDurationChange={handleDurationChange}
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
            playedIds={playedIds}
            filteredTracks={filteredTracks}
            currentTrack={currentTrack}
            isLoadingTracks={isLoadingTracks}
            autoPlayCountdown={autoPlayCountdown}
            buzzedPlayer={buzzedPlayer}
            setBuzzedPlayer={setBuzzedPlayer}
            grantManualCreditToPlayer={grantManualCreditToPlayer}
            grantManualJokerCreditToPlayer={grantManualJokerCreditToPlayer}
            revokeManualJokerCreditFromPlayer={revokeManualJokerCreditFromPlayer}
            activeCategory={activeCategory}
            isFlipped={isFlipped}
            guessTarget={guessTarget}
            roundGuesses={roundGuesses}
            evaluatedGuesses={evaluatedGuesses}
            players={players}
            setPlayers={setPlayers}
            activePlayerIdx={activePlayerIdx}
            setActivePlayerIdx={setActivePlayerIdx}
            pendingPlayers={pendingPlayers}
            pendingMarksModalOpen={pendingMarksModalOpen}
            setPendingMarksModalOpen={setPendingMarksModalOpen}
            handlePingPendingPlayers={handlePingPendingPlayers}
            handleAttemptSpin={handleAttemptSpin}
            handleSpinEnd={handleSpinEnd}
            isPlaying={isPlaying}
            currentTime={currentTime}
            progressPercent={progressPercent}
            audioError={audioError}
            liveSpectrum={spectrum}
            hasLiveSpectrum={hasLiveSpectrum}
            musicVolume={musicVolume}
            onMusicVolumeChange={setMusicVolume}
            sfxVolume={sfxVolume}
            onSfxVolumeChange={setSfxVolume}
            sfxMuted={sfxMuted}
            onToggleSfxMuted={toggleSfxMuted}
            onPlayToggle={handlePlayToggle}
            onFlipAndShow={handleFlipAndShow}
            onNextTrack={handleNextTrack}
            onSeek={handleSeek}
            isPodiumOpen={isPodiumOpen}
            setIsPodiumOpen={setIsPodiumOpen}
            sessionStats={sessionStats}
            isHostModalOpen={isHostModalOpen}
            setIsHostModalOpen={setIsHostModalOpen}
            onResetSession={handleResetHostSession}
            isHistoryOpen={isHistoryOpen}
            setIsHistoryOpen={setIsHistoryOpen}
            roundHistory={roundHistory}
            onClearHistory={() => {
              setRoundHistory([]);
              try {
                localStorage.removeItem("hit_host_history");
              } catch {
                // ignore
              }
            }}
            tieBreaker={tieBreaker}
            isTieBreakerOpen={isTieBreakerOpen}
            onOpenTieBreaker={handleOpenTieBreaker}
            onCloseTieBreaker={handleCloseTieBreaker}
            onCrownTieBreakerWinner={handleCrownTieBreakerWinner}
            activeHint={activeHint}
            onRevealNextHint={handleRevealNextHint}
          />
        </>
      )}
    </PinGate>
  );
}
