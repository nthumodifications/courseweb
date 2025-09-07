/*
  Warnings:

  - You are about to drop the column `scope` on the `AuthCode` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "AuthCode" DROP COLUMN "scope",
ADD COLUMN     "scopes" TEXT[];
