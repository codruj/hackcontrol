-- CreateTable: hackathon_enrollments
CREATE TABLE "hackathon_enrollments" (
    "id" STRING NOT NULL,
    "userId" STRING NOT NULL,
    "hackathonId" STRING NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hackathon_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hackathon_enrollments_userId_hackathonId_key" ON "hackathon_enrollments"("userId", "hackathonId");

-- AddForeignKey
ALTER TABLE "hackathon_enrollments" ADD CONSTRAINT "hackathon_enrollments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "hackathon_enrollments" ADD CONSTRAINT "hackathon_enrollments_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "hackathons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
