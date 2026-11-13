import type { Track } from "./track";

export type MusicFilter = "all" | "hungarian" | "international";
export type SoundEffectType = "airhorn" | "crickets" | "trombone" | "drumroll" | "fanfare";
export type FractionalPointsRate = "off" | "1/3" | "1/5" | "1/10";
export type RemoteCommand =
  | "toggle_play"
  | "flip"
  | "next"
  | "spin"
  | "switch_tab"
  | "open_podium"
  | "reveal_hint";
export type TvTheme = "gala" | "synthwave" | "retro";

export interface RoundHint {
  level: number;
  badge: string;
  text: string;
}

export function getFractionalThreshold(rate: FractionalPointsRate): number {
  if (rate === "1/3") return 3;
  if (rate === "1/5") return 5;
  if (rate === "1/10") return 10;
  return 0;
}

export interface PlayerGuess {
  playerName: string;
  year: number;
  text: string;
  artistGuess?: string;
  titleGuess?: string;
  riskDouble: boolean;
  submittedAt: number;
}

export interface EvaluatedGuess extends PlayerGuess {
  yearDiff: number;
  titleMatch: boolean;
  artistMatch: boolean;
  wonDouble: boolean;
  earnedRegularWin: boolean;
  earnedCredits: number;
  penalty: number;
  secondaryReasons: string[];
  earnedPartialUnits: number;
}

export interface FloatingReaction {
  id: string;
  emoji: string;
  playerName: string;
  leftPercent: number;
}

export interface PlayerSessionStats {
  guessesCount: number;
  totalYearDiff: number;
  maxYearDiff: number;
  maxYearDiffSong?: string;
  exactYearCount: number;
  buzzerCount: number;
  riskCount: number;
  riskWonCount: number;
  riskLostCount: number;
  editCount: number;
  totalResponseTimeMs: number;
  fastestResponseTimeMs: number;
  partialUnitsTotal?: number;
  jokerCreditsTotal?: number;
  currentStreak?: number;
  maxStreak?: number;
}

export interface RoundHistoryEntry {
  id: string;
  track: Track;
  categoryLabel: string;
  categoryAccent: string;
  winners: string[];
  playedAt: number;
}

export interface PersonalRoundFeedback {
  trackId: string | number;
  artist: string;
  title: string;
  actualYear: number;
  guessedYear: number;
  yearDiff: number;
  earnedCredits: number;
  deltaJokerCredits: number;
  penalty: number;
  earnedPartialUnits: number;
  secondaryReasons: string[];
  artistMatch: boolean;
  titleMatch: boolean;
  streak?: number;
}

export interface TieBreakerState {
  active: boolean;
  contenders: string[];
  winner: string | null;
}
