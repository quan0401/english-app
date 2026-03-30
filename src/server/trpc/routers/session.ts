import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/init";
import { getDailyWords } from "@/server/services/daily-words";
import { getSmartSuggestions } from "@/server/services/smart-suggestions";

export const sessionRouter = createTRPCRouter({
  getDailyWords: protectedProcedure
    .input(z.object({ seed: z.number().optional() }).optional())
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id!;
      const user = await ctx.db.user.findUniqueOrThrow({
        where: { id: userId },
      });
      return getDailyWords(ctx.db, user.id, user.cefrLevel, user.dailyGoal);
    }),

  getSmartWords: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id!;
    const user = await ctx.db.user.findUniqueOrThrow({
      where: { id: userId },
    });
    return getSmartSuggestions(ctx.db, user.id, user.cefrLevel, user.dailyGoal);
  }),

  recordWordResult: protectedProcedure
    .input(
      z.object({
        wordId: z.string(),
        known: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      // Create or update word progress
      const existing = await ctx.db.userWordProgress.findUnique({
        where: { userId_wordId: { userId, wordId: input.wordId } },
      });

      if (existing) {
        await ctx.db.userWordProgress.update({
          where: { id: existing.id },
          data: {
            timesCorrect: input.known ? { increment: 1 } : undefined,
            timesWrong: !input.known ? { increment: 1 } : undefined,
            status: input.known ? "LEARNING" : "NEW",
            lastReviewedAt: new Date(),
            // If known, schedule first review for tomorrow; if not, review again today
            nextReviewAt: input.known
              ? new Date(Date.now() + 24 * 60 * 60 * 1000)
              : new Date(),
          },
        });
      } else {
        await ctx.db.userWordProgress.create({
          data: {
            userId,
            wordId: input.wordId,
            status: input.known ? "LEARNING" : "NEW",
            timesCorrect: input.known ? 1 : 0,
            timesWrong: input.known ? 0 : 1,
            lastReviewedAt: new Date(),
            nextReviewAt: input.known
              ? new Date(Date.now() + 24 * 60 * 60 * 1000)
              : new Date(),
            easeFactor: 2.5,
            interval: input.known ? 1 : 0,
            repetitions: input.known ? 1 : 0,
          },
        });
      }

      // Update daily session
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await ctx.db.dailySession.upsert({
        where: { userId_date: { userId, date: today } },
        update: { wordsLearned: { increment: 1 } },
        create: { userId, date: today, wordsLearned: 1 },
      });

      return { success: true };
    }),
});
