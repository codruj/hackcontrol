import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure, organizerProcedure } from "..";
import { search, normalizeUrl, isSearchConfigured } from "@/lib/search";
import { scoreArticle, generateQueries } from "@/lib/pressScoring";

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
    const queries = generateQueries(hackathonNames, sponsorNames);

    const existing = await ctx.prisma.pressArticle.findMany({ select: { url: true } });
    const seenUrls = new Set(existing.map((e) => normalizeUrl(e.url)));

    const toCreate: {
      title: string;
      url: string;
      source: string | null;
      snippet: string | null;
      publishedAt: Date | null;
      hackathonId: string | null;
      matchedKeywords: string[];
      relevanceScore: number;
    }[] = [];

    let apiError: string | null = null;
    let rawResultCount = 0;

    for (const query of queries) {
      let results;
      try {
        results = await search(query);
      } catch (err) {
        apiError = err instanceof Error ? err.message : String(err);
        break;
      }

      rawResultCount += results.length;

      for (const result of results) {
        const normUrl = normalizeUrl(result.url);
        if (seenUrls.has(normUrl)) continue;
        seenUrls.add(normUrl);

        const { score, matchedKeywords, relatedHackathonName } = scoreArticle(result, scoringContext);
        if (score < 1) continue;

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

      await new Promise((r) => setTimeout(r, 300));
    }

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
        // skip on unique constraint (url already exists)
      }
    }

    return {
      queriesRun: queries.length,
      rawResults: rawResultCount,
      candidates: toCreate.length,
      saved,
      searchConfigured: isSearchConfigured(),
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
    .input(z.object({ hackathonId: z.string().optional(), limit: z.number().min(1).max(50).default(20) }))
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
