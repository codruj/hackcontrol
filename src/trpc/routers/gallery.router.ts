import { z } from "zod";
import { createTRPCRouter, publicProcedure, hackathonManagerProcedure } from "..";
import { unlink } from "fs/promises";
import { join } from "path";

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

  addPhoto: hackathonManagerProcedure
    .input(z.object({ hackathonId: z.string(), url: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.hackathonPhoto.create({
        data: {
          hackathonId: input.hackathonId,
          url: input.url,
        },
      });
    }),

  deletePhoto: hackathonManagerProcedure
    .input(z.object({ hackathonId: z.string(), photoId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const photo = await ctx.prisma.hackathonPhoto.findFirst({
        where: { id: input.photoId, hackathonId: input.hackathonId },
      });
      if (!photo) {
        throw new Error("Photo not found");
      }
      if (photo.url.startsWith("/uploads/")) {
        try {
          await unlink(join(process.cwd(), "public", photo.url));
        } catch {
          // file already gone — ignore
        }
      }
      return ctx.prisma.hackathonPhoto.delete({ where: { id: input.photoId } });
    }),
});
