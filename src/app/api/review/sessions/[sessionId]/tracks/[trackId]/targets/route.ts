import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export const runtime = "nodejs";

type TargetPayload = {
  targets: { playlistId: string; playlistName?: string | null }[];
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string; trackId: string }> },
) {
  const { sessionId, trackId } = await params;
  if (!sessionId || !trackId) {
    return NextResponse.json({ error: "Missing session or track id." }, { status: 400 });
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

    const body = (await request.json()) as TargetPayload;
    const targets = body.targets ?? [];
    if (targets.length === 0) {
      return NextResponse.json({ added: 0 });
    }

    const reviewTrack = await prisma.reviewTrack.findUnique({
      where: {
        sessionId_trackId: {
          sessionId,
          trackId,
        },
      },
      select: { id: true },
    });

    if (!reviewTrack) {
      return NextResponse.json({ error: "Track not found in session." }, { status: 404 });
    }

    const incomingTargets = new Map<string, { playlistId: string; playlistName?: string | null }>();
    targets.forEach(target => {
      if (!incomingTargets.has(target.playlistId)) {
        incomingTargets.set(target.playlistId, target);
      }
    });

    const existingTargets = await prisma.reviewTrackTarget.findMany({
      where: {
        reviewTrackId: reviewTrack.id,
        playlistId: { in: Array.from(incomingTargets.keys()) },
      },
      select: { playlistId: true },
    });

    const existingIds = new Set(existingTargets.map(item => item.playlistId));
    const newTargets = Array.from(incomingTargets.values()).filter(
      target => !existingIds.has(target.playlistId),
    );

    if (newTargets.length === 0) {
      return NextResponse.json({ added: 0 });
    }

    const result = await prisma.reviewTrackTarget.createMany({
      data: newTargets.map(target => ({
        reviewTrackId: reviewTrack.id,
        playlistId: target.playlistId,
        playlistName: target.playlistName ?? null,
      })),
    });

    return NextResponse.json({ added: result.count });
  } catch (error) {
    console.error("Failed to add playlist targets:", error);
    return NextResponse.json({ error: "Failed to add playlist targets." }, { status: 500 });
  }
}
