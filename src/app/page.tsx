"use client";

import React, { useState, useEffect, useRef } from "react";
import tracksData from "../data/tracks.json";
import { MusicCard, GuessTarget } from "../components/MusicCard";
import { RouletteWheel, Category } from "../components/RouletteWheel";
import { PlayerBoard, PlayerData, createEmptyGrid, checkBingo } from "../components/PlayerBoard";
import { Track } from "../types/track";
import { supabase } from "../lib/supabase";
import { PinGate } from "../components/PinGate";
import { Play, Pause, SkipForward, Timer, Sparkles, LayoutGrid, Disc, Eye, QrCode, Smartphone, X, Users, Music2 } from "lucide-react";
import confetti from "canvas-confetti";

const TIME_OPTIONS = [15, 30, 45, 60];
type MusicFilter = "all" | "hungarian" | "international";

export default function Home() {
  const allTracks: Track[] = tracksData;

  // KÜLÖN ZENEI SZŰRŐ (Magyar / Nemzetközi / Vegyes)
  const [musicFilter, setMusicFilter] = useState<MusicFilter>("all");

  const filteredTracks = React.useMemo(() => {
    if (musicFilter === "hungarian") {
      return allTracks.filter(
        (t) =>
          (t as any).language === "hu" ||
          (t as any).genre?.toLowerCase().includes("magyar") ||
          /hung|neoton|tnt|omega|bikini|republic|charlie|halott|valmar|edda/i.test(t.artist + t.title)
      );
    }
    if (musicFilter === "international") {
      return allTracks.filter(
        (t) =>
          (t as any).language !== "hu" &&
          !(t as any).genre?.toLowerCase().includes("magyar") &&
          !/hung|neoton|tnt|omega|bikini|republic|charlie|halott|valmar|edda/i.test(t.artist + t.title)
      );
    }
    return allTracks;
  }, [allTracks, musicFilter]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0); // Élő másodperc a dalszöveg szinkronhoz
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [autoPlayCountdown, setAutoPlayCountdown] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"boards" | "game">("boards");
  
  // Állítható időtartam
  const [selectedDuration, setSelectedDuration] = useState<number>(45);
  const [timeLeft, setTimeLeft] = useState<number>(45);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Kártya célkiemelés (A kerék automatikusan átállítja!)
  const [guessTarget, setGuessTarget] = useState<GuessTarget>("year");

  // Játékosok listája
  const [players, setPlayers] = useState<PlayerData[]>([
    { id: "host", name: "Házigazda", notes: "", grid: createEmptyGrid(), hasWon: false },
  ]);
  const [activePlayerIdx, setActivePlayerIdx] = useState(0);

  // Multiplayer
  const [roomCode, setRoomCode] = useState<string>("");
  const [isHostModalOpen, setIsHostModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [isJoinedAsClient, setIsJoinedAsClient] = useState(false);
  const [clientGrid, setClientGrid] = useState<boolean[][]>(createEmptyGrid());
  const [clientNotes, setClientNotes] = useState<string>("");

  const currentTrack = filteredTracks[currentIndex] || allTracks[0];

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
    });

    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomCode]);

  const handleClientTileClick = (r: number, c: number) => {
    const newGrid = clientGrid.map((row, rIdx) =>
      row.map((cell, cIdx) => (rIdx === r && cIdx === c ? !cell : cell))
    );
    setClientGrid(newGrid);
    localStorage.setItem("hit_player_grid", JSON.stringify(newGrid));

    const hasWon = checkBingo(newGrid);
    if (hasWon) confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });

    if (roomCode) {
      const channel = supabase.channel(`room_${roomCode}`);
      channel.send({
        type: "broadcast",
        event: "player_sync",
        payload: { id: playerName, name: playerName, grid: newGrid, notes: clientNotes, hasWon },
      });
    }
  };

  const handleClientNotesChange = (notes: string) => {
    setClientNotes(notes);
    localStorage.setItem("hit_player_notes", notes);

    if (roomCode) {
      const channel = supabase.channel(`room_${roomCode}`);
      channel.send({
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

    if (roomCode) {
      const channel = supabase.channel(`room_${roomCode}`);
      channel.send({
        type: "broadcast",
        event: "player_sync",
        payload: { id: playerName, name: playerName, grid: clientGrid, notes: clientNotes, hasWon: false },
      });
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleStop();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, timeLeft]);

  const handleDurationChange = (seconds: number) => {
    setSelectedDuration(seconds);
    if (!isPlaying) setTimeLeft(seconds);
  };

  // KERÉK MEGÁLLÁSA: Automatikusan átállítja a kártya kiemelési célját is!
  const handleSpinEnd = (cat: Category) => {
    setActiveCategory(cat);
    setGuessTarget(cat.targetType);
    setAutoPlayCountdown(3);
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
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
        audioRef.current.play();
        setIsPlaying(true);
        setTimeLeft(selectedDuration);
      }
      setActiveTab("boards");
    }
    return () => clearTimeout(timer);
  }, [autoPlayCountdown, selectedDuration]);

  const handleFlipAndShow = () => {
    if (activeTab !== "game") setActiveTab("game");
    const nextFlipped = !isFlipped;
    setIsFlipped(nextFlipped);
    if (nextFlipped) {
      handleStop();
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    }
  };

  const handleStop = () => {
    if (audioRef.current) audioRef.current.pause();
    setIsPlaying(false);
  };

  const handlePlayToggle = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      handleStop();
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleNextTrack = () => {
    setIsFlipped(false);
    handleStop();
    setAutoPlayCountdown(null);
    setTimeLeft(selectedDuration);
    setCurrentIndex((prev) => (prev + 1) % filteredTracks.length);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
    }
  };

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
            <button
              onClick={() => {
                localStorage.clear();
                setIsJoinedAsClient(false);
              }}
              className="text-xs text-neutral-500 hover:text-rose-400 px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800"
            >
              Kilépés
            </button>
          </header>

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
                        className="aspect-square rounded-lg flex items-center justify-center font-black text-2xl text-neutral-950 shadow active:scale-90 transition"
                        style={{ backgroundColor: tileColors[(r + c) % tileColors.length] }}
                      >
                        {isMarked ? "✕" : ""}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="w-full bg-neutral-100 rounded-2xl p-3 shadow-inner border border-neutral-300 flex flex-col">
              <span className="text-[10px] uppercase font-bold text-neutral-600 tracking-wider mb-1">
                Fehértábla (Tippjeid a TV-re szinkronizálva):
              </span>
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

            {/* NÉZETVÁLTÓ ÉS MULTIPLAYER */}
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
            </div>

            {/* IDŐZÍTŐ ÉS SZÁMLÁLÓ */}
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
                    {sec}s
                  </button>
                ))}
              </div>
              <span className="text-amber-400 font-bold px-2 py-1 rounded-lg bg-neutral-900 border border-neutral-800">
                {timeLeft}s
              </span>
            </div>
          </header>

          {/* ZENEI SZŰRŐ SÁV (MAGYAR / NEMZETKÖZI / VEGYES) */}
          <div className="w-full max-w-6xl flex justify-between items-center py-2 px-1 text-xs">
            <div className="flex items-center gap-1.5 bg-neutral-900/60 p-1 rounded-xl border border-neutral-800/80">
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
                🇭🇺 Magyar Zenék
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

            <span className="text-[11px] text-neutral-500 font-mono">
              Dalok a listában: {filteredTracks.length} db
            </span>
          </div>

          {/* AUDIO LEJÁTSZÓ ÉLŐ IDŐKÖVETÉSSEL */}
          <audio
            ref={audioRef}
            src={currentTrack.audioUrl}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onEnded={() => {
              setIsPlaying(false);
              setCurrentTime(0);
            }}
          />

          {/* Értesítések */}
          {autoPlayCountdown !== null && (
            <div className="fixed top-20 z-50 flex items-center gap-3 px-6 py-2.5 rounded-full bg-amber-500 text-neutral-950 font-black shadow-2xl animate-bounce">
              <Sparkles className="w-5 h-5 fill-current" />
              <span>Feladvány rögzítve! Zene indul: {autoPlayCountdown} mp...</span>
            </div>
          )}

          {/* FŐ TARTALOM */}
          <div className="w-full flex justify-center items-center my-auto py-4">
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
              />
            ) : (
              <div className="w-full max-w-5xl flex flex-col items-center gap-6">
                {/* AKTÍV FELADVÁNY SÁV A KÁRTYA FELETT */}
                {activeCategory && (
                  <div
                    className="flex items-center gap-2.5 px-5 py-2 rounded-2xl border backdrop-blur-md shadow-lg"
                    style={{
                      backgroundColor: `${activeCategory.accent}15`,
                      borderColor: activeCategory.accent,
                    }}
                  >
                    <Sparkles className="w-4 h-4" style={{ color: activeCategory.accent }} />
                    <span className="text-xs font-bold text-neutral-300">Aktív szabály:</span>
                    <span className="text-xs font-black uppercase tracking-wide" style={{ color: activeCategory.accent }}>
                      {activeCategory.label}
                    </span>
                    <span className="text-[11px] text-neutral-400 font-mono">({activeCategory.desc})</span>
                  </div>
                )}

                <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center justify-items-center">
                  <div className="flex flex-col items-center justify-center p-6 rounded-3xl bg-neutral-900/40 border border-neutral-800/60 backdrop-blur-md w-full max-w-md shadow-2xl">
                    <RouletteWheel onSpinEnd={handleSpinEnd} />
                  </div>

                  <div className="flex flex-col items-center justify-center w-full max-w-sm">
                    <MusicCard
                      track={currentTrack}
                      isFlipped={isFlipped}
                      onFlip={handleFlipAndShow}
                      highlight={guessTarget}
                      currentTime={currentTime}
                    />
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

            <button
              onClick={handleFlipAndShow}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs sm:text-sm border border-neutral-700 transition active:scale-95 shadow-md"
            >
              <Eye className="w-4 h-4 text-amber-400" />
              <span>{isFlipped ? "Elrejtés" : "Megfordítás (Space)"}</span>
            </button>

            <button
              onClick={handleNextTrack}
              className="p-2.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition active:scale-95"
              title="Következő szám"
            >
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