"use client";

import React, { useState, useEffect, useRef } from "react";
import tracksData from "@/data/tracks.json";
import { MusicCard } from "@/components/MusicCard";
import { Track } from "@/types/track";
import { Play, Pause, SkipForward, Volume2 } from "lucide-react";
import confetti from "canvas-confetti";

export default function Home() {
  const tracks: Track[] = tracksData;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentTrack = tracks[currentIndex];

  // Billentyűzet kezelés (Space: flip + stop zene)
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

  const handleFlip = () => {
    const nextFlipped = !isFlipped;
    setIsFlipped(nextFlipped);

    // Ha megfordítjuk és felfedjük, állítsuk meg a zenét és lőjünk konfettit!
    if (nextFlipped) {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#f59e0b", "#ec4899", "#8b5cf6"]
      });
    }
  };

  const handlePlayToggle = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleNextTrack = () => {
    setIsFlipped(false);
    setIsPlaying(false);
    const nextIdx = (currentIndex + 1) % tracks.length;
    setCurrentIndex(nextIdx);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-between p-6">
      {/* Header */}
      <header className="w-full max-w-xl flex justify-between items-center py-4 border-b border-neutral-900">
        <h1 className="text-xl font-black tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-rose-400">
          HIT-ROULETTE
        </h1>
        <div className="text-sm font-mono text-neutral-500">
          {currentIndex + 1} / {tracks.length}
        </div>
      </header>

      {/* Rejtett Audio Tag */}
      <audio
        ref={audioRef}
        src={currentTrack.audioUrl}
        onEnded={() => setIsPlaying(false)}
      />

      {/* A Kártya */}
      <div className="my-auto py-8">
        <MusicCard
          track={currentTrack}
          isFlipped={isFlipped}
          onFlip={handleFlip}
        />
      </div>

      {/* Vezérlőpult */}
      <footer className="w-full max-w-md bg-neutral-900/60 backdrop-blur-md border border-neutral-800 rounded-2xl p-4 flex items-center justify-around">
        <button
          onClick={handlePlayToggle}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold transition shadow-lg shadow-amber-500/20"
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
          <span>{isPlaying ? "Szünet" : "Lejátszás"}</span>
        </button>

        <button
          onClick={handleFlip}
          className="px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold border border-neutral-700 transition"
        >
          {isFlipped ? "Elrejtés" : "Felfedés (Space)"}
        </button>

        <button
          onClick={handleNextTrack}
          className="p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
          title="Következő zene"
        >
          <SkipForward className="w-5 h-5" />
        </button>
      </footer>
    </main>
  );
}