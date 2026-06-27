-- AlterTable: add isManual to press_articles
ALTER TABLE "press_articles" ADD COLUMN "isManual" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: press_keywords
CREATE TABLE "press_keywords" (
    "id" STRING NOT NULL,
    "keyword" STRING NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "press_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique keyword
CREATE UNIQUE INDEX "press_keywords_keyword_key" ON "press_keywords"("keyword");
