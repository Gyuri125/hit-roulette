"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Disc3, History, Trash2, Trophy, X } from "lucide-react";
import { RoundHistoryEntry } from "@/types/game";

interface HistoryDrawerProps {
  mounted: boolean;
  isOpen: boolean;
  onClose: () => void;
  history: RoundHistoryEntry[];
  onClearHistory: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  mounted,
  isOpen,
  onClose,
  history,
  onClearHistory,
}) => {
  const [confirmClear, setConfirmClear] = useState(false);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex justify-end bg-black/75 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setConfirmClear(false);
          onClose();
        }
      }}
    >
      <aside
        className="w-full max-w-md h-full bg-neutral-900 border-l-2 border-amber-500/40 shadow-[-20px_0_70px_rgba(0,0,0,0.9)] flex flex-col p-5 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3.5 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black uppercase tracking-wider text-base">
                Lejátszott Dalok ({history.length})
              </h3>
              <p className="text-[11px] text-neutral-400">
                Az este korábbi körei és nyertesei
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setConfirmClear(false);
              onClose();
            }}
            className="p-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1">
          {history.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-neutral-500 gap-2 p-8">
              <Disc3 className="w-12 h-12 text-neutral-700" />
              <p className="text-sm font-bold text-neutral-300">Még nincs felfordított dal ebben a menetben.</p>
              <p className="text-xs text-neutral-500">
                Amint felfedsz egy dalt a kártya megfordításával, itt visszanézhető marad!
              </p>
            </div>
          ) : (
            history.map((entry, idx) => (
              <div
                key={entry.id}
                className="p-3 rounded-2xl bg-neutral-950/90 border border-neutral-800 flex items-center gap-3 hover:border-amber-500/40 transition"
              >
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 shrink-0 flex items-center justify-center">
                  {entry.track.coverUrl ? (
                    <img
                      src={entry.track.coverUrl}
                      alt={entry.track.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Disc3 className="w-6 h-6 text-amber-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-neutral-500">
                      #{history.length - idx} • {new Date(entry.playedAt).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="text-xs font-black font-mono text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-lg border border-amber-500/30">
                      {entry.track.year}
                    </span>
                  </div>
                  <p className="font-black text-xs text-white truncate mt-0.5">{entry.track.title}</p>
                  <p className="text-[11px] text-neutral-400 truncate">{entry.track.artist}</p>

                  <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                    <span
                      className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded border"
                      style={{
                        borderColor: `${entry.categoryAccent}70`,
                        color: entry.categoryAccent,
                        backgroundColor: `${entry.categoryAccent}15`,
                      }}
                    >
                      {entry.categoryLabel}
                    </span>
                    {entry.winners.length > 0 ? (
                      <span className="text-[10px] font-bold text-emerald-300 flex items-center gap-1">
                        <Trophy className="w-3 h-3 text-amber-400" />
                        {entry.winners.join(", ")}
                      </span>
                    ) : (
                      <span className="text-[10px] text-neutral-500 italic">Nem volt nyertes</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {history.length > 0 && (
          <div className="pt-3 mt-3 border-t border-neutral-800 flex justify-between items-center">
            <button
              onClick={() => {
                if (!confirmClear) {
                  setConfirmClear(true);
                  setTimeout(() => setConfirmClear(false), 3500);
                  return;
                }
                setConfirmClear(false);
                onClearHistory();
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition ${
                confirmClear
                  ? "bg-rose-600 border-rose-400 text-white"
                  : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-rose-400"
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{confirmClear ? "Biztosan törlöd?" : "Előzmények törlése"}</span>
            </button>

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs uppercase"
            >
              Bezárás
            </button>
          </div>
        )}
      </aside>
    </div>,
    document.body
  );
};

