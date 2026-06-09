import type { PressSource } from "./pressSources";

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

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function stripHTML(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTag(xml: string, tag: string): string {
  const cdataMatch = xml.match(
    new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i"),
  );
  if (cdataMatch) return cdataMatch[1]!.trim();
  const plainMatch = xml.match(
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"),
  );
  return plainMatch ? stripHTML(plainMatch[1]!).trim() : "";
}

function extractLink(item: string): string {
  const cdataMatch = item.match(/<link><!\[CDATA\[([\s\S]*?)\]\]><\/link>/i);
  if (cdataMatch) return cdataMatch[1]!.trim();
  const hrefMatch = item.match(/<link[^>]+href="([^"]+)"/i);
  if (hrefMatch) return hrefMatch[1]!.trim();
  const textMatch = item.match(/<link[^>]*>(https?:\/\/[^\s<]+)<\/link>/i);
  if (textMatch) return textMatch[1]!.trim();
  const afterGuid = item.match(/<link\s*\/>([\s\S]*?)<guid[^>]*>(https?:\/\/[^<]+)<\/guid>/i);
  if (afterGuid) return afterGuid[2]!.trim();
  const guidMatch = item.match(/<guid[^>]*>(https?:\/\/[^<]+)<\/guid>/i);
  return guidMatch ? guidMatch[1]!.trim() : "";
}

function parseRSSXML(xml: string, sourceName: string): SearchResult[] {
  const results: SearchResult[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1]!;
    const title = extractTag(item, "title");
    const link = extractLink(item);
    const description = extractTag(item, "description");
    const pubDate = extractTag(item, "pubDate") || extractTag(item, "dc:date");

    if (!title || !link || !link.startsWith("http")) continue;

    results.push({
      title,
      url: link,
      source: sourceName,
      snippet: description ? description.slice(0, 600) : undefined,
      publishedAt: pubDate || undefined,
    });
  }

  return results;
}

function passesKeywordFilter(result: SearchResult, keywords: string[]): boolean {
  const text = normalizeText(`${result.title} ${result.snippet ?? ""}`);
  return keywords.some((kw) => text.includes(normalizeText(kw)));
}

function isValidHttpUrl(str: string): boolean {
  try {
    const u = new URL(str);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function extractArticlesFromHTML(html: string, sourceName: string): SearchResult[] {
  const results: SearchResult[] = [];
  const seen = new Set<string>();

  // Extract href + title from anchor tags inside h2/h3 headings
  const hrefRegex = /href="(https?:\/\/[^"\s]{10,500})"/gi;
  const titleRegex = />([\s\S]{5,300}?)<\/a>/i;

  // Split on <h2 or <h3 boundaries and process each heading block
  const blocks = html.split(/<h[23][^>]*>/i);
  for (const block of blocks) {
    const closeIdx = block.indexOf("</h");
    if (closeIdx === -1) continue;
    const headingContent = block.slice(0, closeIdx);

    const hrefMatch = hrefRegex.exec(headingContent);
    hrefRegex.lastIndex = 0;
    if (!hrefMatch) continue;

    const rawUrl = hrefMatch[1]!.trim().replace(/[\s\n\r\t]+/g, "");
    if (!isValidHttpUrl(rawUrl) || seen.has(rawUrl)) continue;

    const titleMatch = titleRegex.exec(headingContent);
    if (!titleMatch) continue;
    const title = stripHTML(titleMatch[1]!).trim();
    if (!title || title.length < 5) continue;

    seen.add(rawUrl);
    results.push({ title, url: rawUrl, source: sourceName });
  }

  return results;
}

export async function searchWordPressSite(
  baseUrl: string,
  sourceName: string,
  query: string,
): Promise<{ results: SearchResult[]; error?: string }> {
  const searchUrl = `${baseUrl.replace(/\/$/, "")}/?s=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(searchUrl, {
      signal: AbortSignal.timeout(12000),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; HackcontrolBot/1.0)",
        Accept: "text/html",
      },
    });
    if (!res.ok) {
      return { results: [], error: `${sourceName} search: HTTP ${res.status}` };
    }
    const html = await res.text();
    const results = extractArticlesFromHTML(html, sourceName);
    return { results };
  } catch (err) {
    return {
      results: [],
      error: `${sourceName} search: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export async function fetchRSSFeed(
  source: PressSource,
  filterKeywords: string[],
): Promise<{ results: SearchResult[]; error?: string }> {
  try {
    const res = await fetch(source.rssUrl, {
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; HackcontrolBot/1.0)" },
    });
    if (!res.ok) {
      return { results: [], error: `${source.name}: HTTP ${res.status}` };
    }
    const xml = await res.text();
    const items = parseRSSXML(xml, source.name);
    const filtered = source.alwaysInclude
      ? items
      : items.filter((r) => passesKeywordFilter(r, filterKeywords));
    return { results: filtered };
  } catch (err) {
    return {
      results: [],
      error: `${source.name}: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

async function searchNewsApi(query: string, apiKey: string): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    sortBy: "publishedAt",
    pageSize: "10",
    apiKey,
  });
  const res = await fetch(`https://newsapi.org/v2/everything?${params}`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText);
    throw new Error(`NewsAPI ${res.status}: ${body}`);
  }
  const data = await res.json() as {
    articles?: {
      title?: string;
      url?: string;
      source?: { name?: string };
      description?: string;
      publishedAt?: string;
    }[];
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
}

async function searchGoogleCSE(query: string, key: string, cx: string): Promise<SearchResult[]> {
  const params = new URLSearchParams({ key, cx, q: query, num: "10", hl: "ro" });
  const res = await fetch(
    `https://www.googleapis.com/customsearch/v1?${params}`,
    { signal: AbortSignal.timeout(10000) },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText);
    throw new Error(`Google CSE ${res.status}: ${body}`);
  }
  const data = await res.json() as {
    items?: {
      title?: string;
      link?: string;
      displayLink?: string;
      snippet?: string;
      pagemap?: { metatags?: Record<string, string>[] };
    }[];
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
}

export async function search(query: string): Promise<SearchResult[]> {
  const newsApiKey = process.env.NEWS_API_KEY;
  const googleKey = process.env.GOOGLE_CSE_KEY;
  const googleCx = process.env.GOOGLE_CSE_ID;

  if (newsApiKey) return searchNewsApi(query, newsApiKey);
  if (googleKey && googleCx) return searchGoogleCSE(query, googleKey, googleCx);
  return [];
}
