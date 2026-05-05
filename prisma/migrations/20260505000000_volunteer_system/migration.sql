-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');

-- CreateTable: volunteers
CREATE TABLE "volunteers" (
    "id" STRING NOT NULL,
    "userId" STRING NOT NULL,
    "hackathonId" STRING NOT NULL,
    "invitedById" STRING NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "volunteers_pkey" PRIMARY KEY ("id")
);

-- CreateTable: volunteer_tasks
CREATE TABLE "volunteer_tasks" (
    "id" STRING NOT NULL,
    "title" STRING NOT NULL,
    "description" STRING,
    "deadline" TIMESTAMP(3),
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "hackathonId" STRING NOT NULL,
    "createdById" STRING NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "volunteer_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable: volunteer_task_assignments
CREATE TABLE "volunteer_task_assignments" (
    "taskId" STRING NOT NULL,
    "volunteerId" STRING NOT NULL,

    CONSTRAINT "volunteer_task_assignments_pkey" PRIMARY KEY ("taskId", "volunteerId")
);

-- CreateIndex: unique volunteer per hackathon
CREATE UNIQUE INDEX "volunteers_userId_hackathonId_key" ON "volunteers"("userId", "hackathonId");

-- AddForeignKey: volunteers -> hackathons
ALTER TABLE "volunteers" ADD CONSTRAINT "volunteers_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "hackathons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: volunteers -> users (inviter)
ALTER TABLE "volunteers" ADD CONSTRAINT "volunteers_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON UPDATE CASCADE;

-- AddForeignKey: volunteers -> users
ALTER TABLE "volunteers" ADD CONSTRAINT "volunteers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: volunteer_tasks -> hackathons
ALTER TABLE "volunteer_tasks" ADD CONSTRAINT "volunteer_tasks_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "hackathons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: volunteer_tasks -> users (creator)
ALTER TABLE "volunteer_tasks" ADD CONSTRAINT "volunteer_tasks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON UPDATE CASCADE;

-- AddForeignKey: volunteer_task_assignments -> volunteer_tasks
ALTER TABLE "volunteer_task_assignments" ADD CONSTRAINT "volunteer_task_assignments_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "volunteer_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: volunteer_task_assignments -> volunteers
ALTER TABLE "volunteer_task_assignments" ADD CONSTRAINT "volunteer_task_assignments_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "volunteers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
