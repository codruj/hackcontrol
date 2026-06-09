import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure, organizerProcedure } from "..";
import { search, fetchRSSFeed, normalizeUrl, isSearchConfigured } from "@/lib/search";
import { scoreArticle, generateQueries } from "@/lib/pressScoring";
import { pressSources } from "@/lib/pressSources";

type ArticleCandidate = {
  title: string;
  url: string;
  source: string | null;
  snippet: string | null;
  publishedAt: Date | null;
  hackathonId: string | null;
  matchedKeywords: string[];
  relevanceScore: number;
};

export const pressRouter = createTRPCRouter({
  discoverArticles: organizerProcedure.mutation(async ({ ctx }) => {
    const hackathons = await ctx.prisma.hackathon.findMany({
      select: {
        id: true,
        name: true,
        sponsors: true,
        mentors: { select: { company: true } },
        Judge: { select: { company: true } },
      },
    });

    const hackathonNames = hackathons.map((h) => h.name);

    const sponsorNames = hackathons.flatMap((h) => {
      const sponsors = h.sponsors as { name?: string }[] | null;
      return (sponsors ?? []).map((s) => s.name).filter((n): n is string => !!n);
    });

    const mentorCompanies = hackathons
      .flatMap((h) => h.mentors.map((m) => m.company))
      .filter((c): c is string => !!c);

    const judgeCompanies = hackathons
      .flatMap((h) => h.Judge.map((j) => j.company))
      .filter((c): c is string => !!c);

    const scoringContext = { hackathonNames, sponsorNames, mentorCompanies, judgeCompanies };

    const filterKeywords = [
      "hackathon",
      "hackaton",
      "UTCN",
      "AIRI",
      ...hackathonNames,
    ];

    const existing = await ctx.prisma.pressArticle.findMany({ select: { url: true } });
    const seenUrls = new Set(existing.map((e) => normalizeUrl(e.url)));

    const toCreate: ArticleCandidate[] = [];
    const sourceErrors: string[] = [];
    let rawResultCount = 0;

    // --- RSS sources (primary) ---
    for (const source of pressSources) {
      const { results, error } = await fetchRSSFeed(source, filterKeywords);
      if (error) sourceErrors.push(error);
      rawResultCount += results.length;

      for (const result of results) {
        const normUrl = normalizeUrl(result.url);
        if (seenUrls.has(normUrl)) continue;
        seenUrls.add(normUrl);

        const { score, matchedKeywords, relatedHackathonName } = scoreArticle(result, scoringContext);
        if (score < 3) continue;

        const relatedHackathon = relatedHackathonName
          ? hackathons.find((h) => h.name === relatedHackathonName)
          : undefined;

        toCreate.push({
          title: result.title.slice(0, 500),
          url: result.url,
          source: result.source ?? null,
          snippet: result.snippet ? result.snippet.slice(0, 600) : null,
          publishedAt: result.publishedAt ? new Date(result.publishedAt) : null,
          hackathonId: relatedHackathon?.id ?? null,
          matchedKeywords,
          relevanceScore: score,
        });
      }
    }

    // --- External API (supplemental, if configured) ---
    let apiError: string | null = null;
    if (isSearchConfigured()) {
      const queries = generateQueries(hackathonNames, sponsorNames);
      for (const query of queries) {
        try {
          const results = await search(query);
          rawResultCount += results.length;

          for (const result of results) {
            const normUrl = normalizeUrl(result.url);
            if (seenUrls.has(normUrl)) continue;
            seenUrls.add(normUrl);

            const { score, matchedKeywords, relatedHackathonName } = scoreArticle(result, scoringContext);
            if (score < 3) continue;

            const relatedHackathon = relatedHackathonName
              ? hackathons.find((h) => h.name === relatedHackathonName)
              : undefined;

            toCreate.push({
              title: result.title.slice(0, 500),
              url: result.url,
              source: result.source ?? null,
              snippet: result.snippet ? result.snippet.slice(0, 600) : null,
              publishedAt: result.publishedAt ? new Date(result.publishedAt) : null,
              hackathonId: relatedHackathon?.id ?? null,
              matchedKeywords,
              relevanceScore: score,
            });
          }
        } catch (err) {
          apiError = err instanceof Error ? err.message : String(err);
          break;
        }
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    // --- Save to DB ---
    let saved = 0;
    for (const article of toCreate) {
      try {
        await ctx.prisma.pressArticle.create({
          data: {
            title: article.title,
            url: article.url,
            source: article.source,
            snippet: article.snippet,
            publishedAt: article.publishedAt,
            hackathonId: article.hackathonId,
            matchedKeywords: article.matchedKeywords,
            relevanceScore: article.relevanceScore,
          },
        });
        saved++;
      } catch {
        // skip duplicates
      }
    }

    return {
      sourcesChecked: pressSources.length,
      rawResults: rawResultCount,
      candidates: toCreate.length,
      saved,
      sourceErrors: sourceErrors.slice(0, 5),
      apiError,
    };
  }),

  listArticles: organizerProcedure
    .input(
      z.object({
        status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
        limit: z.number().min(1).max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.pressArticle.findMany({
        where: input.status ? { status: input.status } : undefined,
        orderBy: [{ relevanceScore: "desc" }, { discoveredAt: "desc" }],
        take: input.limit,
        include: { hackathon: { select: { name: true, url: true } } },
      });
    }),

  updateStatus: organizerProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["APPROVED", "REJECTED"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const article = await ctx.prisma.pressArticle.findUnique({ where: { id: input.id } });
      if (!article) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.prisma.pressArticle.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),

  getApprovedPublic: publicProcedure
    .input(
      z.object({
        hackathonId: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.pressArticle.findMany({
        where: {
          status: "APPROVED",
          ...(input.hackathonId ? { hackathonId: input.hackathonId } : {}),
        },
        orderBy: [{ publishedAt: "desc" }, { discoveredAt: "desc" }],
        take: input.limit,
        select: {
          id: true,
          title: true,
          url: true,
          source: true,
          snippet: true,
          publishedAt: true,
          hackathon: { select: { name: true, url: true } },
        },
      });
    }),
});
