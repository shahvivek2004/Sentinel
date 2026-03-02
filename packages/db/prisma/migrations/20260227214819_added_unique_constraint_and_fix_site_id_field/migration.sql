/*
  Warnings:

  - You are about to drop the column `sitd_id` on the `tickStatus` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `Region` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `site_id` to the `tickStatus` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "tickStatus" DROP CONSTRAINT "tickStatus_sitd_id_fkey";

-- AlterTable
ALTER TABLE "tickStatus" DROP COLUMN "sitd_id",
ADD COLUMN     "site_id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Region_name_key" ON "Region"("name");

-- AddForeignKey
ALTER TABLE "tickStatus" ADD CONSTRAINT "tickStatus_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
