-- AlterTable
ALTER TABLE "UserInvitations" ADD COLUMN "Role" TEXT NOT NULL DEFAULT 'participant',
ADD COLUMN "IsAdmin" BOOLEAN NOT NULL DEFAULT false;
