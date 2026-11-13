import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  constantTimeEqualText,
  generateSignedToken,
  getExpectedPin,
  getPinSecret,
  isProductionMissingPinConfig,
  verifySignedToken,
} from "../src/lib/pinAuth.ts";
import {
  evaluatePlayerGuesses,
  isFuzzyTextMatch,
  levenshteinSimilarity,
  normalizeForMatch,
} from "../src/lib/fuzzyMatch.ts";
import {
  checkBingo,
  createEmptyGrid,
  getMatchPointCells,
  isOneAwayFromBingo,
} from "../src/lib/bingoLogic.ts";
import {
  buildRoundHint,
  extractLyricSnippet,
  maskTextForHint,
} from "../src/lib/hintHelper.ts";

describe("pinAuth security helpers", () => {
  it("compares strings in constant time accurately", () => {
    assert.equal(constantTimeEqualText("303646", "303646"), true);
    assert.equal(constantTimeEqualText("303646", "303647"), false);
    assert.equal(constantTimeEqualText("short", "much-longer-string"), false);
  });

  it("generates and verifies valid HMAC tokens", () => {
    const secret = "test-secret-key-123";
    const now = 1_700_000_000_000;
    const { token, expiresAt } = generateSignedToken(secret, now);

    assert.equal(expiresAt, now + 4 * 60 * 60 * 1000);
    assert.equal(verifySignedToken(token, secret, now + 60_000), true);
  });

  it("rejects expired, tampered, wrong-secret, and malformed tokens without throwing", () => {
    const secret = "test-secret-key-123";
    const now = 1_700_000_000_000;
    const { token } = generateSignedToken(secret, now);

    assert.equal(verifySignedToken(token, secret, now + 5 * 60 * 60 * 1000), false);
    assert.equal(verifySignedToken(token, "wrong-secret", now + 1000), false);

    const parts = token.split(":");
    const tampered = `${Number(parts[0]) + 1}:${parts[1]}:${parts[2]}`;
    assert.equal(verifySignedToken(tampered, secret, now + 1000), false);

    // Malformed lengths (previously caused timingSafeEqual RangeError)
    assert.equal(verifySignedToken("123:456:abcd", secret, now), false);
    assert.equal(verifySignedToken("invalid", secret, now), false);
    assert.equal(verifySignedToken("", secret, now), false);
    assert.equal(verifySignedToken("abc:def:" + "z".repeat(64), secret, now), false);
    assert.equal(verifySignedToken(token, "", now + 1000), false);
  });

  it("enforces explicit PIN_SECRET and MASTER_PIN in production mode", () => {
    const prevSecret = process.env.PIN_SECRET;
    const prevPin = process.env.MASTER_PIN;
    try {
      delete process.env.PIN_SECRET;
      delete process.env.MASTER_PIN;

      assert.equal(isProductionMissingPinConfig("development"), false);
      assert.equal(isProductionMissingPinConfig("production"), true);
      assert.throws(() => getPinSecret("production"));
      assert.throws(() => getExpectedPin("production"));
      assert.ok(getPinSecret("development").length > 0);
      assert.ok(getExpectedPin("development").length > 0);
    } finally {
      if (prevSecret !== undefined) process.env.PIN_SECRET = prevSecret;
      if (prevPin !== undefined) process.env.MASTER_PIN = prevPin;
    }
  });
});

describe("fuzzyMatch text normalization & matching", () => {
  it("normalizes Hungarian diacritics and punctuation cleanly", () => {
    assert.equal(normalizeForMatch("AC/DC - Back In Black!"), "acdc back in black");
    assert.equal(normalizeForMatch("Záray Márta & Vámosi János"), "zaray marta vamosi janos");
  });

  it("supports short exact matches like U2 while blocking stopword false positives", () => {
    assert.equal(isFuzzyTextMatch("U2", "U2"), true);
    assert.equal(isFuzzyTextMatch("the", "The Rolling Stones"), false);
    assert.equal(isFuzzyTextMatch("12", "1982"), false);
    assert.equal(isFuzzyTextMatch("zaray", "Záray Márta"), true);
    assert.equal(isFuzzyTextMatch("Bohimian Rapsody", "Bohemian Rhapsody"), true);
    assert.equal(levenshteinSimilarity("queen", "queen"), 1);
  });
});

