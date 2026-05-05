-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('MENTORS_PARTICIPANTS', 'MENTORS_JUDGES', 'VOLUNTEERS_PARTICIPANTS', 'VOLUNTEERS_ONLY', 'TEAM_ONLY');

-- CreateTable: mentors
CREATE TABLE "mentors" (
    "id" STRING NOT NULL,
    "userId" STRING NOT NULL,
    "hackathonId" STRING NOT NULL,
    "invitedById" STRING NOT NULL,
    "bio" STRING,
    "expertise" STRING,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mentors_pkey" PRIMARY KEY ("id")
);

-- CreateTable: mentor_slots
CREATE TABLE "mentor_slots" (
    "id" STRING NOT NULL,
    "mentorId" STRING NOT NULL,
    "hackathonId" STRING NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "topic" STRING,
    "isBooked" BOOL NOT NULL DEFAULT false,
    "bookedById" STRING,
    "bookingNote" STRING,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mentor_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable: chat_channels
CREATE TABLE "chat_channels" (
    "id" STRING NOT NULL,
    "key" STRING NOT NULL,
    "hackathonId" STRING NOT NULL,
    "type" "ChannelType" NOT NULL,
    "participationId" STRING,
    "name" STRING NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable: chat_messages
CREATE TABLE "chat_messages" (
    "id" STRING NOT NULL,
    "channelId" STRING NOT NULL,
    "userId" STRING NOT NULL,
    "content" STRING NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mentors_userId_hackathonId_key" ON "mentors"("userId", "hackathonId");
CREATE UNIQUE INDEX "chat_channels_key_key" ON "chat_channels"("key");

-- AddForeignKey: mentors
ALTER TABLE "mentors" ADD CONSTRAINT "mentors_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "hackathons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mentors" ADD CONSTRAINT "mentors_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON UPDATE CASCADE;
ALTER TABLE "mentors" ADD CONSTRAINT "mentors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: mentor_slots
ALTER TABLE "mentor_slots" ADD CONSTRAINT "mentor_slots_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "mentors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mentor_slots" ADD CONSTRAINT "mentor_slots_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "hackathons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mentor_slots" ADD CONSTRAINT "mentor_slots_bookedById_fkey" FOREIGN KEY ("bookedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: chat_channels
ALTER TABLE "chat_channels" ADD CONSTRAINT "chat_channels_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "hackathons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: chat_messages
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "chat_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON UPDATE CASCADE;
