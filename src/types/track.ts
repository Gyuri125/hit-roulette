export interface Track {
  id: string | number;
  title: string;
  artist: string;
  year: number;
  audioUrl?: string;
  audioFile?: string;
  coverUrl?: string;
  genre?: string;
  language?: "hu" | "en" | string; // <-- "hu" (magyar) vagy "en" (nemzetközi)
  lyrics?: string;                  // Teljes dalszöveg vagy LRC formátum
  lyricsHint?: string;              // 1-2 sor segítségnek a zene alatt
}