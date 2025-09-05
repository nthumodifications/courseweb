/*
  Warnings:

  - A unique constraint covering the columns `[sessionId]` on the table `AuthSessions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `sessionId` to the `AuthSessions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AuthSessions" ADD COLUMN     "sessionId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "AuthSessions_sessionId_key" ON "AuthSessions"("sessionId");
