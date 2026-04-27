-- AlterTable: hackathon_categories — add optional per-category winner count
ALTER TABLE "hackathon_categories" ADD COLUMN "max_winners_displayed" INT4;
