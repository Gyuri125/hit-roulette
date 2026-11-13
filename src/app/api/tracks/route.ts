import { NextResponse } from "next/server";
import tracksData from "@/data/tracks.json";
import { isProductionMissingPinConfig, verifySignedToken } from "@/lib/pinAuth";

export async function GET(request: Request) {
  try {
    if (isProductionMissingPinConfig()) {
      return NextResponse.json(
        { error: "Szerver konfigurációs hiba: MASTER_PIN és PIN_SECRET hiányzik." },
        { status: 503 }
      );
    }

    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

    if (!token || !verifySignedToken(token)) {
      return NextResponse.json(
        { error: "Hitelesítés szükséges a dallista lekéréséhez." },
        { status: 401 }
      );
    }

    return NextResponse.json(tracksData, {
      headers: {
        "Cache-Control": "private, max-age=3600",
        Vary: "Authorization",
      },
    });
  } catch {
    return NextResponse.json({ error: "Hitelesítési hiba." }, { status: 401 });
  }
}
