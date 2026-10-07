export interface Track {
  id: string | number;
  title: string;
  artist: string;
  year: number;
  audioUrl: string;
  coverUrl?: string; // Borítókép támogatás
  genre?: string;
  hint?: string;
}