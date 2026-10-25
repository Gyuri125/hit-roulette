"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import tracksData from "../data/tracks.json";
import { MusicCard, GuessTarget } from "../components/MusicCard";
import { RouletteWheel, Category } from "../components/RouletteWheel";
import {
  PlayerBoard,
  PlayerData,
  createEmptyGrid,
  checkBingo,
  getSharedAudioContext,
  playMarkerSound,
} from "../components/PlayerBoard";
import { Track } from "../types/track";
import { supabase } from "../lib/supabase";
import { PinGate, lockPinGate } from "../components/PinGate";
import {
  Play,
  Pause,
  SkipForward,
  Timer,
  Sparkles,
  LayoutGrid,
  Disc,
  Eye,
  QrCode,
  Smartphone,
  X,
  Users,
  Music2,
  Tv,
  Shuffle,
  CalendarRange,
  RotateCcw,
  Lock,
  Eraser,
  Zap,
  SlidersHorizontal,
  Bell,
  Crown,
  Send,
  CheckCircle2,
  Trophy,
  Dices,
  Volume2,
  Maximize2,
  Minimize2,
  MoveHorizontal,
  ShieldCheck,
  Plus,
  RefreshCw,
} from "lucide-react";
import confetti from "canvas-confetti";

const TIME_OPTIONS = [15, 30, 45, 60, 0];
type MusicFilter = "all" | "hungarian" | "international";
type SoundEffectType = "airhorn" | "crickets" | "trombone" | "drumroll";

interface PlayerGuess {
  playerName: string;
  year: number;
  text: string;
  riskDouble: boolean;
  submittedAt: number;
}

interface FloatingReaction {
  id: string;
  emoji: string;
  playerName: string;
  leftPercent: number;
}

interface PlayerSessionStats {
  guessesCount: number;
  totalYearDiff: number;
  buzzerCount: number;
  riskCount: number;
}

const getFirstLyricTime = (lyrics?: string): number => {
  if (!lyrics) return 0;
  const match = lyrics.match(/\[(\d{2}):(\d{2})\.?(\d{2,3})?\]/);
  if (match) {
    const mins = parseInt(match[1], 10);
    const secs = parseInt(match[2], 10);
    const ms = match[3] ? parseInt(match[3].padEnd(3, "0").slice(0, 3), 10) : 0;
    return mins * 60 + secs + ms / 1000;
  }
  return 0;
};

const getSmartStartTime = (lyrics?: string): number => {
  const firstTime = getFirstLyricTime(lyrics);
  if (firstTime > 6) {
    return Math.max(0, Math.floor(firstTime - 5));
  }
  return 0;
};

// ================= 6. ÉKEZET- ÉS ELGÉPELÉSTŰRŐ (FUZZY LEVENSHTEIN) MOTOR =================
const normalizeForMatch = (str: string): string =>
  str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // ékezetek eltávolítása
    .replace(/[^a-z0-9\s]/g, "") // írásjelek eltávolítása (pl. AC/DC -> acdc)
    .replace(/\s+/g, " ")
    .trim();

const levenshteinSimilarity = (a: string, b: string): number => {
  if (!a.length || !b.length) return 0;
  if (a === b) return 1;
  const matrix: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  const maxLen = Math.max(a.length, b.length);
  return (maxLen - matrix[a.length][b.length]) / maxLen;
};

const isFuzzyTextMatch = (guessRaw: string, targetRaw: string): boolean => {
  const g = normalizeForMatch(guessRaw);
  const t = normalizeForMatch(targetRaw);
  if (g.length < 3 || !t.length) return false;

  // Teljes vagy részleges szövegegyezés (pl. "zaray" a "zaray marta & vamosi janos"-ban)
  if (t.includes(g) || g.includes(t)) return true;

  // Szóköz nélküli egyezés (pl. "ac dc" == "acdc")
  const gCompact = g.replace(/\s+/g, "");
  const tCompact = t.replace(/\s+/g, "");
  if (gCompact.length >= 3 && (tCompact.includes(gCompact) || gCompact.includes(tCompact))) {
    return true;
  }

  // Levenshtein hasonlóság >= 75%
  if (levenshteinSimilarity(g, t) >= 0.75) return true;
  if (levenshteinSimilarity(gCompact, tCompact) >= 0.75) return true;

  return false;
};

// ================= SINGLETON WEB AUDIO HANGEFFEKTEK =================
const playBuzzerSound = () => {
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(340, ctx.currentTime);
    osc.frequency.setValueAtTime(480, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch (_) {}
};

const playPartySoundEffect = (effect: SoundEffectType) => {
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;

    if (effect === "airhorn") {
      const freqs = [390, 465, 585];
      freqs.forEach((f) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(f, ctx.currentTime);
        gain.gain.setValueAtTime(0.16, ctx.currentTime);
        gain.gain.setValueAtTime(0.02, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.16, ctx.currentTime + 0.16);
        gain.gain.setValueAtTime(0.02, ctx.currentTime + 0.28);
        gain.gain.setValueAtTime(0.18, ctx.currentTime + 0.32);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.85);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.85);
      });
    } else if (effect === "crickets") {
      for (let burst = 0; burst < 3; burst++) {
        for (let i = 0; i < 4; i++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = ctx.currentTime + burst * 0.38 + i * 0.045;
          osc.type = "sine";
          osc.frequency.setValueAtTime(4100 + (i % 2) * 200, start);
          gain.gain.setValueAtTime(0.12, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.035);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(start);
          osc.stop(start + 0.035);
        }
      }
    } else if (effect === "trombone") {
      const notes = [
        { f: 293.66, start: 0, dur: 0.28 },
        { f: 277.18, start: 0.3, dur: 0.28 },
        { f: 261.63, start: 0.6, dur: 0.28 },
        { f: 246.94, start: 0.9, dur: 0.65 },
      ];
      notes.forEach((n, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        const st = ctx.currentTime + n.start;
        osc.frequency.setValueAtTime(n.f, st);
        if (idx === 3) {
          osc.frequency.linearRampToValueAtTime(n.f - 30, st + n.dur);
        }
        gain.gain.setValueAtTime(0.18, st);
        gain.gain.exponentialRampToValueAtTime(0.001, st + n.dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(st);
        osc.stop(st + n.dur);
      });
    } else if (effect === "drumroll") {
      for (let i = 0; i < 18; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const st = ctx.currentTime + i * 0.05;
        osc.type = "triangle";
        osc.frequency.setValueAtTime(140 + (i % 2) * 35, st);
        osc.frequency.exponentialRampToValueAtTime(55, st + 0.04);
        gain.gain.setValueAtTime(0.18, st);
        gain.gain.exponentialRampToValueAtTime(0.001, st + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(st);
        osc.stop(st + 0.04);
      }
      const endOsc = ctx.createOscillator();
      const endGain = ctx.createGain();
      const endTime = ctx.currentTime + 0.92;
      endOsc.type = "sine";
      endOsc.frequency.setValueAtTime(523.25, endTime);
      endGain.gain.setValueAtTime(0.25, endTime);
      endGain.gain.exponentialRampToValueAtTime(0.001, endTime + 0.5);
      endOsc.connect(endGain);
      endGain.connect(ctx.destination);
      endOsc.start(endTime);
      endOsc.stop(endTime + 0.5);
    }
  } catch (_) {}
};

