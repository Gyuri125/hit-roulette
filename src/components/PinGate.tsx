"use client";

import React, { useState, useEffect } from "react";
import { Lock, ShieldAlert, KeyRound, ArrowRight } from "lucide-react";

const MASTER_PIN = "303646";
const FOUR_HOURS_MS = 4 * 60 * 60 * 1000; // 4 óra milliszekundumban
const STORAGE_KEY = "hit_pin_auth_time";

// Globálisan meghívható azonnali visszazáró függvény
export const lockPinGate = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event("pingate:lock"));
  }
};

interface PinGateProps {
  children: React.ReactNode;
}

export const PinGate: React.FC<PinGateProps> = ({ children }) => {
  const [isUnlocked, setIsUnlocked] = useState<boolean | null>(null);
  const [pinInput, setPinInput] = useState<string>("");
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [lockTimeLeft, setLockTimeLeft] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // 4 órás érvényesség ellenőrzése
  const checkValidity = () => {
    if (typeof window === "undefined") return;
    const authTimeStr = localStorage.getItem(STORAGE_KEY);
    if (!authTimeStr) {
      setIsUnlocked(false);
      return;
    }

    const authTime = parseInt(authTimeStr, 10);
    const now = Date.now();

    // Ha eltelt a 4 óra -> Automatikus visszazárás
    if (now - authTime > FOUR_HOURS_MS) {
      localStorage.removeItem(STORAGE_KEY);
      setIsUnlocked(false);
    } else {
      setIsUnlocked(true);
    }
  };

  useEffect(() => {
    checkValidity();

    // Percenkénti automata ellenőrzés (a 4 óra leteltének figyelésére)
    const interval = setInterval(checkValidity, 60000);

    // Kézi zárolási esemény figyelése
    const handleLockEvent = () => setIsUnlocked(false);
    window.addEventListener("pingate:lock", handleLockEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener("pingate:lock", handleLockEvent);
    };
  }, []);

  // Visszaszámláló a hibás próbálkozások büntetőidejéhez
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (lockTimeLeft > 0) {
      timer = setInterval(() => {
        setLockTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [lockTimeLeft]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (lockTimeLeft > 0) return;

    if (pinInput.trim() === MASTER_PIN) {
      // Sikeres feloldás: időbélyeg mentése
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
      setIsUnlocked(true);
      setErrorMsg("");
      setFailedAttempts(0);
      setPinInput("");
    } else {
      // Hibás kód: Négyzetes büntetés (próbálkozások száma ^ 2 másodperc)
      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);
      const penaltySeconds = Math.pow(nextAttempts, 2);
      setLockTimeLeft(penaltySeconds);
      setErrorMsg(`Hibás PIN! Rendszer zárolva: ${penaltySeconds} másodpercre.`);
      setPinInput("");
    }
  };

  // Betöltési villanás megelőzése
  if (isUnlocked === null) {
    return <div className="min-h-screen bg-neutral-950" />;
  }

  // Zárolt állapot -> PIN bekérő képernyő
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-4 select-none">
        <div className="w-full max-w-sm bg-neutral-900 border-2 border-neutral-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center gap-5 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
            {lockTimeLeft > 0 ? (
              <ShieldAlert className="w-8 h-8 text-rose-500 animate-pulse" />
            ) : (
              <Lock className="w-8 h-8" />
            )}
          </div>

          <div>
            <h2 className="text-xl font-black uppercase tracking-wider text-white">
              Hit-Roulette Védelem
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Add meg a 6 számjegyű belépőkódot a feloldáshoz:
            </p>
          </div>

          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
            <div className="relative w-full">
              <KeyRound className="w-5 h-5 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-neutral-500 pointer-events-none" />
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                disabled={lockTimeLeft > 0}
                placeholder="••••••"
                value={pinInput}
                onChange={(e) => {
                  setErrorMsg("");
                  setPinInput(e.target.value.replace(/\D/g, ""));
                }}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-400 text-center text-xl font-mono tracking-[0.4em] py-3 pl-10 pr-4 rounded-xl text-white focus:outline-none disabled:opacity-40 transition"
                autoFocus
              />
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-400 font-bold leading-tight">
                {lockTimeLeft > 0 ? `⏳ Újrapróbálás: ${lockTimeLeft} mp múlva` : errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={lockTimeLeft > 0 || pinInput.length < 6}
              className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-neutral-800 disabled:text-neutral-500 text-neutral-950 font-black text-xs uppercase tracking-widest transition shadow-lg flex items-center justify-center gap-2 active:scale-95"
            >
              <span>{lockTimeLeft > 0 ? `Zárolva (${lockTimeLeft}s)` : "Belépés"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="flex flex-col gap-0.5 text-[10px] text-neutral-600 font-mono">
            <span>Anti-Brute-Force védelem aktív</span>
            <span>4 óra inaktivitás után automatikusan visszazár</span>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};