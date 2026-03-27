import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/init";

export const wordListsRouter = createTRPCRouter({
  // Get all user's lists
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id!;
    return ctx.db.wordList.findMany({
      where: { userId },
      include: { _count: { select: { items: true } } },
      orderBy: { updatedAt: "desc" },
    });
  }),

  // Get lists that contain a specific word (for the save modal)
  getListsForWord: protectedProcedure
    .input(z.object({ wordId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;
      const lists = await ctx.db.wordList.findMany({
        where: { userId },
        include: {
          _count: { select: { items: true } },
          items: {
            where: { wordId: input.wordId },
            select: { id: true },
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      return lists.map((list) => ({
        id: list.id,
        name: list.name,
        icon: list.icon,
        wordCount: list._count.items,
        hasWord: list.items.length > 0,
      }));
    }),

  // Create a new list
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(50),
      icon: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;
      return ctx.db.wordList.create({
        data: {
          userId,
          name: input.name,
          icon: input.icon ?? "📚",
        },
      });
    }),

  // Toggle a word in a list
  toggleWord: protectedProcedure
    .input(z.object({
      listId: z.string(),
      wordId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.wordListItem.findUnique({
        where: { listId_wordId: { listId: input.listId, wordId: input.wordId } },
      });

      if (existing) {
        await ctx.db.wordListItem.delete({ where: { id: existing.id } });
        return { added: false };
      } else {
        await ctx.db.wordListItem.create({
          data: { listId: input.listId, wordId: input.wordId },
        });
        // Update the list's updatedAt
        await ctx.db.wordList.update({
          where: { id: input.listId },
          data: { updatedAt: new Date() },
        });
        return { added: true };
      }
    }),

  // Get words in a list
  getWords: protectedProcedure
    .input(z.object({
      listId: z.string(),
      page: z.number().min(1).default(1),
    }))
    .query(async ({ ctx, input }) => {
      const pageSize = 20;
      const [items, total] = await Promise.all([
        ctx.db.wordListItem.findMany({
          where: { listId: input.listId },
          include: { word: true },
          orderBy: { createdAt: "desc" },
          take: pageSize,
          skip: (input.page - 1) * pageSize,
        }),
        ctx.db.wordListItem.count({ where: { listId: input.listId } }),
      ]);
      return {
        words: items.map((i) => i.word),
        total,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

  // Update a list (rename, change icon)
  update: protectedProcedure
    .input(z.object({
      listId: z.string(),
      name: z.string().min(1).max(50).optional(),
      icon: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;
      return ctx.db.wordList.update({
        where: { id: input.listId, userId },
        data: {
          ...(input.name ? { name: input.name } : {}),
          ...(input.icon ? { icon: input.icon } : {}),
        },
      });
    }),

  // Remove a word from a list
  removeWord: protectedProcedure
    .input(z.object({ listId: z.string(), wordId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.wordListItem.delete({
        where: { listId_wordId: { listId: input.listId, wordId: input.wordId } },
      });
      return { success: true };
    }),

  // Delete a list
  delete: protectedProcedure
    .input(z.object({ listId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;
      await ctx.db.wordList.delete({
        where: { id: input.listId, userId },
      });
      return { success: true };
    }),
});
