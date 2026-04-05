import { z } from "zod";
import { createTRPCRouter, publicProcedure, organizerProcedure } from "..";

export const criteriaRouter = createTRPCRouter({
  getCriteria: publicProcedure
    .input(z.object({ hackathonId: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.prisma.criterion.findMany({
        where: { hackathonId: input.hackathonId },
        orderBy: { order: "asc" },
      });
    }),

  setCriteria: organizerProcedure
    .input(
      z.object({
        hackathonId: z.string(),
        criteria: z
          .array(
            z.object({
              name: z.string().min(1, "Name is required").max(100),
              weight: z.number().min(0.1).max(100),
              order: z.number().int().min(1).max(7),
            }),
          )
          .min(1)
          .max(7),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const hackathon = await ctx.prisma.hackathon.findFirst({
        where: { id: input.hackathonId, creatorId: ctx.session.user.id },
      });
      if (!hackathon) throw new Error("Hackathon not found or insufficient permissions");

      const totalWeight = input.criteria.reduce((s, c) => s + c.weight, 0);
      if (Math.abs(totalWeight - 100) > 0.5)
        throw new Error(`Weights must sum to 100% (currently: ${totalWeight.toFixed(1)}%)`);

      await ctx.prisma.criterion.deleteMany({ where: { hackathonId: input.hackathonId } });

      await ctx.prisma.criterion.createMany({
        data: input.criteria.map((c) => ({
          name: c.name,
          weight: c.weight,
          order: c.order,
          hackathonId: input.hackathonId,
        })),
      });

      return ctx.prisma.criterion.findMany({
        where: { hackathonId: input.hackathonId },
        orderBy: { order: "asc" },
      });
    }),

  clearCriteria: organizerProcedure
    .input(z.object({ hackathonId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const hackathon = await ctx.prisma.hackathon.findFirst({
        where: { id: input.hackathonId, creatorId: ctx.session.user.id },
      });
      if (!hackathon) throw new Error("Hackathon not found or insufficient permissions");
      return ctx.prisma.criterion.deleteMany({ where: { hackathonId: input.hackathonId } });
    }),
});
