<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Hit-Roulette Developer & AI Agent Guide

Welcome to the **Hit-Roulette** codebase. This document serves as the single source of truth for AI agents (Antigravity, Claude, Copilot, Gemini) and human contributors working on this project.

---

## 1. Project Essence & Architecture

Hit-Roulette is an interactive music party game combining **Hitster** (guessing song release year, artist, and title) with **Roulette** (category selector), **Bingo** (5x5 player board), and **Kahoot** (real-time mobile blind guessing & buzzer).

### Core Architecture
- **Single Page App (Next.js 16 App Router)**:
  - Driven almost entirely through `src/app/page.tsx`, which serves as both the **Host (TV Screen)** and **Mobile Client (Smartphone)** depending on URL query param (`?room=XXXX`) or `localStorage`.
- **Media CDN (Cloudflare R2)**:
  - 687 songs and cover images are hosted remotely on Cloudflare R2 (`https://pub-787e97fb58a04330b0cb1791afeba37a.r2.dev/{id}.mp3` and `.jpg`).
- **Serverless Realtime Network (Supabase Realtime Broadcast)**:
  - There is no custom backend server or database polling. Host and mobile devices communicate over WebSockets via Supabase channel `room_${roomCode}`.
- **Synthesized Audio Engine**:
  - Sound effects (fanfare, buzzer, clicks, markers, airhorn, trombone, crickets, drumroll) are synthesized live using the Web Audio API (`AudioContext` oscillators), requiring no sound file downloads.

---

## 2. Directory & Component Structure

```
src/
├── app/
│   ├── layout.tsx         # HTML shell, metadata, and root layout
│   ├── globals.css        # Tailwind directives and base background styling
│   └── page.tsx           # Monolithic coordinator: Host state, mobile client, audio player, realtime channels
├── components/
│   ├── MusicCard.tsx      # 3D interactive holographic flip card with synchronized LRC lyrics & visualizer
│   ├── RouletteWheel.tsx  # Interactive SVG roulette wheel with presets, physics, and custom category editor
│   ├── PlayerBoard.tsx    # 5x5 Bingo boards, player manager, sound effects, confetti trigger
│   ├── PinGate.tsx        # Client-side 6-digit PIN lock with brute-force exponential backoff
│   ├── AudioPlayer.tsx    # [PLANNED] Modular audio playback extracted from page.tsx (currently empty)
│   └── SettingsModal.tsx  # [PLANNED] Extracted settings & filter controls (currently empty)
├── data/
│   └── tracks.json        # 687 track entries with LRC lyrics, genre, language, year, and R2 media URLs
├── lib/
│   └── supabase.ts        # Supabase client initialized via NEXT_PUBLIC_SUPABASE_URL and ANON_KEY
└── types/
    └── track.ts           # Track interface definition
```

---

## 3. Data Models & Schemas

### `Track` (`src/types/track.ts`)
```typescript
export interface Track {
  id: string | number;
  title: string;
  artist: string;
  year: number;
  audioUrl?: string;
  audioFile?: string;
  coverUrl?: string;
  genre?: string;
  language?: "hu" | "en" | string;
  lyrics?: string;       // Synced LRC format (e.g. "[01:23.45] Lyric text")
  lyricsHint?: string;   // Optional 1-2 line teaser
}
```

### `PlayerData` (`src/components/PlayerBoard.tsx`)
```typescript
export interface PlayerData {
  id: string;
  name: string;
  notes: string;
  grid: boolean[][]; // 5x5 boolean matrix
  hasWon: boolean;
  isOnline?: boolean;
}
```

### `Category` (`src/components/RouletteWheel.tsx`)
```typescript
export interface Category {
  id: string;
  label: string;
  lines: [string, string];
  desc: string;
  targetType: "year" | "title" | "artist" | "all";
  colors: [string, string];
  accent: string;
}
```

### `PlayerGuess` (`src/app/page.tsx`)
```typescript
export interface PlayerGuess {
  playerName: string;
  year: number;
  text: string;
  riskDouble: boolean;   // "Double or Nothing" gamble
  submittedAt: number;
}
```

---

## 4. Supabase Realtime Protocol (`room_${roomCode}`)

Host and players communicate on channel `room_${roomCode}` using broadcast events (`broadcast: { self: false }`).

