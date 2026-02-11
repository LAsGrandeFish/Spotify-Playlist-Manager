import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const spotifyId = searchParams.get("spotifyId");
  const sourceType = searchParams.get("sourceType");
  const sourceId = searchParams.get("sourceId");

  if (!spotifyId || !sourceType) {
    return NextResponse.json({ error: "Missing query params." }, { status: 400 });
  }

  try {
    const session = await prisma.reviewSession.findFirst({
      where: {
        user: { spotifyId },
        sourceType: sourceType.toUpperCase(),
        sourceId: sourceType === "playlist" ? sourceId : null,
        status: "IN_PROGRESS",
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        tracks: {
          select: {
            trackId: true,
            action: true,
            addTargets: {
              select: { id: true },
            },
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ sessionId: null, tracks: [] });
    }

    const tracks = session.tracks.map(track => ({
      trackId: track.trackId,
      action: track.action,
      addCount: track.addTargets.length,
    }));

    return NextResponse.json({ sessionId: session.id, tracks });
  } catch (error) {
    console.error("Failed to load review session:", error);
    return NextResponse.json({ error: "Failed to load review session." }, { status: 500 });
  }
}
