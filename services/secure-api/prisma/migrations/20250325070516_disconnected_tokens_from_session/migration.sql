/*
  Warnings:

  - You are about to drop the column `sessionId` on the `AuthCode` table. All the data in the column will be lost.
  - You are about to drop the column `sessionId` on the `Token` table. All the data in the column will be lost.
  - Added the required column `userId` to the `AuthCode` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "AuthCode" DROP CONSTRAINT "AuthCode_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "Token" DROP CONSTRAINT "Token_sessionId_fkey";

-- AlterTable
ALTER TABLE "AuthCode" DROP COLUMN "sessionId",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "AuthRequest" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Token" DROP COLUMN "sessionId",
ADD COLUMN     "userId" TEXT;

-- AddForeignKey
ALTER TABLE "AuthCode" ADD CONSTRAINT "AuthCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Token" ADD CONSTRAINT "Token_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