// ================= 32-SÁVOS NEON AUDIO VISUALIZER KOMPONENS =================
const NeonEqualizerBar: React.FC<{ isPlaying: boolean; accentColor: string }> = ({ isPlaying, accentColor }) => {
  const [bars, setBars] = useState<number[]>(Array(32).fill(10));

  useEffect(() => {
    if (!isPlaying) {
      setBars(Array(32).fill(8));
      return;
    }
    const interval = setInterval(() => {
      setBars(
        Array.from({ length: 32 }, (_, idx) => {
          const distFromCenter = Math.abs(idx - 15.5) / 16;
          const wave = Math.max(0.25, 1 - distFromCenter * 0.85);
          return Math.floor((Math.random() * 82 + 18) * wave);
        })
      );
    }, 95);
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div className="w-full max-w-lg h-9 flex items-end justify-center gap-1 px-4 pointer-events-none select-none z-10 -mb-2">
      {bars.map((val, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-full transition-all duration-100"
          style={{
            height: `${isPlaying ? val : 8}%`,
            backgroundColor: accentColor,
            opacity: isPlaying ? 0.85 : 0.18,
            boxShadow: isPlaying ? `0 0 12px ${accentColor}` : "none",
          }}
        />
      ))}
    </div>
  );
};

export default function Home() {
  const allTracks: Track[] = tracksData;

  const { absoluteMinYear, absoluteMaxYear } = React.useMemo(() => {
    const validYears = allTracks
      .map((t) => t.year)
      .filter((y) => typeof y === "number" && y >= 1950 && y <= 2030);
    if (!validYears.length) return { absoluteMinYear: 1960, absoluteMaxYear: 2026 };
    return {
      absoluteMinYear: Math.min(...validYears),
      absoluteMaxYear: Math.max(...validYears),
    };
  }, [allTracks]);

  const [musicFilter, setMusicFilter] = useState<MusicFilter>("all");
  const [minYear, setMinYear] = useState<number>(absoluteMinYear);
  const [maxYear, setMaxYear] = useState<number>(absoluteMaxYear);
  const [smartIntroSkip, setSmartIntroSkip] = useState<boolean>(true);
  const [showFilters, setShowFilters] = useState<boolean>(true);
  const [doubleOrNothingEnabled, setDoubleOrNothingEnabled] = useState<boolean>(true);

  // 7. SZIGORÚ KVÍZ MÓD (Automata Jutalom X & Csalásvédelem)
  const [strictQuizMode, setStrictQuizMode] = useState<boolean>(true);

  // 1. KÉPERNYŐ-ÉBRENTARTÁS (Wake Lock API)
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(false);
  const wakeLockRef = useRef<any>(null);

  // ⛶ 1-Kattintásos TV Fullscreen (Mozimód)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // 8. 16:9 TV-RE OPTIMALIZÁLT NÉZET ÉS MÉRETARÁNY (UI ZOOM SCALER)
  const [isTvMode, setIsTvMode] = useState<boolean>(false);
  const [tvScale, setTvScale] = useState<number>(120);
  const [isScaleDropdownOpen, setIsScaleDropdownOpen] = useState<boolean>(false);

  // 📺 16:9 TV FINOMHANGOLHATÓ ELRENDEZÉS, HÉZAG ÉS ELEMMÉRETEK (DRAGGABLE & RESIZABLE)
  const [tvWheelSize, setTvWheelSize] = useState<number>(530);
  const [tvCardWidth, setTvCardWidth] = useState<number>(470);
  const [tvGap, setTvGap] = useState<number>(28);
  const [isLayoutMenuOpen, setIsLayoutMenuOpen] = useState<boolean>(false);

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

  const saveTvLayout = (wheel: number, card: number, gap: number) => {
    const safeWheel = Math.max(380, Math.min(650, wheel));
    const safeCard = Math.max(360, Math.min(580, card));
    const safeGap = Math.max(8, Math.min(160, gap));
    setTvWheelSize(safeWheel);
    setTvCardWidth(safeCard);
    setTvGap(safeGap);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          "hit_tv_layout_prefs",
          JSON.stringify({ wheelSize: safeWheel, cardWidth: safeCard, gap: safeGap })
        );
      } catch (_) {}
    }
  };

  const applyLayoutPreset = (type: "cinema" | "balanced" | "compact") => {
    if (type === "cinema") {
      // 🎬 TV Mozi: Óriás elemek, feszes 24px hézag, teljes képernyőkitöltés
      saveTvLayout(580, 510, 24);
    } else if (type === "balanced") {
      // 🎯 Kiegyensúlyozott
      saveTvLayout(520, 460, 36);
    } else if (type === "compact") {
      // ⚡ Kompakt
      saveTvLayout(450, 410, 20);
    }
  };

  // ↔ KÖZTES HÉZAG (GAP) HÚZÁSA EGÉRREL / ÉRINTÉSSEL
  const handleStartDragGap = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startGap = tvGap;
    let currentGap = startGap;

    const onMouseMove = (moveEvt: MouseEvent) => {
      const delta = moveEvt.clientX - startX;
      currentGap = Math.max(8, Math.min(160, Math.round(startGap + delta)));
      setTvGap(currentGap);
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      saveTvLayout(tvWheelSize, tvCardWidth, currentGap);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const handleStartTouchDragGap = (e: React.TouchEvent) => {
    if (!e.touches[0]) return;
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
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      saveTvLayout(tvWheelSize, tvCardWidth, currentGap);
    };

    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onTouchEnd);
  };

  // 🎡 KERÉK MÉRETÉNEK HÚZÁSA SZÉLÉRŐL
  const handleStartDragWheel = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWheel = tvWheelSize;
    let currentWheel = startWheel;

    const onMouseMove = (moveEvt: MouseEvent) => {
      const delta = startX - moveEvt.clientX; // balra húzva szélesedik kifelé a kerék
      currentWheel = Math.max(380, Math.min(650, Math.round(startWheel + delta)));
      setTvWheelSize(currentWheel);
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      saveTvLayout(currentWheel, tvCardWidth, tvGap);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // 🎴 KÁRTYA MÉRETÉNEK HÚZÁSA SZÉLÉRŐL
  const handleStartDragCard = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startCard = tvCardWidth;
    let currentCard = startCard;

    const onMouseMove = (moveEvt: MouseEvent) => {
      const delta = moveEvt.clientX - startX; // jobbra húzva szélesedik kifelé a kártya
      currentCard = Math.max(360, Math.min(580, Math.round(startCard + delta)));
      setTvCardWidth(currentCard);
    };

    const onMouseUp = () => {
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

  const filteredTracks = React.useMemo(() => {
    return allTracks.filter((t) => {
      const isHu = (t as any).language === "hu";

      if (musicFilter === "hungarian" && !isHu) return false;
      if (musicFilter === "international" && isHu) return false;

      if (typeof t.year === "number") {
        if (t.year < minYear || t.year > maxYear) return false;
      }

      return true;
    });
  }, [allTracks, musicFilter, minYear, maxYear]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextPreloadIndex, setNextPreloadIndex] = useState<number>(1);
  const [playedIds, setPlayedIds] = useState<(string | number)[]>([]);

  const [isFlipped, setIsFlipped] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [autoPlayCountdown, setAutoPlayCountdown] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"boards" | "game">("boards");
  const [autoSwitchTab, setAutoSwitchTab] = useState(false);

  const [selectedDuration, setSelectedDuration] = useState<number>(45);
  const [timeLeft, setTimeLeft] = useState<number>(45);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [guessTarget, setGuessTarget] = useState<GuessTarget>("year");

  const [players, setPlayers] = useState<PlayerData[]>([
    { id: "host", name: "Házigazda", notes: "", grid: createEmptyGrid(), hasWon: false },
  ]);
  const [activePlayerIdx, setActivePlayerIdx] = useState(0);

  // Multiplayer, Buzzer, Host Remote & Kahoot Vak Tippelés
  const [roomCode, setRoomCode] = useState<string>("");
  const [isHostModalOpen, setIsHostModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [isJoinedAsClient, setIsJoinedAsClient] = useState(false);
  const [clientGrid, setClientGrid] = useState<boolean[][]>(createEmptyGrid());
  const [clientNotes, setClientNotes] = useState<string>("");
  const [buzzedPlayer, setBuzzedPlayer] = useState<string | null>(null);

  // Mobil Házigazda Távirányító & Mobil Kahoot Tipp Állapotok
  const [isRemoteOpen, setIsRemoteOpen] = useState<boolean>(false);
  const [clientGuessYear, setClientGuessYear] = useState<number>(1995);
  const [clientGuessText, setClientGuessText] = useState<string>("");
  const [clientRiskDouble, setClientRiskDouble] = useState<boolean>(false);
  const [isGuessLocked, setIsGuessLocked] = useState<boolean>(false);

  // 7. MOBIL JUTALOM X KREDITEK ÉS BÜNTETÉS (Szigorú Kvíz Mód)
  const [clientCredits, setClientCredits] = useState<number>(0);
  const [clientPenaltyDebt, setClientPenaltyDebt] = useState<number>(0);
  const [clientRewardBanner, setClientRewardBanner] = useState<string | null>(null);

  // TV-n beérkezett Kahoot tippek az adott körben
  const [roundGuesses, setRoundGuesses] = useState<Record<string, PlayerGuess>>({});

  // Lebegő Emoji-Ágyú & Parti Díjátadó (Podium) Állapotok
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [sessionStats, setSessionStats] = useState<Record<string, PlayerSessionStats>>({});
  const [isPodiumOpen, setIsPodiumOpen] = useState<boolean>(false);
  const scoredTrackIdRef = useRef<string | number | null>(null);
  const hostHydratedRef = useRef<boolean>(false);

  const channelRef = useRef<any>(null);
  const activeCategoryRef = useRef<Category | null>(null);
  const doubleOrNothingRef = useRef<boolean>(true);
  const strictQuizModeRef = useRef<boolean>(true);
  const remoteHandlersRef = useRef<{
    playToggle: () => void;
    flip: () => void;
    next: () => void;
    spin: () => void;
    switchTab: () => void;
    openPodium: () => void;
  }>({
    playToggle: () => {},
    flip: () => {},
    next: () => {},
    spin: () => {},
    switchTab: () => {},
    openPodium: () => {},
  });

  useEffect(() => {
    activeCategoryRef.current = activeCategory;
  }, [activeCategory]);

  useEffect(() => {
    doubleOrNothingRef.current = doubleOrNothingEnabled;
  }, [doubleOrNothingEnabled]);

  useEffect(() => {
    strictQuizModeRef.current = strictQuizMode;
  }, [strictQuizMode]);

  const currentTrack = filteredTracks[currentIndex] || allTracks[0];
  const nextPreloadTrack = filteredTracks[nextPreloadIndex] || allTracks[0];
  const currentAccent = activeCategory?.accent || "#f59e0b";

  // ================= 1. WAKE LOCK ÉS 5. VISIBILITY RECONNECT =================
  const requestWakeLock = async () => {
    if (typeof navigator !== "undefined" && "wakeLock" in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
        setWakeLockActive(true);
        wakeLockRef.current.addEventListener("release", () => {
          setWakeLockActive(false);
        });
      } catch (_) {
        setWakeLockActive(false);
      }
    }
  };

  useEffect(() => {
    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        requestWakeLock();
        // Ha mobil játékos visszatér a böngészőbe, azonnal kér szinkront a TV-től
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
  }, [isJoinedAsClient, playerName]);

  // ================= 2. HÁZIGAZDA (TV) ANTI-REFRESH MENTÉS ÉS VISSZATÖLTÉS =================
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const urlRoom = params.get("room");

    // Mobil kliens állapot visszatöltése
    const savedName = localStorage.getItem("hit_player_name");
    const savedRoom = localStorage.getItem("hit_room_code");
    const savedGrid = localStorage.getItem("hit_player_grid");
    const savedNotes = localStorage.getItem("hit_player_notes");
    const savedCredits = localStorage.getItem("hit_player_credits");
    const savedDebt = localStorage.getItem("hit_player_debt");

    if (savedCredits !== null) setClientCredits(Math.max(0, parseInt(savedCredits, 10) || 0));
    if (savedDebt !== null) setClientPenaltyDebt(Math.max(0, parseInt(savedDebt, 10) || 0));

    if (urlRoom) {
      setRoomCode(urlRoom.toUpperCase());
      if (savedName) setPlayerName(savedName);
      setIsJoinModalOpen(true);
      hostHydratedRef.current = true;
      return;
    }

    if (savedRoom && savedName) {
      setRoomCode(savedRoom);
      setPlayerName(savedName);
      if (savedGrid) {
        try { setClientGrid(JSON.parse(savedGrid)); } catch (_) {}
      }
      if (savedNotes) setClientNotes(savedNotes);
      setIsJoinedAsClient(true);
      hostHydratedRef.current = true;
      return;
    }

    // Házigazda (TV) állapot visszatöltése F5 frissítés után
    const hostRoom = localStorage.getItem("hit_host_room_code");
    const hostPlayers = localStorage.getItem("hit_host_players");
    const hostPlayed = localStorage.getItem("hit_host_played_ids");
    const hostStats = localStorage.getItem("hit_host_session_stats");
    const hostStrict = localStorage.getItem("hit_host_strict_mode");
    const hostTvMode = localStorage.getItem("hit_host_tv_mode");
    const hostTvScale = localStorage.getItem("hit_host_tv_scale");
    const hostLayout = localStorage.getItem("hit_tv_layout_prefs");

    if (hostLayout) {
      try {
        const parsed = JSON.parse(hostLayout);
        if (parsed.wheelSize) setTvWheelSize(parsed.wheelSize);
        if (parsed.cardWidth) setTvCardWidth(parsed.cardWidth);
        if (parsed.gap !== undefined) setTvGap(parsed.gap);
      } catch (_) {}
    }

    if (hostRoom) setRoomCode(hostRoom);
    if (hostPlayers) {
      try {
        const parsed = JSON.parse(hostPlayers);
        if (Array.isArray(parsed) && parsed.length > 0) setPlayers(parsed);
      } catch (_) {}
    }
    if (hostPlayed) {
      try { setPlayedIds(JSON.parse(hostPlayed)); } catch (_) {}
    }
    if (hostStats) {
      try { setSessionStats(JSON.parse(hostStats)); } catch (_) {}
    }
    if (hostStrict !== null) {
      setStrictQuizMode(hostStrict === "true");
    }
    if (hostTvMode !== null) {
      setIsTvMode(hostTvMode === "true");
    } else if (typeof window !== "undefined" && window.innerWidth >= 1200) {
      setIsTvMode(true);
    }
    if (hostTvScale) {
      const parsedScale = parseInt(hostTvScale, 10);
      if (parsedScale >= 80 && parsedScale <= 170) setTvScale(parsedScale);
    }

    hostHydratedRef.current = true;
  }, []);

  // Házigazda (TV) állapot folyamatos mentése
  useEffect(() => {
    if (!hostHydratedRef.current || isJoinedAsClient || typeof window === "undefined") return;
    if (roomCode) localStorage.setItem("hit_host_room_code", roomCode);
    localStorage.setItem("hit_host_players", JSON.stringify(players));
    localStorage.setItem("hit_host_played_ids", JSON.stringify(playedIds));
    localStorage.setItem("hit_host_session_stats", JSON.stringify(sessionStats));
    localStorage.setItem("hit_host_strict_mode", String(strictQuizMode));
    localStorage.setItem("hit_host_tv_mode", String(isTvMode));
    localStorage.setItem("hit_host_tv_scale", String(tvScale));
    localStorage.setItem(
      "hit_tv_layout_prefs",
      JSON.stringify({ wheelSize: tvWheelSize, cardWidth: tvCardWidth, gap: tvGap })
    );
  }, [roomCode, players, playedIds, sessionStats, strictQuizMode, isTvMode, tvScale, tvWheelSize, tvCardWidth, tvGap, isJoinedAsClient]);

  // ================= FADE IN & FADE OUT MOTOR =================
  const stopFadeTimer = () => {
    if (fadeTimerRef.current) {
      clearInterval(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
  };

  const fadeIn = (audio: HTMLAudioElement, targetVol = 1.0, durationMs = 1500) => {
    stopFadeTimer();
    try { audio.volume = 0; } catch (_) {}
    const stepTime = 30;
    const steps = durationMs / stepTime;
    const increment = targetVol / steps;
    let curVol = 0;

    fadeTimerRef.current = setInterval(() => {
      curVol = Math.min(targetVol, curVol + increment);
      try { audio.volume = curVol; } catch (_) {}
      if (curVol >= targetVol) stopFadeTimer();
    }, stepTime);
  };

  const fadeOut = (audio: HTMLAudioElement, durationMs = 1800, onDone?: () => void) => {
    stopFadeTimer();
    const startVol = audio.volume;
    if (startVol <= 0.05) {
      audio.pause();
      try { audio.volume = 1.0; } catch (_) {}
      if (onDone) onDone();
      return;
    }
    const stepTime = 30;
    const steps = durationMs / stepTime;
    const decrement = startVol / steps;
    let curVol = startVol;

    fadeTimerRef.current = setInterval(() => {
      curVol = Math.max(0, curVol - decrement);
      try { audio.volume = curVol; } catch (_) {}
      if (curVol <= 0) {
        stopFadeTimer();
        audio.pause();
        try { audio.volume = 1.0; } catch (_) {}
        if (onDone) onDone();
      }
    }, stepTime);
  };

  useEffect(() => {
    return () => stopFadeTimer();
  }, []);

  // ================= 4. KÖVETKEZŐ DAL ELŐSORSOLÁSA ÉS PRELOAD =================
  const computeCandidateIndex = (pool: Track[], excludeIds: (string | number)[], currentId?: string | number): number => {
    if (!pool.length) return 0;
    if (pool.length === 1) return 0;

    let unplayed = pool.filter((t) => !excludeIds.includes(t.id));
    if (unplayed.length === 0) {
      unplayed = pool.filter((t) => t.id !== currentId);
    }
    const candidates = unplayed.length > 0 ? unplayed : pool;
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    const idx = pool.findIndex((t) => t.id === chosen.id);
    return idx !== -1 ? idx : 0;
  };

  useEffect(() => {
    if (filteredTracks.length > 0) {
      const rndIdx = Math.floor(Math.random() * filteredTracks.length);
      const firstId = filteredTracks[rndIdx].id;
      setCurrentIndex(rndIdx);
      setPlayedIds([firstId]);
      const preloadIdx = computeCandidateIndex(filteredTracks, [firstId], firstId);
      setNextPreloadIndex(preloadIdx);
      handleStop(true);
      setIsFlipped(false);
    }
  }, [musicFilter, minYear, maxYear]);

  const handleCreateRoom = () => {
    if (!roomCode) {
      const code = Math.random().toString(36).substring(2, 6).toUpperCase();
      setRoomCode(code);
    }
    setIsHostModalOpen(true);
  };

  const handleResetHostSession = () => {
    if (!confirm("Biztosan új partit indítasz? Minden tábla és pontszám nullázódik, és új szobakód generálódik.")) return;
    const newCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    setRoomCode(newCode);
    setPlayers([{ id: "host", name: "Házigazda", notes: "", grid: createEmptyGrid(), hasWon: false }]);
    setSessionStats({});
    setRoundGuesses({});
    localStorage.removeItem("hit_host_players");
    localStorage.removeItem("hit_host_session_stats");
    localStorage.setItem("hit_host_room_code", newCode);
  };

  // ================= REALTIME SUPABASE BROADCAST =================
  useEffect(() => {
    if (!roomCode) return;

    const channel = supabase.channel(`room_${roomCode}`, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    const broadcastCurrentGameState = () => {
      channel.send({
        type: "broadcast",
        event: "game_state",
        payload: {
          activeCategory: activeCategoryRef.current,
          targetType: activeCategoryRef.current?.targetType || "year",
          doubleOrNothingEnabled: doubleOrNothingRef.current,
          strictQuizMode: strictQuizModeRef.current,
        },
      });
    };

    channel.on("broadcast", { event: "player_sync" }, ({ payload }) => {
      setPlayers((prev) => {
        const existingIdx = prev.findIndex((p) => p.name.toLowerCase() === payload.name.toLowerCase());
        if (existingIdx !== -1) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            grid: payload.grid,
            notes: payload.notes,
            hasWon: payload.hasWon,
            isOnline: true,
          };
          return updated;
        } else {
          return [
            ...prev,
            {
              id: payload.id || String(Date.now()),
              name: payload.name,
              notes: payload.notes || "",
              grid: payload.grid || createEmptyGrid(),
              hasWon: payload.hasWon || false,
              isOnline: true,
            },
          ];
        }
      });

      if (!isJoinedAsClient) {
        broadcastCurrentGameState();
      }
    });

    // 5. VISIBILITY RECONNECT: Ha egy telefon felébred, a TV visszaküldi az aktuális játékszabályokat
    channel.on("broadcast", { event: "sync_request" }, () => {
      if (!isJoinedAsClient) {
        broadcastCurrentGameState();
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
      if (payload.resetRound) {
        setIsGuessLocked(false);
        setClientGuessText("");
        setClientRiskDouble(false);
        setClientRewardBanner(null);
      }
    });

    // 7. AUTOMATA JUTALOM X KREDIT FOGADÁSA A TELEFONON
    channel.on("broadcast", { event: "award_credits" }, ({ payload }) => {
      if (!isJoinedAsClient) return;
      const myAward = payload?.awards?.[playerName];
      if (!myAward) return;

      if (myAward.deltaCredits > 0) {
        setClientCredits((prev) => {
          const next = prev + myAward.deltaCredits;
          localStorage.setItem("hit_player_credits", String(next));
          return next;
        });
        setClientRewardBanner(`🎉 +${myAward.deltaCredits} X lépést szereztél! (${myAward.reason})`);
        if (typeof window !== "undefined" && "vibrate" in navigator) {
          try { navigator.vibrate([50, 40, 90]); } catch (_) {}
        }
      } else if (myAward.penalty > 0) {
        setClientCredits((prev) => {
          if (prev >= myAward.penalty) {
            const next = prev - myAward.penalty;
            localStorage.setItem("hit_player_credits", String(next));
            setClientRewardBanner("💀 Dupla vagy Semmi bukta: -1 X kredit levonva!");
            return next;
          } else {
            setClientPenaltyDebt((d) => {
              const nextDebt = d + 1;
              localStorage.setItem("hit_player_debt", String(nextDebt));
              return nextDebt;
            });
            setClientRewardBanner("💀 Dupla vagy Semmi bukta: Radírozz le 1 X-et a tábládról!");
            return prev;
          }
        });
      }
    });

    channel.on("broadcast", { event: "buzzer_ring" }, ({ payload }) => {
      if (!isJoinedAsClient && payload?.playerName) {
        setBuzzedPlayer((prev) => {
          if (!prev) {
            playBuzzerSound();
            remoteHandlersRef.current.playToggle();
            setSessionStats((st) => {
              const cur = st[payload.playerName] || { guessesCount: 0, totalYearDiff: 0, buzzerCount: 0, riskCount: 0 };
              return {
                ...st,
                [payload.playerName]: { ...cur, buzzerCount: cur.buzzerCount + 1 },
              };
            });
            return payload.playerName;
          }
          return prev;
        });
      }
    });

    channel.on("broadcast", { event: "submit_guess" }, ({ payload }) => {
      if (!isJoinedAsClient && payload?.playerName) {
        setRoundGuesses((prev) => ({
          ...prev,
          [payload.playerName]: {
            playerName: payload.playerName,
            year: Number(payload.year),
            text: String(payload.text || "").trim(),
            riskDouble: Boolean(payload.riskDouble),
            submittedAt: Date.now(),
          },
        }));
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
    });

    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomCode, isJoinedAsClient, playerName]);

  const toggleDoubleOrNothingHost = () => {
    const nextVal = !doubleOrNothingEnabled;
    setDoubleOrNothingEnabled(nextVal);
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "game_state",
        payload: {
          activeCategory: activeCategoryRef.current,
          targetType: activeCategoryRef.current?.targetType || "year",
          doubleOrNothingEnabled: nextVal,
          strictQuizMode: strictQuizModeRef.current,
        },
      });
    }
  };

  const toggleStrictQuizModeHost = () => {
    const nextVal = !strictQuizMode;
    setStrictQuizMode(nextVal);
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "game_state",
        payload: {
          activeCategory: activeCategoryRef.current,
          targetType: activeCategoryRef.current?.targetType || "year",
          doubleOrNothingEnabled: doubleOrNothingRef.current,
          strictQuizMode: nextVal,
        },
      });
    }
  };

  // Kézi +1 X kredit küldése a TV-ről (pl. Buzzerrel bemondott helyes válaszért)
  const grantManualCreditToPlayer = (targetPlayerName: string) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "award_credits",
        payload: {
          awards: {
            [targetPlayerName]: { deltaCredits: 1, penalty: 0, reason: "Házigazda jóváhagyás" },
          },
        },
      });
    }
  };

  const sendRemoteCommand = (command: "toggle_play" | "flip" | "next" | "spin" | "switch_tab" | "open_podium") => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate(25); } catch (_) {}
    }
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "remote_control",
        payload: { command, by: playerName },
      });
    }
  };

  const sendClientReaction = (emoji: string, sound?: SoundEffectType) => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate(20); } catch (_) {}
    }
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "party_reaction",
        payload: { playerName, emoji, sound },
      });
    }
  };

  const handleClientSubmitGuess = () => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate([30, 50, 30]); } catch (_) {}
    }
    setIsGuessLocked(true);
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "submit_guess",
        payload: {
          playerName,
          year: clientGuessYear,
          text: clientGuessText,
          riskDouble: doubleOrNothingEnabled ? clientRiskDouble : false,
        },
      });
    }
  };

  const handleClientBuzzer = () => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate([60, 40, 80]); } catch (_) {}
    }
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "buzzer_ring",
        payload: { playerName },
      });
    }
  };

  // ================= 7. CSALÁSVÉDETT MOBIL TÁBLA KATTINTÁS (SZIGORÚ KVÍZ MÓD) =================
  const handleClientTileClick = (r: number, c: number) => {
    const isCurrentlyMarked = clientGrid[r][c];
    const willBeMarked = !isCurrentlyMarked;
    const markedCount = clientGrid.flat().filter(Boolean).length;

    if (strictQuizMode) {
      if (willBeMarked) {
        if (clientPenaltyDebt > 0 && markedCount > 0) {
          alert("⚠️ Elbuktad a Dupla vagy Semmit! Először radírozz le 1 meglévő X-et a tábládról!");
          return;
        }
        if (clientCredits <= 0) {
          alert("🔒 Nincs szabad X lépésed! Találd el a feladványt a következő körben az X feloldásához!");
          return;
        }
        // 1 kredit levonása
        setClientCredits((prev) => {
          const next = Math.max(0, prev - 1);
          localStorage.setItem("hit_player_credits", String(next));
          return next;
        });
      } else {
        // Meglévő X levétele: ha büntetésben volt, letudja a büntetést; különben visszakapja a kreditet, hogy átrakja máshova
        if (clientPenaltyDebt > 0) {
          setClientPenaltyDebt((prev) => {
            const next = Math.max(0, prev - 1);
            localStorage.setItem("hit_player_debt", String(next));
            return next;
          });
          setClientRewardBanner("✅ Büntetés letudva (1 X leradírozva)!");
        } else {
          setClientCredits((prev) => {
            const next = prev + 1;
            localStorage.setItem("hit_player_credits", String(next));
            return next;
          });
        }
      }
    }

    playMarkerSound(willBeMarked);

    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate(willBeMarked ? 35 : 15); } catch (_) {}
    }

    const newGrid = clientGrid.map((row, rIdx) =>
      row.map((cell, cIdx) => (rIdx === r && cIdx === c ? !cell : cell))
    );
    setClientGrid(newGrid);
    localStorage.setItem("hit_player_grid", JSON.stringify(newGrid));

    const hasWon = checkBingo(newGrid);
    if (hasWon) confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });

    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "player_sync",
        payload: { id: playerName, name: playerName, grid: newGrid, notes: clientNotes, hasWon },
      });
    }
  };

  const handleClientNotesChange = (notes: string) => {
    setClientNotes(notes);
    localStorage.setItem("hit_player_notes", notes);

    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "player_sync",
        payload: { id: playerName, name: playerName, grid: clientGrid, notes, hasWon: checkBingo(clientGrid) },
      });
    }
  };

  const handleJoinGame = () => {
    if (!playerName.trim()) return alert("Kérlek írd be a neved!");
    localStorage.setItem("hit_player_name", playerName);
    localStorage.setItem("hit_room_code", roomCode);
    setIsJoinModalOpen(false);
    setIsJoinedAsClient(true);
    requestWakeLock();

    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "player_sync",
        payload: { id: playerName, name: playerName, grid: clientGrid, notes: clientNotes, hasWon: false },
      });
    }
  };

  // Időzítő visszaszámláló: 3 másodperccel a vége előtt elindul a lágy elhalkulás
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && selectedDuration > 0 && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev === 3 && audioRef.current) {
            fadeOut(audioRef.current, 2800);
          }
          if (prev <= 1) {
            handleStop(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, timeLeft, selectedDuration]);

  const handleDurationChange = (seconds: number) => {
    setSelectedDuration(seconds);
    if (!isPlaying) setTimeLeft(seconds);
  };

  const handleSpinEnd = (cat: Category) => {
    setActiveCategory(cat);
    setGuessTarget(cat.targetType);
    setBuzzedPlayer(null);
    setRoundGuesses({});
    setAutoPlayCountdown(3);

    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "game_state",
        payload: {
          activeCategory: cat,
          targetType: cat.targetType,
          doubleOrNothingEnabled,
          strictQuizMode,
          resetRound: true,
        },
      });
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (autoPlayCountdown !== null && autoPlayCountdown > 0) {
      timer = setTimeout(() => {
        setAutoPlayCountdown((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);
    } else if (autoPlayCountdown === 0) {
      setAutoPlayCountdown(null);
      if (audioRef.current) {
        const smartStart = smartIntroSkip ? getSmartStartTime(currentTrack?.lyrics) : 0;
        audioRef.current.currentTime = smartStart;
        setCurrentTime(smartStart);
        fadeIn(audioRef.current, 1.0, 1500);
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
        setTimeLeft(selectedDuration);
      }
      if (autoSwitchTab) {
        setActiveTab("boards");
      }
    }
    return () => clearTimeout(timer);
  }, [autoPlayCountdown, selectedDuration, autoSwitchTab, smartIntroSkip, currentTrack]);

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
      if (!isPlaying) {
        fadeIn(audioRef.current, 1.0, 1000);
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }
  };

  // ================= 6. FUZZY KIÉRTÉKELÉS ÉS 7. JUTALOM X KALKULÁCIÓ =================
  const guessList = Object.values(roundGuesses);

  const evaluatedGuesses = React.useMemo(() => {
    if (!currentTrack) return [];
    const catId = activeCategory?.id || "year";

    return guessList
      .map((g) => {
        const yearDiff = Math.abs(g.year - currentTrack.year);
        const titleMatch = isFuzzyTextMatch(g.text, currentTrack.title);
        const artistMatch = isFuzzyTextMatch(g.text, currentTrack.artist);

        // Kategória-függő győzelmi feltétel
        let earnedRegularWin = false;
        if (catId === "c_exact_year" || catId === "y_exact") {
          earnedRegularWin = yearDiff === 0;
        } else if (catId === "y_5") {
          earnedRegularWin = yearDiff <= 5;
        } else if (catId === "c_decade" || catId === "y_dec") {
          earnedRegularWin = Math.floor(g.year / 10) === Math.floor(currentTrack.year / 10);
        } else if (catId === "y_2000") {
          earnedRegularWin = (g.year >= 2000) === (currentTrack.year >= 2000);
        } else if (guessTarget === "title") {
          earnedRegularWin = titleMatch;
        } else if (guessTarget === "artist") {
          earnedRegularWin = artistMatch;
        } else if (guessTarget === "all") {
          earnedRegularWin = yearDiff <= 2 && (titleMatch || artistMatch);
        } else {
          // Alapértelmezett évszám / szabad tipp: ±2 év eltérés VAGY eltalált cím/előadó
          earnedRegularWin = yearDiff <= 2 || titleMatch || artistMatch;
        }

        const wonDouble = g.riskDouble && (yearDiff === 0 || titleMatch || artistMatch);
        const earnedCredits = g.riskDouble ? (wonDouble ? 2 : 0) : earnedRegularWin ? 1 : 0;
        const penalty = g.riskDouble && !wonDouble ? 1 : 0;

        return {
          ...g,
          yearDiff,
          titleMatch,
          artistMatch,
          wonDouble,
          earnedRegularWin,
          earnedCredits,
          penalty,
        };
      })
      .sort((a, b) => b.earnedCredits - a.earnedCredits || a.yearDiff - b.yearDiff || a.submittedAt - b.submittedAt);
  }, [guessList, currentTrack, activeCategory, guessTarget]);

  const handleFlipAndShow = () => {
    const nextFlipped = !isFlipped;
    setIsFlipped(nextFlipped);
    if (nextFlipped) {
      handleStop(false);
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });

      // Statisztikák és Automata Jutalom X-ek kiküldése (dalonként egyszer)
      if (currentTrack && scoredTrackIdRef.current !== currentTrack.id) {
        scoredTrackIdRef.current = currentTrack.id;

        if (evaluatedGuesses.length > 0) {
          setSessionStats((prev) => {
            const next = { ...prev };
            evaluatedGuesses.forEach((g) => {
              const cur = next[g.playerName] || {
                guessesCount: 0,
                totalYearDiff: 0,
                buzzerCount: 0,
                riskCount: 0,
              };
              next[g.playerName] = {
                ...cur,
                guessesCount: cur.guessesCount + 1,
                totalYearDiff: cur.totalYearDiff + g.yearDiff,
                riskCount: cur.riskCount + (g.riskDouble ? 1 : 0),
              };
            });
            return next;
          });

          // Jutalom X kreditek kiküldése a telefonokra
          if (channelRef.current) {
            const awards: Record<string, { deltaCredits: number; penalty: number; reason: string }> = {};
            evaluatedGuesses.forEach((g) => {
              if (g.earnedCredits > 0 || g.penalty > 0) {
                awards[g.playerName] = {
                  deltaCredits: g.earnedCredits,
                  penalty: g.penalty,
                  reason: g.wonDouble ? "Dupla vagy Semmi telitalálat!" : "Helyes tipp!",
                };
              }
            });
            if (Object.keys(awards).length > 0) {
              channelRef.current.send({
                type: "broadcast",
                event: "award_credits",
                payload: { awards, trackId: currentTrack.id },
              });
            }
          }
        }
      }
    }
  };

  const handleStop = (immediate = false) => {
    if (!audioRef.current) {
      setIsPlaying(false);
      return;
    }
    if (immediate) {
      stopFadeTimer();
      audioRef.current.pause();
      try { audioRef.current.volume = 1.0; } catch (_) {}
      setIsPlaying(false);
    } else {
      fadeOut(audioRef.current, 1600, () => {
        setIsPlaying(false);
      });
    }
  };

  const handlePlayToggle = () => {
    if (!audioRef.current) return;
    getSharedAudioContext();
    if (isPlaying) {
      handleStop(false);
    } else {
      const audio = audioRef.current;
      if (audio.currentTime === 0 && smartIntroSkip) {
        const smartStart = getSmartStartTime(currentTrack?.lyrics);
        audio.currentTime = smartStart;
        setCurrentTime(smartStart);
      }
      fadeIn(audio, 1.0, 1500);
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  // 4. AZONNALI VÁLTÁS AZ ELŐTÖLTÖTT DALRA + KÖVETKEZŐ ELŐSORSOLÁSA
  const handleNextTrack = () => {
    setIsFlipped(false);
    setBuzzedPlayer(null);
    setRoundGuesses({});
    handleStop(true);
    setAutoPlayCountdown(null);
    setTimeLeft(selectedDuration);

    const chosenIdx =
      nextPreloadIndex >= 0 && nextPreloadIndex < filteredTracks.length
        ? nextPreloadIndex
        : computeCandidateIndex(filteredTracks, playedIds, currentTrack?.id);

    const chosenTrack = filteredTracks[chosenIdx];
    const updatedPlayed = chosenTrack ? [...playedIds, chosenTrack.id] : playedIds;
    setPlayedIds(updatedPlayed);
    setCurrentIndex(chosenIdx);

    const upcomingIdx = computeCandidateIndex(filteredTracks, updatedPlayed, chosenTrack?.id);
    setNextPreloadIndex(upcomingIdx);

    if (audioRef.current && chosenTrack) {
      const smartStart = smartIntroSkip ? getSmartStartTime(chosenTrack.lyrics) : 0;
      audioRef.current.currentTime = smartStart;
      setCurrentTime(smartStart);
    }

    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "game_state",
        payload: {
          activeCategory: activeCategoryRef.current,
          targetType: activeCategoryRef.current?.targetType || "year",
          doubleOrNothingEnabled: doubleOrNothingRef.current,
          strictQuizMode: strictQuizModeRef.current,
          resetRound: true,
        },
      });
    }
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
      spin: () => {
        setActiveTab("game");
        setIsFlipped(false);
        setTimeout(() => {
          document.querySelector<HTMLButtonElement>("#roulette-spin-btn")?.click();
        }, 150);
      },
      switchTab: () => {
        setActiveTab((prev) => (prev === "boards" ? "game" : "boards"));
      },
      openPodium: handleOpenPodium,
    };
  });

  // PC / Laptop billentyűparancsok
  useEffect(() => {
    if (isJoinedAsClient) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.code === "Space") {
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
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const isWideOpenYears = minYear <= absoluteMinYear && maxYear >= absoluteMaxYear;
  const progressPercent =
    selectedDuration > 0 ? Math.max(0, Math.min(100, (timeLeft / selectedDuration) * 100)) : 100;

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://hit-roulette-party.vercel.app";
  const joinUrl = `${baseUrl}?room=${roomCode}`;
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    joinUrl
  )}&bgcolor=171717&color=fbbf24`;

  const onlinePlayers = players.filter((p) => p.isOnline);

  const podiumData = React.useMemo(() => {
    const rankedPlayers = [...players]
      .map((p) => ({
        ...p,
        score: p.grid.flat().filter(Boolean).length,
      }))
      .sort((a, b) => Number(b.hasWon) - Number(a.hasWon) || b.score - a.score);

    const champion = rankedPlayers[0];

    let sniperName = "Még nincs tipp";
    let sniperDetail = "-";
    let bestAvg = Infinity;
    Object.entries(sessionStats).forEach(([name, st]) => {
      if (st.guessesCount > 0) {
        const avg = st.totalYearDiff / st.guessesCount;
        if (avg < bestAvg) {
          bestAvg = avg;
          sniperName = name;
          sniperDetail = `Átlag ±${avg.toFixed(1)} év (${st.guessesCount} tipp)`;
        }
      }
    });

    let fastestName = "Még senki";
    let fastestDetail = "0 csengetés";
    let maxBuzz = 0;
    Object.entries(sessionStats).forEach(([name, st]) => {
      if (st.buzzerCount > maxBuzz) {
        maxBuzz = st.buzzerCount;
        fastestName = name;
        fastestDetail = `${st.buzzerCount}× első csengetés`;
      }
    });

    let gamblerName = "Még senki";
    let gamblerDetail = "0 kockáztatás";
    let maxRisk = 0;
    Object.entries(sessionStats).forEach(([name, st]) => {
      if (st.riskCount > maxRisk) {
        maxRisk = st.riskCount;
        gamblerName = name;
        gamblerDetail = `${st.riskCount}× Dupla vagy Semmi`;
      }
    });

    return {
      top3: rankedPlayers.slice(0, 3),
      championName: champion?.name || "Házigazda",
      championDetail: `${champion?.score || 0}/25 X ${champion?.hasWon ? "(BINGO!)" : ""}`,
      sniperName,
      sniperDetail,
      fastestName,
      fastestDetail,
      gamblerName,
      gamblerDetail,
    };
  }, [players, sessionStats]);

  return (
    <PinGate>
      {isJoinedAsClient ? (
        /* ==================== MOBIL NÉZET ==================== */
        <main className="min-h-[100dvh] bg-neutral-950 text-white flex flex-col items-center justify-between p-3 sm:p-4 select-none">
          <header className="w-full max-w-sm flex justify-between items-center py-2 border-b border-neutral-800">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <h1 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider">
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
                onClick={lockPinGate}
                className="text-xs text-neutral-500 hover:text-amber-400 p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 transition"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem("hit_player_name");
                  localStorage.removeItem("hit_room_code");
                  localStorage.removeItem("hit_player_grid");
                  localStorage.removeItem("hit_player_notes");
                  localStorage.removeItem("hit_player_credits");
                  localStorage.removeItem("hit_player_debt");
                  setIsJoinedAsClient(false);
                }}
                className="text-xs text-neutral-500 hover:text-rose-400 px-2 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 transition"
              >
                Kilép
              </button>
            </div>
          </header>

          {isRemoteOpen && (
            <div className="w-full max-w-sm bg-neutral-900/95 border-2 border-amber-500/40 rounded-2xl p-3 my-1.5 shadow-2xl flex flex-col gap-2">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-amber-400">
                <span className="flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5" /> Házigazda TV Távirányító
                </span>
                <button
                  onClick={() => sendRemoteCommand("open_podium")}
                  className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/50 text-amber-300 font-bold"
                >
                  🏆 Díjátadó a TV-n
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => sendRemoteCommand("spin")}
                  className="py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-neutral-950 font-black text-xs flex items-center justify-center gap-1.5 active:scale-95 transition"
                >
                  <Disc className="w-3.5 h-3.5" />
                  <span>Rulett Pörgetés</span>
                </button>
                <button
                  onClick={() => sendRemoteCommand("toggle_play")}
                  className="py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-neutral-700 active:scale-95 transition"
                >
                  <Play className="w-3.5 h-3.5 text-amber-400" />
                  <span>Zene / Szünet</span>
                </button>
                <button
                  onClick={() => sendRemoteCommand("flip")}
                  className="py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-neutral-700 active:scale-95 transition"
                >
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Kártya Fordítás</span>
                </button>
                <button
                  onClick={() => sendRemoteCommand("next")}
                  className="py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-neutral-700 active:scale-95 transition"
                >
                  <SkipForward className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Következő Dal</span>
                </button>
              </div>
              <button
                onClick={() => sendRemoteCommand("switch_tab")}
                className="w-full py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-300 text-[11px] font-bold flex items-center justify-center gap-1.5 active:scale-95 transition"
              >
                <Tv className="w-3.5 h-3.5 text-violet-400" />
                <span>TV Nézet Váltása (Táblák ↔ Kártya)</span>
              </button>
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

          {clientRewardBanner && (
            <div className="w-full max-w-sm py-2 px-3 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-300 text-xs font-black text-center animate-bounce">
              {clientRewardBanner}
            </div>
          )}

          <div className="w-full max-w-sm flex flex-col gap-2 my-auto">
            <div className="w-full bg-neutral-900 border-2 border-neutral-800 rounded-2xl p-3 shadow-xl flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
                  🎯 Titkos Tipp a TV-re (Ékezettűrő)
                </span>
                {isGuessLocked && (
                  <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Beküldve!
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 bg-neutral-950 p-1.5 rounded-xl border border-neutral-800">
                <button
                  onClick={() => {
                    setIsGuessLocked(false);
                    setClientGuessYear((y) => Math.max(1950, y - 1));
                  }}
                  className="w-8 h-8 rounded-lg bg-neutral-800 text-white font-black text-base active:scale-90"
                >
                  -
                </button>
                <div className="flex flex-col items-center flex-1">
                  <span className="text-[9px] text-neutral-500 uppercase font-bold">Tippelt Évszám</span>
                  <span className="text-lg font-black font-mono text-amber-400">{clientGuessYear}</span>
                </div>
                <button
                  onClick={() => {
                    setIsGuessLocked(false);
                    setClientGuessYear((y) => Math.min(2026, y + 1));
                  }}
                  className="w-8 h-8 rounded-lg bg-neutral-800 text-white font-black text-base active:scale-90"
                >
                  +
                </button>
              </div>

              <input
                type="range"
                min={absoluteMinYear}
                max={absoluteMaxYear}
                value={clientGuessYear}
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
                  onClick={handleClientSubmitGuess}
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
            </div>

            <div className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-2 flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-1">
                {["🔥", "💃", "🤯", "😂", "🍅"].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => sendClientReaction(emoji)}
                    className="flex-1 py-1.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-lg active:scale-90 transition"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-1">
                <button
                  onClick={() => sendClientReaction("🎺", "airhorn")}
                  className="py-1 px-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-[10px] font-bold text-amber-300 active:scale-95 flex items-center justify-center gap-1"
                >
                  <span>🎺 Duda</span>
                </button>
                <button
                  onClick={() => sendClientReaction("🦗", "crickets")}
                  className="py-1 px-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-[10px] font-bold text-emerald-300 active:scale-95 flex items-center justify-center gap-1"
                >
                  <span>🦗 Tücsök</span>
                </button>
                <button
                  onClick={() => sendClientReaction("📉", "trombone")}
                  className="py-1 px-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-[10px] font-bold text-rose-300 active:scale-95 flex items-center justify-center gap-1"
                >
                  <span>📉 Bukta</span>
                </button>
                <button
                  onClick={() => sendClientReaction("🥁", "drumroll")}
                  className="py-1 px-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-[10px] font-bold text-cyan-300 active:scale-95 flex items-center justify-center gap-1"
                >
                  <span>🥁 Pergés</span>
                </button>
              </div>
            </div>

            <button
              onClick={handleClientBuzzer}
              className="w-full py-2 px-4 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-600/30 active:scale-95 transition flex items-center justify-center gap-2"
            >
              <Bell className="w-4 h-4 fill-current animate-bounce" />
              <span>🔔 TUDOM! (Buzzer megnyomása)</span>
            </button>

            {/* 7. SZIGORÚ KVÍZ MÓD ÁLLAPOTJELZŐ A TÁBLA FELETT */}
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
                    <span className="text-emerald-400 font-black">
                      ✅ {clientCredits} db szabad X lépésed van!
                    </span>
                  ) : (
                    <span className="text-amber-400/90 font-mono text-[10px]">
                      🔒 0 X kredit (Találd el a dalt!)
                    </span>
                  )}
                </div>
              )}

              <div className="grid grid-cols-5 gap-2 w-full bg-neutral-950 p-2 rounded-2xl border border-neutral-800">
                {clientGrid.map((row, r) =>
                  row.map((isMarked, c) => {
                    const tileColors = ["#f59e0b", "#10b981", "#ec4899", "#8b5cf6", "#06b6d4"];
                    return (
                      <button
                        key={`${r}-${c}`}
                        onClick={() => handleClientTileClick(r, c)}
                        className="aspect-square rounded-xl flex items-center justify-center relative shadow select-none active:scale-90 transition overflow-hidden"
                        style={{ backgroundColor: tileColors[(r + c) % tileColors.length] }}
                      >
                        {isMarked && (
                          <span className="font-black text-2xl text-neutral-950 select-none animate-in zoom-in-50 duration-150">
                            ✕
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="w-full bg-neutral-100 rounded-2xl p-2 shadow-inner border border-neutral-300 flex flex-col">
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-[9px] uppercase font-bold text-neutral-600 tracking-wider">
                  Fehértábla (Jegyzetek):
                </span>
                {clientNotes && (
                  <button
                    onClick={() => handleClientNotesChange("")}
                    className="flex items-center gap-1 text-[10px] font-bold text-neutral-500 hover:text-rose-600 transition"
                  >
                    <Eraser className="w-3 h-3 text-rose-500" />
                    <span>Törlés</span>
                  </button>
                )}
              </div>
              <textarea
                value={clientNotes}
                onChange={(e) => handleClientNotesChange(e.target.value)}
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
      ) : (
        /* ==================== TV / LAPTOP FŐOLDAL ==================== */
        <main
          className={`min-h-[100dvh] bg-neutral-950 text-white flex flex-col items-center justify-between p-2.5 sm:p-5 select-none relative overflow-x-hidden transition-all duration-300 ${
            isTvMode ? "w-full max-w-[1920px] mx-auto px-3 sm:px-6" : ""
          }`}
          style={isTvMode && tvScale !== 100 ? { zoom: `${tvScale}%` } : undefined}
        >
          <div
            className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full blur-[150px] opacity-20 pointer-events-none transition-colors duration-700"
            style={{ backgroundColor: currentAccent }}
          />

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
                  <span className="text-4xl sm:text-5xl drop-shadow-[0_6px_15px_rgba(0,0,0,0.8)]">
                    {r.emoji}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-neutral-900/90 text-amber-300 px-2 py-0.5 rounded-full border border-neutral-700 shadow">
                    {r.playerName}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* FEJLÉC */}
          <header className={`w-full flex flex-wrap justify-between items-center py-2.5 border-b border-neutral-800/80 gap-2 z-10 ${
            isTvMode ? "max-w-[1900px]" : "max-w-6xl"
          }`}>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-2xl font-black tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-rose-400 to-violet-500">
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
              </div>
              <p className="text-[9px] sm:text-[10px] text-neutral-500 tracking-wider">A HITSTER PARTI KIADÁS</p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-2xl border border-neutral-800">
                <button
                  onClick={() => setActiveTab("boards")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    activeTab === "boards" ? "bg-amber-500 text-neutral-950 shadow-md" : "text-neutral-400 hover:text-white"
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Táblák</span>
                </button>

                <button
                  onClick={() => setActiveTab("game")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    activeTab === "game" ? "bg-amber-500 text-neutral-950 shadow-md" : "text-neutral-400 hover:text-white"
                  }`}
                >
                  <Disc className="w-3.5 h-3.5" />
                  <span>Rulett & Kártya</span>
                </button>
              </div>

              <button
                onClick={() => setSmartIntroSkip((prev) => !prev)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-2xl border text-xs font-bold transition ${
                  smartIntroSkip
                    ? "bg-amber-500/10 border-amber-500/40 text-amber-400"
                    : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                }`}
                title="Okos Intro (-5s az első dalszöveg előtt)"
              >
                <Zap className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Intro:</span>
                <span>{smartIntroSkip ? "BE" : "KI"}</span>
              </button>

              {/* 7. SZIGORÚ KVÍZ MÓD KAPCSOLÓ */}
              <button
                onClick={toggleStrictQuizModeHost}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-2xl border text-xs font-bold transition ${
                  strictQuizMode
                    ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-300"
                    : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                }`}
                title="Szigorú Kvíz Mód: A játékosok csak helyes tipp után kapnak X lépést a telefonjukra"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Szigorú Kvíz:</span>
                <span>{strictQuizMode ? "BE" : "KI"}</span>
              </button>

              <button
                onClick={toggleDoubleOrNothingHost}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-2xl border text-xs font-bold transition ${
                  doubleOrNothingEnabled
                    ? "bg-purple-500/15 border-purple-500/50 text-purple-300"
                    : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                }`}
                title="Dupla vagy Semmi kockáztatás engedélyezése vagy letiltása"
              >
                <Dices className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Dupla/Semmi:</span>
                <span>{doubleOrNothingEnabled ? "BE" : "KI"}</span>
              </button>

              <button
                onClick={() => setShowFilters((prev) => !prev)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-2xl border text-xs font-bold transition ${
                  showFilters
                    ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300"
                    : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Szűrők</span>
              </button>

              <button
                onClick={toggleFullscreen}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl border text-xs font-bold transition ${
                  isFullscreen
                    ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-300"
                    : "bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white"
                }`}
                title="Teljes Képernyő / Mozimód (F)"
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                <span className="hidden md:inline">{isFullscreen ? "Ablakos" : "Teljes Képernyő"}</span>
              </button>

              {/* 📺 16:9 TV-RE OPTIMALIZÁLT NAGYOBB NÉZET GOMB */}
              <button
                onClick={toggleTvMode}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-xs font-bold transition shadow-sm ${
                  isTvMode
                    ? "bg-gradient-to-r from-amber-500/25 to-emerald-500/20 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.25)]"
                    : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                }`}
                title="16:9 TV-re optimalizált nagyobb nézet (T)"
              >
                <Tv className={`w-3.5 h-3.5 ${isTvMode ? "text-amber-400" : "text-neutral-400"}`} />
                <span>16:9 TV</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${isTvMode ? "bg-amber-400 text-neutral-950" : "bg-neutral-800 text-neutral-400"}`}>
                  {isTvMode ? "BE" : "KI"}
                </span>
              </button>

              {/* 📐 TV ELRENDEZÉS, HÉZAG ÉS MÉRET BEÁLLÍTÓ MENÜ */}
              <div className="relative">
                <button
                  onClick={() => setIsLayoutMenuOpen((prev) => !prev)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-xs font-bold transition shadow-sm ${
                    isLayoutMenuOpen
                      ? "bg-amber-500/20 border-amber-400 text-amber-300"
                      : "bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white"
                  }`}
                  title="TV méretarány, távolság és elemméretek finomhangolása"
                >
                  <MoveHorizontal className="w-3.5 h-3.5 text-amber-400" />
                  <span>Méret & Rés</span>
                </button>

                {isLayoutMenuOpen && (
                  <div className="absolute top-full mt-2 right-0 z-50 bg-neutral-900/95 backdrop-blur-2xl border-2 border-amber-500/40 rounded-3xl p-4 shadow-[0_15px_50px_rgba(0,0,0,0.9)] flex flex-col gap-4 min-w-[290px] sm:min-w-[340px] animate-in fade-in zoom-in-95 duration-150 text-xs">
                    <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                      <div className="flex items-center gap-2">
                        <MoveHorizontal className="w-4 h-4 text-amber-400" />
                        <span className="font-black uppercase tracking-wider text-white">TV Elrendezés & Méret</span>
                      </div>
                      <button
                        onClick={() => setIsLayoutMenuOpen(false)}
                        className="p-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* GYORS SABLONOK */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Gyors Sablonok:</span>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          onClick={() => applyLayoutPreset("cinema")}
                          className="p-2 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-amber-400 text-left transition flex flex-col group"
                        >
                          <strong className="text-amber-300 group-hover:text-amber-200 text-[11px] font-black truncate">🎬 Mozi (Full)</strong>
                          <span className="text-[9px] text-neutral-500">Max méret, szűk rés</span>
                        </button>
                        <button
                          onClick={() => applyLayoutPreset("balanced")}
                          className="p-2 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-amber-400 text-left transition flex flex-col group"
                        >
                          <strong className="text-amber-300 group-hover:text-amber-200 text-[11px] font-black truncate">🎯 Optimális</strong>
                          <span className="text-[9px] text-neutral-500">Kiegyensúlyozott</span>
                        </button>
                        <button
                          onClick={() => applyLayoutPreset("compact")}
                          className="p-2 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-amber-400 text-left transition flex flex-col group"
                        >
                          <strong className="text-amber-300 group-hover:text-amber-200 text-[11px] font-black truncate">⚡ Kompakt</strong>
                          <span className="text-[9px] text-neutral-500">Kisebb méret</span>
                        </button>
                      </div>
                    </div>

                    {/* FINOMHANGOLÓ CSÚSZKÁK */}
                    <div className="flex flex-col gap-3 pt-2 border-t border-neutral-800/80">
                      {/* 1. HÉZAG / TÁVOLSÁG */}
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-neutral-300 font-bold">Köztes Hézag (Rés):</span>
                          <span className="font-mono font-bold text-amber-400">{tvGap} px</span>
                        </div>
                        <input
                          type="range"
                          min="8"
                          max="140"
                          step="4"
                          value={tvGap}
                          onChange={(e) => saveTvLayout(tvWheelSize, tvCardWidth, Number(e.target.value))}
                          className="w-full accent-amber-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
                        />
                        <div className="flex justify-between text-[9px] text-neutral-500">
                          <span>8px (Feszes rés)</span>
                          <span>140px (Tágas)</span>
                        </div>
                      </div>

                      {/* 2. KERÉK MÉRETE */}
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-neutral-300 font-bold">Szerencsekerék Mérete:</span>
                          <span className="font-mono font-bold text-amber-400">{tvWheelSize} px</span>
                        </div>
                        <input
                          type="range"
                          min="400"
                          max="640"
                          step="10"
                          value={tvWheelSize}
                          onChange={(e) => saveTvLayout(Number(e.target.value), tvCardWidth, tvGap)}
                          className="w-full accent-amber-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
                        />
                        <div className="flex justify-between text-[9px] text-neutral-500">
                          <span>400px</span>
                          <span>640px (Óriás)</span>
                        </div>
                      </div>

                      {/* 3. KÁRTYA SZÉLESSÉGE */}
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-neutral-300 font-bold">Zenei Kártya Szélessége:</span>
                          <span className="font-mono font-bold text-amber-400">{tvCardWidth} px</span>
                        </div>
                        <input
                          type="range"
                          min="380"
                          max="560"
                          step="10"
                          value={tvCardWidth}
                          onChange={(e) => saveTvLayout(tvWheelSize, Number(e.target.value), tvGap)}
                          className="w-full accent-amber-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
                        />
                        <div className="flex justify-between text-[9px] text-neutral-500">
                          <span>380px</span>
                          <span>560px (Óriás)</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-neutral-800 flex justify-between items-center">
                      <button
                        onClick={() => applyLayoutPreset("cinema")}
                        className="text-[10px] text-neutral-400 hover:text-amber-300 flex items-center gap-1 transition"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Alaphelyzet (Mozi TV)</span>
                      </button>
                      <button
                        onClick={() => setIsLayoutMenuOpen(false)}
                        className="px-3.5 py-1 rounded-xl bg-amber-500 text-neutral-950 font-black text-xs hover:bg-amber-400 transition"
                      >
                        Kész
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 🔍 %-OS IKON ÉS MÉRET NÖVELŐ (UI ZOOM SCALER) */}
              <div className="relative flex items-center bg-neutral-900 border border-neutral-800 rounded-2xl p-0.5 shadow-sm">
                <button
                  onClick={() => adjustScale(-10)}
                  disabled={tvScale <= 90}
                  className="px-2 py-1 text-xs font-black text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 rounded-xl transition"
                  title="Kisebb nézet (-10%)"
                >
                  -
                </button>

                <button
                  onClick={() => setIsScaleDropdownOpen((prev) => !prev)}
                  className="px-2.5 py-1 text-xs font-black font-mono text-amber-400 hover:text-amber-300 transition flex items-center gap-1"
                  title="Kattints a méretarány gyors beállításához"
                >
                  <span>{tvScale}%</span>
                </button>

                <button
                  onClick={() => adjustScale(10)}
                  disabled={tvScale >= 160}
                  className="px-2 py-1 text-xs font-black text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 rounded-xl transition"
                  title="Nagyobb nézet (+10%)"
                >
                  +
                </button>

                {isScaleDropdownOpen && (
                  <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 bg-neutral-900/95 backdrop-blur-xl border-2 border-amber-500/40 rounded-2xl p-2 shadow-2xl flex flex-col gap-1 min-w-[130px] animate-in fade-in zoom-in-95 duration-150">
                    <div className="text-[10px] uppercase font-black text-amber-400 px-2 py-0.5 border-b border-neutral-800">
                      TV Méretarány
                    </div>
                    {[100, 115, 125, 140, 155].map((s) => (
                      <button
                        key={s}
                        onClick={() => setSpecificScale(s)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold text-left transition flex items-center justify-between ${
                          tvScale === s ? "bg-amber-500 text-neutral-950 font-black shadow" : "text-neutral-300 hover:bg-neutral-800"
                        }`}
                      >
                        <span>{s}%</span>
                        {s === 125 && <span className="text-[9px] opacity-75 font-normal">(Ajánlott TV)</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={handleCreateRoom}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-gradient-to-r from-violet-600 to-rose-600 text-white text-xs font-bold shadow-lg hover:scale-105 active:scale-95 transition"
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

              <button
                onClick={handleOpenPodium}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 text-neutral-950 text-xs font-black shadow-lg hover:scale-105 active:scale-95 transition"
              >
                <Trophy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Díjátadó</span>
              </button>

              <button
                onClick={lockPinGate}
                className="p-2 rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-rose-400 hover:border-rose-500/40 text-xs font-bold transition shadow active:scale-95"
                title="PIN Zárolás"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-xl border border-neutral-800">
                <Timer className="w-3.5 h-3.5 text-amber-400 ml-1 mr-0.5" />
                {TIME_OPTIONS.map((sec) => (
                  <button
                    key={sec}
                    onClick={() => handleDurationChange(sec)}
                    className={`px-2 py-0.5 rounded-lg font-bold transition text-[11px] ${
                      selectedDuration === sec
                        ? "bg-amber-500 text-neutral-950 shadow"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    {sec === 0 ? "∞" : `${sec}s`}
                  </button>
                ))}
              </div>
              <span className="text-amber-400 font-bold px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 min-w-10 text-center">
                {selectedDuration === 0 ? "∞" : `${timeLeft}s`}
              </span>
            </div>
          </header>

          {/* ÖSSZECSUKHATÓ SZŰRŐSÁV */}
          {showFilters && (
            <div className={`w-full flex flex-col gap-2 py-2 px-3 bg-neutral-900/50 border border-neutral-800/80 rounded-2xl my-1.5 backdrop-blur-md z-10 ${
              isTvMode ? "max-w-[1900px]" : "max-w-6xl"
            }`}>
              <div className="w-full flex flex-wrap justify-between items-center gap-2 text-xs">
                <div className="flex items-center gap-1 bg-neutral-900/90 p-1 rounded-xl border border-neutral-800">
                  <Music2 className="w-3.5 h-3.5 text-amber-400 ml-1.5" />
                  <button
                    onClick={() => setMusicFilter("all")}
                    className={`px-2.5 py-1 rounded-lg font-bold transition text-[11px] ${
                      musicFilter === "all" ? "bg-amber-500 text-neutral-950 shadow" : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    🎲 Vegyes
                  </button>
                  <button
                    onClick={() => setMusicFilter("hungarian")}
                    className={`px-2.5 py-1 rounded-lg font-bold transition text-[11px] ${
                      musicFilter === "hungarian" ? "bg-emerald-500 text-neutral-950 shadow" : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    🇭🇺 Magyar
                  </button>
                  <button
                    onClick={() => setMusicFilter("international")}
                    className={`px-2.5 py-1 rounded-lg font-bold transition text-[11px] ${
                      musicFilter === "international" ? "bg-cyan-500 text-neutral-950 shadow" : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    🌍 Nemzetközi
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-1">
                  {[
                    { label: "Összes", min: absoluteMinYear, max: absoluteMaxYear },
                    { label: "80-as", min: 1980, max: 1989 },
                    { label: "90-es", min: 1990, max: 1999 },
                    { label: "2000-es", min: 2000, max: 2009 },
                    { label: "2010+", min: 2010, max: absoluteMaxYear },
                  ].map((era) => {
                    const activeEra = minYear === era.min && maxYear === era.max;
                    return (
                      <button
                        key={era.label}
                        onClick={() => {
                          setMinYear(era.min);
                          setMaxYear(era.max);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                          activeEra
                            ? "bg-violet-600 border-violet-400 text-white shadow"
                            : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                        }`}
                      >
                        {era.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-neutral-900/90 border border-neutral-800 text-[11px] font-mono text-amber-400 font-bold">
                    <Shuffle className="w-3 h-3 text-amber-400" />
                    <span>{playedIds.length}/{filteredTracks.length} dal</span>
                  </span>
                </div>
              </div>

              <div className="w-full flex flex-wrap items-center justify-between gap-3 pt-1.5 border-t border-neutral-800/60">
                <div className="flex items-center gap-3 flex-1 min-w-[260px]">
                  <CalendarRange className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-[10px] font-mono text-cyan-300 font-bold w-8">{minYear}</span>
                    <input
                      type="range"
                      min={absoluteMinYear}
                      max={maxYear}
                      value={minYear}
                      onChange={(e) => setMinYear(Math.min(Number(e.target.value), maxYear))}
                      className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="range"
                      min={minYear}
                      max={absoluteMaxYear}
                      value={maxYear}
                      onChange={(e) => setMaxYear(Math.max(Number(e.target.value), minYear))}
                      className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-rose-400"
                    />
                    <span className="text-[10px] font-mono text-rose-300 font-bold w-8">{maxYear}</span>
                  </div>
                </div>

                {!isWideOpenYears && (
                  <button
                    onClick={() => {
                      setMinYear(absoluteMinYear);
                      setMaxYear(absoluteMaxYear);
                    }}
                    className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-300 text-[11px] font-bold transition"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 4. FŐ LEJÁTSZÓ HIBAKEZELÉSSEL + MÁSODLAGOS REJTETT PRELOAD LEJÁTSZÓ */}
          <audio
            ref={audioRef}
            src={currentTrack?.audioUrl}
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
            }}
            onError={() => {
              console.warn("Hiba az audió betöltésekor, automatikus ugrás a következő dalra:", currentTrack?.id);
              handleNextTrack();
            }}
          />

          {nextPreloadTrack && nextPreloadTrack.id !== currentTrack?.id && (
            <audio preload="auto" src={nextPreloadTrack.audioUrl} className="hidden" />
          )}

          {autoPlayCountdown !== null && (
            <div className="fixed top-20 z-50 flex items-center gap-3 px-6 py-2.5 rounded-full bg-amber-500 text-neutral-950 font-black shadow-2xl animate-bounce">
              <Sparkles className="w-5 h-5 fill-current" />
              <span>Feladvány rögzítve! Zene indul: {autoPlayCountdown} mp...</span>
            </div>
          )}

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
              <button
                onClick={() => setBuzzedPlayer(null)}
                className="ml-1 p-1 rounded-lg bg-black/30 hover:bg-black/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* FŐ TARTALOM */}
          <div className="w-full flex flex-col items-center my-auto py-2 z-10">
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

              {!isFlipped && guessList.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-neutral-900/90 border border-emerald-500/40 text-xs">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-bold text-neutral-300">Tippelt:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {guessList.map((g) => (
                      <span
                        key={g.playerName}
                        className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-black text-[11px] flex items-center gap-1"
                      >
                        <span>{g.playerName} ✓</span>
                        {g.riskDouble && (
                          <span className="text-amber-300 font-extrabold" title="Dupla vagy Semmit kockáztatott!">
                            🎲2x
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {isFlipped && evaluatedGuesses.length > 0 && (
              <div className="w-full max-w-3xl bg-neutral-900/95 border-2 border-amber-400 rounded-3xl p-4 mb-4 shadow-[0_0_50px_rgba(245,158,11,0.25)] animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-amber-300">
                      Kör Kiértékelés • Helyes évszám: {currentTrack?.year}
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-neutral-400">
                    {currentTrack?.artist} – {currentTrack?.title}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {evaluatedGuesses.map((g, idx) => {
                    const isExact = g.yearDiff === 0;
                    const isClose2 = g.yearDiff > 0 && g.yearDiff <= 2;
                    const isClose5 = g.yearDiff > 2 && g.yearDiff <= 5;

                    return (
                      <div
                        key={g.playerName}
                        className={`flex items-center justify-between p-2.5 rounded-2xl border ${
                          isExact || g.earnedCredits > 0
                            ? "bg-amber-500/20 border-amber-400 text-amber-200"
                            : isClose2
                            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-200"
                            : isClose5
                            ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-200"
                            : "bg-neutral-950 border-neutral-800 text-neutral-400"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {isExact ? "🥇" : isClose2 ? "🥈" : isClose5 ? "🥉" : "❌"}
                          </span>
                          <div>
                            <div className="font-black text-xs uppercase text-white flex items-center gap-1.5 flex-wrap">
                              <span>
                                {idx + 1}. {g.playerName}
                              </span>
                              {g.riskDouble ? (
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                                    g.wonDouble ? "bg-amber-400 text-neutral-950" : "bg-rose-600 text-white"
                                  }`}
                                >
                                  {g.wonDouble ? "🎰 DUPLA (+2 X)" : "💀 BUKTA (-1 X)"}
                                </span>
                              ) : (
                                g.earnedCredits > 0 && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-neutral-950 text-[9px] font-black">
                                    +{g.earnedCredits} X KREDIT
                                  </span>
                                )
                              )}
                            </div>
                            {g.text && (
                              <div className="text-[10px] text-neutral-300">
                                Tipp: „{g.text}”{" "}
                                {(g.titleMatch || g.artistMatch) && (
                                  <span className="text-emerald-400 font-bold">(Fuzzy Találat! 🎯)</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="text-right font-mono">
                            <div className="text-sm font-black">{g.year}</div>
                            <div className="text-[10px] font-bold">
                              {isExact ? "TELITALÁLAT!" : `±${g.yearDiff} év`}
                            </div>
                          </div>
                          {strictQuizMode && (
                            <button
                              onClick={() => grantManualCreditToPlayer(g.playerName)}
                              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-emerald-500 hover:text-neutral-950 text-emerald-400 transition text-[10px] font-black"
                              title="Plusz 1 X lépés küldése a játékos telefonjára"
                            >
                              +1 X
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === "boards" ? (
              <PlayerBoard
                players={players}
                setPlayers={setPlayers}
                activePlayerIdx={activePlayerIdx}
                setActivePlayerIdx={setActivePlayerIdx}
                onStartSpinAndMusic={() => remoteHandlersRef.current.spin()}
                isPlayingMusic={isPlaying}
                activeCategory={activeCategory}
                tvMode={isTvMode}
                tvScale={tvScale}
              />
            ) : (
              <div className={`w-full flex flex-col items-center gap-6 ${isTvMode ? "max-w-[1900px]" : "max-w-5xl"}`}>
                <div
                  className={`w-full ${
                    isTvMode
                      ? "flex flex-col xl:flex-row items-center justify-center relative"
                      : "grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-center justify-items-center"
                  }`}
                  style={isTvMode ? { gap: `${tvGap}px` } : undefined}
                >
                  {/* BAL OLDAL: SZERENCSEKERÉK PANEL */}
                  <div
                    className={`relative flex flex-col items-center justify-center p-5 rounded-3xl bg-neutral-900/40 border border-neutral-800/60 backdrop-blur-md shadow-2xl transition-all duration-200 group ${
                      isTvMode ? "" : "w-full max-w-md"
                    }`}
                    style={isTvMode ? { width: `${tvWheelSize + 50}px`, maxWidth: "100%" } : undefined}
                  >
                    {/* BAL OLDALI HÚZHATÓ ÁTMÉRETEZŐ ÉS GYORSGOMBOK */}
                    {isTvMode && (
                      <div
                        className="hidden xl:flex absolute -left-3 top-1/2 -translate-y-1/2 flex-col items-center justify-center py-4 px-1 group cursor-ew-resize select-none z-30"
                        title="Húzd balra/jobbra a kerék méretének állításához!"
                        onMouseDown={handleStartDragWheel}
                      >
                        <div className="w-1.5 h-28 rounded-full bg-neutral-800 group-hover:bg-amber-400 group-hover:shadow-[0_0_12px_rgba(251,191,36,0.9)] transition-all" />
                        <div className="absolute opacity-0 group-hover:opacity-100 transition-all pointer-events-auto -left-16 flex items-center gap-1 bg-neutral-900/95 border border-neutral-700 px-2 py-0.5 rounded-full shadow-2xl text-[10px] font-mono text-amber-300">
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
                      tvMode={isTvMode}
                      tvScale={tvScale}
                      customWheelSize={isTvMode ? tvWheelSize : undefined}
                    />
                  </div>

                  {/* KÖZTES INTERAKTÍV HÚZHATÓ ELVÁLASZTÓ (DRAGGABLE RESIZER & GAP ADJUSTER) */}
                  {isTvMode && (
                    <div
                      className="hidden xl:flex flex-col items-center justify-center relative select-none py-8 px-2 group cursor-col-resize z-20 shrink-0"
                      title="Húzd az elemek közti távolság (rés) állításához!"
                      onMouseDown={handleStartDragGap}
                      onTouchStart={handleStartTouchDragGap}
                    >
                      <div className="w-1.5 h-44 rounded-full bg-neutral-800/80 group-hover:bg-amber-400 group-hover:shadow-[0_0_15px_rgba(251,191,36,0.9)] transition-all duration-200" />
                      <div className="absolute top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-neutral-900 border-2 border-neutral-700 group-hover:border-amber-400 group-hover:scale-115 flex items-center justify-center shadow-2xl text-neutral-400 group-hover:text-amber-300 transition-all">
                        <MoveHorizontal className="w-4 h-4" />
                      </div>

                      {/* Mini lebegő vezérlő hover esetén */}
                      <div className="absolute -bottom-7 opacity-0 group-hover:opacity-100 transition-all pointer-events-auto flex items-center gap-1.5 bg-neutral-900/95 border border-neutral-700 px-2.5 py-0.5 rounded-full shadow-2xl text-[10px] font-mono whitespace-nowrap text-amber-300">
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
                  )}

                  {/* JOBB OLDAL: ZENEI KÁRTYA */}
                  <div
                    className={`relative flex flex-col items-center justify-center group ${
                      isTvMode ? "" : "w-full max-w-sm"
                    }`}
                    style={isTvMode ? { width: `${tvCardWidth}px`, maxWidth: "100%" } : undefined}
                  >
                    {filteredTracks.length > 0 ? (
                      <MusicCard
                        track={currentTrack}
                        isFlipped={isFlipped}
                        onFlip={handleFlipAndShow}
                        highlight={guessTarget}
                        currentTime={currentTime}
                        onSeek={handleSeek}
                        isPlaying={isPlaying}
                        accentColor={currentAccent}
                        tvMode={isTvMode}
                        tvScale={tvScale}
                        customCardWidth={isTvMode ? tvCardWidth : undefined}
                      />
                    ) : (
                      <div className="w-80 h-96 rounded-3xl border-2 border-dashed border-neutral-800 flex flex-col items-center justify-center p-6 text-center text-neutral-500 gap-3">
                        <CalendarRange className="w-12 h-12 text-neutral-700" />
                        <p className="text-sm font-bold text-neutral-300">Nincs dal ebben a szűrésben!</p>
                      </div>
                    )}

                    {/* JOBB OLDALI HÚZHATÓ ÁTMÉRETEZŐ ÉS GYORSGOMBOK */}
                    {isTvMode && (
                      <div
                        className="hidden xl:flex absolute -right-3 top-1/2 -translate-y-1/2 flex-col items-center justify-center py-4 px-1 group cursor-ew-resize select-none z-30"
                        title="Húzd balra/jobbra a kártya méretének állításához!"
                        onMouseDown={handleStartDragCard}
                      >
                        <div className="w-1.5 h-28 rounded-full bg-neutral-800 group-hover:bg-amber-400 group-hover:shadow-[0_0_12px_rgba(251,191,36,0.9)] transition-all" />
                        <div className="absolute opacity-0 group-hover:opacity-100 transition-all pointer-events-auto -right-16 flex items-center gap-1 bg-neutral-900/95 border border-neutral-700 px-2 py-0.5 rounded-full shadow-2xl text-[10px] font-mono text-amber-300">
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
              </div>
            )}
          </div>

          <div className="w-full flex flex-col items-center z-10">
            <NeonEqualizerBar isPlaying={isPlaying} accentColor={currentAccent} />

            <footer className="relative overflow-hidden w-full max-w-lg bg-neutral-900/90 backdrop-blur-xl border border-neutral-800 rounded-3xl p-3 flex items-center justify-between shadow-2xl mb-1">
              {selectedDuration > 0 && isPlaying && (
                <div
                  className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-amber-400 via-rose-500 to-violet-500 transition-all duration-1000"
                  style={{ width: `${progressPercent}%` }}
                />
              )}

              <button
                onClick={handlePlayToggle}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs sm:text-sm tracking-wide transition shadow-lg shadow-amber-500/20 active:scale-95"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                <span>{isPlaying ? "Szünet (P)" : "Zene (P)"}</span>
              </button>

              {activeTab === "game" && (
                <button
                  onClick={handleFlipAndShow}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs sm:text-sm border border-neutral-700 transition active:scale-95 shadow-md"
                >
                  <Eye className="w-4 h-4 text-amber-400" />
                  <span>{isFlipped ? "Elrejtés" : "Megfordítás (Space)"}</span>
                </button>
              )}

              <button
                onClick={handleNextTrack}
                className="px-3.5 py-2.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition active:scale-95 flex items-center gap-1.5 text-xs font-bold"
              >
                <Shuffle className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Következő</span>
                <SkipForward className="w-4 h-4" />
              </button>
            </footer>
          </div>

          {/* 🏆 PARTI ZÁRÓKÉPERNYŐ & DÍJÁTADÓ MODAL */}
          {isPodiumOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg overflow-y-auto">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full max-w-3xl bg-neutral-900 border-2 border-amber-400/80 rounded-[36px] p-6 sm:p-8 shadow-[0_0_80px_rgba(245,158,11,0.3)] flex flex-col items-center gap-6 text-center my-auto"
              >
                <div className="w-full flex justify-between items-center border-b border-neutral-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <Trophy className="w-7 h-7 text-amber-400" />
                    <div className="text-left">
                      <h2 className="text-lg sm:text-2xl font-black uppercase tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-rose-300 to-white">
                        Hit-Roulette Díjátadó & Dobogó
                      </h2>
                      <p className="text-xs text-neutral-400">Az este hivatalos végeredménye és különdíjai</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsPodiumOpen(false)}
                    className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3 items-end pt-2">
                  {podiumData.top3.map((p, idx) => {
                    const medals = ["🥇 1. HELY", "🥈 2. HELY", "🥉 3. HELY"];
                    const styles = [
                      "bg-gradient-to-b from-amber-500/25 to-neutral-950 border-amber-400 sm:h-44",
                      "bg-gradient-to-b from-slate-400/20 to-neutral-950 border-slate-400 sm:h-36",
                      "bg-gradient-to-b from-orange-700/20 to-neutral-950 border-orange-500 sm:h-32",
                    ];
                    return (
                      <div
                        key={p.id}
                        className={`rounded-3xl border-2 p-4 flex flex-col items-center justify-center gap-1.5 shadow-xl ${styles[idx]}`}
                      >
                        <span className="text-xs font-black uppercase tracking-widest text-amber-300">
                          {medals[idx]}
                        </span>
                        <span className="text-lg font-black text-white uppercase truncate max-w-full">
                          {p.name}
                        </span>
                        <span className="text-xs font-mono font-bold px-3 py-0.5 rounded-full bg-neutral-900 border border-neutral-700 text-neutral-200">
                          {p.score} / 25 X {p.hasWon ? "🏆 BINGO" : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                  <div className="p-4 rounded-2xl bg-neutral-950 border border-amber-500/40 flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-2xl shrink-0">
                      👑
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                        Az Este Bajnoka
                      </span>
                      <h4 className="text-base font-black text-white uppercase">{podiumData.championName}</h4>
                      <p className="text-xs text-neutral-400 font-mono">{podiumData.championDetail}</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950 border border-emerald-500/40 flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-2xl shrink-0">
                      🎯
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                        Az Élő Lexikon (Sniper)
                      </span>
                      <h4 className="text-base font-black text-white uppercase">{podiumData.sniperName}</h4>
                      <p className="text-xs text-neutral-400 font-mono">{podiumData.sniperDetail}</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950 border border-rose-500/40 flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-2xl shrink-0">
                      ⚡
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">
                        A Leggyorsabb Kezű (Buzzer)
                      </span>
                      <h4 className="text-base font-black text-white uppercase">{podiumData.fastestName}</h4>
                      <p className="text-xs text-neutral-400 font-mono">{podiumData.fastestDetail}</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950 border border-purple-500/40 flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-2xl shrink-0">
                      🎲
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-purple-400">
                        A Legnagyobb Szerencsejátékos
                      </span>
                      <h4 className="text-base font-black text-white uppercase">{podiumData.gamblerName}</h4>
                      <p className="text-xs text-neutral-400 font-mono">{podiumData.gamblerDetail}</p>
                    </div>
                  </div>
                </div>

                <div className="w-full flex justify-between items-center pt-2">
                  <button
                    onClick={() => playPartySoundEffect("airhorn")}
                    className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>🎺 Győzelmi Duda</span>
                  </button>

                  <button
                    onClick={() => setIsPodiumOpen(false)}
                    className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs uppercase tracking-wider transition shadow-lg"
                  >
                    Folytatás / Bezárás
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {/* TV QR KÓD MODAL + ÚJ PARTI RESET GOMBBAL */}
          {isHostModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
              <div className="w-full max-w-sm bg-neutral-900 border-2 border-neutral-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center gap-4 text-center">
                <div className="w-full flex justify-between items-center">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4" /> Mobil Csatlakozás
                  </span>
                  <button onClick={() => setIsHostModalOpen(false)} className="text-neutral-500 hover:text-white p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div>
                  <p className="text-[11px] text-neutral-400 mb-1">Olvassátok be a telefon kamerájával:</p>
                  <h2 className="text-3xl font-black tracking-widest text-white font-mono bg-neutral-950 py-1 px-4 rounded-xl border border-neutral-800 inline-block">
                    {roomCode}
                  </h2>
                </div>

                <div className="p-3 bg-neutral-950 rounded-2xl border border-neutral-800 shadow-inner">
                  <img src={qrCodeImageUrl} alt="Room QR Code" className="w-48 h-48 rounded-lg" />
                </div>

                <div className="w-full bg-neutral-950 p-2.5 rounded-xl border border-neutral-800 flex flex-col gap-1">
                  <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                    <Users className="w-3 h-3 text-cyan-400" /> Csatlakozott játékosok ({onlinePlayers.length}):
                  </span>
                  {onlinePlayers.length === 0 ? (
                    <span className="text-xs text-neutral-600 italic">Még senki nem csatlakozott...</span>
                  ) : (
                    <div className="flex flex-wrap justify-center gap-1.5 pt-1">
                      {onlinePlayers.map((p) => (
                        <span key={p.id} className="text-xs font-bold px-2 py-0.5 rounded-md bg-neutral-900 border border-neutral-700 text-amber-400">
                          📱 {p.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleResetHostSession}
                  className="w-full py-2 px-3 rounded-xl bg-neutral-950 hover:bg-rose-950/40 border border-neutral-800 hover:border-rose-500/40 text-neutral-400 hover:text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Új Szobakód & Táblák Nullázása</span>
                </button>
              </div>
            </div>
          )}

          {/* JÁTÉKOS BELÉPŐ MODAL */}
          {isJoinModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
              <div className="w-full max-w-xs bg-neutral-900 border-2 border-neutral-800 rounded-3xl p-5 shadow-2xl flex flex-col items-center gap-4 text-center">
                <Smartphone className="w-8 h-8 text-amber-400" />
                <div>
                  <h3 className="text-base font-black text-white uppercase">Csatlakozás a partihoz</h3>
                  <p className="text-xs text-amber-400 font-mono mt-0.5">Szobaszám: {roomCode}</p>
                </div>

                <input
                  type="text"
                  placeholder="Add meg a neved (pl. Sajt)"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 text-center font-bold"
                />

                <button
                  onClick={handleJoinGame}
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-sm uppercase tracking-wider transition shadow-lg shadow-amber-500/20"
                >
                  Belépés a játékba
                </button>
              </div>
            </div>
          )}
        </main>
      )}
    </PinGate>
  );
}