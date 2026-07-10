import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure, organizerProcedure } from "..";
import { search, fetchRSSFeed, normalizeUrl, isSearchConfigured } from "@/lib/search";
import { scoreArticle, generateQueries } from "@/lib/pressScoring";
import { pressSources, searchQueries } from "@/lib/pressSources";

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
  discoverArticles: organizerProcedure.mutation(async ({ ctx }) => { try {
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

    const customKeywords = await ctx.prisma.pressKeyword
      .findMany()
      .then((rows) => rows.map((r) => r.keyword))
      .catch(() => [] as string[]);

    const scoringContext = { hackathonNames, sponsorNames, mentorCompanies, judgeCompanies, customKeywords };

    const filterKeywords = [
      "hackathon",
      "hackaton",
      "UTCN",
      "AIRI",
      ...hackathonNames,
      ...customKeywords,
    ];

    const existing = await ctx.prisma.pressArticle.findMany({ select: { url: true } }).catch(() => [] as { url: string }[]);
    const seenUrls = new Set(existing.map((e) => normalizeUrl(e.url)));

    const toCreate: ArticleCandidate[] = [];
    const sourceErrors: string[] = [];
    let rawResultCount = 0;

    const processResults = (results: import("@/lib/search").SearchResult[]) => {
      for (const result of results) {
        try {
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
        } catch {
          // skip malformed results
        }
      }
    };

    // --- RSS feeds ---
    const rssFetches = pressSources
      .filter((s) => s.rssUrl)
      .map((s) => fetchRSSFeed(s, filterKeywords));
    const rssResponses = await Promise.all(rssFetches).catch(() => []);
    for (const { results, error } of rssResponses) {
      if (error) sourceErrors.push(error);
      rawResultCount += results.length;
      processResults(results);
    }

    // --- WordPress RSS search (targeted by query, avoids HTML scraping) ---
    const allQueries = [
      ...searchQueries,
      ...hackathonNames.slice(0, 3).map((n) => `${n} hackathon`),
      ...customKeywords.slice(0, 5),
    ];
    const searchableSources = pressSources.filter((s) => s.searchRssBase);
    for (const query of allQueries) {
      const searchFetches = searchableSources.map((s) =>
        fetchRSSFeed(
          {
            name: s.name,
            rssUrl: `${s.searchRssBase!.replace(/\/$/, "")}/?s=${encodeURIComponent(query)}&feed=rss2`,
            skipSslVerify: s.skipSslVerify,
            alwaysInclude: true,
          },
          filterKeywords,
        ),
      );
      const searchResponses = await Promise.all(searchFetches).catch(() => []);
      for (const { results, error } of searchResponses) {
        if (error) sourceErrors.push(error);
        rawResultCount += results.length;
        processResults(results);
      }
      await new Promise((r) => setTimeout(r, 200));
    }

    // --- External API (supplemental, if configured) ---
    let apiError: string | null = null;
    if (isSearchConfigured()) {
      const queries = generateQueries(hackathonNames, sponsorNames, customKeywords);
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
      sourceErrors: sourceErrors.slice(0, 5).map((e) => e.slice(0, 120)),
      apiError: apiError ? apiError.slice(0, 200) : null,
    };
  } catch (err) {
    return {
      sourcesChecked: 0,
      rawResults: 0,
      candidates: 0,
      saved: 0,
      sourceErrors: [],
      apiError: err instanceof Error ? err.message : String(err),
    };
  }
  }),

  listArticles: organizerProcedure
    .input(
      z.object({
        status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
        limit: z.number().min(1).max(100).default(50),
        hackathonId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.pressArticle.findMany({
        where: {
          ...(input.status ? { status: input.status } : {}),
          ...(input.hackathonId ? { hackathonId: input.hackathonId } : {}),
        },
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

  listKeywords: organizerProcedure.query(async ({ ctx }) => {
    return ctx.prisma.pressKeyword.findMany({ orderBy: { createdAt: "desc" } });
  }),

  addKeyword: organizerProcedure
    .input(z.object({ keyword: z.string().min(1).max(200) }))
    .mutation(async ({ ctx, input }) => {
      const trimmed = input.keyword.trim();
      if (!trimmed) throw new TRPCError({ code: "BAD_REQUEST", message: "Keyword cannot be empty" });
      const existing = await ctx.prisma.pressKeyword.findMany({
        where: { keyword: { equals: trimmed, mode: "insensitive" } },
      });
      if (existing.length > 0) throw new TRPCError({ code: "CONFLICT", message: "This keyword already exists" });
      return ctx.prisma.pressKeyword.create({ data: { keyword: trimmed } });
    }),

  deleteKeyword: organizerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const kw = await ctx.prisma.pressKeyword.findUnique({ where: { id: input.id } });
      if (!kw) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.prisma.pressKeyword.delete({ where: { id: input.id } });
    }),

  listHackathonsForPress: organizerProcedure.query(async ({ ctx }) => {
    return ctx.prisma.hackathon.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }),

  addManualArticle: organizerProcedure
    .input(
      z.object({
        url: z.string().url().max(2000),
        title: z.string().min(1).max(500),
        source: z.string().max(100).optional(),
        snippet: z.string().max(1000).optional(),
        publishedAt: z.string().optional(),
        hackathonId: z.string().optional(),
        matchedKeywords: z.array(z.string().max(100)).max(20).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const normUrl = normalizeUrl(input.url);
      const allUrls = await ctx.prisma.pressArticle.findMany({ select: { url: true } });
      const urlExists = allUrls.some((a) => normalizeUrl(a.url) === normUrl);
      if (urlExists) throw new TRPCError({ code: "CONFLICT", message: "An entry with this URL already exists" });

      const titleExists = await ctx.prisma.pressArticle.findFirst({
        where: { title: { equals: input.title, mode: "insensitive" } },
      });
      if (titleExists) throw new TRPCError({ code: "CONFLICT", message: "An entry with this title already exists" });

      return ctx.prisma.pressArticle.create({
        data: {
          url: input.url,
          title: input.title,
          source: input.source ?? null,
          snippet: input.snippet ?? null,
          publishedAt: input.publishedAt ? new Date(input.publishedAt) : null,
          hackathonId: input.hackathonId ?? null,
          matchedKeywords: input.matchedKeywords ?? [],
          relevanceScore: 0,
          status: "APPROVED",
          isManual: true,
        },
      });
    }),
});
