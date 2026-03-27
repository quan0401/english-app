import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/init";

export const favoritesRouter = createTRPCRouter({
  // Check if a word is favorited/saved
  getStatus: protectedProcedure
    .input(z.object({ wordId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;
      const [favorite, saved, inList] = await Promise.all([
        ctx.db.favoriteWord.findUnique({
          where: { userId_wordId: { userId, wordId: input.wordId } },
        }),
        ctx.db.savedWord.findUnique({
          where: { userId_wordId: { userId, wordId: input.wordId } },
        }),
        ctx.db.wordListItem.findFirst({
          where: {
            wordId: input.wordId,
            list: { userId },
          },
        }),
      ]);
      return { isFavorited: !!favorite, isSaved: !!saved || !!inList };
    }),

  // Batch check for word lists
  getStatusBatch: protectedProcedure
    .input(z.object({ wordIds: z.array(z.string()) }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;
      const [favorites, saved] = await Promise.all([
        ctx.db.favoriteWord.findMany({
          where: { userId, wordId: { in: input.wordIds } },
          select: { wordId: true },
        }),
        ctx.db.savedWord.findMany({
          where: { userId, wordId: { in: input.wordIds } },
          select: { wordId: true },
        }),
      ]);
      const favSet = new Set(favorites.map((f) => f.wordId));
      const savedSet = new Set(saved.map((s) => s.wordId));
      return { favoritedIds: [...favSet], savedIds: [...savedSet] };
    }),

  // Toggle favorite
  toggleFavorite: protectedProcedure
    .input(z.object({ wordId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;
      const existing = await ctx.db.favoriteWord.findUnique({
        where: { userId_wordId: { userId, wordId: input.wordId } },
      });

      if (existing) {
        await ctx.db.favoriteWord.delete({ where: { id: existing.id } });
        return { isFavorited: false };
      } else {
        await ctx.db.favoriteWord.create({
          data: { userId, wordId: input.wordId },
        });
        return { isFavorited: true };
      }
    }),

  // Toggle saved
  toggleSaved: protectedProcedure
    .input(z.object({ wordId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;
      const existing = await ctx.db.savedWord.findUnique({
        where: { userId_wordId: { userId, wordId: input.wordId } },
      });

      if (existing) {
        await ctx.db.savedWord.delete({ where: { id: existing.id } });
        return { isSaved: false };
      } else {
        await ctx.db.savedWord.create({
          data: { userId, wordId: input.wordId },
        });
        return { isSaved: true };
      }
    }),

  // Get all favorites
  getFavorites: protectedProcedure
    .input(z.object({ page: z.number().min(1).default(1) }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;
      const pageSize = 20;
      const [items, total] = await Promise.all([
        ctx.db.favoriteWord.findMany({
          where: { userId },
          include: { word: true },
          orderBy: { createdAt: "desc" },
          take: pageSize,
          skip: (input.page - 1) * pageSize,
        }),
        ctx.db.favoriteWord.count({ where: { userId } }),
      ]);
      return {
        words: items.map((i) => i.word),
        total,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

  // Get all saved
  getSaved: protectedProcedure
    .input(z.object({ page: z.number().min(1).default(1) }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;
      const pageSize = 20;
      const [items, total] = await Promise.all([
        ctx.db.savedWord.findMany({
          where: { userId },
          include: { word: true },
          orderBy: { createdAt: "desc" },
          take: pageSize,
          skip: (input.page - 1) * pageSize,
        }),
        ctx.db.savedWord.count({ where: { userId } }),
      ]);
      return {
        words: items.map((i) => i.word),
        total,
        totalPages: Math.ceil(total / pageSize),
      };
    }),
});
