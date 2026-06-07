export interface SearchResult {
  title: string;
  url: string;
  source: string;
  snippet?: string;
  publishedAt?: string;
}

export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname}`.toLowerCase().replace(/\/$/, "");
  } catch {
    return url.toLowerCase();
  }
}

export function isSearchConfigured(): boolean {
  return !!(
    process.env.NEWS_API_KEY ||
    (process.env.GOOGLE_CSE_KEY && process.env.GOOGLE_CSE_ID)
  );
}

async function searchNewsApi(query: string, apiKey: string): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    sortBy: "publishedAt",
    pageSize: "5",
    apiKey,
  });
  try {
    const res = await fetch(`https://newsapi.org/v2/everything?${params}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json() as {
      articles?: { title?: string; url?: string; source?: { name?: string }; description?: string; publishedAt?: string }[];
    };
    return (data.articles ?? [])
      .filter((a) => a.url && a.title && !a.title.startsWith("[Removed]"))
      .map((a) => ({
        title: a.title!,
        url: a.url!,
        source: a.source?.name ?? new URL(a.url!).hostname,
        snippet: a.description ?? undefined,
        publishedAt: a.publishedAt,
      }));
  } catch {
    return [];
  }
}

async function searchGoogleCSE(query: string, key: string, cx: string): Promise<SearchResult[]> {
  const params = new URLSearchParams({ key, cx, q: query, num: "5" });
  try {
    const res = await fetch(
      `https://www.googleapis.com/customsearch/v1?${params}`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return [];
    const data = await res.json() as {
      items?: { title?: string; link?: string; displayLink?: string; snippet?: string; pagemap?: { metatags?: Record<string, string>[] } }[];
    };
    return (data.items ?? [])
      .filter((item) => item.link && item.title)
      .map((item) => ({
        title: item.title!,
        url: item.link!,
        source: item.displayLink ?? new URL(item.link!).hostname,
        snippet: item.snippet,
        publishedAt: item.pagemap?.metatags?.[0]?.["article:published_time"],
      }));
  } catch {
    return [];
  }
}

export async function search(query: string): Promise<SearchResult[]> {
  const newsApiKey = process.env.NEWS_API_KEY;
  const googleKey = process.env.GOOGLE_CSE_KEY;
  const googleCx = process.env.GOOGLE_CSE_ID;

  if (newsApiKey) return searchNewsApi(query, newsApiKey);
  if (googleKey && googleCx) return searchGoogleCSE(query, googleKey, googleCx);
  return [];
}
