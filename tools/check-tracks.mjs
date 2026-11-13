import fs from "node:fs";
import path from "node:path";

const tracksPath = path.resolve("src/data/tracks.json");
const raw = fs.readFileSync(tracksPath, "utf8");
const tracks = JSON.parse(raw);

if (!Array.isArray(tracks)) {
  console.error("❌ tracks.json gyökéreleme nem tömb!");
  process.exit(1);
}

const errors = [];
const warnings = [];
const idSeen = new Set();
const songSeen = new Set();
const langCounts = {};
const genreCounts = {};
let withLyrics = 0;

const lrcRegex = /^\[\d{2}:\d{2}(\.\d{2,3})?\]/;

tracks.forEach((t, idx) => {
  const label = `#${idx} (${t?.id ?? "no-id"})`;
  if (!t || typeof t !== "object") {
    errors.push(`${label}: érvénytelen objektum`);
    return;
  }

  if (t.id === undefined || t.id === null || String(t.id).trim() === "") {
    errors.push(`${label}: hiányzó id`);
  } else if (idSeen.has(String(t.id))) {
    errors.push(`${label}: duplikált id: ${t.id}`);
  } else {
    idSeen.add(String(t.id));
  }

  if (!t.title || !String(t.title).trim()) errors.push(`${label}: hiányzó title`);
  if (!t.artist || !String(t.artist).trim()) errors.push(`${label}: hiányzó artist`);

  const songKey = `${String(t.artist || "").trim().toLowerCase()}__${String(t.title || "").trim().toLowerCase()}`;
  if (songSeen.has(songKey)) {
    warnings.push(`${label}: duplikált előadó+dalcím: ${t.artist} - ${t.title}`);
  } else {
    songSeen.add(songKey);
  }

  if (typeof t.year !== "number" || t.year < 1900 || t.year > 2030) {
    errors.push(`${label}: érvénytelen évszám (${t.year})`);
  }

  if (!t.audioUrl || !/^https?:\/\//i.test(String(t.audioUrl))) {
    errors.push(`${label}: érvénytelen vagy hiányzó audioUrl (${t.audioUrl})`);
  }

  if (!t.coverUrl || !/^https?:\/\//i.test(String(t.coverUrl))) {
    warnings.push(`${label}: hiányzó vagy nem HTTP coverUrl (${t.coverUrl})`);
  }

  const lang = t.language || "unspecified";
  langCounts[lang] = (langCounts[lang] || 0) + 1;

  const genre = t.genre || "unspecified";
  genreCounts[genre] = (genreCounts[genre] || 0) + 1;

  if (t.lyrics && String(t.lyrics).trim()) {
    withLyrics++;
    const lines = String(t.lyrics).split("\n").filter((l) => l.trim().length > 0);
    const hasLrc = lines.some((l) => lrcRegex.test(l.trim()));
    if (!hasLrc) {
      warnings.push(`${label}: dalszöveg LRC időbélyegek nélkül`);
    }
  }
});

console.log(`🎵 Hit-Roulette Adatbázis Audit (${tracks.length} dal):`);
console.log(`   Nyelvek:`, langCounts);
console.log(`   Műfajok:`, genreCounts);
console.log(`   Szinkronizált/dalszöveges dalok: ${withLyrics}/${tracks.length}`);

if (warnings.length > 0) {
  console.warn(`⚠️ ${warnings.length} figyelmeztetés:`);
  warnings.slice(0, 10).forEach((w) => console.warn(`   - ${w}`));
  if (warnings.length > 10) console.warn(`   ... és további ${warnings.length - 10} figyelmeztetés.`);
}

if (errors.length > 0) {
  console.error(`❌ ${errors.length} kritikus hiba:`);
  errors.forEach((e) => console.error(`   - ${e}`));
  process.exit(1);
}

console.log("✅ Minden dal szerkezetileg rendben van (0 kritikus hiba, 0 duplikált ID).");

