-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "spotifyId" TEXT NOT NULL,
    "displayName" TEXT,
    "email" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ReviewSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "sourceName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReviewSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReviewTrack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artists" TEXT NOT NULL,
    "album" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "artworkUrl" TEXT,
    "addedAt" DATETIME,
    "position" INTEGER NOT NULL,
    "action" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReviewTrack_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ReviewSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReviewAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reviewTrackId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReviewAction_reviewTrackId_fkey" FOREIGN KEY ("reviewTrackId") REFERENCES "ReviewTrack" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReviewTrackTarget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reviewTrackId" TEXT NOT NULL,
    "playlistId" TEXT NOT NULL,
    "playlistName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReviewTrackTarget_reviewTrackId_fkey" FOREIGN KEY ("reviewTrackId") REFERENCES "ReviewTrack" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_spotifyId_key" ON "User"("spotifyId");

-- CreateIndex
CREATE INDEX "ReviewTrack_sessionId_idx" ON "ReviewTrack"("sessionId");

-- CreateIndex
CREATE INDEX "ReviewTrack_trackId_idx" ON "ReviewTrack"("trackId");

-- CreateIndex
CREATE INDEX "ReviewAction_reviewTrackId_idx" ON "ReviewAction"("reviewTrackId");

-- CreateIndex
CREATE INDEX "ReviewTrackTarget_reviewTrackId_idx" ON "ReviewTrackTarget"("reviewTrackId");

-- CreateIndex
CREATE INDEX "ReviewTrackTarget_playlistId_idx" ON "ReviewTrackTarget"("playlistId");
