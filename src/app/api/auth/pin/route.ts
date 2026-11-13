import { NextResponse } from "next/server";
import {
  constantTimeEqualText,
  generateSignedToken,
  getExpectedPin,
  isProductionMissingPinConfig,
  verifySignedToken,
} from "@/lib/pinAuth";

interface RateLimitEntry {
  attempts: number;
  blockedUntil: number;
  lastSeen: number;
}

const attemptStore = new Map<string, RateLimitEntry>();
const MAX_TRACKED_IPS = 500;
const STALE_ENTRY_MS = 30 * 60 * 1000;

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim() || "unknown";
  }
  return request.headers.get("x-real-ip")?.trim() || "local";
}

function pruneAttemptStore(now: number) {
  if (attemptStore.size < MAX_TRACKED_IPS) return;
  for (const [ip, entry] of attemptStore.entries()) {
    if (now - entry.lastSeen > STALE_ENTRY_MS) {
      attemptStore.delete(ip);
    }
  }
}

// POST: PIN ellenőrzése szerveroldalon exponenciális brute-force védelemmel
export async function POST(request: Request) {
  try {
    if (isProductionMissingPinConfig()) {
      return NextResponse.json(
        {
          success: false,
          error: "Szerver konfigurációs hiba: a MASTER_PIN és PIN_SECRET beállítása kötelező!",
        },
        { status: 503 }
      );
    }

    const now = Date.now();
    const ip = getClientIp(request);
    pruneAttemptStore(now);

    const existing = attemptStore.get(ip);
    if (existing && existing.blockedUntil > now) {
      const retryAfterSec = Math.max(1, Math.ceil((existing.blockedUntil - now) / 1000));
      return NextResponse.json(
        {
          success: false,
          retryAfter: retryAfterSec,
          error: `Túl sok hibás próbálkozás! Próbáld újra ${retryAfterSec} mp múlva.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfterSec) },
        }
      );
    }

    const body = await request.json();
    const pin = String(body?.pin ?? "").trim();
    const expectedPin = getExpectedPin();

    if (pin.length > 0 && constantTimeEqualText(pin, expectedPin)) {
      attemptStore.delete(ip);
      const { token, expiresAt } = generateSignedToken();
      return NextResponse.json({ success: true, token, expiresAt });
    }

    const nextAttempts = (existing?.attempts ?? 0) + 1;
    const penaltySeconds = Math.min(300, Math.pow(nextAttempts, 2));
    attemptStore.set(ip, {
      attempts: nextAttempts,
      blockedUntil: now + penaltySeconds * 1000,
      lastSeen: now,
    });

    return NextResponse.json(
      {
        success: false,
        retryAfter: penaltySeconds,
        error: `Hibás belépőkód! Újrapróbálás: ${penaltySeconds} mp múlva.`,
      },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Érvénytelen kérés formátum!" },
      { status: 400 }
    );
  }
}

// GET: Meglévő munkamenet token érvényességének ellenőrzése
export async function GET(request: Request) {
  try {
    if (isProductionMissingPinConfig()) {
      return NextResponse.json({ valid: false, error: "Server PIN config missing" }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (token && verifySignedToken(token)) {
      return NextResponse.json({ valid: true });
    }

    return NextResponse.json({ valid: false }, { status: 401 });
  } catch {
    return NextResponse.json({ valid: false }, { status: 400 });
  }
}
