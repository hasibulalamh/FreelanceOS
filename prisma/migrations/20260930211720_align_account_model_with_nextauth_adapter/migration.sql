/*
  Warnings:

  - You are about to drop the column `expiresAt` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the column `idToken` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the column `providerAccessToken` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the column `providerRefreshToken` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the column `tokenType` on the `accounts` table. All the data in the column will be lost.
  - Added the required column `type` to the `accounts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "accounts" DROP COLUMN "expiresAt",
DROP COLUMN "idToken",
DROP COLUMN "providerAccessToken",
DROP COLUMN "providerRefreshToken",
DROP COLUMN "tokenType",
ADD COLUMN     "access_token" TEXT,
ADD COLUMN     "expires_at" INTEGER,
ADD COLUMN     "id_token" TEXT,
ADD COLUMN     "refresh_token" TEXT,
ADD COLUMN     "session_state" TEXT,
ADD COLUMN     "token_type" TEXT,
ADD COLUMN     "type" TEXT NOT NULL;
