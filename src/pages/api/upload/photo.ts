import type { NextApiRequest, NextApiResponse } from "next";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { nanoid } from "nanoid";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
const EXT_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerAuthSession({ req, res });
  if (!session?.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (session.user.role !== "ADMIN" && session.user.role !== "ORGANIZER") {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { base64, hackathonId } = req.body as { base64?: string; hackathonId?: string };
  if (!base64 || !hackathonId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const hackathon = await prisma.hackathon.findUnique({
    where: { id: hackathonId },
    select: { creatorId: true },
  });
  if (!hackathon) {
    return res.status(404).json({ error: "Hackathon not found" });
  }
  if (session.user.role !== "ADMIN" && hackathon.creatorId !== session.user.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const matches = base64.match(/^data:(.+?);base64,(.+)$/);
  if (!matches) {
    return res.status(400).json({ error: "Invalid image data" });
  }
  const mimeType = matches[1]!;
  const data = matches[2]!;

  if (!ALLOWED_TYPES.includes(mimeType)) {
    return res.status(400).json({ error: "Invalid file type. Only images are accepted." });
  }

  const ext = EXT_MAP[mimeType] ?? "jpg";
  const fileName = `${hackathonId}-${nanoid(10)}.${ext}`;
  const uploadDir = join(process.cwd(), "uploads", "gallery");

  try {
    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, fileName), Buffer.from(data, "base64"));
  } catch {
    return res.status(500).json({ error: "Failed to save file" });
  }

  return res.status(200).json({ url: `/api/uploads/gallery/${fileName}` });
}
