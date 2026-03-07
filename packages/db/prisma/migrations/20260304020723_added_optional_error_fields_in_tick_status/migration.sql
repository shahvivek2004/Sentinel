-- AlterTable
ALTER TABLE "tickStatus" ADD COLUMN     "errorReason" TEXT,
ADD COLUMN     "errorType" TEXT,
ADD COLUMN     "statusCode" INTEGER;
