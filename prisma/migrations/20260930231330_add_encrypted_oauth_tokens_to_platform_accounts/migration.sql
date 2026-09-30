-- AlterTable
ALTER TABLE "platform_accounts" ADD COLUMN     "oauthAccessToken" TEXT,
ADD COLUMN     "oauthExpiresAt" TIMESTAMP(3),
ADD COLUMN     "oauthRefreshToken" TEXT,
ADD COLUMN     "oauthScope" TEXT;