describe("evaluatePlayerGuesses category & scoring rules", () => {
  const sampleTrack = {
    id: 1,
    title: "Reptér",
    artist: "Korda György",
    year: 1981,
  };

  it("requires year match for year category and awards artist/title only as partial units", () => {
    const yearCat = {
      id: "year",
      label: "Megjelenési Év",
      lines: ["MEGJELENÉSI", "ÉV"],
      desc: "Találd el +/- 2 éven belül!",
      targetType: "year",
      colors: ["#a", "#b"],
      accent: "#fff",
    };

    const [rightYear, wrongYearRightArtist] = evaluatePlayerGuesses(
      [
        {
          playerName: "Anna",
          year: 1982,
          text: "",
          artistGuess: "Korda Gyorgy",
          riskDouble: false,
          submittedAt: 1000,
        },
        {
          playerName: "Béla",
          year: 2005,
          text: "Korda György - Reptér",
          artistGuess: "Korda György",
          titleGuess: "Reptér",
          riskDouble: false,
          submittedAt: 900,
        },
      ],
      sampleTrack,
      yearCat,
      "year",
      "1/3"
    );

    assert.equal(rightYear.playerName, "Anna");
    assert.equal(rightYear.earnedRegularWin, true);
    assert.equal(rightYear.earnedCredits, 1);
    assert.equal(rightYear.earnedPartialUnits, 1);

    assert.equal(wrongYearRightArtist.playerName, "Béla");
    assert.equal(wrongYearRightArtist.earnedRegularWin, false);
    assert.equal(wrongYearRightArtist.earnedCredits, 0);
    assert.equal(wrongYearRightArtist.earnedPartialUnits, 2);
  });

  it("handles Double or Nothing wins and penalties accurately", () => {
    const [winner, loser] = evaluatePlayerGuesses(
      [
        {
          playerName: "Cili",
          year: 1981,
          text: "",
          riskDouble: true,
          submittedAt: 100,
        },
        {
          playerName: "Dani",
          year: 1982,
          text: "",
          riskDouble: true,
          submittedAt: 200,
        },
      ],
      sampleTrack,
      null,
      "year",
      "off"
    );

    assert.equal(winner.wonDouble, true);
    assert.equal(winner.earnedCredits, 2);
    assert.equal(winner.penalty, 0);

    assert.equal(loser.wonDouble, false);
    assert.equal(loser.earnedCredits, 0);
    assert.equal(loser.penalty, 1);
    assert.equal(loser.earnedPartialUnits, 0);
  });

  it("allows any category match on bonus category", () => {
    const bonusCat = {
      id: "bonus",
      label: "Szabad Választás",
      lines: ["SZABAD", "VÁLASZTÁS"],
      desc: "Bármi jó!",
      targetType: "all",
      colors: ["#a", "#b"],
      accent: "#fff",
    };

    const [res] = evaluatePlayerGuesses(
      [
        {
          playerName: "Eszter",
          year: 2010,
          text: "Korda György",
          artistGuess: "Korda György",
          riskDouble: false,
          submittedAt: 100,
        },
      ],
      sampleTrack,
      bonusCat,
      "all",
      "1/3"
    );

    assert.equal(res.earnedRegularWin, true);
    assert.equal(res.earnedCredits, 1);
  });
});

describe("bingoLogic win & match-point radar", () => {
  it("detects row, column, and diagonal bingos accurately", () => {
    const empty = createEmptyGrid();
    assert.equal(checkBingo(empty), false);

    const rowWin = createEmptyGrid();
    for (let c = 0; c < 5; c++) rowWin[2][c] = true;
    assert.equal(checkBingo(rowWin), true);

    const colWin = createEmptyGrid();
    for (let r = 0; r < 5; r++) colWin[r][4] = true;
    assert.equal(checkBingo(colWin), true);

    const diagWin = createEmptyGrid();
    for (let i = 0; i < 5; i++) diagWin[i][4 - i] = true;
    assert.equal(checkBingo(diagWin), true);
  });

  it("identifies exact match-point finishing cells when 1 X away from Bingo", () => {
    const grid = createEmptyGrid();
    // 4 marked along main diagonal except (2,2), plus 4 marked on row 0 except (0,4)
    grid[0][0] = true;
    grid[1][1] = true;
    grid[3][3] = true;
    grid[4][4] = true;

    grid[0][1] = true;
    grid[0][2] = true;
    grid[0][3] = true;

    assert.equal(isOneAwayFromBingo(grid), true);
    const cells = getMatchPointCells(grid);
    assert.equal(cells.has("2-2"), true);
    assert.equal(cells.has("0-4"), true);
    assert.equal(cells.size, 2);
  });

  it("clears match-point radar once Bingo is already achieved", () => {
    const won = createEmptyGrid();
    for (let c = 0; c < 5; c++) won[0][c] = true;
    won[1][0] = true;
    won[2][0] = true;
    won[3][0] = true;

    assert.equal(checkBingo(won), true);
    assert.equal(isOneAwayFromBingo(won), false);
    assert.equal(getMatchPointCells(won).size, 0);
  });
});

describe("hintHelper progressive clues", () => {
  const track = {
    id: 42,
    title: "Reptér",
    artist: "Korda György",
    year: 1981,
    language: "hu",
    genre: "Pop",
    lyrics: "[00:02.00] Intro\n[00:10.00] Állok a repülőtéren este tízkor\n[00:25.00] Felszáll a gép a magasba",
  };

  it("masks words keeping initial characters and preserving punctuation", () => {
    assert.equal(maskTextForHint("Korda György"), "K•••• G•••••");
    assert.equal(maskTextForHint("A-ha!"), "A-h•!");
  });

  it("extracts representative lyric snippet stripping LRC tags", () => {
    const snippet = extractLyricSnippet(track.lyrics);
    assert.equal(snippet, "Felszáll a gép a magasba");
    assert.equal(extractLyricSnippet(track.lyrics, "Egyedi idézet"), "Egyedi idézet");
  });

  it("builds 3 progressive hint levels accurately", () => {
    assert.equal(buildRoundHint(track, 0), null);

    const h1 = buildRoundHint(track, 1);
    assert.equal(h1?.level, 1);
    assert.ok(h1?.text.includes("1980–1984"));

    const h2 = buildRoundHint(track, 2);
    assert.equal(h2?.level, 2);
    assert.ok(h2?.text.includes("K•••• G•••••"));
    assert.ok(h2?.text.includes("R•••••"));

    const h3 = buildRoundHint(track, 3);
    assert.equal(h3?.level, 3);
    assert.ok(h3?.text.includes("Felszáll a gép a magasba"));
  });
});



