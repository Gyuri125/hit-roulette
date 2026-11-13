import type { Track } from "@/types/track";
import type { EvaluatedGuess, FractionalPointsRate, PlayerGuess } from "@/types/game";
import type { Category, TargetHighlight } from "@/components/RouletteWheel";

export const normalizeForMatch = (str: string): string =>
  str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export const levenshteinSimilarity = (a: string, b: string): number => {
  if (!a.length || !b.length) return 0;
  if (a === b) return 1;
  const matrix: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  const maxLen = Math.max(a.length, b.length);
  return (maxLen - matrix[a.length][b.length]) / maxLen;
};

export const isFuzzyTextMatch = (guessRaw: string, targetRaw: string): boolean => {
  const g = normalizeForMatch(guessRaw);
  const t = normalizeForMatch(targetRaw);
  if (!g.length || !t.length) return false;

  const gCompact = g.replace(/\s+/g, "");
  const tCompact = t.replace(/\s+/g, "");

  // Teljes egyezés (akár rövid, 2 karakteres előadókra is, pl. "U2", "LP")
  if (g === t || (gCompact.length >= 2 && gCompact === tCompact)) {
    return true;
  }

  const gWords = g.split(" ");
  const tWords = t.split(" ");

  // Ha az egybeszerkesztett tipp tartalmazza a teljes célpontot (pl. "U2 - With or Without You" -> "u2")
  if (t.length >= 2 && gWords.includes(t)) return true;
  if (t.length >= 4 && g.includes(t)) return true;

  // Ha a tipp >= 3 karakteres
  if (g.length < 3) return false;

  // Teljes szó egyezés a célponton belül (pl. "zaray" a "zaray marta & vamosi janos"-ban, "beatles" a "the beatles"-ben)
  if (g.length >= 4 && tWords.includes(g)) return true;

  // Részsztring egyezés: védjük ki a rövid kötőszavakat (pl. "the", "you", "egy")
  if (g.length >= 4 && t.includes(g) && g.length >= t.length * 0.45) {
    return true;
  }

  // Szóköz nélküli részsztring egyezés hosszabb szavakra (pl. "acdc", "bohemianrhapsody")
  if (
    gCompact.length >= 5 &&
    tCompact.includes(gCompact) &&
    gCompact.length >= tCompact.length * 0.45
  ) {
    return true;
  }
  if (tCompact.length >= 4 && gCompact.includes(tCompact)) {
    return true;
  }

  // Levenshtein hasonlóság >= 75%
  if (levenshteinSimilarity(g, t) >= 0.75) return true;
  if (levenshteinSimilarity(gCompact, tCompact) >= 0.75) return true;

  return false;
};

export const evaluatePlayerGuesses = (
  guessList: PlayerGuess[],
  currentTrack: Track | undefined,
  activeCategory: Category | null,
  guessTarget: TargetHighlight,
  fractionalPointsRate: FractionalPointsRate
): EvaluatedGuess[] => {
  if (!currentTrack) return [];
  const catId = activeCategory?.id || "year";
  const isFreeBonus =
    catId === "bonus" ||
    catId === "c_bonus" ||
    activeCategory?.label?.toLowerCase().includes("szabad") ||
    activeCategory?.label?.toLowerCase().includes("joker");

  return guessList
    .map((g) => {
      const yearDiff = Math.abs(g.year - currentTrack.year);
      const titleMatch = isFuzzyTextMatch(g.titleGuess || g.text, currentTrack.title);
      const artistMatch = isFuzzyTextMatch(g.artistGuess || g.text, currentTrack.artist);

      // Kategória-függő győzelmi feltétel (NAGYPONT)
      let earnedRegularWin = false;
      if (isFreeBonus) {
        earnedRegularWin = yearDiff <= 2 || titleMatch || artistMatch;
      } else if (catId === "c_exact_year" || catId === "y_exact") {
        earnedRegularWin = yearDiff === 0;
      } else if (catId === "y_5") {
        earnedRegularWin = yearDiff <= 5;
      } else if (catId === "c_decade" || catId === "y_dec") {
        earnedRegularWin = Math.floor(g.year / 10) === Math.floor(currentTrack.year / 10);
      } else if (catId === "y_2000") {
        earnedRegularWin = (g.year >= 2000) === (currentTrack.year >= 2000);
      } else if (guessTarget === "title") {
        earnedRegularWin = titleMatch;
      } else if (guessTarget === "artist") {
        earnedRegularWin = artistMatch;
      } else if (guessTarget === "all") {
        earnedRegularWin = yearDiff <= 2 && (titleMatch || artistMatch);
      } else {
        // Évszám alapú feladvány: ±2 év eltérés szükséges (az előadó/cím részpontot ad!)
        earnedRegularWin = yearDiff <= 2;
      }

      // Dupla vagy Semmi (szigorúbb feltétel a kategória szabályaihoz igazítva)
      let wonDouble = false;
      if (g.riskDouble) {
        if (isFreeBonus) {
          wonDouble = yearDiff === 0 || titleMatch || artistMatch;
        } else if (catId === "y_5" || catId === "c_decade" || catId === "y_dec" || catId === "y_2000") {
          wonDouble = earnedRegularWin;
        } else if (guessTarget === "title" || guessTarget === "artist") {
          wonDouble = earnedRegularWin;
        } else if (guessTarget === "all") {
          wonDouble = yearDiff <= 2 && titleMatch && artistMatch;
        } else {
          wonDouble = yearDiff === 0;
        }
      }

      const earnedCredits = g.riskDouble ? (wonDouble ? 2 : 0) : earnedRegularWin ? 1 : 0;
      const penalty = g.riskDouble && !wonDouble ? 1 : 0;

      // RÉSZPONT SZÁMÍTÁS (Másodlagos adatok eltalálása)
      const secondaryReasons: string[] = [];
      if (guessTarget === "artist" && !isFreeBonus) {
        if (titleMatch) secondaryReasons.push("🎵 Dalcím");
        if (yearDiff <= 1) secondaryReasons.push(yearDiff === 0 ? "📅 Pontos év" : "📅 Év (±1 év)");
      } else if (guessTarget === "title" && !isFreeBonus) {
        if (artistMatch) secondaryReasons.push("🎤 Előadó");
        if (yearDiff <= 1) secondaryReasons.push(yearDiff === 0 ? "📅 Pontos év" : "📅 Év (±1 év)");
      } else if (guessTarget === "all") {
        if (yearDiff === 0 && titleMatch && artistMatch) {
          secondaryReasons.push("⭐ Triumvirátus bónusz");
        }
      } else {
        if (artistMatch) secondaryReasons.push("🎤 Előadó");
        if (titleMatch) secondaryReasons.push("🎵 Dalcím");
      }

      const earnedPartialUnits = fractionalPointsRate !== "off" ? secondaryReasons.length : 0;

      return {
        ...g,
        yearDiff,
        titleMatch,
        artistMatch,
        wonDouble,
        earnedRegularWin,
        earnedCredits,
        penalty,
        secondaryReasons,
        earnedPartialUnits,
      };
    })
    .sort(
      (a, b) =>
        b.earnedCredits - a.earnedCredits ||
        b.earnedPartialUnits - a.earnedPartialUnits ||
        a.yearDiff - b.yearDiff ||
        a.submittedAt - b.submittedAt
    );
};
