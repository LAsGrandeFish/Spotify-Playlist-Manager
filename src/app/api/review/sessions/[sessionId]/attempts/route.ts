import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
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

    const attempts = await prisma.reviewConfirmAttempt.findMany({
      where: { sessionId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        status: true,
        dryRun: true,
        removedRequested: true,
        removedApplied: true,
        addedRequested: true,
        addedApplied: true,
        totalTargets: true,
        playlistsCreated: true,
        playlistsSkipped: true,
        failureCount: true,
        failureLog: true,
        errorMessage: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ attempts });
  } catch (error) {
    console.error("Failed to load confirm attempts:", error);
    return NextResponse.json({ error: "Failed to load confirm attempts." }, { status: 500 });
  }
}
