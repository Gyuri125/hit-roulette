"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import { AlertTriangle, Bell, RefreshCw, Smartphone, Users, X, Zap } from "lucide-react";
import { PlayerData } from "@/components/PlayerBoard";
import { playMarkerSound } from "@/lib/audioEffects";

interface PendingMarksModalProps {
  mounted: boolean;
  isOpen: boolean;
  pendingPlayers: PlayerData[];
  onClose: () => void;
  onPingPlayers: () => void;
  onForceSpin: () => void;
}

export const PendingMarksModal: React.FC<PendingMarksModalProps> = ({
  mounted,
  isOpen,
  pendingPlayers,
  onClose,
  onPingPlayers,
  onForceSpin,
}) => {
  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-lg bg-neutral-900 border-2 border-rose-500/80 rounded-3xl p-6 shadow-[0_20px_70px_rgba(244,63,94,0.3)] flex flex-col gap-5 text-neutral-200 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="font-black uppercase tracking-wider text-white text-base">
                Várakozás X Behúzásra ({pendingPlayers.length} játékos)
              </h3>
              <p className="text-[11px] text-neutral-400">
                A következő pörgetés előtt a játékosoknak be kell jelölniük a pontjukat!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
          {pendingPlayers.map((p) => {
            const cr = p.credits ?? 0;
            const jcr = p.jokerCredits ?? 0;
            const db = p.debt ?? 0;
            return (
              <div
                key={p.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-neutral-950 border border-neutral-800"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-neutral-900 border border-neutral-700 flex items-center justify-center font-black text-amber-400 text-sm">
                    📱
                  </span>
                  <span className="font-bold text-white text-sm">{p.name}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {cr > 0 && (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-bold text-xs flex items-center gap-1">
                      <span>+{cr} X</span>
                      <span className="text-[10px] text-emerald-400 font-medium">kötött szín</span>
                    </span>
                  )}
                  {jcr > 0 && (
                    <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 font-bold text-xs flex items-center gap-1">
                      <span>⭐ +{jcr} Joker X</span>
                      <span className="text-[10px] text-amber-400 font-medium">bármely szín</span>
                    </span>
                  )}
                  {db > 0 && (
                    <span className="px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/50 text-rose-300 font-bold text-xs flex items-center gap-1">
                      <span>-{db} X</span>
                      <span className="text-[10px] text-rose-400 font-medium">levonás vár</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <button
            onClick={() => {
              onPingPlayers();
              playMarkerSound(true);
            }}
            className="w-full py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg shadow-amber-500/20"
          >
            <Bell className="w-4 h-4" />
            <span>Értesítés & Rezgés küldése a mobilokra</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onForceSpin}
              className="py-2.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition border border-neutral-700"
              title="Átugorja a várakozást és elindítja a kereket"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Pörgetés mindenképp</span>
            </button>

            <button
              onClick={onClose}
              className="py-2.5 px-3 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-white font-bold text-xs transition border border-neutral-800"
            >
              Mégse / Vissza
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

interface HostQrModalProps {
  mounted: boolean;
  isOpen: boolean;
  roomCode: string;
  joinUrl: string;
  onlinePlayers: PlayerData[];
  onClose: () => void;
  onResetSession: () => void;
}

export const HostQrModal: React.FC<HostQrModalProps> = ({
  mounted,
  isOpen,
  roomCode,
  joinUrl,
  onlinePlayers,
  onClose,
  onResetSession,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setConfirmReset(false);
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-sm bg-neutral-900 border-2 border-neutral-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center gap-4 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full flex justify-between items-center">
          <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Smartphone className="w-4 h-4" /> Mobil Csatlakozás
          </span>
          <button
            onClick={() => {
              setConfirmReset(false);
              onClose();
            }}
            className="text-neutral-500 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <p className="text-[11px] text-neutral-400 mb-1">Olvassátok be a telefon kamerájával:</p>
          <h2 className="text-3xl font-black tracking-widest text-white font-mono bg-neutral-950 py-1 px-4 rounded-xl border border-neutral-800 inline-block">
            {roomCode}
          </h2>
        </div>

        <div className="p-3 bg-neutral-950 rounded-2xl border border-neutral-800 shadow-inner flex items-center justify-center">
          <QRCodeSVG
            value={joinUrl}
            size={192}
            bgColor="#0a0a0a"
            fgColor="#fbbf24"
            level="M"
            className="rounded-lg shadow-sm"
          />
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
                <span
                  key={p.id}
                  className="text-xs font-bold px-2 py-0.5 rounded-md bg-neutral-900 border border-neutral-700 text-amber-400"
                >
                  📱 {p.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => {
            if (!confirmReset) {
              setConfirmReset(true);
              return;
            }
            setConfirmReset(false);
            onResetSession();
          }}
          className={`w-full py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
            confirmReset
              ? "bg-rose-600/30 border-rose-500 text-rose-200 animate-pulse"
              : "bg-neutral-950 hover:bg-rose-950/40 border-neutral-800 hover:border-rose-500/40 text-neutral-400 hover:text-rose-300"
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>
            {confirmReset ? "Biztos? Minden pont nullázódik — Kattints újra!" : "Új Szobakód & Táblák Nullázása"}
          </span>
        </button>
      </div>
    </div>,
    document.body
  );
};

interface JoinRoomScreenProps {
  roomCode: string;
  playerName: string;
  setPlayerName: (name: string) => void;
  onJoin: () => void;
  errorMsg: string | null;
}

export const JoinRoomScreen: React.FC<JoinRoomScreenProps> = ({
  roomCode,
  playerName,
  setPlayerName,
  onJoin,
  errorMsg,
}) => {
  return (
    <main className="min-h-[100dvh] bg-neutral-950 text-white flex items-center justify-center p-4 select-none relative overflow-hidden">
      <div className="absolute w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onJoin();
        }}
        className="relative z-10 w-full max-w-xs bg-neutral-900 border-2 border-neutral-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center gap-4 text-center"
      >
        <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <Smartphone className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-base font-black text-white uppercase tracking-wider">Csatlakozás a partihoz</h3>
          <p className="text-xs text-amber-400 font-mono mt-0.5">Szobaszám: {roomCode}</p>
        </div>

        <input
          type="text"
          placeholder="Add meg a neved (pl. Sajt)"
          value={playerName}
          maxLength={24}
          onChange={(e) => setPlayerName(e.target.value)}
          className="w-full bg-neutral-950 border-2 border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400 text-center font-bold"
          autoFocus
        />

        {errorMsg && (
          <p className="w-full text-xs text-rose-300 font-bold bg-rose-500/15 border border-rose-500/40 rounded-xl px-3 py-2">
            {errorMsg}
          </p>
        )}

        <button
          type="submit"
          className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-sm uppercase tracking-wider transition shadow-lg shadow-amber-500/20 active:scale-95"
        >
          Belépés a játékba
        </button>
      </form>
    </main>
  );
};

