import crypto from "crypto";

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
const DEV_FALLBACK_SECRET = "hit-roulette-default-secret-salt-2026";
const DEV_FALLBACK_PIN = "303646";

export function isUsingDefaultPinConfig(): boolean {
  return !process.env.MASTER_PIN?.trim() || !process.env.PIN_SECRET?.trim();
}

export function isProductionMissingPinConfig(
  nodeEnv: string | undefined = process.env.NODE_ENV
): boolean {
  return nodeEnv === "production" && isUsingDefaultPinConfig();
}

export function getPinSecret(nodeEnv: string | undefined = process.env.NODE_ENV): string {
  const configured = process.env.PIN_SECRET?.trim();
  if (configured) return configured;
  if (nodeEnv === "production") {
    throw new Error("PIN_SECRET environment variable must be set in production.");
  }
  return DEV_FALLBACK_SECRET;
}

export function getExpectedPin(nodeEnv: string | undefined = process.env.NODE_ENV): string {
  const configured = process.env.MASTER_PIN?.trim();
  if (configured) return configured;
  if (nodeEnv === "production") {
    throw new Error("MASTER_PIN environment variable must be set in production.");
  }
  return DEV_FALLBACK_PIN;
}

export function constantTimeEqualText(a: string, b: string): boolean {
  const hashA = crypto.createHash("sha256").update(a).digest();
  const hashB = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

export function generateSignedToken(
  secret: string = getPinSecret(),
  now: number = Date.now()
): { token: string; expiresAt: number } {
  if (!secret) {
    throw new Error("Signing secret must not be empty.");
  }
  const expiresAt = now + FOUR_HOURS_MS;
  const payload = `${now}:${expiresAt}`;
  const hmac = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return {
    token: `${payload}:${hmac}`,
    expiresAt,
  };
}

export function verifySignedToken(
  token: string,
  secret: string = getPinSecret(),
  now: number = Date.now()
): boolean {
  if (!token || typeof token !== "string" || !secret) return false;
  const parts = token.split(":");
  if (parts.length !== 3) return false;

  const [timestampStr, expiresAtStr, hmac] = parts;
  if (!/^\d+$/.test(timestampStr) || !/^\d+$/.test(expiresAtStr)) return false;
  if (!/^[a-f0-9]{64}$/i.test(hmac)) return false;

  const issuedAt = parseInt(timestampStr, 10);
  const expiresAt = parseInt(expiresAtStr, 10);
  if (Number.isNaN(issuedAt) || Number.isNaN(expiresAt) || expiresAt < issuedAt || now > expiresAt) {
    return false;
  }

  const payload = `${timestampStr}:${expiresAtStr}`;
  const expectedHmac = crypto.createHmac("sha256", secret).update(payload).digest("hex");

  const hmacBuf = Buffer.from(hmac.toLowerCase(), "utf8");
  const expectedBuf = Buffer.from(expectedHmac, "utf8");
  if (hmacBuf.length !== expectedBuf.length) return false;

  return crypto.timingSafeEqual(hmacBuf, expectedBuf);
}
