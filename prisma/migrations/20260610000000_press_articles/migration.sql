-- CreateEnum
CREATE TYPE "PressArticleStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable: press_articles
CREATE TABLE "press_articles" (
    "id" STRING NOT NULL,
    "title" STRING NOT NULL,
    "url" STRING NOT NULL,
    "source" STRING,
    "snippet" STRING,
    "publishedAt" TIMESTAMP(3),
    "hackathonId" STRING,
    "matchedKeywords" JSONB,
    "relevanceScore" FLOAT8 NOT NULL DEFAULT 0,
    "status" "PressArticleStatus" NOT NULL DEFAULT 'PENDING',
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "press_articles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique url
CREATE UNIQUE INDEX "press_articles_url_key" ON "press_articles"("url");

-- AddForeignKey: press_articles -> hackathons
ALTER TABLE "press_articles" ADD CONSTRAINT "press_articles_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "hackathons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
