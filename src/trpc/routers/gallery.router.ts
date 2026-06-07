import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure, organizerProcedure } from "..";
import { unlink } from "fs/promises";
import { join } from "path";

async function assertCanManage(
  prisma: { hackathon: { findUnique: (args: any) => Promise<{ creatorId: string } | null> } },
  hackathonId: string,
  userId: string,
  role: string,
) {
  if (role === "ADMIN") return;
  const hackathon = await prisma.hackathon.findUnique({
    where: { id: hackathonId },
    select: { creatorId: true },
  });
  if (!hackathon || hackathon.creatorId !== userId) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
}

export const galleryRouter = createTRPCRouter({
  getHackathonPhotos: publicProcedure
    .input(z.object({ hackathonId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.hackathonPhoto.findMany({
        where: { hackathonId: input.hackathonId },
        orderBy: { uploadedAt: "desc" },
      });
    }),

  getAllPhotos: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.hackathonPhoto.findMany({
      include: {
        hackathon: { select: { id: true, name: true, url: true } },
      },
      orderBy: { uploadedAt: "desc" },
    });
  }),

  addPhoto: organizerProcedure
    .input(z.object({ hackathonId: z.string().min(1), url: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await assertCanManage(
        ctx.prisma,
        input.hackathonId,
        ctx.session.user.id,
        ctx.session.user.role,
      );
      return ctx.prisma.hackathonPhoto.create({
        data: {
          hackathonId: input.hackathonId,
          url: input.url,
        },
      });
    }),

  deletePhoto: organizerProcedure
    .input(z.object({ hackathonId: z.string().min(1), photoId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await assertCanManage(
        ctx.prisma,
        input.hackathonId,
        ctx.session.user.id,
        ctx.session.user.role,
      );
      const photo = await ctx.prisma.hackathonPhoto.findFirst({
        where: { id: input.photoId, hackathonId: input.hackathonId },
      });
      if (!photo) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Photo not found" });
      }
      if (photo.url.startsWith("/api/uploads/")) {
        try {
          const rel = photo.url.replace(/^\/api\/uploads\//, "uploads/");
          await unlink(join(process.cwd(), rel));
        } catch {
          // file already gone — ignore
        }
      }
      return ctx.prisma.hackathonPhoto.delete({ where: { id: input.photoId } });
    }),
});
