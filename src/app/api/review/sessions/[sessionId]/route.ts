import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export const runtime = "nodejs";

type UpdateSessionPayload = {
  status: "IN_PROGRESS" | "COMPLETED" | "CONFIRMED";
};

export async function PATCH(
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

    const body = (await request.json()) as UpdateSessionPayload;
    if (!body?.status) {
      return NextResponse.json({ error: "Missing session status." }, { status: 400 });
    }

    await prisma.reviewSession.update({
      where: { id: sessionId },
      data: { status: body.status },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to update review session:", error);
    return NextResponse.json({ error: "Failed to update review session." }, { status: 500 });
  }
}
