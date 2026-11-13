"use client";

import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Trophy, Volume2, X } from "lucide-react";
import { PlayerData } from "@/components/PlayerBoard";
import { PlayerSessionStats, SoundEffectType } from "@/types/game";
import { playPartySoundEffect } from "@/lib/audioEffects";

interface PodiumModalProps {
  mounted: boolean;
  isOpen: boolean;
  onClose: () => void;
  players: PlayerData[];
  sessionStats: Record<string, PlayerSessionStats>;
}

export const PodiumModal: React.FC<PodiumModalProps> = ({
  mounted,
  isOpen,
  onClose,
  players,
  sessionStats,
}) => {
  const [podiumTab, setPodiumTab] = useState<"awards" | "stats">("awards");

  const podiumData = useMemo(() => {
    const rankedPlayers = [...players]
      .map((p) => ({
        ...p,
        score: p.grid.flat().filter(Boolean).length,
      }))
      .sort((a, b) => Number(b.hasWon) - Number(a.hasWon) || b.score - a.score);

    const champion = rankedPlayers[0];

    let sniperName = "Még nincs tipp";
    let sniperDetail = "-";
    let maxExact = -1;
    let bestAvg = Infinity;
    Object.entries(sessionStats).forEach(([name, st]) => {
      if (st.guessesCount > 0) {
        const exact = st.exactYearCount || 0;
        const avg = st.totalYearDiff / st.guessesCount;
        if (exact > maxExact || (exact === maxExact && avg < bestAvg)) {
          maxExact = exact;
          bestAvg = avg;
          sniperName = name;
          sniperDetail = `${exact}× pontos telitalálat (Átlag ±${avg.toFixed(1)} év)`;
        }
      }
    });

    let fastestBrainName = "Még nincs tipp";
    let fastestBrainDetail = "-";
    let bestResponseTime = Infinity;
    Object.entries(sessionStats).forEach(([name, st]) => {
      if (st.guessesCount > 0 && (st.totalResponseTimeMs || 0) > 0) {
        const avgSec = st.totalResponseTimeMs / st.guessesCount / 1000;
        if (avgSec < bestResponseTime) {
          bestResponseTime = avgSec;
          fastestBrainName = name;
          const bestSingle =
            st.fastestResponseTimeMs < 99999
              ? (st.fastestResponseTimeMs / 1000).toFixed(1)
              : avgSec.toFixed(1);
          fastestBrainDetail = `Átlag: ${avgSec.toFixed(1)}s (Legjobb: ${bestSingle}s)`;
        }
      }
    });

    let tacticianName = "Még senki";
    let tacticianDetail = "0 módosítás";
    let maxEdits = 0;
    Object.entries(sessionStats).forEach(([name, st]) => {
      if ((st.editCount || 0) > maxEdits) {
        maxEdits = st.editCount;
        tacticianName = name;
        tacticianDetail = `${st.editCount}× írta át / változtatta a tippjét`;
      }
    });

    let timeTravelerName = "Még senki";
    let timeTravelerDetail = "-";
    let maxDiff = 0;
    Object.entries(sessionStats).forEach(([name, st]) => {
      if ((st.maxYearDiff || 0) > maxDiff) {
        maxDiff = st.maxYearDiff;
        timeTravelerName = name;
        timeTravelerDetail = `±${st.maxYearDiff} év mellé! (${st.maxYearDiffSong || "dal"})`;
      }
    });

    let fastestName = "Még senki";
    let fastestDetail = "0 csengetés";
    let maxBuzz = 0;
    Object.entries(sessionStats).forEach(([name, st]) => {
      if (st.buzzerCount > maxBuzz) {
        maxBuzz = st.buzzerCount;
        fastestName = name;
        fastestDetail = `${st.buzzerCount}× első csengetés`;
      }
    });

    let gamblerName = "Még senki";
    let gamblerDetail = "0 kockáztatás";
    let maxRisk = 0;
    Object.entries(sessionStats).forEach(([name, st]) => {
      if (st.riskCount > maxRisk) {
        maxRisk = st.riskCount;
        gamblerName = name;
        gamblerDetail = `${st.riskCount}× Dupla vagy Semmi (${st.riskWonCount || 0} siker)`;
      }
    });

    let phoenixName = "Még senki";
    let phoenixDetail = "0 bukott büntetés";
    let maxLost = 0;
    Object.entries(sessionStats).forEach(([name, st]) => {
      if ((st.riskLostCount || 0) > maxLost) {
        maxLost = st.riskLostCount;
        phoenixName = name;
        phoenixDetail = `${st.riskLostCount} elbukott büntetés után is talpon`;
      }
    });

    let hotStreakName = "Még senki";
    let hotStreakDetail = "0× nyerő széria";
    let bestStreak = 0;
    Object.entries(sessionStats).forEach(([name, st]) => {
      if ((st.maxStreak || 0) > bestStreak) {
        bestStreak = st.maxStreak || 0;
        hotStreakName = name;
        hotStreakDetail = `${bestStreak}× hibátlan kör zsinórban`;
      }
    });

    const detailedPlayerStats = rankedPlayers.map((p) => {
      const st = sessionStats[p.name] || {
        guessesCount: 0,
        totalYearDiff: 0,
        maxYearDiff: 0,
        exactYearCount: 0,
        buzzerCount: 0,
        riskCount: 0,
        riskWonCount: 0,
        riskLostCount: 0,
        editCount: 0,
        totalResponseTimeMs: 0,
        fastestResponseTimeMs: 999999,
      };

      return {
        id: p.id,
        name: p.name,
        score: p.score,
        hasWon: p.hasWon,
        guessesCount: st.guessesCount,
        avgResponseSec:
          st.guessesCount > 0 ? (st.totalResponseTimeMs / st.guessesCount / 1000).toFixed(1) : "-",
        fastestResponseSec:
          st.fastestResponseTimeMs < 99999 ? (st.fastestResponseTimeMs / 1000).toFixed(1) : "-",
        avgYearDiff: st.guessesCount > 0 ? (st.totalYearDiff / st.guessesCount).toFixed(1) : "-",
        exactYears: st.exactYearCount || 0,
        maxYearDiff: st.maxYearDiff > 0 ? `±${st.maxYearDiff} év` : "-",
        maxYearDiffSong: st.maxYearDiffSong || "",
        editCount: st.editCount || 0,
        buzzerCount: st.buzzerCount || 0,
        riskWon: st.riskWonCount || 0,
        riskTotal: st.riskCount || 0,
        partialUnitsTotal: st.partialUnitsTotal || 0,
        jokerCreditsTotal: st.jokerCreditsTotal || 0,
        maxStreak: st.maxStreak || 0,
      };
    });

    return {
      top3: rankedPlayers.slice(0, 3),
      championName: champion?.name || "Házigazda",
      championDetail: `${champion?.score || 0}/25 X ${champion?.hasWon ? "(BINGO!)" : ""}`,
      sniperName,
      sniperDetail,
      fastestBrainName,
      fastestBrainDetail,
      tacticianName,
      tacticianDetail,
      timeTravelerName,
      timeTravelerDetail,
      fastestName,
      fastestDetail,
      gamblerName,
      gamblerDetail,
      phoenixName,
      phoenixDetail,
      hotStreakName,
      hotStreakDetail,
      detailedPlayerStats,
    };
  }, [players, sessionStats]);

  if (!mounted || !isOpen) return null;

  const triggerSound = (s: SoundEffectType) => playPartySoundEffect(s);

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-xl overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-5xl bg-neutral-900 border-2 border-amber-400/80 rounded-[32px] sm:rounded-[36px] p-5 sm:p-7 shadow-[0_0_80px_rgba(245,158,11,0.35)] flex flex-col gap-5 text-center my-auto max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full flex justify-between items-center border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
              <Trophy className="w-7 h-7" />
            </div>
            <div className="text-left">
              <h2 className="text-lg sm:text-2xl font-black uppercase tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-rose-300 to-white">
                Hit-Roulette Hivatalos Díjátadó
              </h2>
              <p className="text-xs text-neutral-400">
                Az este karakteres különdíjai, rekordjai és részletes kartotékai
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition"
            title="Bezárás"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 p-1 bg-neutral-950 border border-neutral-800 rounded-2xl max-w-md mx-auto w-full">
          <button
            onClick={() => setPodiumTab("awards")}
            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 ${
              podiumTab === "awards"
                ? "bg-amber-500 text-neutral-950 shadow-md font-black"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <span>🎖️ Különdíjak & Karakterek</span>
          </button>
          <button
            onClick={() => setPodiumTab("stats")}
            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 ${
              podiumTab === "stats"
                ? "bg-amber-500 text-neutral-950 shadow-md font-black"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <span>📊 Részletes Kartoték</span>
          </button>
        </div>

        {podiumTab === "awards" && (
          <div className="flex flex-col gap-5 w-full">
            <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3 items-end pt-1">
              {podiumData.top3.map((p, idx) => {
                const medals = ["🥇 1. HELY (BAJNOK)", "🥈 2. HELY", "🥉 3. HELY"];
                const styles = [
                  "bg-gradient-to-b from-amber-500/25 to-neutral-950 border-amber-400 sm:h-44 shadow-[0_0_30px_rgba(245,158,11,0.2)]",
                  "bg-gradient-to-b from-slate-400/20 to-neutral-950 border-slate-400 sm:h-36",
                  "bg-gradient-to-b from-orange-700/20 to-neutral-950 border-orange-500 sm:h-32",
                ];
                return (
                  <div
                    key={p.id}
                    className={`rounded-3xl border-2 p-4 flex flex-col items-center justify-center gap-1.5 shadow-xl transition hover:scale-[1.02] ${styles[idx]}`}
                  >
                    <span className="text-xs font-black uppercase tracking-widest text-amber-300">
                      {medals[idx]}
                    </span>
                    <span className="text-lg sm:text-xl font-black text-white uppercase truncate max-w-full">
                      {p.name}
                    </span>
                    <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-neutral-900 border border-neutral-700 text-neutral-200">
                      {p.score} / 25 X {p.hasWon ? "🏆 BINGO" : ""}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-left">
              {[
                {
                  icon: "👑",
                  color: "border-amber-500/40",
                  badge: "bg-amber-500/15 border-amber-500/30",
                  titleColor: "text-amber-400",
                  title: "Az Este Bajnoka",
                  name: podiumData.championName,
                  detail: podiumData.championDetail,
                },
                {
                  icon: "🎯",
                  color: "border-emerald-500/40",
                  badge: "bg-emerald-500/15 border-emerald-500/30",
                  titleColor: "text-emerald-400",
                  title: "A Mesterlövész (Sniper)",
                  name: podiumData.sniperName,
                  detail: podiumData.sniperDetail,
                },
                {
                  icon: "⚡",
                  color: "border-cyan-500/40",
                  badge: "bg-cyan-500/15 border-cyan-500/30",
                  titleColor: "text-cyan-400",
                  title: "A Villámagyú (Válaszidő)",
                  name: podiumData.fastestBrainName,
                  detail: podiumData.fastestBrainDetail,
                },
                {
                  icon: "🤔",
                  color: "border-blue-500/40",
                  badge: "bg-blue-500/15 border-blue-500/30",
                  titleColor: "text-blue-400",
                  title: "A Taktikus (Átírogató)",
                  name: podiumData.tacticianName,
                  detail: podiumData.tacticianDetail,
                },
                {
                  icon: "⏳",
                  color: "border-fuchsia-500/40",
                  badge: "bg-fuchsia-500/15 border-fuchsia-500/30",
                  titleColor: "text-fuchsia-400",
                  title: "Az Időutazó (Mellélövés)",
                  name: podiumData.timeTravelerName,
                  detail: podiumData.timeTravelerDetail,
                },
                {
                  icon: "🔔",
                  color: "border-rose-500/40",
                  badge: "bg-rose-500/15 border-rose-500/30",
                  titleColor: "text-rose-400",
                  title: "A Villámcsengő (Buzzer)",
                  name: podiumData.fastestName,
                  detail: podiumData.fastestDetail,
                },
                {
                  icon: "🎲",
                  color: "border-purple-500/40",
                  badge: "bg-purple-500/15 border-purple-500/30",
                  titleColor: "text-purple-400",
                  title: "Kaszinók Királya (Dupla)",
                  name: podiumData.gamblerName,
                  detail: podiumData.gamblerDetail,
                },
                {
                  icon: "💀",
                  color: "border-orange-500/40",
                  badge: "bg-orange-500/15 border-orange-500/30",
                  titleColor: "text-orange-400",
                  title: "A Feltámadó Főnix",
                  name: podiumData.phoenixName,
                  detail: podiumData.phoenixDetail,
                },
                {
                  icon: "🔥",
                  color: "border-red-500/40",
                  badge: "bg-red-500/15 border-red-500/30",
                  titleColor: "text-red-400",
                  title: "A Lángoló Kezű (Széria)",
                  name: podiumData.hotStreakName,
                  detail: podiumData.hotStreakDetail,
                },
              ].map((award) => (
                <div
                  key={award.title}
                  className={`p-3.5 rounded-2xl bg-neutral-950/80 border ${award.color} flex items-center gap-3`}
                >
                  <div
                    className={`w-11 h-11 rounded-2xl ${award.badge} border flex items-center justify-center text-2xl shrink-0`}
                  >
                    {award.icon}
                  </div>
                  <div className="min-w-0">
                    <span className={`text-[10px] font-black uppercase tracking-wider ${award.titleColor} block truncate`}>
                      {award.title}
                    </span>
                    <h4 className="text-sm font-black text-white uppercase truncate">{award.name}</h4>
                    <p className="text-[11px] text-neutral-400 font-mono truncate" title={award.detail}>
                      {award.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {podiumTab === "stats" && (
          <div className="w-full overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-950 p-2 shadow-inner">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-2.5">Helyezés & Játékos</th>
                  <th className="p-2.5 text-center">X / 25</th>
                  <th className="p-2.5 text-center">⭐ Rész / Joker</th>
                  <th className="p-2.5 text-center">Tippek</th>
                  <th className="p-2.5 text-center">Átl. Idő</th>
                  <th className="p-2.5 text-center">Leggyorsabb</th>
                  <th className="p-2.5 text-center">🎯 Pontos</th>
                  <th className="p-2.5 text-center">Átl. Eltérés</th>
                  <th className="p-2.5 text-center">Legnagyobb Mellé</th>
                  <th className="p-2.5 text-center">🤔 Átírások</th>
                  <th className="p-2.5 text-center">🔔 Buzzer</th>
                  <th className="p-2.5 text-center">🎲 Dupla</th>
                  <th className="p-2.5 text-center">🔥 Széria</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900 font-medium">
                {podiumData.detailedPlayerStats.map((st, idx) => (
                  <tr key={st.id} className="hover:bg-neutral-900/60 transition">
                    <td className="p-2.5 flex items-center gap-2 font-bold text-white">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                          idx === 0
                            ? "bg-amber-400 text-black"
                            : idx === 1
                            ? "bg-slate-300 text-black"
                            : idx === 2
                            ? "bg-orange-400 text-black"
                            : "bg-neutral-800 text-neutral-400"
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <span className="truncate max-w-[120px]">{st.name}</span>
                      {st.hasWon && <span className="text-[10px] text-amber-400">🏆</span>}
                    </td>
                    <td className="p-2.5 text-center font-bold font-mono text-amber-400">{st.score}</td>
                    <td className="p-2.5 text-center font-mono text-amber-300 font-bold">
                      {st.partialUnitsTotal > 0 || st.jokerCreditsTotal > 0
                        ? `${st.partialUnitsTotal}⭐ (${st.jokerCreditsTotal} Joker)`
                        : "-"}
                    </td>
                    <td className="p-2.5 text-center text-neutral-400">{st.guessesCount}</td>
                    <td className="p-2.5 text-center font-mono text-cyan-300">
                      {st.avgResponseSec !== "-" ? `${st.avgResponseSec}s` : "-"}
                    </td>
                    <td className="p-2.5 text-center font-mono text-cyan-400 font-bold">
                      {st.fastestResponseSec !== "-" ? `${st.fastestResponseSec}s` : "-"}
                    </td>
                    <td className="p-2.5 text-center font-bold text-emerald-400 font-mono">{st.exactYears}×</td>
                    <td className="p-2.5 text-center font-mono text-neutral-300">
                      {st.avgYearDiff !== "-" ? `±${st.avgYearDiff} év` : "-"}
                    </td>
                    <td
                      className="p-2.5 text-center text-[11px] font-mono text-fuchsia-300 truncate max-w-[140px]"
                      title={st.maxYearDiffSong ? `${st.maxYearDiff} (${st.maxYearDiffSong})` : st.maxYearDiff}
                    >
                      {st.maxYearDiff}
                    </td>
                    <td className="p-2.5 text-center font-mono text-blue-300">{st.editCount}×</td>
                    <td className="p-2.5 text-center font-mono text-rose-300">{st.buzzerCount}×</td>
                    <td className="p-2.5 text-center font-mono text-purple-300">
                      {st.riskTotal > 0 ? `${st.riskWon}/${st.riskTotal}` : "-"}
                    </td>
                    <td className="p-2.5 text-center font-mono font-bold text-orange-300">
                      {st.maxStreak > 0 ? `${st.maxStreak}×` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="w-full flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-neutral-800">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => triggerSound("airhorn")}
              className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition"
            >
              <Volume2 className="w-4 h-4" />
              <span>🎺 Duda</span>
            </button>
            <button
              onClick={() => triggerSound("drumroll")}
              className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition"
            >
              <span>🥁 Dobpergés</span>
            </button>
            <button
              onClick={() => triggerSound("fanfare")}
              className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition"
            >
              <span>🎉 Fanfár</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-amber-500/20"
          >
            Vissza a Játékhoz / Bezárás
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};

