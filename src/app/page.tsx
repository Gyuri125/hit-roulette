"use client";

import React, { useState, useEffect, useRef } from "react";
import tracksData from "../data/tracks.json";
import { MusicCard, GuessTarget } from "../components/MusicCard";
import { RouletteWheel, Category } from "../components/RouletteWheel";
import { PlayerBoard, PlayerData, createEmptyGrid, checkBingo } from "../components/PlayerBoard";
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
  Trophy
} from "lucide-react";
import confetti from "canvas-confetti";

const TIME_OPTIONS = [15, 30, 45, 60, 0];
type MusicFilter = "all" | "hungarian" | "international";

interface PlayerGuess {
  playerName: string;
  year: number;
  text: string;
  submittedAt: number;
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

const playBuzzerSound = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
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
  const [isGuessLocked, setIsGuessLocked] = useState<boolean>(false);

  // TV-n beérkezett Kahoot tippek az adott körben
  const [roundGuesses, setRoundGuesses] = useState<Record<string, PlayerGuess>>({});

  const channelRef = useRef<any>(null);
  const activeCategoryRef = useRef<Category | null>(null);
  const remoteHandlersRef = useRef<{
    playToggle: () => void;
    flip: () => void;
    next: () => void;
    spin: () => void;
    switchTab: () => void;
  }>({
    playToggle: () => {},
    flip: () => {},
    next: () => {},
    spin: () => {},
    switchTab: () => {},
  });

  useEffect(() => {
    activeCategoryRef.current = activeCategory;
  }, [activeCategory]);

  const currentTrack = filteredTracks[currentIndex] || allTracks[0];
  const currentAccent = activeCategory?.accent || "#f59e0b";

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

  const pickNextRandomIndex = (pool: Track[], currentId?: string | number): number => {
    if (!pool.length) return 0;
    if (pool.length === 1) return 0;

    let unplayed = pool.filter((t) => !playedIds.includes(t.id));
    if (unplayed.length === 0) {
      unplayed = pool;
      setPlayedIds(currentId !== undefined ? [currentId] : []);
    }

    const candidates = unplayed.filter((t) => t.id !== currentId);
    const chosen = (candidates.length > 0 ? candidates : unplayed)[
      Math.floor(Math.random() * (candidates.length > 0 ? candidates.length : unplayed.length))
    ];

    setPlayedIds((prev) => [...prev, chosen.id]);
    const chosenIdx = pool.findIndex((t) => t.id === chosen.id);
    return chosenIdx !== -1 ? chosenIdx : 0;
  };

  useEffect(() => {
    if (filteredTracks.length > 0) {
      const rndIdx = Math.floor(Math.random() * filteredTracks.length);
      setCurrentIndex(rndIdx);
      setPlayedIds([filteredTracks[rndIdx].id]);
      handleStop(true);
      setIsFlipped(false);
    }
  }, [musicFilter, minYear, maxYear]);

  // Mobil cache visszatöltése
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedName = localStorage.getItem("hit_player_name");
      const savedRoom = localStorage.getItem("hit_room_code");
      const savedGrid = localStorage.getItem("hit_player_grid");
      const savedNotes = localStorage.getItem("hit_player_notes");

      const params = new URLSearchParams(window.location.search);
      const urlRoom = params.get("room");

