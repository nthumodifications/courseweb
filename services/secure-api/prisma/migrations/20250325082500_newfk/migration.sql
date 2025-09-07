/*
  Warnings:

  - The values [EXPIRED] on the enum `AuthSessionState` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `userid` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AuthSessionState_new" AS ENUM ('UNAUTHENTICATED', 'AUTHENTICATED');
ALTER TABLE "AuthSessions" ALTER COLUMN "state" TYPE "AuthSessionState_new" USING ("state"::text::"AuthSessionState_new");
ALTER TYPE "AuthSessionState" RENAME TO "AuthSessionState_old";
ALTER TYPE "AuthSessionState_new" RENAME TO "AuthSessionState";
DROP TYPE "AuthSessionState_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "AuthCode" DROP CONSTRAINT "AuthCode_userId_fkey";

-- DropForeignKey
ALTER TABLE "AuthRequest" DROP CONSTRAINT "AuthRequest_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "AuthSessions" DROP CONSTRAINT "AuthSessions_userId_fkey";

-- DropForeignKey
ALTER TABLE "Token" DROP CONSTRAINT "Token_userId_fkey";

-- DropIndex
DROP INDEX "User_userid_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "userid",
ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_userId_key" ON "User"("userId");

-- AddForeignKey
ALTER TABLE "AuthCode" ADD CONSTRAINT "AuthCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthRequest" ADD CONSTRAINT "AuthRequest_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AuthSessions"("sessionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Token" ADD CONSTRAINT "Token_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthSessions" ADD CONSTRAINT "AuthSessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;
