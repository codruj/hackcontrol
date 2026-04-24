-- CreateTable: hackathon_categories
CREATE TABLE "hackathon_categories" (
    "id" STRING NOT NULL,
    "hackathonId" STRING NOT NULL,
    "name" STRING NOT NULL,
    "description" STRING,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hackathon_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable: judge_categories
CREATE TABLE "judge_categories" (
    "id" STRING NOT NULL,
    "judgeId" STRING NOT NULL,
    "categoryId" STRING NOT NULL,

    CONSTRAINT "judge_categories_pkey" PRIMARY KEY ("id")
);

-- AlterTable: participations — add nullable categoryId
ALTER TABLE "participations" ADD COLUMN "categoryId" STRING;

-- CreateIndex: unique category name per hackathon
CREATE UNIQUE INDEX "hackathon_categories_hackathonId_name_key" ON "hackathon_categories"("hackathonId", "name");

-- CreateIndex: unique judge-category pair
CREATE UNIQUE INDEX "judge_categories_judgeId_categoryId_key" ON "judge_categories"("judgeId", "categoryId");

-- AddForeignKey: hackathon_categories -> hackathons
ALTER TABLE "hackathon_categories" ADD CONSTRAINT "hackathon_categories_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "hackathons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: participations -> hackathon_categories
ALTER TABLE "participations" ADD CONSTRAINT "participations_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "hackathon_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: judge_categories -> judges
ALTER TABLE "judge_categories" ADD CONSTRAINT "judge_categories_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES "judges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: judge_categories -> hackathon_categories
ALTER TABLE "judge_categories" ADD CONSTRAINT "judge_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "hackathon_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
