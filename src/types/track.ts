export interface Track {
  id: string;
  title: string;
  artist: string;
  year: number;
  genre: string;
  event?: string;       // Pl. "Woodstock éve", "A rendszerváltás éve"
  audioUrl: string;     // Google Drive direct link vagy helyi public link
}