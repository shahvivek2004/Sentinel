-- CreateEnum
CREATE TYPE "days" AS ENUM ('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday');

-- AlterTable
ALTER TABLE "site" ADD COLUMN     "maintenanceDays" "days"[] DEFAULT ARRAY[]::"days"[],
ADD COLUMN     "maintenanceEndMin" INTEGER,
ADD COLUMN     "maintenanceStartMin" INTEGER;
