import { NextResponse } from "next/server";
import tracksData from "@/data/tracks.json";

export async function GET() {
  return NextResponse.json(tracksData, {
    headers: {
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
