import type { NextApiRequest, NextApiResponse } from "next";
import { readFile } from "fs/promises";
import { join, resolve } from "path";

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).end();
  }

  const parts = req.query.path;
  if (!parts || !Array.isArray(parts)) {
    return res.status(400).end();
  }

  const uploadsBase = resolve(process.cwd(), "uploads");
  const filePath = resolve(uploadsBase, ...parts);

  if (!filePath.startsWith(uploadsBase + "/") && filePath !== uploadsBase) {
    return res.status(400).end();
  }

  try {
    const data = await readFile(filePath);
    const ext = parts[parts.length - 1]?.split(".").pop()?.toLowerCase() ?? "";
    res.setHeader("Content-Type", MIME[ext] ?? "application/octet-stream");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return res.send(data);
  } catch {
    return res.status(404).end();
  }
}
