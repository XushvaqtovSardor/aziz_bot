/*
  Warnings:

  - You are about to drop the column `title` on the `Channel` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Channel` table. All the data in the column will be lost.
  - Added the required column `channelName` to the `Channel` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Channel" DROP COLUMN "title",
DROP COLUMN "updatedAt",
ADD COLUMN     "channelName" TEXT NOT NULL,
ADD COLUMN     "inviteLink" TEXT;

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "chatId" TEXT NOT NULL,
    "username" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Video" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_chatId_key" ON "User"("chatId");

-- CreateIndex
CREATE UNIQUE INDEX "Video_code_key" ON "Video"("code");
