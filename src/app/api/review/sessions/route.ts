import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import type { QueueSource, QueueTrack } from "@/lib/spotify/queue";

export const runtime = "nodejs";

type CreateSessionPayload = {
  user: {
    spotifyId: string;
    displayName?: string | null;
    email?: string | null;
  };
  source: QueueSource;
  tracks: QueueTrack[];
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateSessionPayload;

    if (!body?.user?.spotifyId) {
      return NextResponse.json({ error: "Missing user info." }, { status: 400 });
    }
    if (!body?.source) {
      return NextResponse.json({ error: "Missing playlist source." }, { status: 400 });
    }

    const uniqueTracks = new Map<string, QueueTrack>();
    (body.tracks ?? []).forEach(track => {
      if (!uniqueTracks.has(track.id)) {
        uniqueTracks.set(track.id, track);
      }
    });

    const [user, session] = await prisma.$transaction(async tx => {
      const upsertedUser = await tx.user.upsert({
        where: { spotifyId: body.user.spotifyId },
        update: {
          displayName: body.user.displayName ?? undefined,
          email: body.user.email ?? undefined,
        },
        create: {
          spotifyId: body.user.spotifyId,
          displayName: body.user.displayName ?? undefined,
          email: body.user.email ?? undefined,
        },
      });

      const createdSession = await tx.reviewSession.create({
        data: {
          userId: upsertedUser.id,
          sourceType: body.source.type === "liked" ? "LIKED" : "PLAYLIST",
          sourceId: body.source.type === "playlist" ? body.source.id : null,
          sourceName: body.source.type === "playlist" ? (body.source.name ?? null) : "Liked Songs",
        },
      });

      if (uniqueTracks.size > 0) {
        await tx.reviewTrack.createMany({
          data: Array.from(uniqueTracks.values()).map((track, index) => ({
            sessionId: createdSession.id,
            trackId: track.id,
            title: track.title,
            artists: track.artists,
            album: track.album,
            durationMs: track.durationMs,
            artworkUrl: track.artworkUrl,
            addedAt: track.addedAt ? new Date(track.addedAt) : null,
            position: index,
          })),
        });
      }

      return [upsertedUser, createdSession];
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error("Failed to create review session:", error);
    return NextResponse.json({ error: "Failed to create review session." }, { status: 500 });
  }
}
