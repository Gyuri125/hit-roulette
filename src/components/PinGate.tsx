"use client";

import React, { useState, useEffect } from "react";
import { Lock, ShieldAlert, KeyRound, ArrowRight } from "lucide-react";

const MASTER_PIN = "303646";

interface PinGateProps {
  children: React.ReactNode;
}

export const PinGate: React.FC<PinGateProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>("");
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [lockTimeLeft, setLockTimeLeft] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const auth = sessionStorage.getItem("hit_auth_unlocked");
      if (auth === "true") setIsAuthenticated(true);
    }
  }, []);

  // Visszaszámláló a négyzetes zároláshoz
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
      sessionStorage.setItem("hit_auth_unlocked", "true");
      setIsAuthenticated(true);
      setErrorMsg("");
    } else {
      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);
      // NÉGYZETES BÜNTETÉS: (próbálkozások)^2 másodperc
      const penaltySeconds = Math.pow(nextAttempts, 2);
      setLockTimeLeft(penaltySeconds);
      setErrorMsg(`Hibás PIN! Rendszer zárolva: ${penaltySeconds} másodpercre.`);
      setPinInput("");
    }
  };

  if (isAuthenticated) {
    return <>{children}</>;
  }

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
            <KeyRound className="w-5 h-5 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-neutral-500" />
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              disabled={lockTimeLeft > 0}
              placeholder="••••••"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
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
            className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-neutral-800 disabled:text-neutral-500 text-neutral-950 font-black text-xs uppercase tracking-widest transition shadow-lg flex items-center justify-center gap-2"
          >
            <span>{lockTimeLeft > 0 ? `Zárolva (${lockTimeLeft}s)` : "Belépés"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <span className="text-[10px] text-neutral-600 font-mono">
          Anti-Brute-Force védelem aktív
        </span>
      </div>
    </div>
  );
};