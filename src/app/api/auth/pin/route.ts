import { NextResponse } from "next/server";
import crypto from "crypto";

const PIN_SECRET = process.env.PIN_SECRET || "hit-roulette-default-secret-salt-2026";
const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

function generateSignedToken(): { token: string; expiresAt: number } {
  const timestamp = Date.now();
  const expiresAt = timestamp + FOUR_HOURS_MS;
  const payload = `${timestamp}:${expiresAt}`;
  const hmac = crypto.createHmac("sha256", PIN_SECRET).update(payload).digest("hex");
  return {
    token: `${payload}:${hmac}`,
    expiresAt,
  };
}

function verifySignedToken(token: string): boolean {
  if (!token) return false;
  const parts = token.split(":");
  if (parts.length !== 3) return false;
  const [timestampStr, expiresAtStr, hmac] = parts;
  const expiresAt = parseInt(expiresAtStr, 10);
  if (isNaN(expiresAt) || Date.now() > expiresAt) return false;

  const payload = `${timestampStr}:${expiresAtStr}`;
  const expectedHmac = crypto.createHmac("sha256", PIN_SECRET).update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac));
}

// POST: PIN ellenőrzése szerveroldalon
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const pin = String(body?.pin || "").trim();
    const expectedPin = (process.env.MASTER_PIN || "303646").trim();

    if (pin === expectedPin) {
      const { token, expiresAt } = generateSignedToken();
      return NextResponse.json({ success: true, token, expiresAt });
    }

    return NextResponse.json(
      { success: false, error: "Hibás belépőkód!" },
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
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (token && verifySignedToken(token)) {
    return NextResponse.json({ valid: true });
  }

  return NextResponse.json({ valid: false }, { status: 401 });
}
