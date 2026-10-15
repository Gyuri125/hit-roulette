"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lock, ShieldAlert, KeyRound, ArrowRight } from "lucide-react";

const MASTER_PIN = "303646";
const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
const STORAGE_KEY = "hit_pin_auth_time";

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
  const [shake, setShake] = useState(false);

  const checkValidity = () => {
    if (typeof window === "undefined") return;
    const authTimeStr = localStorage.getItem(STORAGE_KEY);
    if (!authTimeStr) {
      setIsUnlocked(false);
      return;
    }

    const authTime = parseInt(authTimeStr, 10);
    if (Date.now() - authTime > FOUR_HOURS_MS) {
      localStorage.removeItem(STORAGE_KEY);
      setIsUnlocked(false);
    } else {
      setIsUnlocked(true);
    }
  };

  useEffect(() => {
    checkValidity();
    const interval = setInterval(checkValidity, 60000);
    const handleLockEvent = () => setIsUnlocked(false);
    window.addEventListener("pingate:lock", handleLockEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener("pingate:lock", handleLockEvent);
    };
  }, []);

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
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
      setIsUnlocked(true);
      setErrorMsg("");
      setFailedAttempts(0);
      setPinInput("");
    } else {
      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);
      const penaltySeconds = Math.pow(nextAttempts, 2);
      setLockTimeLeft(penaltySeconds);
      setErrorMsg(`Hibás PIN! Zárolva: ${penaltySeconds} másodpercre.`);
      setPinInput("");
      setShake(true);
      setTimeout(() => setShake(false), 450);
    }
  };

  if (isUnlocked === null) {
    return <div className="min-h-screen bg-neutral-950" />;
  }

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-4 select-none relative overflow-hidden">
        <div className="absolute w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <motion.div
          animate={shake ? { x: [-10, 10, -8, 8, -4, 4, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="relative z-10 w-full max-w-sm bg-neutral-900/90 backdrop-blur-xl border-2 border-neutral-800 rounded-[32px] p-6 sm:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.9)] flex flex-col items-center gap-5 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-rose-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
            {lockTimeLeft > 0 ? (
              <ShieldAlert className="w-8 h-8 text-rose-500 animate-pulse" />
            ) : (
              <Lock className="w-8 h-8" />
            )}
          </div>

          <div>
            <h2 className="text-xl font-black uppercase tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-rose-300 to-white">
              Hit-Roulette Védelem
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Add meg a 6 számjegyű belépőkódot a feloldáshoz:
            </p>
          </div>

          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
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
                className="w-full bg-neutral-950 border-2 border-neutral-800 focus:border-amber-400 text-center text-2xl font-mono tracking-[0.45em] py-3.5 pl-10 pr-4 rounded-2xl text-white focus:outline-none disabled:opacity-40 transition shadow-inner"
                autoFocus
              />
            </div>

            {/* Vizuális 6-pontos állapotjelző */}
            <div className="flex justify-center gap-2">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${
                    idx < pinInput.length
                      ? "bg-amber-400 scale-125 shadow-[0_0_8px_#fbbf24]"
                      : "bg-neutral-800"
                  }`}
                />
              ))}
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-400 font-bold leading-tight bg-rose-500/10 border border-rose-500/30 py-2 px-3 rounded-xl">
                {lockTimeLeft > 0 ? `⏳ Újrapróbálás: ${lockTimeLeft} mp múlva` : errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={lockTimeLeft > 0 || pinInput.length < 6}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:from-neutral-800 disabled:to-neutral-800 disabled:text-neutral-500 text-neutral-950 font-black text-xs uppercase tracking-widest transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 active:scale-95"
            >
              <span>{lockTimeLeft > 0 ? `Zárolva (${lockTimeLeft}s)` : "Belépés"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="flex flex-col gap-0.5 text-[10px] text-neutral-500 font-mono pt-1 border-t border-neutral-800/80 w-full">
            <span>🛡️ Anti-Brute-Force védelem aktív</span>
            <span>⏱️ 4 óra után automatikusan visszazár</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
};