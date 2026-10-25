# 🎵 Hit-Roulette • Hitster & Rulett Parti Kiadás

> **Interaktív zenei kvíz, Hitster-stílusú Bingó és szerencsekerék parti játék nagyképernyőre (TV) és okostelefonokra.**

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-61dafb?style=flat-square&logo=react)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Realtime-3ecf8e?style=flat-square&logo=supabase)](https://supabase.com/)
[![Cloudflare R2](https://img.shields.io/badge/Cloudflare-R2_Storage-f38020?style=flat-square&logo=cloudflare)](https://developers.cloudflare.com/r2/)

---

## 📖 Áttekintés

A **Hit-Roulette** egy modern, böngészőből futtatható parti társasjáték, amely a népszerű **Hitster**, az **orosz rulett / szerencsekerék**, a **Bingó** és a **Kahoot** legjobb elemeit ötvözi:

1. **Házigazda / TV Képernyő (Host View)**:
   - Hatalmas, látványos 3D lemezborító-kártya holografikus fénnyel és 180°-os átfordulással.
   - 32-sávos élő neonszínű hangvizualizáló (Equalizer).
   - Teljesen interaktív, testreszabható SVG rulettkerék hangeffektekkel és konfettivel.
   - Minden csatlakozott játékos 5×5-ös Bingó táblájának élő állapota.
   - Valós idejű Kahoot-stílusú tipp-kiértékelés, beérkező emoji-reakciók ágyúja és dobpergéses díjátadó (Podium / Hall of Fame).

2. **Mobil Kliens Képernyő (Player Mobile View)**:
   - A játékosok a TV-n megjelenő QR-kód beolvasásával vagy a 4 betűs szobakóddal azonnal csatlakozhatnak applikáció telepítése nélkül.
   - Interaktív 5×5-ös digitális Bingó menetlevél haptikus rezgéssel és szintetizált kattanó hangokkal.
   - **Buzzer (Nyomógomb)**: Aki először rácsap, annak a neve villog a TV-n, és a zene automatikusan megáll.
   - **Vak tippelés**: Évszám-csúszka, előadó/dalcím beviteli mező, valamint „Dupla vagy Semmi” kockáztatási lehetőség.
   - **Távirányító mód**: A házigazda a saját telefonjáról is vezérelheti a TV-t (lejátszás, forgatás, kártyafordítás, léptetés).
   - **Parti reakciók**: Lebegő emojik küldése és hangeffektek megszólaltatása a TV-n (légkürt, tücskök, harsona, dobpergés).

---

## ✨ Főbb funkciók és modulok

| Funkció | Leírás |
| :--- | :--- |
| **687 dalos zenetár** | Magyar és nemzetközi slágerek az 1960-as évektől egészen 2026-ig, Cloudflare R2 felhőtárhelyről streamelve (.mp3 és .jpg borító). |
| **Szinkronizált dalszöveg (LRC)** | Karaoke jellegű, soronként időzített dalszövegek; a kártya automatikusan a pillanatnyilag énekelt sorhoz görget. |
| **Smart Intro Skip** | Az LRC időbélyegekből automatikusan kiszámítja, mikor kezdődik az ének, és 5 másodperccel az ének elé ugrik a holtidők elkerülésére. |
| **Audio Fade-In / Fade-Out** | Finom 1.5 másodperces hangerő-felfutás és elhalkulás leállításkor vagy az időzítő lejártakor (nincs recsegő hirtelen vágás). |
| **Következő dal előtöltése** | A háttérben azonnal előkészíti és puffereli a következő kör dalát a folyamatos játékélményért. |
| **Szigorú Kvíz Mód & Csalásvédelem** | Automatikus pontszámítás: csak az tehet le X-et a táblájára, aki helyesen tippel. A sikertelen „Dupla vagy Semmi” büntetéssel jár (radírozás). |
| **Kipörgetett Színhez Kötött X Behúzás** | Csak a kerekén kipörgetett kategória színével megegyező mezőkre tehető X. A többi mező zárolt és halványított, a megfelelő mezők pulzáló fénnyel vezetnek. |
| **Részpont (Törtpont) Rendszer & Joker X** | Ha a feladvány pl. megjelenési év, de a játékos tudja az előadót vagy címet is, konfigurálható arányú törtpontot kap (`KI`, `1/3`, `1/5`, `1/10`), ami 1 egészre gyűlve tetszőleges színre letehető **Joker X**-re váltódik át! |
| **Pörgetési Zár (Kihagyás- & Csalásvédelem)** | Ha van olyan játékos, aki még nem húzta be a megérdemelt X-et (vagy nem vonta le a büntetést), a kerék nem indulhat el; figyelmeztető ablak és mobil rezgés ébreszti. |
| **Részletes Díjátadó & Karakter Különdíjak** | 8 egyedi különdíj (👑 Bajnok, 🎯 Sniper, ⚡ Villámagyú reakcióidő, 🤔 Taktikus átíró, ⏳ Időutazó mellélövés dalcímmel, 🔔 Buzzer, 🎲 Kaszinó királya, 💀 Főnix) + Részletes Játékos Kartoték és statisztikai táblázat. |
| **Fuzzy Levenshtein értékelés** | Ékezetmentesítő, írásjel-eltávolító és 75%-os elgépeléstűrő Levenshtein távolság motor a szöveges tippekhez. |
| **Web Audio szintézis** | Zéró külső hangfájl terhelés: minden kattanás, csilingelés, légkürt, fanfár és harsona közvetlenül a böngésző AudioContext oszcillátoraival generálódik. |
| **Anti-F5 és Wake Lock** | A játékállás, kreditek és pontok folyamatosan mentődnek `localStorage`-ba; a telefon képernyője nem alszik el a parti közben (Screen Wake Lock API). |
| **PinGate Belépésvédelem** | 6 jegyű PIN-kódos védelem exponenciálisan növekvő brute-force késleltetéssel és 4 órás megjegyzéssel. |

---

## 🛠️ Technológiai Stack

- **Keretrendszer**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **Könyvtár**: [React 19](https://react.dev/) + [TypeScript 5](https://www.typescriptlang.org/)
- **Stílus**: [TailwindCSS 3.4](https://tailwindcss.com/)
- **Animációk**: [Framer Motion](https://www.framer.com/motion/)
- **Valós idejű hálózat**: [Supabase Realtime Broadcast](https://supabase.com/docs/guides/realtime) (WebSockets, szervermentes kliens-kliens kommunikáció)
- **Média és CDN**: [Cloudflare R2](https://developers.cloudflare.com/r2/) (hangfájlok és borítóképek gyors elérése)
- **Ikonok & Effektek**: `lucide-react`, `canvas-confetti`

---

## 🚀 Telepítés és Futtatás

### Előfeltételek
- **Node.js**: v18.18+ vagy újabb
- **npm** (v9+) vagy **pnpm** / **yarn**

### 1. Függőségek telepítése
```bash
npm install
```

### 2. Környezeti változók beállítása
Hozd létre a `.env.local` fájlt a projekt gyökerében a Supabase eléréshez:
```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-anon-or-publishable-key>
```

### 3. Fejlesztői szerver indítása
```bash
npm run dev
```
Nyisd meg a böngészőben a [http://localhost:3000](http://localhost:3000) címet.

### 4. Éles build készítése és ellenőrzése
```bash
npm run build
npm run start
```
Kódellenőrzés:
```bash
npm run lint
```

---

## 🎮 Játékmenet és Szabályok

1. **Szoba nyitása**: Nyisd meg az alkalmazást a TV-n vagy laptopon, és add meg a belépési PIN kódot (alapértelmezett: `303646`).
2. **Kód & QR**: Kattints a jobb felső sarokban lévő szobakód gombra (`SZOBA: XXXX`). A TV képernyőjén megjelenik a csatlakozási QR-kód.
3. **Játékosok csatlakozása**: A játékosok leolvassák a QR-kódot a telefonjukkal, beírják a nevüket, és azonnal megjelennek a TV táblázatában.
4. **Pörgetés**: A házigazda megpörgeti a rulettkereket (pl. *Évszám*, *Dal címe*, *Előadó*, *Mindent bele* vagy *Szabad tipp*).
5. **Zenehallgatás és tippelés**:
   - A zene elindul (vagy az éneknél kezdve a Smart Intro Skip segítségével).
   - A játékosok a telefonjukon beküldik a tippjüket a lejárati idő előtt.
   - Bátor játékosok bekapcsolhatják a **„Dupla vagy Semmi”** kockázatot (2 pont vagy büntetés).
6. **Kártyafordítás**: A házigazda felfedi a kártyát (Space billentyű vagy mobil távirányító). A rendszer automatikusan kiértékeli a tippeket, jóváírja az X-krediteket a nyerteseknek, vagy büntetést oszt ki.
7. **Bingó!**: Ha valakinek kigyűlik 5 egymás melletti, alatti vagy átlós X, a képernyőt elárasztja a konfetti és megszólal a győzelmi fanfár.
8. **Díjátadó**: A parti végén a Podium gombbal előhívható a dicsőségfal (*Bajnok*, *Mesterlövész*, *Leggyorsabb*, *Kártyás Szerencsejátékos*).

---

## 📂 Projektstruktúra

```
hit-roulette/
├── public/                 # Statikus állományok (manifest.json, favicon)
├── scripts/                # Zenei előkészítő / adatkonvertáló Python szkriptek
├── src/
│   ├── app/
│   │   ├── globals.css     # Globális Tailwind és alapstílusok
│   │   ├── layout.tsx      # Next.js RootLayout és HTML metaadatok
│   │   └── page.tsx        # Főoldal (TV Host és Mobil Kliens nézet, állapotok)
│   ├── components/
│   │   ├── MusicCard.tsx     # 3D holografikus kártya, LRC dalszöveg & audio visualizer
│   │   ├── PinGate.tsx       # Belépési kapu PIN-ellenőrzéssel és brute-force védelemmel
│   │   ├── PlayerBoard.tsx   # 5×5 Bingó táblák, nyerésellenőrzés, Web Audio szintézis
│   │   ├── RouletteWheel.tsx # SVG szerencsekerék, pörgetési fizika, egyedi szeletszerkesztő
│   │   ├── AudioPlayer.tsx   # (Tervezett moduláris lejátszó komponens)
│   │   └── SettingsModal.tsx # (Tervezett beállítási modal)
│   ├── data/
│   │   └── tracks.json       # 687 dal metaadatai, R2 linkek és szinkronizált dalszövegek
│   ├── lib/
│   │   └── supabase.ts       # Supabase Realtime kliens inicializáció
│   └── types/
│       └── track.ts          # TypeScript interfészek (Track, Category, Guess)
├── AGENTS.md               # Részletes útmutató mesterséges intelligencia ágenseknek
├── eslint.config.mjs       # ESLint konfiguráció
├── package.json            # Függőségek és npm scriptek
└── tsconfig.json           # TypeScript konfiguráció
```

---

## 📺 16:9 TV Nézet, Húzható Elrendezés & Méretezés

A Házigazda (TV) nézet fejlécében és képernyőjén elérhető prémium testreszabási lehetőségek:
- **📺 16:9 TV Mód (`T` gyorsbillentyű)**: Tágas, modern 16:9 elrendezés megnövelt méretű rulettkerékkel (akár 650px átmérőig), nagyméretű bakelitlemezjátszóval és kártyakijelzővel, teljes képernyős kitöltéssel a felesleges fekete sávok és rések nélkül.
- **↔ Húzható Elválasztó (Draggable Gap Splitter)**: A rulettkerék és a zenei kártya közötti interaktív elválasztó sáv egérrel vagy érintéssel húzható balra/jobbra, valós időben szabályozva a két elem közti távolságot (8px-től 140px-ig).
- **↕ Szélen Húzható Elemméretezés & Gyorsgombok**: A kerék bal szélén és a kártya jobb szélén lévő fogantyúkkal vagy a lebegő `[-]` / `[+]` gombokkal közvetlenül átméretezhető a kerék és a kártya.
- **📐 Méret & Rés Menü**: 
  - **Gyors Sablonok**: 🎬 *Mozi (Full TV)* (óriás elemek, feszes 24px hézag), 🎯 *Optimális (Kiegyensúlyozott)*, ⚡ *Kompakt*.
  - **Finomhangoló Csúszkák**: Köztes rés, kerékátmérő és kártyaszélesség pixelpontos állítása automatikus `localStorage` mentéssel.
- **🔍 Méretarány (% Zoom)**: Közvetlen `[-]` és `[+]` gombokkal, illetve gyorsválasztó menüvel (100%, 115%, 125%, 140%, 155%) az egész felület mérete tetszőlegesen skálázható a kanapéról történő kényelmes olvasáshoz.
- **🎨 Kerék Stúdió PRO TV Nézet**: A feladványszerkesztő felugró ablak nagyképernyőn óriásira nyúlik (akár 1550px szélességben), 420px-es kristálytiszta élő előnézeti kerékkel, nagyobb betűkkel, kibővített csomagválasztóval és 1-kattintásos teljes képernyős nézettel.

---

## 🔒 Biztonsági és Architektúrális Tudnivalók

- **Biztonságos Szerveroldali PIN**: A belépési PIN-kód (`MASTER_PIN`) kizárólag a szerveroldali környezeti változóban él, a kliens JavaScript sosem tartalmazza azt. A hitelesítés a `/api/auth/pin` végponton keresztül, HMAC-SHA256 aláírt munkamenet-tokenekkel történik exponenciális brute-force védelemmel.
- **Supabase Realtime**: Csak WebSocket alapú broadcast eseményeket használ, az adatbázisban nem tárolódnak érzékeny személyes adatok.
- **Médiaelérés**: A dalok közvetlenül a Cloudflare R2 publikus bucketjéből töltődnek be, minimális szerverterhelést okozva.
