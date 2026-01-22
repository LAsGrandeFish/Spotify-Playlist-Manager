/*
  Warnings:

  - A unique constraint covering the columns `[sessionId,trackId]` on the table `ReviewTrack` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[reviewTrackId,playlistId]` on the table `ReviewTrackTarget` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ReviewTrack_sessionId_trackId_key" ON "ReviewTrack"("sessionId", "trackId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewTrackTarget_reviewTrackId_playlistId_key" ON "ReviewTrackTarget"("reviewTrackId", "playlistId");
