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
  Zap
} from "lucide-react";
import confetti from "canvas-confetti";

const TIME_OPTIONS = [15, 30, 45, 60, 0];
type MusicFilter = "all" | "hungarian" | "international";

// ================= OKOS INTRO SZÁMÍTÓ SEGÉDFÜGGVÉNYEK =================
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
  // Ha az első sor több mint 6 mp-nél kezdődik, elé ugrunk 5 másodperccel
  if (firstTime > 6) {
    return Math.max(0, Math.floor(firstTime - 5));
  }
  return 0;
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

  // Szűrők
  const [musicFilter, setMusicFilter] = useState<MusicFilter>("all");
  const [minYear, setMinYear] = useState<number>(absoluteMinYear);
  const [maxYear, setMaxYear] = useState<number>(absoluteMaxYear);

  // Okos Intro átugrás kapcsoló (alapból BE van kapcsolva)
  const [smartIntroSkip, setSmartIntroSkip] = useState<boolean>(true);

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

  // Véletlenszerű pakli-kezelés
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

  // Fade In / Fade Out időzítő referencia
  const fadeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [guessTarget, setGuessTarget] = useState<GuessTarget>("year");

  const [players, setPlayers] = useState<PlayerData[]>([
    { id: "host", name: "Házigazda", notes: "", grid: createEmptyGrid(), hasWon: false },
  ]);
  const [activePlayerIdx, setActivePlayerIdx] = useState(0);

  const [roomCode, setRoomCode] = useState<string>("");
  const [isHostModalOpen, setIsHostModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [isJoinedAsClient, setIsJoinedAsClient] = useState(false);
  const [clientGrid, setClientGrid] = useState<boolean[][]>(createEmptyGrid());
  const [clientNotes, setClientNotes] = useState<string>("");

  const channelRef = useRef<any>(null);
  const activeCategoryRef = useRef<Category | null>(null);

  useEffect(() => {
    activeCategoryRef.current = activeCategory;
  }, [activeCategory]);

  const currentTrack = filteredTracks[currentIndex] || allTracks[0];

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
    const stepTime = 40;
    const steps = durationMs / stepTime;
    const increment = targetVol / steps;
    let curVol = 0;

    fadeTimerRef.current = setInterval(() => {
      curVol = Math.min(targetVol, curVol + increment);
      try { audio.volume = curVol; } catch (_) {}
      if (curVol >= targetVol) stopFadeTimer();
    }, stepTime);
  };

  const fadeOut = (audio: HTMLAudioElement, durationMs = 1200, onDone?: () => void) => {
    stopFadeTimer();
    const startVol = audio.volume;
    if (startVol <= 0.05) {
      audio.pause();
      if (onDone) onDone();
      return;
    }
    const stepTime = 40;
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
    });

    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomCode, isJoinedAsClient]);

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

  // Időzítő visszaszámláló: ha lejár -> lágy Fade-Out leállás
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && selectedDuration > 0 && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleStop(false);
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
    setAutoPlayCountdown(3);

    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "game_state",
        payload: { activeCategory: cat, targetType: cat.targetType },
      });
    }
  };

  // Automata indítás a rulett után (Okos kezdéssel + Fade-In)
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

  // Leállítás Fade-Out opcióval
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
      fadeOut(audioRef.current, 1200, () => {
        setIsPlaying(false);
      });
    }
  };

  // Lejátszás ki/bekapcsolása (Okos kezdéssel + Fade-In)
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
  };

  const isWideOpenYears = minYear <= absoluteMinYear && maxYear >= absoluteMaxYear;

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://hit-roulette-party.vercel.app";
  const joinUrl = `${baseUrl}?room=${roomCode}`;
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    joinUrl
  )}&bgcolor=171717&color=fbbf24`;

  const onlinePlayers = players.filter((p) => p.isOnline);

  return (
    <PinGate>
      {isJoinedAsClient ? (
        /* ==================== MOBIL NÉZET ==================== */
        <main className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-between p-4 select-none">
          <header className="w-full flex justify-between items-center py-2 border-b border-neutral-800">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <h1 className="text-base font-black text-amber-400 uppercase tracking-wider">{playerName} táblája</h1>
              </div>
              <p className="text-[10px] text-neutral-500 font-mono">
                SZOBASZÁM: {roomCode} • PONT: {clientGrid.flat().filter(Boolean).length}/25
              </p>
            </div>
            
            <div className="flex items-center gap-1.5">
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
                className="text-xs text-neutral-500 hover:text-rose-400 px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 transition"
              >
                Kilépés
              </button>
            </div>
          </header>

          {/* TELEFONOS FELADVÁNY EMLÉKEZTETŐ SÁV */}
          {activeCategory && (
            <div
              className="w-full max-w-xs py-2 px-3 rounded-2xl border text-center font-black text-xs uppercase tracking-wider my-2 shadow-lg transition-all animate-pulse"
              style={{
                backgroundColor: `${activeCategory.accent}20`,
                borderColor: activeCategory.accent,
                color: activeCategory.accent,
              }}
            >
              🎯 Feladvány: {activeCategory.label} ({activeCategory.desc})
            </div>
          )}

          <div className="w-full max-w-xs flex flex-col gap-3 my-auto">
            <div className="bg-neutral-900 border-2 border-neutral-800 rounded-3xl p-3 shadow-2xl">
              <div className="grid grid-cols-5 gap-2 w-full bg-neutral-950 p-2.5 rounded-2xl border border-neutral-800">
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

            <div className="w-full bg-neutral-100 rounded-2xl p-3 shadow-inner border border-neutral-300 flex flex-col">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] uppercase font-bold text-neutral-600 tracking-wider">
                  Fehértábla (TV-re szinkronizálva):
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
        <main className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-between p-3 sm:p-6 select-none">
          {/* FEJLÉC */}
          <header className="w-full max-w-6xl flex flex-wrap justify-between items-center py-3 border-b border-neutral-800/80 gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-rose-400 to-violet-500">
                HIT-ROULETTE
              </h1>
              <p className="text-[10px] text-neutral-500 tracking-wider">A HITSTER PARTI KIADÁS</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-neutral-900 p-1 rounded-2xl border border-neutral-800">
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

              {/* HÁZIGAZDA OKOS INTRO KAPCSOLÓ */}
              <button
                onClick={() => setSmartIntroSkip((prev) => !prev)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-xs font-bold transition ${
                  smartIntroSkip
                    ? "bg-amber-500/10 border-amber-500/40 text-amber-400"
                    : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                }`}
                title="Ha be van kapcsolva, a dal az első szöveges rész előtt 5 másodperccel indul (fade-in-nel)"
              >
                <Zap className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Okos Intro:</span>
                <span>{smartIntroSkip ? "BE (-5s)" : "KI (0s)"}</span>
              </button>

              <button
                onClick={() => setAutoSwitchTab((prev) => !prev)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-xs font-bold transition ${
                  autoSwitchTab
                    ? "bg-amber-500/10 border-amber-500/40 text-amber-400"
                    : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                }`}
                title="Ha kikapcsolod (Rögzítve), nem vált át automatikusan a táblákra a pörgetés után"
              >
                <Tv className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Auto lapozás:</span>
                <span>{autoSwitchTab ? "BE" : "RÖGZÍTVE"}</span>
              </button>

              <button
                onClick={handleCreateRoom}
                className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-violet-600 to-rose-600 text-white text-xs font-bold shadow-lg hover:scale-105 active:scale-95 transition"
              >
                <QrCode className="w-3.5 h-3.5 text-amber-300" />
                <span>{roomCode ? `Szoba: ${roomCode}` : "📱 Mobil (TV)"}</span>
                {onlinePlayers.length > 0 && (
                  <span className="flex items-center gap-1 bg-emerald-500/30 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full border border-emerald-400/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {onlinePlayers.length} online
                  </span>
                )}
              </button>

              <button
                onClick={lockPinGate}
                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-rose-400 hover:border-rose-500/40 text-xs font-bold transition shadow active:scale-95"
                title="Alkalmazás azonnali zárolása (PIN bekérés)"
              >
                <Lock className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Zárolás</span>
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono">
              <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-xl border border-neutral-800">
                <Timer className="w-3.5 h-3.5 text-amber-400 ml-1.5 mr-0.5" />
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
                    {sec === 0 ? "Végig" : `${sec}s`}
                  </button>
                ))}
              </div>
              <span className="text-amber-400 font-bold px-2 py-1 rounded-lg bg-neutral-900 border border-neutral-800 min-w-10 text-center">
                {selectedDuration === 0 ? "∞" : `${timeLeft}s`}
              </span>
            </div>
          </header>

          {/* SZŰRŐSÁV */}
          <div className="w-full max-w-6xl flex flex-col gap-2.5 py-2.5 px-2 bg-neutral-900/40 border border-neutral-800/80 rounded-2xl my-2 backdrop-blur-md">
            <div className="w-full flex flex-wrap justify-between items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5 bg-neutral-900/90 p-1 rounded-xl border border-neutral-800">
                <Music2 className="w-3.5 h-3.5 text-amber-400 ml-1.5" />
                <span className="text-[10px] uppercase font-bold text-neutral-500 px-1">Zenei Csomag:</span>
                
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

              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-neutral-900/90 border border-neutral-800 text-[11px] font-mono text-amber-400 font-bold">
                  <Shuffle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Véletlen sorrend</span>
                  <span className="text-neutral-500 font-normal">
                    ({playedIds.length}/{filteredTracks.length} játszva)
                  </span>
                </span>

                <span className="text-[11px] text-neutral-400 font-mono hidden md:inline">
                  Elérhető: <strong className="text-white">{filteredTracks.length}</strong> db
                </span>
              </div>
            </div>

            <div className="w-full flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-800/60">
              <div className="flex items-center gap-3 flex-1 min-w-[280px]">
                <CalendarRange className="w-4 h-4 text-cyan-400 shrink-0" />
                
                <div className="flex flex-col flex-1 gap-0.5">
                  <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
                    <span>Kezdő év:</span>
                    <strong className="text-cyan-300">{minYear}</strong>
                  </div>
                  <input
                    type="range"
                    min={absoluteMinYear}
                    max={maxYear}
                    value={minYear}
                    onChange={(e) => setMinYear(Math.min(Number(e.target.value), maxYear))}
                    className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                <div className="flex flex-col flex-1 gap-0.5">
                  <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
                    <span>Záró év:</span>
                    <strong className="text-rose-300">{maxYear}</strong>
                  </div>
                  <input
                    type="range"
                    min={minYear}
                    max={absoluteMaxYear}
                    value={maxYear}
                    onChange={(e) => setMaxYear(Math.max(Number(e.target.value), minYear))}
                    className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-rose-400"
                  />
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-[11px] font-bold font-mono text-neutral-300">
                  {isWideOpenYears ? "Bármelyik korszak (Összes)" : `${minYear} – ${maxYear}`}
                </span>

                {!isWideOpenYears && (
                  <button
                    onClick={() => {
                      setMinYear(absoluteMinYear);
                      setMaxYear(absoluteMaxYear);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-300 text-[11px] font-bold transition shadow"
                    title="Visszaállítás a teljes repertoárra"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Bármi</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* AUDIO LEJÁTSZÓ ÉLŐ IDŐKÖVETÉSSEL ÉS MEGBÍZHATÓ INTRO BEÁLLÍTÁSSAL */}
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

          {/* FŐ TARTALOM: KÖZPONTI FELADVÁNY MINDEN NÉZETBEN */}
          <div className="w-full flex flex-col items-center my-auto py-2">
            
            {activeCategory && (
              <div
                className="flex items-center gap-3 px-6 py-2.5 rounded-2xl border-2 backdrop-blur-md shadow-2xl mb-4 transition-all animate-pulse"
                style={{
                  backgroundColor: `${activeCategory.accent}20`,
                  borderColor: activeCategory.accent,
                  boxShadow: `0 0 30px ${activeCategory.accent}35`,
                }}
              >
                <Sparkles className="w-5 h-5 shrink-0" style={{ color: activeCategory.accent }} />
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-400">
                    Aktív Szabály:
                  </span>
                  <span className="text-sm sm:text-base font-black uppercase tracking-wide" style={{ color: activeCategory.accent }}>
                    {activeCategory.label}
                  </span>
                  <span className="text-xs text-neutral-300 font-mono hidden sm:inline">
                    ({activeCategory.desc})
                  </span>
                </div>
              </div>
            )}

            {activeTab === "boards" ? (
              <PlayerBoard
                players={players}
                setPlayers={setPlayers}
                activePlayerIdx={activePlayerIdx}
                setActivePlayerIdx={setActivePlayerIdx}
                onStartSpinAndMusic={() => {
                  setActiveTab("game");
                  setIsFlipped(false);
                  setTimeout(() => {
                    document.querySelector<HTMLButtonElement>("#roulette-spin-btn")?.click();
                  }, 200);
                }}
                isPlayingMusic={isPlaying}
                activeCategory={activeCategory}
              />
            ) : (
              <div className="w-full max-w-5xl flex flex-col items-center gap-6">
                <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center justify-items-center">
                  <div className="flex flex-col items-center justify-center p-6 rounded-3xl bg-neutral-900/40 border border-neutral-800/60 backdrop-blur-md w-full max-w-md shadow-2xl">
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
                      />
                    ) : (
                      <div className="w-80 h-96 rounded-3xl border-2 border-dashed border-neutral-800 flex flex-col items-center justify-center p-6 text-center text-neutral-500 gap-3">
                        <CalendarRange className="w-12 h-12 text-neutral-700" />
                        <p className="text-sm font-bold text-neutral-300">Nincs dal ebben a szűrésben!</p>
                        <p className="text-xs text-neutral-500">
                          Húzd szélesebbre az évszám csúszkát vagy válassz vegyes csomagot.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ALSÓ VEZÉRLŐSÁV */}
          <footer className="w-full max-w-lg bg-neutral-900/80 backdrop-blur-lg border border-neutral-800 rounded-3xl p-3 flex items-center justify-between shadow-2xl mb-1">
            <button
              onClick={handlePlayToggle}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs sm:text-sm tracking-wide transition shadow-lg shadow-amber-500/20 active:scale-95"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isPlaying ? "Szünet" : "Zene"}</span>
            </button>

            {/* A MEGFORDÍTÁS GOMB KIZÁRÓLAG A KÁRTYA NÉZETBEN JELENIK MEG */}
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
              className="p-2.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition active:scale-95 flex items-center gap-1"
              title="Következő véletlenszerű dal"
            >
              <Shuffle className="w-4 h-4 text-amber-400" />
              <SkipForward className="w-4 h-4" />
            </button>
          </footer>

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