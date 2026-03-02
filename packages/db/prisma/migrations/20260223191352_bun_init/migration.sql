-- CreateEnum
CREATE TYPE "siteStatus" AS ENUM ('Up', 'Down', 'Unknown');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "photo" TEXT,
    "googleId" TEXT,
    "facebookId" TEXT,
    "githubId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site" (
    "id" TEXT NOT NULL,
    "userid" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "timeAdded" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickStatus" (
    "id" TEXT NOT NULL,
    "response_time_ms" INTEGER NOT NULL,
    "status" "siteStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "region_id" TEXT NOT NULL,
    "sitd_id" TEXT NOT NULL,

    CONSTRAINT "tickStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "site" ADD CONSTRAINT "site_userid_fkey" FOREIGN KEY ("userid") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickStatus" ADD CONSTRAINT "tickStatus_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickStatus" ADD CONSTRAINT "tickStatus_sitd_id_fkey" FOREIGN KEY ("sitd_id") REFERENCES "site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
