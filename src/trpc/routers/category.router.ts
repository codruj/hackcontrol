import { z } from "zod";
import { createTRPCRouter, publicProcedure, organizerProcedure } from "..";

const categoryNameSchema = z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters");

export const categoryRouter = createTRPCRouter({
  // Get all categories for a hackathon (public)
  getCategories: publicProcedure
    .input(z.object({ hackathonId: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.prisma.hackathonCategory.findMany({
        where: { hackathonId: input.hackathonId },
        orderBy: { createdAt: "asc" },
      });
    }),

  // Add a category (organizer/admin only, max 10 per hackathon)
  addCategory: organizerProcedure
    .input(z.object({
      hackathonId: z.string(),
      name: categoryNameSchema,
      description: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const hackathon = await ctx.prisma.hackathon.findFirst({
        where: { id: input.hackathonId, creatorId: ctx.session.user.id },
      });
      if (!hackathon) throw new Error("Hackathon not found or insufficient permissions");

      const count = await ctx.prisma.hackathonCategory.count({
        where: { hackathonId: input.hackathonId },
      });
      if (count >= 10) throw new Error("Maximum of 10 categories allowed per hackathon");

      const existing = await ctx.prisma.hackathonCategory.findUnique({
        where: { hackathonId_name: { hackathonId: input.hackathonId, name: input.name.trim() } },
      });
      if (existing) throw new Error("A category with this name already exists");

      return ctx.prisma.hackathonCategory.create({
        data: {
          hackathonId: input.hackathonId,
          name: input.name.trim(),
          description: input.description?.trim() || null,
        },
      });
    }),

  // Update a category (organizer/admin only)
  updateCategory: organizerProcedure
    .input(z.object({
      categoryId: z.string(),
      hackathonId: z.string(),
      name: categoryNameSchema,
      description: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const hackathon = await ctx.prisma.hackathon.findFirst({
        where: { id: input.hackathonId, creatorId: ctx.session.user.id },
      });
      if (!hackathon) throw new Error("Hackathon not found or insufficient permissions");

      const category = await ctx.prisma.hackathonCategory.findFirst({
        where: { id: input.categoryId, hackathonId: input.hackathonId },
      });
      if (!category) throw new Error("Category not found");

      // Check name uniqueness (excluding self)
      const nameConflict = await ctx.prisma.hackathonCategory.findFirst({
        where: {
          hackathonId: input.hackathonId,
          name: input.name.trim(),
          id: { not: input.categoryId },
        },
      });
      if (nameConflict) throw new Error("A category with this name already exists");

      return ctx.prisma.hackathonCategory.update({
        where: { id: input.categoryId },
        data: {
          name: input.name.trim(),
          description: input.description?.trim() || null,
        },
      });
    }),

  // Delete a category (organizer/admin only)
  deleteCategory: organizerProcedure
    .input(z.object({
      categoryId: z.string(),
      hackathonId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const hackathon = await ctx.prisma.hackathon.findFirst({
        where: { id: input.hackathonId, creatorId: ctx.session.user.id },
      });
      if (!hackathon) throw new Error("Hackathon not found or insufficient permissions");

      const category = await ctx.prisma.hackathonCategory.findFirst({
        where: { id: input.categoryId, hackathonId: input.hackathonId },
      });
      if (!category) throw new Error("Category not found");

      return ctx.prisma.hackathonCategory.delete({
        where: { id: input.categoryId },
      });
    }),
});
