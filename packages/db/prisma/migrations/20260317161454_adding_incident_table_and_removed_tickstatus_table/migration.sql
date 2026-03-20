/*
  Warnings:

  - You are about to drop the `tickStatus` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "tickStatus" DROP CONSTRAINT "tickStatus_region_id_fkey";

-- DropForeignKey
ALTER TABLE "tickStatus" DROP CONSTRAINT "tickStatus_site_id_fkey";

-- DropTable
DROP TABLE "tickStatus";

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Incident_siteId_startedAt_idx" ON "Incident"("siteId", "startedAt" DESC);

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
