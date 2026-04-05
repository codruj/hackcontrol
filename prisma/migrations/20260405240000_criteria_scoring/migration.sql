-- CreateTable
CREATE TABLE "criteria" (
    "id" STRING NOT NULL,
    "name" STRING NOT NULL,
    "weight" FLOAT8 NOT NULL,
    "order" INT4 NOT NULL,
    "hackathonId" STRING NOT NULL,

    CONSTRAINT "criteria_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey for criteria -> hackathons
ALTER TABLE "criteria" ADD CONSTRAINT "criteria_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "hackathons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable scores: drop old unique index, add criterionId column, add new unique index
DROP INDEX "scores_judgeId_participationId_key";

ALTER TABLE "scores" ADD COLUMN "criterionId" STRING;

CREATE UNIQUE INDEX "scores_judgeId_participationId_criterionId_key" ON "scores"("judgeId", "participationId", "criterionId");

-- AddForeignKey for scores -> criteria
ALTER TABLE "scores" ADD CONSTRAINT "scores_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "criteria"("id") ON DELETE SET NULL ON UPDATE CASCADE;
