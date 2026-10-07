"use client";

import React, { useState, useEffect, useRef } from "react";
import tracksData from "../data/tracks.json";
import { MusicCard } from "../components/MusicCard";
import { RouletteWheel } from "../components/RouletteWheel";
import { Track } from "../types/track";
import { Play, Pause, SkipForward, Timer } from "lucide-react";
import confetti from "canvas-confetti";

export default function Home() {
  const tracks: Track[] = tracksData;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [timeLimit, setTimeLimit] = useState<number>(30); // 30 mp időkorlát
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentTrack = tracks[currentIndex];

  // Billentyűzet figyelés (Space -> felfedés és zene leállítása)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        handleFlip();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFlipped, isPlaying]);

  // Visszaszámláló időzítő lejátszás közben
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
    setTimeLeft(timeLimit);
    const nextIdx = (currentIndex + 1) % tracks.length;
    setCurrentIndex(nextIdx);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-between p-4 md:p-8 select-none">
      {/* Fejléc - igazítva a 6xl szélességhez */}
      <header className="w-full max-w-6xl flex justify-between items-center py-4 border-b border-neutral-800/80">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-rose-400 to-violet-500">
            HIT-ROULETTE
          </h1>
          <p className="text-xs text-neutral-500 tracking-wider">A HITSTER PARTI KIADÁS</p>
        </div>

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

      {/* Audio Lejátszó elem */}
      <audio
        ref={audioRef}
        src={currentTrack.audioUrl}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Fő játéktér: Balra a nagy Rulett, Jobbra a Kártya */}
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-10 items-center justify-items-center my-auto py-6">
        {/* Bal oldal: Nagy Rulett kerék konténer */}
        <div className="flex flex-col items-center justify-center p-6 sm:p-8 rounded-3xl bg-neutral-900/40 border border-neutral-800/60 backdrop-blur-md w-full max-w-lg shadow-2xl">
          <RouletteWheel
            onSpinEnd={(cat: any) =>
              setActiveCategory(typeof cat === "string" ? cat : cat?.label || null)
            }
          />
        </div>

        {/* Jobb oldal: Hitster kártya */}
        <div className="flex flex-col items-center justify-center w-full max-w-md">
          <MusicCard
            track={currentTrack}
            isFlipped={isFlipped}
            onFlip={handleFlip}
          />
        </div>
      </div>

      {/* Alsó vezérlősáv */}
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