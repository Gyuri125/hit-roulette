export interface Track {
  id: string | number;
  title: string;
  artist: string;
  year: number;
  audioUrl?: string;
  audioFile?: string;
  coverUrl?: string;
  genre?: string;
  lyrics?: string;       // Teljes dalszöveg vagy refrén
  lyricsHint?: string;   // 1-2 sor segítségnek a zene alatt
}