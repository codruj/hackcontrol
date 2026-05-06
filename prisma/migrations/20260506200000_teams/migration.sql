-- Add TEAM_MENTOR to ChannelType enum
ALTER TYPE "ChannelType" ADD VALUE 'TEAM_MENTOR';

-- CreateTable: teams
CREATE TABLE "teams" (
    "id" STRING NOT NULL,
    "hackathonId" STRING NOT NULL,
    "name" STRING NOT NULL,
    "leaderId" STRING NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable: team_memberships
CREATE TABLE "team_memberships" (
    "id" STRING NOT NULL,
    "teamId" STRING NOT NULL,
    "userId" STRING NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "teams_hackathonId_name_key" ON "teams"("hackathonId", "name");
CREATE UNIQUE INDEX "team_memberships_teamId_userId_key" ON "team_memberships"("teamId", "userId");

-- AlterTable: chat_channels
ALTER TABLE "chat_channels" ADD COLUMN "teamId" STRING;
ALTER TABLE "chat_channels" ADD COLUMN "slotId" STRING;

-- AlterTable: mentor_slots
ALTER TABLE "mentor_slots" ADD COLUMN "bookedByTeamId" STRING;

-- AddForeignKey: teams
ALTER TABLE "teams" ADD CONSTRAINT "teams_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "hackathons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "teams" ADD CONSTRAINT "teams_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "users"("id") ON UPDATE CASCADE;

-- AddForeignKey: team_memberships
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: mentor_slots
ALTER TABLE "mentor_slots" ADD CONSTRAINT "mentor_slots_bookedByTeamId_fkey" FOREIGN KEY ("bookedByTeamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
