import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";

type UpdateTrackPayload = {
  action: "PENDING" | "KEEP" | "REMOVE";
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string; trackId: string }> },
) {
  const { sessionId, trackId } = await params;
  if (!sessionId || !trackId) {
    return NextResponse.json({ error: "Missing session or track id." }, { status: 400 });
  }

  try {
    const body = (await request.json()) as UpdateTrackPayload;
    if (!body?.action) {
      return NextResponse.json({ error: "Missing track action." }, { status: 400 });
    }

    const reviewTrack = await prisma.reviewTrack.upsert({
      where: {
        sessionId_trackId: {
          sessionId,
          trackId,
        },
      },
      update: {
        action: body.action,
      },
      create: {
        sessionId,
        trackId,
        title: "",
        artists: "",
        album: "",
        durationMs: 0,
        position: 0,
        action: body.action,
      },
    });

    await prisma.reviewAction.create({
      data: {
        reviewTrackId: reviewTrack.id,
        action: body.action,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to update review track:", error);
    return NextResponse.json({ error: "Failed to update track action." }, { status: 500 });
  }
}
