-- AlterTable
ALTER TABLE "site" ADD COLUMN     "followRedirect" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sslVerify" BOOLEAN NOT NULL DEFAULT true;
