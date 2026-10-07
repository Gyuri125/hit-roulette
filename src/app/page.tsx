"use client";

import React, { useState, useEffect, useRef } from "react";
import tracksData from "../data/tracks.json";
import { MusicCard } from "../components/MusicCard";
import { RouletteWheel, Category } from "../components/RouletteWheel";
import { PlayerBoard } from "../components/PlayerBoard";
import { Track } from "../types/track";
import { supabase } from "../lib/supabase";
import { Play, Pause, SkipForward, Timer, Sparkles, LayoutGrid, Disc, Eye, QrCode, Smartphone, X, Trophy } from "lucide-react";
import confetti from "canvas-confetti";

export default function Home() {
  const tracks: Track[] = tracksData;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  
  // Automatikus zeneindítás (3 mp)
  const [autoPlayCountdown, setAutoPlayCountdown] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"boards" | "game">("boards");
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // MULTIPLAYER ÁLLAPOTOK
  const [roomCode, setRoomCode] = useState<string>("");
  const [isHostModalOpen, setIsHostModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [isJoinedAsClient, setIsJoinedAsClient] = useState(false);
  const [clientGrid, setClientGrid] = useState<boolean[][]>(
    Array(5).fill(null).map(() => Array(5).fill(false))
  );

  const currentTrack = tracks[currentIndex];

  // URL-ből szobakód automatikus felismerése (?room=KOD)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlRoom = params.get("room");
      if (urlRoom) {
        setRoomCode(urlRoom.toUpperCase());
        setIsJoinModalOpen(true);
      }
    }
  }, []);

  // Szoba generálása a TV / Házigazda számára
  const handleCreateRoom = () => {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    setRoomCode(code);
    setIsHostModalOpen(true);
  };

  // REALTIME CSATLAKOZÁS ÉS SZINKRONIZÁCIÓ (Supabase Broadcast)
  useEffect(() => {
    if (!roomCode) return;

    const channel = supabase.channel(`room_${roomCode}`, {
      config: { broadcast: { self: false } },
    });

    // Ha a TV nézetben vagyunk: fogadjuk a telefonos kattintásokat
    channel.on("broadcast", { event: "tile_update" }, ({ payload }) => {
      if (payload.hasWon) {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.5 },
        });
      }
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomCode]);

  // Telefonos mező megnyomása -> azonnali üzenetküldés a TV-nek
  const handleClientTileClick = (r: number, c: number) => {
    const newGrid = clientGrid.map((row, rIdx) =>
      row.map((cell, cIdx) => (rIdx === r && cIdx === c ? !cell : cell))
    );
    setClientGrid(newGrid);

    // Sor/oszlop/átló Bingo ellenőrzés
    const isRowWon = newGrid.some((row) => row.every(Boolean));
    const isColWon = [0, 1, 2, 3, 4].some((col) => [0, 1, 2, 3, 4].every((row) => newGrid[row][col]));
    const hasWon = isRowWon || isColWon;

    // Supabase Broadcast küldése a TV-nek
    if (roomCode) {
      const channel = supabase.channel(`room_${roomCode}`);
      channel.send({
        type: "broadcast",
        event: "tile_update",
        payload: {
          playerName: playerName || "Játékos",
          row: r,
          col: c,
          hasWon,
        },
      });
    }
  };

  // Zenelejátszó visszaszámláló
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

  // Automata zeneindítás a rulett után
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
        audioRef.current.play();
        setIsPlaying(true);
        setTimeLeft(30);
      }
      setActiveTab("boards");
    }
    return () => clearTimeout(timer);
  }, [autoPlayCountdown]);

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
    setTimeLeft(30);
    setCurrentIndex((prev) => (prev + 1) % tracks.length);
    if (audioRef.current) audioRef.current.currentTime = 0;
  };

  // Dinamikus QR kód link generálása a telefonokhoz (HTTPS Vercel domaint ad mobilnak még localhoston is)
  const baseUrl =
    typeof window !== "undefined" && !window.location.hostname.includes("localhost")
      ? window.location.origin
      : "https://hit-roulette-lie1.vercel.app";
  const joinUrl = `${baseUrl}?room=${roomCode}`;
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    joinUrl
  )}&bgcolor=171717&color=fbbf24`;

  // HA A FELHASZNÁLÓ MINT MOBIL JÁTÉKOS LÉPETT BE
  if (isJoinedAsClient) {
    const tileColors = ["#f59e0b", "#10b981", "#ec4899", "#8b5cf6", "#06b6d4"];
    return (
      <main className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-between p-4 select-none">
        <header className="w-full flex justify-between items-center py-3 border-b border-neutral-800">
          <div>
            <h1 className="text-base font-black text-amber-400 uppercase tracking-wider">{playerName} táblája</h1>
            <p className="text-[10px] text-neutral-500 font-mono">SZOBASZÁM: {roomCode}</p>
          </div>
          <button
            onClick={() => setIsJoinedAsClient(false)}
            className="text-xs text-neutral-500 hover:text-rose-400"
          >
            Kilépés
          </button>
        </header>

        {/* MOBIL 5x5 TÁBLA */}
        <div className="w-full max-w-xs bg-neutral-900 border-2 border-neutral-800 rounded-3xl p-4 shadow-2xl my-auto flex flex-col gap-3">
          <div className="grid grid-cols-5 gap-2 w-full bg-neutral-950 p-2.5 rounded-2xl border border-neutral-800">
            {clientGrid.map((row, r) =>
              row.map((isMarked, c) => (
                <button
                  key={`${r}-${c}`}
                  onClick={() => handleClientTileClick(r, c)}
                  className="aspect-square rounded-lg flex items-center justify-center font-black text-2xl text-neutral-950 shadow active:scale-90 transition"
                  style={{ backgroundColor: tileColors[(r + c) % tileColors.length] }}
                >
                  {isMarked ? "✕" : ""}
                </button>
              ))
            )}
          </div>
          <div className="text-center text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
            Érintsd meg a négyzetet a jelöléshez!
          </div>
        </div>

        <footer className="text-center text-[11px] text-neutral-600 pb-2">
          Szinkronizálva a TV-vel • Hit-Roulette Party
        </footer>
      </main>
    );
  }

  // ALAPÉRTELMEZETT TV / LAPTOP FŐOLDAL
  return (
    <main className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-between p-3 sm:p-6 select-none">
      {/* FEJLÉC */}
      <header className="w-full max-w-6xl flex flex-wrap justify-between items-center py-3 border-b border-neutral-800/80 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-rose-400 to-violet-500">
            HIT-ROULETTE
          </h1>
          <p className="text-[10px] text-neutral-500 tracking-wider">A HITSTER PARTI KIADÁS</p>
        </div>

        {/* NÉZETVÁLTÓ ÉS MULTIPLAYER GOMBOK */}
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

          {/* MULTIPLAYER SZOBAGOMB */}
          <button
            onClick={handleCreateRoom}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-violet-600 to-rose-600 text-white text-xs font-bold shadow-lg hover:scale-105 active:scale-95 transition"
          >
            <QrCode className="w-3.5 h-3.5 text-amber-300" />
            <span>{roomCode ? `Szoba: ${roomCode}` : "📱 Mobil Csatlakozás (TV)"}</span>
          </button>
        </div>

        {/* IDŐZÍTŐ */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400">
            <Timer className="w-3.5 h-3.5 text-amber-400" />
            <span>{timeLeft}s</span>
          </div>
          <span className="text-neutral-500">#{currentTrack.id} ({currentIndex + 1}/{tracks.length})</span>
        </div>
      </header>

      {/* Audio Lejátszó */}
      <audio ref={audioRef} src={currentTrack.audioUrl} onEnded={() => setIsPlaying(false)} />

      {/* ÉRTESÍTÉSEK */}
      {autoPlayCountdown !== null && (
        <div className="fixed top-20 z-50 flex items-center gap-3 px-6 py-2.5 rounded-full bg-amber-500 text-neutral-950 font-black shadow-2xl animate-bounce">
          <Sparkles className="w-5 h-5 fill-current" />
          <span>Téma rögzítve! Zene indul: {autoPlayCountdown} mp...</span>
        </div>
      )}

      {/* FŐ TARTALOM */}
      <div className="w-full flex justify-center items-center my-auto py-4">
        {activeTab === "boards" ? (
          <PlayerBoard
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
          <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center justify-items-center">
            <div className="flex flex-col items-center justify-center p-6 rounded-3xl bg-neutral-900/40 border border-neutral-800/60 backdrop-blur-md w-full max-w-md shadow-2xl">
              <RouletteWheel onSpinEnd={(cat) => { setActiveCategory(cat); setAutoPlayCountdown(3); }} />
            </div>

            <div className="flex flex-col items-center justify-center w-full max-w-sm">
              <MusicCard track={currentTrack} isFlipped={isFlipped} onFlip={handleFlipAndShow} />
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

            <p className="text-[10px] text-neutral-500 leading-tight">
              A telefonos játékosok saját táblát kapnak, és minden kattintásuk azonnal szinkronizál ide a képernyőre!
            </p>
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
              placeholder="Add meg a neved (pl. Béla)"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 text-center font-bold"
            />

            <button
              onClick={() => {
                if (!playerName.trim()) return alert("Kérlek írd be a neved!");
                setIsJoinModalOpen(false);
                setIsJoinedAsClient(true);
              }}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-sm uppercase tracking-wider transition shadow-lg shadow-amber-500/20"
            >
              Belépés a játékba
            </button>
          </div>
        </div>
      )}
    </main>
  );
}