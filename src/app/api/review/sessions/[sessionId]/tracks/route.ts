import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import type { QueueTrack } from "@/lib/spotify/queue";

export const runtime = "nodejs";

type AddTracksPayload = {
  tracks: QueueTrack[];
  startIndex?: number;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session id." }, { status: 400 });
  }

  try {
    const spotifyId = request.headers.get("x-spotify-id");
    if (!spotifyId) {
      return NextResponse.json({ error: "Missing user context." }, { status: 400 });
    }

    const session = await prisma.reviewSession.findUnique({
      where: { id: sessionId },
      select: { user: { select: { spotifyId: true } } },
    });
    if (!session || session.user.spotifyId !== spotifyId) {
      return NextResponse.json({ error: "Unauthorized session access." }, { status: 403 });
    }

    const body = (await request.json()) as AddTracksPayload;
    const startIndex = body.startIndex ?? 0;
    const tracks = body.tracks ?? [];

    if (tracks.length === 0) {
      return NextResponse.json({ added: 0 });
    }

    const incomingTracks = new Map<string, QueueTrack>();
    tracks.forEach(track => {
      if (!incomingTracks.has(track.id)) {
        incomingTracks.set(track.id, track);
      }
    });

    const existing = await prisma.reviewTrack.findMany({
      where: {
        sessionId,
        trackId: { in: Array.from(incomingTracks.keys()) },
      },
      select: { trackId: true },
    });

    const existingIds = new Set(existing.map(item => item.trackId));
    const newTracks = Array.from(incomingTracks.values()).filter(
      track => !existingIds.has(track.id),
    );

    if (newTracks.length === 0) {
      return NextResponse.json({ added: 0 });
    }

    const result = await prisma.reviewTrack.createMany({
      data: newTracks.map((track, index) => ({
        sessionId,
        trackId: track.id,
        title: track.title,
        artists: track.artists,
        album: track.album,
        durationMs: track.durationMs,
        artworkUrl: track.artworkUrl,
        addedAt: track.addedAt ? new Date(track.addedAt) : null,
        position: startIndex + index,
      })),
    });

    return NextResponse.json({ added: result.count });
  } catch (error) {
    console.error("Failed to append review tracks:", error);
    return NextResponse.json({ error: "Failed to append tracks." }, { status: 500 });
  }
}
