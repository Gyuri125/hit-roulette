"use client";

import React, { useState, useEffect, useRef } from "react";
import tracksData from "../data/tracks.json";
import { MusicCard } from "../components/MusicCard";
import { RouletteWheel, Category } from "../components/RouletteWheel";
import { PlayerBoard } from "../components/PlayerBoard";
import { Track } from "../types/track";
import { Play, Pause, SkipForward, Timer, Sparkles, LayoutGrid, Disc } from "lucide-react";
import confetti from "canvas-confetti";

export default function Home() {
  const tracks: Track[] = tracksData;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  
  // Automatikus zeneindítás visszaszámlálója (3 mp)
  const [autoPlayCountdown, setAutoPlayCountdown] = useState<number | null>(null);

  // Fülek kezelése: "game" (Rulett+Kártya) vagy "boards" (Játékos táblák)
  const [activeTab, setActiveTab] = useState<"game" | "boards">("game");

  const [timeLimit] = useState<number>(30);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentTrack = tracks[currentIndex];

  // Billentyűzet: Space -> kártya fordítás
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && activeTab === "game") {
        e.preventDefault();
        handleFlip();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFlipped, isPlaying, activeTab]);

  // Visszaszámláló lejátszás közben (30s)
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

  // Automatikus zeneindítás időzítője a kerék megállása után
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (autoPlayCountdown !== null && autoPlayCountdown > 0) {
      timer = setTimeout(() => {
        setAutoPlayCountdown((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);
    } else if (autoPlayCountdown === 0) {
      // 0-hoz ért -> Zene automatikus indítása!
      setAutoPlayCountdown(null);
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
        setIsPlaying(true);
        setTimeLeft(timeLimit);
      }
    }
    return () => clearTimeout(timer);
  }, [autoPlayCountdown, timeLimit]);

  // Amikor megáll a kerék
  const handleSpinEnd = (cat: Category) => {
    setActiveCategory(cat);
    // 3 másodperces visszaszámlálás indul az automata lejátszáshoz
    setAutoPlayCountdown(3);
  };

  const handleFlip = () => {
    const nextFlipped = !isFlipped;
    setIsFlipped(nextFlipped);

    if (nextFlipped) {
      handleStop();
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 },
        colors: ["#f59e0b", "#ec4899", "#8b5cf6"],
      });
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
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
    setTimeLeft(timeLimit);
    const nextIdx = (currentIndex + 1) % tracks.length;
    setCurrentIndex(nextIdx);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-between p-4 md:p-8 select-none">
      {/* FEJLÉC */}
      <header className="w-full max-w-6xl flex flex-wrap justify-between items-center py-4 border-b border-neutral-800/80 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-rose-400 to-violet-500">
            HIT-ROULETTE
          </h1>
          <p className="text-xs text-neutral-500 tracking-wider">A HITSTER PARTI KIADÁS</p>
        </div>

        {/* FŐ FÜLVÁLTÓ GOMBOK */}
        <div className="flex items-center gap-2 bg-neutral-900 p-1.5 rounded-2xl border border-neutral-800">
          <button
            onClick={() => setActiveTab("game")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === "game"
                ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Disc className="w-4 h-4" />
            <span>Zene & Rulett</span>
          </button>

          <button
            onClick={() => setActiveTab("boards")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === "boards"
                ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Játékos Táblák</span>
          </button>
        </div>

        {/* Állapot és időzítő */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400">
            <Timer className="w-4 h-4 text-amber-400" />
            <span>{timeLeft}s</span>
          </div>
          <span className="text-neutral-500">
            {currentIndex + 1} / {tracks.length}
          </span>
        </div>
      </header>

      {/* Audio Lejátszó */}
      <audio
        ref={audioRef}
        src={currentTrack.audioUrl}
        onEnded={() => setIsPlaying(false)}
      />

      {/* AUTOMATA ZENEINDÍTÁS ÉRTESÍTÉS */}
      {autoPlayCountdown !== null && (
        <div className="fixed top-24 z-50 flex items-center gap-3 px-6 py-3 rounded-full bg-amber-500 text-neutral-950 font-black shadow-2xl animate-bounce">
          <Sparkles className="w-5 h-5 fill-current" />
          <span>Téma rögzítve! Zene indul: {autoPlayCountdown} mp...</span>
        </div>
      )}

      {/* TARTALOM A KIVÁLASZTOTT FÜL ALAPJÁN */}
      {activeTab === "game" ? (
        /* 1. FÜL: RULETT ÉS KÁRTYA */
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-10 items-center justify-items-center my-auto py-6">
          {/* Bal oldal: Nagy Rulett */}
          <div className="flex flex-col items-center justify-center p-6 sm:p-8 rounded-3xl bg-neutral-900/40 border border-neutral-800/60 backdrop-blur-md w-full max-w-lg shadow-2xl">
            <RouletteWheel onSpinEnd={handleSpinEnd} />
          </div>

          {/* Jobb oldal: Kártya */}
          <div className="flex flex-col items-center justify-center w-full max-w-md">
            <MusicCard
              track={currentTrack}
              isFlipped={isFlipped}
              onFlip={handleFlip}
            />
          </div>
        </div>
      ) : (
        /* 2. FÜL: JÁTÉKOS TÁBLÁK (HITSTER BINGO) */
        <div className="my-auto py-6 flex justify-center w-full">
          <PlayerBoard />
        </div>
      )}

      {/* ALSÓ VEZÉRLŐSÁV (Csak a játék nézetben szükséges, de elérhető marad) */}
      <footer className="w-full max-w-xl bg-neutral-900/80 backdrop-blur-lg border border-neutral-800 rounded-3xl p-4 flex items-center justify-between shadow-2xl mb-2">
        <button
          onClick={handlePlayToggle}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black tracking-wide transition shadow-lg shadow-amber-500/20 active:scale-95"
        >
          {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
          <span>{isPlaying ? "Szünet" : "Zene indítása"}</span>
        </button>

        <button
          onClick={handleFlip}
          className="px-6 py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold border border-neutral-700 transition active:scale-95"
        >
          {isFlipped ? "Elrejtés" : "Felfedés (Space)"}
        </button>

        <button
          onClick={handleNextTrack}
          className="p-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition active:scale-95"
          title="Következő szám"
        >
          <SkipForward className="w-5 h-5" />
        </button>
      </footer>
    </main>
  );
}