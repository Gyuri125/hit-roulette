import type { Track } from "@/types/track";
import type { RoundHint } from "@/types/game";

/**
 * Maszkolja a szöveget úgy, hogy minden szó első alfanumerikus karaktere látható maradjon,
 * a szó többi betűje/száma helyére pedig `•` kerüljön (a szóközök és írásjelek megmaradnak).
 */
export function maskTextForHint(text: string): string {
  if (!text) return "";
  return text.replace(/[\p{L}\p{N}]+/gu, (word) => {
    const chars = Array.from(word);
    if (chars.length <= 1) return word;
    return `${chars[0]}${"•".repeat(chars.length - 1)}`;
  });
}

/**
 * Kinyer egy reprezentatív dalszöveg-sort az LRC időbélyegek eltávolításával.
 */
export function extractLyricSnippet(lyrics?: string, lyricsHint?: string): string | null {
  if (lyricsHint && lyricsHint.trim()) {
    return lyricsHint.trim();
  }
  if (!lyrics || !lyrics.trim()) return null;

  const cleanedLines = lyrics
    .split(/\r?\n/)
    .map((line) => line.replace(/\[[^\]]+\]/g, "").trim())
    .filter((line) => {
      if (line.length < 12) return false;
      const lower = line.toLowerCase();
      if (lower.includes("instrumental") || lower.includes("intro") || lower.includes("outro")) {
        return false;
      }
      return true;
    });

  if (!cleanedLines.length) return null;
  const pickIdx = Math.floor(cleanedLines.length / 2);
  const picked = cleanedLines[pickIdx];
  return picked.length > 90 ? `${picked.slice(0, 87)}...` : picked;
}

/**
 * Háromszintű progresszív körsúgót állít elő a jelenlegi dalhoz.
 */
export function buildRoundHint(track: Track | undefined, level: number): RoundHint | null {
  if (!track || level <= 0) return null;

  if (level === 1) {
    const decade = Math.floor(track.year / 10) * 10;
    const isFirstHalf = track.year % 10 < 5;
    const windowStr = isFirstHalf ? `${decade}–${decade + 4}` : `${decade + 5}–${decade + 9}`;
    return {
      level: 1,
      badge: "1/3 • Korszak súgó",
      text: `🕰️ A dal az ${decade}-as évek ${isFirstHalf ? "első" : "második"} felében (${windowStr}) jelent meg.`,
    };
  }

  if (level === 2) {
    return {
      level: 2,
      badge: "2/3 • Monogram súgó",
      text: `🔤 Előadó: ${maskTextForHint(track.artist)} • Cím: ${maskTextForHint(track.title)}`,
    };
  }

  const snippet = extractLyricSnippet(track.lyrics, track.lyricsHint);
  if (snippet) {
    return {
      level: 3,
      badge: "3/3 • Dalszöveg idézet",
      text: `🎤 Idézet: „${snippet}” (${maskTextForHint(track.artist)} – ${maskTextForHint(track.title)})`,
    };
  }

  const langLabel = track.language === "hu" ? "Magyar" : "Külföldi";
  const genreLabel = track.genre ? `, ${track.genre}` : "";
  return {
    level: 3,
    badge: "3/3 • Részletes súgó",
    text: `💿 ${langLabel}${genreLabel} • ${track.year} (${maskTextForHint(track.artist)} – ${maskTextForHint(track.title)})`,
  };
}

