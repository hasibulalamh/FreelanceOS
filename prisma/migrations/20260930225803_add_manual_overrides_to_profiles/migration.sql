-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "manualOverrides" TEXT[] DEFAULT ARRAY[]::TEXT[];