| Event Name | Direction | Payload Structure | Purpose |
| :--- | :--- | :--- | :--- |
| `player_sync` | Client ➔ Host | `{ id, name, grid, notes, hasWon }` | Mobile updates its 5x5 board or name on the TV |
| `sync_request` | Client ➔ Host | `{ playerName }` | Fired when phone screen wakes up (Visibility API) |
| `game_state` | Host ➔ Client | `{ activeCategory, targetType, doubleOrNothingEnabled, strictQuizMode, resetRound? }` | Broadcasts current rules and resets round inputs |
| `submit_guess` | Client ➔ Host | `{ playerName, year, text, riskDouble }` | Submits blind Kahoot-style guess to the TV |
| `buzzer_ring` | Client ➔ Host | `{ playerName }` | First player to buzz stops audio and flashes their name |
| `award_credits` | Host ➔ Client | `{ awards: { [playerName]: { deltaCredits, penalty, reason } } }` | Transmits earned X marks or penalty deductions |
| `remote_control` | Client ➔ Host | `{ command: "toggle_play" \| "flip" \| "next" \| "spin" \| "switch_tab" \| "open_podium" }` | Host phone controls TV display |
| `party_reaction` | Client ➔ Host | `{ playerName, emoji?, sound? }` | Floating emoji cannon & party sound effect triggers |

---

## 5. Key Algorithms & Subsystems

### 1. Smart Intro Skip
- Analyzes LRC timestamps using `getFirstLyricTime(lyrics)`.
- If vocals begin after 6 seconds, jumps playback directly to `max(0, firstTime - 5)` seconds, bypassing long instrumentals during party play.

### 2. Fuzzy Levenshtein Text Matcher
- `normalizeForMatch(str)`: Lowercases, decomposes Unicode (`NFD`), removes diacritics (`á->a`, `ő->o`), and strips special characters (`AC/DC -> acdc`).
- Computes Levenshtein similarity. Accepts answers if similarity $\ge 75\%$ or substring is contained.

### 3. Strict Quiz Mode & Penalty Economy
- When active, players cannot mark random cells on their mobile board.
- Correct guesses award `+1 X credit` (or `+2 X credits` on successful "Double or Nothing").
- Failed "Double or Nothing" imposes a `-1 X penalty debt`, forcing the player to erase a previously placed mark.

### 4. Audio Engine & Volume Faders
- Custom `fadeIn` and `fadeOut` volume timers using 30ms interval steps (over 1500–1800ms) prevent popping and harsh cutoffs.
- Shared Web Audio context (`getSharedAudioContext`) handles all custom oscillators.

### 5. 16:9 TV Mode, Layout Sizing & Pro Kerék Stúdió
- `isTvMode`: Expands host layout for wide screens (`max-w-[1920px]`), increases roulette wheel size (400px–650px), expands card and vinyl player, eliminates dead central gap.
- **Draggable Gap Splitter & Edge Resizers**: Interactive middle divider (`MoveHorizontal`) and outer edge handles to drag-to-resize gap (8px–140px), wheel size, and card width in real-time.
- **TV Layout Menu (`📐 Méret & Rés`)**: Instant presets (*Cinema Full*, *Balanced*, *Compact*) and precise sliders for gap, wheel, and card sizing persisted in `localStorage` (`hit_tv_layout_prefs`).
- **Kerék Stúdió PRO TV**: Modal expands up to 1550px width (`w-[95vw]`), featuring a 420px live preview wheel, maximize toggle, and high-legibility inputs.
- `tvScale`: UI zoom scaler (90% to 160%, presets: 100%, 115%, 125%, 140%, 155%), persisted in `localStorage`.
- Keyboard shortcuts: `Space` (flip/play), `P` (play/pause), `ArrowRight` (next), `R` (spin), `F` (fullscreen), `T` (toggle 16:9 TV mode).

---

## 6. Security & Authentication (`PinGate`)

- PIN validation is handled strictly server-side in `/api/auth/pin` (`src/app/api/auth/pin/route.ts`).
- `MASTER_PIN` and `PIN_SECRET` reside in server environment variables and are NEVER exposed to client bundles.
- Valid logins receive an HMAC-SHA256 signed token valid for 4 hours, verified on app launch.

---

## 7. Technical Debt & Refactoring Priorities

When modifying or expanding the codebase, prioritize these areas:

1. **`page.tsx` Monolith Deconstruction**:
   - `src/app/page.tsx` is over 2,700 lines. Separate Host UI (`HostView.tsx`) and Mobile Client UI (`MobileClientView.tsx`).
   - Fill in `AudioPlayer.tsx` and `SettingsModal.tsx` which are currently 0-byte placeholders.
2. **Bundle Optimization (`tracks.json`)**:
   - `src/data/tracks.json` is 1.63 MB and imported directly into `page.tsx`. This inflates the client JS bundle. Consider lazy loading or an API endpoint.
3. **Local QR Code Generator**:
   - Currently uses `api.qrserver.com`. Replace with a local client-side QR renderer (e.g., `qrcode.react`) to eliminate external network dependency.

---

## 8. Development & Verification Commands

```bash
# Start development server (Turbopack)
npm run dev

# Run ESLint validation
npm run lint

# TypeScript verification
npx tsc --noEmit

# Production build verification
npm run build
```