      if (urlRoom) {
        setRoomCode(urlRoom.toUpperCase());
        if (savedName) setPlayerName(savedName);
        setIsJoinModalOpen(true);
      } else if (savedRoom && savedName) {
        setRoomCode(savedRoom);
        setPlayerName(savedName);
        if (savedGrid) {
          try { setClientGrid(JSON.parse(savedGrid)); } catch (_) {}
        }
        if (savedNotes) setClientNotes(savedNotes);
        setIsJoinedAsClient(true);
      }
    }
  }, []);

  const handleCreateRoom = () => {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    setRoomCode(code);
    setIsHostModalOpen(true);
  };

  // Realtime Supabase Broadcast
  useEffect(() => {
    if (!roomCode) return;

    const channel = supabase.channel(`room_${roomCode}`, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

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

      if (!isJoinedAsClient && activeCategoryRef.current) {
        channel.send({
          type: "broadcast",
          event: "game_state",
          payload: { activeCategory: activeCategoryRef.current, targetType: activeCategoryRef.current.targetType },
        });
      }
    });

    channel.on("broadcast", { event: "game_state" }, ({ payload }) => {
      if (payload.activeCategory) {
        setActiveCategory(payload.activeCategory);
        setGuessTarget(payload.targetType || payload.activeCategory.targetType);
      }
      if (payload.resetRound) {
        setIsGuessLocked(false);
        setClientGuessText("");
      }
    });

    channel.on("broadcast", { event: "buzzer_ring" }, ({ payload }) => {
      if (!isJoinedAsClient && payload?.playerName) {
        setBuzzedPlayer((prev) => prev || payload.playerName);
        playBuzzerSound();
        remoteHandlersRef.current.playToggle();
      }
    });

    // Kahoot Vak Tipp fogadása a TV-n
    channel.on("broadcast", { event: "submit_guess" }, ({ payload }) => {
      if (!isJoinedAsClient && payload?.playerName) {
        setRoundGuesses((prev) => ({
          ...prev,
          [payload.playerName]: {
            playerName: payload.playerName,
            year: Number(payload.year),
            text: String(payload.text || "").trim(),
            submittedAt: Date.now(),
          },
        }));
      }
    });

    // Mobil Házigazda Távirányító parancsok fogadása a TV-n
    channel.on("broadcast", { event: "remote_control" }, ({ payload }) => {
      if (isJoinedAsClient) return;
      const cmd = payload?.command;
      if (cmd === "toggle_play") remoteHandlersRef.current.playToggle();
      if (cmd === "flip") remoteHandlersRef.current.flip();
      if (cmd === "next") remoteHandlersRef.current.next();
      if (cmd === "spin") remoteHandlersRef.current.spin();
      if (cmd === "switch_tab") remoteHandlersRef.current.switchTab();
    });

    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomCode, isJoinedAsClient]);

  const sendRemoteCommand = (command: "toggle_play" | "flip" | "next" | "spin" | "switch_tab") => {
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

  const handleClientTileClick = (r: number, c: number) => {
    const willBeMarked = !clientGrid[r][c];

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
        payload: { activeCategory: cat, targetType: cat.targetType, resetRound: true },
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

  const handleFlipAndShow = () => {
    const nextFlipped = !isFlipped;
    setIsFlipped(nextFlipped);
    if (nextFlipped) {
      handleStop(false);
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
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

  const handleNextTrack = () => {
    setIsFlipped(false);
    setBuzzedPlayer(null);
    setRoundGuesses({});
    handleStop(true);
    setAutoPlayCountdown(null);
    setTimeLeft(selectedDuration);

    const nextIdx = pickNextRandomIndex(filteredTracks, currentTrack?.id);
    setCurrentIndex(nextIdx);

    if (audioRef.current) {
      const nextTrack = filteredTracks[nextIdx];
      const smartStart = smartIntroSkip ? getSmartStartTime(nextTrack?.lyrics) : 0;
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
          resetRound: true,
        },
      });
    }
  };

  // Remote Handler referenciák frissítése
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
  const guessList = Object.values(roundGuesses);

  // Kahoot Rangsor Kiértékelése
  const evaluatedGuesses = React.useMemo(() => {
    if (!currentTrack) return [];
    return guessList
      .map((g) => {
        const yearDiff = Math.abs(g.year - currentTrack.year);
        const normText = g.text.toLowerCase();
        const titleMatch =
          normText.length >= 3 &&
          (currentTrack.title.toLowerCase().includes(normText) ||
            normText.includes(currentTrack.title.toLowerCase()));
        const artistMatch =
          normText.length >= 3 &&
          (currentTrack.artist.toLowerCase().includes(normText) ||
            normText.includes(currentTrack.artist.toLowerCase()));

        return {
          ...g,
          yearDiff,
          titleMatch,
          artistMatch,
        };
      })
      .sort((a, b) => a.yearDiff - b.yearDiff || a.submittedAt - b.submittedAt);
  }, [guessList, currentTrack]);

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
              </div>
              <p className="text-[10px] text-neutral-500 font-mono">
                SZOBA: {roomCode} • PONT: {clientGrid.flat().filter(Boolean).length}/25
              </p>
            </div>
            
            <div className="flex items-center gap-1.5">
              {/* 👑 MOBIL HÁZIGAZDA TÁVIRÁNYÍTÓ KAPCSOLÓ */}
              <button
                onClick={() => setIsRemoteOpen((prev) => !prev)}
                className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg border transition ${
                  isRemoteOpen
                    ? "bg-amber-500 text-neutral-950 border-amber-400 shadow-lg"
                    : "bg-neutral-900 text-amber-400 border-neutral-800"
                }`}
                title="TV Távirányító megnyitása"
              >
                <Crown className="w-3.5 h-3.5" />
                <span>TV Vezérlő</span>
              </button>

              <button
                onClick={lockPinGate}
                className="text-xs text-neutral-500 hover:text-amber-400 p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 transition"
                title="PIN zárolás"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  localStorage.clear();
                  setIsJoinedAsClient(false);
                }}
                className="text-xs text-neutral-500 hover:text-rose-400 px-2 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 transition"
              >
                Kilép
              </button>
            </div>
          </header>

          {/* 👑 LENYITHATÓ MOBIL HÁZIGAZDA TÁVIRÁNYÍTÓ PANEL */}
          {isRemoteOpen && (
            <div className="w-full max-w-sm bg-neutral-900/95 border-2 border-amber-500/40 rounded-2xl p-3 my-1.5 shadow-2xl flex flex-col gap-2">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-amber-400">
                <span className="flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5" /> Házigazda TV Távirányító
                </span>
                <span className="text-neutral-500">Élő vezérlés</span>
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

          <div className="w-full max-w-sm flex flex-col gap-2.5 my-auto">
            {/* 🎯 KAHOOT STÍLUSÚ VAK TIPPELŐ PANEL */}
            <div className="w-full bg-neutral-900 border-2 border-neutral-800 rounded-2xl p-3 shadow-xl flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
                  🎯 Titkos Tipp Beküldése a TV-re
                </span>
                {isGuessLocked && (
                  <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Beküldve!
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 bg-neutral-950 p-2 rounded-xl border border-neutral-800">
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
                  <span className="text-xl font-black font-mono text-amber-400">{clientGuessYear}</span>
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

              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={clientGuessText}
                  onChange={(e) => {
                    setIsGuessLocked(false);
                    setClientGuessText(e.target.value);
                  }}
                  placeholder="Előadó / Dalcím tipp (opcionális)..."
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

            {/* MOBIL GYORSASÁGI BUZZER GOMB */}
            <button
              onClick={handleClientBuzzer}
              className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-600/30 active:scale-95 transition flex items-center justify-center gap-2"
            >
              <Bell className="w-4 h-4 fill-current animate-bounce" />
              <span>🔔 TUDOM! (Buzzer megnyomása)</span>
            </button>

            <div className="bg-neutral-900 border-2 border-neutral-800 rounded-3xl p-2.5 shadow-2xl">
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

            <div className="w-full bg-neutral-100 rounded-2xl p-2.5 shadow-inner border border-neutral-300 flex flex-col">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] uppercase font-bold text-neutral-600 tracking-wider">
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
                rows={2}
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
        <main className="min-h-[100dvh] bg-neutral-950 text-white flex flex-col items-center justify-between p-2.5 sm:p-5 select-none relative overflow-x-hidden">
          <div
            className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full blur-[150px] opacity-20 pointer-events-none transition-colors duration-700"
            style={{ backgroundColor: currentAccent }}
          />

          {/* FEJLÉC */}
          <header className="w-full max-w-6xl flex flex-wrap justify-between items-center py-2.5 border-b border-neutral-800/80 gap-2 z-10">
            <div>
              <h1 className="text-lg sm:text-2xl font-black tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-rose-400 to-violet-500">
                HIT-ROULETTE
              </h1>
              <p className="text-[9px] sm:text-[10px] text-neutral-500 tracking-wider">A HITSTER PARTI KIADÁS</p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
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
              >
                <Zap className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Okos Intro:</span>
                <span>{smartIntroSkip ? "BE" : "KI"}</span>
              </button>

              <button
                onClick={() => setAutoSwitchTab((prev) => !prev)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-2xl border text-xs font-bold transition ${
                  autoSwitchTab
                    ? "bg-amber-500/10 border-amber-500/40 text-amber-400"
                    : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                }`}
              >
                <Tv className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Auto lapozás:</span>
                <span>{autoSwitchTab ? "BE" : "KI"}</span>
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
                onClick={lockPinGate}
                className="p-2 rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-rose-400 hover:border-rose-500/40 text-xs font-bold transition shadow active:scale-95"
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
            <div className="w-full max-w-6xl flex flex-col gap-2 py-2 px-3 bg-neutral-900/50 border border-neutral-800/80 rounded-2xl my-1.5 backdrop-blur-md z-10">
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
          />

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
              <button
                onClick={() => setBuzzedPlayer(null)}
                className="ml-2 p-1 rounded-lg bg-black/30 hover:bg-black/50"
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

              {/* TV: KIK KÜLDTÉK MÁR BE A VAK TIPPET (MEGFORDÍTÁS ELŐTT) */}
              {!isFlipped && guessList.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-neutral-900/90 border border-emerald-500/40 text-xs">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-bold text-neutral-300">Tippelt:</span>
                  <div className="flex flex-wrap gap-1">
                    {guessList.map((g) => (
                      <span
                        key={g.playerName}
                        className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-black text-[11px]"
                      >
                        {g.playerName} ✓
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 🏆 KAHOOT AUTOMATA EREDMÉNYHIRDETÉS PANEL (AMIKOR FELFORDUL A KÁRTYA) */}
            {isFlipped && evaluatedGuesses.length > 0 && (
              <div className="w-full max-w-3xl bg-neutral-900/95 border-2 border-amber-400 rounded-3xl p-4 mb-4 shadow-[0_0_50px_rgba(245,158,11,0.25)] animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-amber-300">
                      Kahoot Kör Kiértékelés • Helyes évszám: {currentTrack?.year}
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
                          isExact
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
                            <div className="font-black text-xs uppercase text-white">
                              {idx + 1}. {g.playerName}
                            </div>
                            {g.text && (
                              <div className="text-[10px] text-neutral-300">
                                Szöveges tipp: „{g.text}”{" "}
                                {(g.titleMatch || g.artistMatch) && (
                                  <span className="text-emerald-400 font-bold">(Találat! 🎯)</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-right font-mono">
                          <div className="text-sm font-black">{g.year}</div>
                          <div className="text-[10px] font-bold">
                            {isExact ? "TELITALÁLAT!" : `±${g.yearDiff} év eltérés`}
                          </div>
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
              />
            ) : (
              <div className="w-full max-w-5xl flex flex-col items-center gap-6">
                <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-center justify-items-center">
                  <div className="flex flex-col items-center justify-center p-5 rounded-3xl bg-neutral-900/40 border border-neutral-800/60 backdrop-blur-md w-full max-w-md shadow-2xl">
                    <RouletteWheel onSpinEnd={handleSpinEnd} />
                  </div>

                  <div className="flex flex-col items-center justify-center w-full max-w-sm">
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
                      />
                    ) : (
                      <div className="w-80 h-96 rounded-3xl border-2 border-dashed border-neutral-800 flex flex-col items-center justify-center p-6 text-center text-neutral-500 gap-3">
                        <CalendarRange className="w-12 h-12 text-neutral-700" />
                        <p className="text-sm font-bold text-neutral-300">Nincs dal ebben a szűrésben!</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 🎧 32-SÁVOS NEON SPECTRUM ANALYZER ÉS DOKKOLÓ */}
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

          {/* TV QR KÓD MODAL */}
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