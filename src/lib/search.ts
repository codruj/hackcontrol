import { request as httpsRequest, Agent as HttpsAgent } from "node:https";
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
  try {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");
  } catch {
    return text.toLowerCase();
  }
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

function fetchInsecure(url: string, timeoutMs: number): Promise<{ body: string; status: number }> {
  return new Promise((resolve, reject) => {
    const agent = new HttpsAgent({ rejectUnauthorized: false });
    const timer = setTimeout(() => reject(new Error("Request timed out")), timeoutMs);

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      clearTimeout(timer);
      reject(new Error(`Invalid URL: ${url}`));
      return;
    }

    const req = httpsRequest(
      {
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: parsed.pathname + parsed.search,
        method: "GET",
        agent,
        headers: { Accept: "text/xml,application/xml,application/rss+xml,text/html,*/*" },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          clearTimeout(timer);
          resolve({ body: Buffer.concat(chunks).toString("utf-8"), status: res.statusCode ?? 0 });
        });
      },
    );

    req.on("error", (err: Error) => {
      clearTimeout(timer);
      reject(err);
    });

    req.end();
  });
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<{ body: string; status: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    const body = await res.text();
    return { body, status: res.status };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchRSSFeed(
  source: PressSource,
  filterKeywords: string[],
): Promise<{ results: SearchResult[]; error?: string }> {
  const rssUrl = source.rssUrl;
  if (!rssUrl) return { results: [] };
  try {
    const { body, status } = source.skipSslVerify
      ? await fetchInsecure(rssUrl, 10000)
      : await fetchWithTimeout(rssUrl, 10000);

    if (status < 200 || status >= 300) {
      return { results: [], error: `${source.name}: HTTP ${status}` };
    }

    const items = parseRSSXML(body, source.name);
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
  const { body, status } = await fetchWithTimeout(
    `https://newsapi.org/v2/everything?${params}`,
    10000,
  );
  if (status < 200 || status >= 300) {
    throw new Error(`NewsAPI ${status}: ${body.slice(0, 200)}`);
  }
  const data = JSON.parse(body) as {
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
    .map((a) => {
      let hostname = "";
      try { hostname = new URL(a.url!).hostname; } catch { /* ignore */ }
      return {
        title: a.title!,
        url: a.url!,
        source: a.source?.name ?? hostname,
        snippet: a.description ?? undefined,
        publishedAt: a.publishedAt,
      };
    });
}

async function searchGoogleCSE(query: string, key: string, cx: string): Promise<SearchResult[]> {
  const params = new URLSearchParams({ key, cx, q: query, num: "10", hl: "ro" });
  const { body, status } = await fetchWithTimeout(
    `https://www.googleapis.com/customsearch/v1?${params}`,
    10000,
  );
  if (status < 200 || status >= 300) {
    throw new Error(`Google CSE ${status}: ${body.slice(0, 200)}`);
  }
  const data = JSON.parse(body) as {
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
    .map((item) => {
      let hostname = "";
      try { hostname = new URL(item.link!).hostname; } catch { /* ignore */ }
      return {
        title: item.title!,
        url: item.link!,
        source: item.displayLink ?? hostname,
        snippet: item.snippet,
        publishedAt: item.pagemap?.metatags?.[0]?.["article:published_time"],
      };
    });
}

export async function search(query: string): Promise<SearchResult[]> {
  const newsApiKey = process.env.NEWS_API_KEY;
  const googleKey = process.env.GOOGLE_CSE_KEY;
  const googleCx = process.env.GOOGLE_CSE_ID;

  if (newsApiKey) return searchNewsApi(query, newsApiKey);
  if (googleKey && googleCx) return searchGoogleCSE(query, googleKey, googleCx);
  return [];
}
