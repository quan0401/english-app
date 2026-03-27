import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/init";

export const gameRouter = createTRPCRouter({
  /**
   * Get words for games — pulls from user's learned words + random distractors.
   * Returns `count` question words + extra words for wrong answer choices.
   */
  getGameWords: protectedProcedure
    .input(z.object({ count: z.number().min(1).max(20).default(10) }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      // Get words the user has seen (for questions)
      const userWords = await ctx.db.userWordProgress.findMany({
        where: { userId },
        include: { word: true },
        orderBy: { lastReviewedAt: "desc" },
        take: input.count * 3, // pool to pick from
      });

      // If user hasn't learned enough words, supplement with random words
      let questionPool = userWords.map((uw) => uw.word);

      if (questionPool.length < input.count) {
        const extra = await ctx.db.word.findMany({
          take: input.count - questionPool.length,
          orderBy: { frequency: "asc" },
        });
        questionPool = [...questionPool, ...extra];
      }

      // Shuffle and take `count`
      const shuffled = questionPool.sort(() => Math.random() - 0.5);
      const questions = shuffled.slice(0, input.count);

      // Get distractor words (for multiple choice wrong answers)
      const questionIds = new Set(questions.map((q) => q.id));
      const distractors = await ctx.db.word.findMany({
        where: { id: { notIn: [...questionIds] } },
        take: input.count * 3,
        orderBy: { frequency: "asc" },
      });

      return {
        questions: questions.map((q) => ({
          id: q.id,
          word: q.word,
          phonetic: q.phonetic,
          partOfSpeech: q.partOfSpeech,
          definitionEn: q.definitionEn,
          translationVi: q.translationVi,
          exampleSentence: q.exampleSentence,
        })),
        distractors: distractors.map((d) => ({
          id: d.id,
          word: d.word,
          definitionEn: d.definitionEn,
          translationVi: d.translationVi,
        })),
      };
    }),

  // Record game result
  recordResult: protectedProcedure
    .input(
      z.object({
        wordId: z.string(),
        correct: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      // Update word progress stats
      const progress = await ctx.db.userWordProgress.findUnique({
        where: { userId_wordId: { userId, wordId: input.wordId } },
      });

      if (progress) {
        await ctx.db.userWordProgress.update({
          where: { id: progress.id },
          data: {
            timesCorrect: input.correct ? { increment: 1 } : undefined,
            timesWrong: !input.correct ? { increment: 1 } : undefined,
          },
        });
      }

      // Update daily session
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      await ctx.db.dailySession.upsert({
        where: { userId_date: { userId, date: today } },
        update: { wordsReviewed: { increment: 1 } },
        create: { userId, date: today, wordsReviewed: 1 },
      });

      return { success: true };
    }),
});
