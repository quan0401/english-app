import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/init";
import { sm2, qualityMap } from "@/server/services/sm2";
import type { ReviewQuality } from "@/server/services/sm2";

export const progressRouter = createTRPCRouter({
  getReviewQueue: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id!;

    const reviews = await ctx.db.userWordProgress.findMany({
      where: {
        userId,
        nextReviewAt: { lte: new Date() },
        status: { not: "MASTERED" },
      },
      include: { word: true },
      orderBy: { nextReviewAt: "asc" },
      take: 50,
    });

    return reviews;
  }),

  getReviewCount: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id!;

    return ctx.db.userWordProgress.count({
      where: {
        userId,
        nextReviewAt: { lte: new Date() },
        status: { not: "MASTERED" },
      },
    });
  }),

  submitReview: protectedProcedure
    .input(
      z.object({
        wordId: z.string(),
        quality: z.enum(["again", "hard", "good", "easy"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;
      const qualityScore = qualityMap[input.quality as ReviewQuality];

      const progress = await ctx.db.userWordProgress.findUniqueOrThrow({
        where: { userId_wordId: { userId, wordId: input.wordId } },
      });

      const result = sm2({
        quality: qualityScore,
        repetitions: progress.repetitions,
        easeFactor: progress.easeFactor,
        interval: progress.interval,
      });

      // Determine new status
      let newStatus = progress.status;
      if (qualityScore < 3) {
        newStatus = "LEARNING";
      } else if (result.interval > 21 && result.easeFactor > 2.0) {
        newStatus = "MASTERED";
      } else if (result.interval > 1) {
        newStatus = "REVIEW";
      } else {
        newStatus = "LEARNING";
      }

      await ctx.db.userWordProgress.update({
        where: { id: progress.id },
        data: {
          easeFactor: result.easeFactor,
          interval: result.interval,
          repetitions: result.repetitions,
          nextReviewAt: result.nextReviewAt,
          lastReviewedAt: new Date(),
          timesCorrect: qualityScore >= 3 ? { increment: 1 } : undefined,
          timesWrong: qualityScore < 3 ? { increment: 1 } : undefined,
          status: newStatus,
        },
      });

      // Update daily session
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await ctx.db.dailySession.upsert({
        where: { userId_date: { userId, date: today } },
        update: { wordsReviewed: { increment: 1 } },
        create: { userId, date: today, wordsReviewed: 1 },
      });

      return { success: true, newStatus };
    }),

  getLearnedWords: protectedProcedure
    .input(z.object({
      status: z.enum(["ALL", "MASTERED", "LEARNING", "REVIEW", "NEW"]).default("ALL"),
      page: z.number().min(1).default(1),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;
      const pageSize = 20;
      const where = {
        userId,
        ...(input.status !== "ALL" ? { status: input.status } : {}),
      };

      const [items, total] = await Promise.all([
        ctx.db.userWordProgress.findMany({
          where,
          include: { word: true },
          orderBy: { lastReviewedAt: "desc" },
          take: pageSize,
          skip: (input.page - 1) * pageSize,
        }),
        ctx.db.userWordProgress.count({ where }),
      ]);

      return {
        words: items.map((i) => i.word),
        total,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id!;

    const [total, mastered, learning, review, newWords] = await Promise.all([
      ctx.db.userWordProgress.count({ where: { userId } }),
      ctx.db.userWordProgress.count({ where: { userId, status: "MASTERED" } }),
      ctx.db.userWordProgress.count({ where: { userId, status: "LEARNING" } }),
      ctx.db.userWordProgress.count({ where: { userId, status: "REVIEW" } }),
      ctx.db.userWordProgress.count({ where: { userId, status: "NEW" } }),
    ]);

    return { total, mastered, learning, review, new: newWords };
  }),

  getWordProgress: protectedProcedure
    .input(z.object({ wordId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;
      return ctx.db.userWordProgress.findUnique({
        where: { userId_wordId: { userId, wordId: input.wordId } },
      });
    }),

  updateNotes: protectedProcedure
    .input(z.object({ wordId: z.string(), notes: z.string().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;
      return ctx.db.userWordProgress.upsert({
        where: { userId_wordId: { userId, wordId: input.wordId } },
        update: { notes: input.notes },
        create: {
          userId,
          wordId: input.wordId,
          notes: input.notes,
          nextReviewAt: new Date(),
        },
      });
    }),

  getTopicProgress: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id!;

    const topics = await ctx.db.topic.findMany({
      select: {
        id: true,
        _count: { select: { words: true } },
      },
    });

    const progress = await ctx.db.userWordProgress.groupBy({
      by: ["status"],
      where: {
        userId,
        word: { topicId: { not: null } },
      },
      _count: true,
    });

    // Get per-topic mastered counts
    const topicMastery = await ctx.db.$queryRawUnsafe<
      { topicId: string; total: bigint; mastered: bigint }[]
    >(`
      SELECT w."topicId",
        COUNT(uwp.id) as total,
        COUNT(CASE WHEN uwp.status = 'MASTERED' THEN 1 END) as mastered
      FROM user_word_progress uwp
      JOIN words w ON uwp."wordId" = w.id
      WHERE uwp."userId" = $1 AND w."topicId" IS NOT NULL
      GROUP BY w."topicId"
    `, userId);

    const masteryMap = new Map(
      topicMastery.map((t) => [t.topicId, {
        learned: Number(t.total),
        mastered: Number(t.mastered),
      }])
    );

    return topics.map((t) => ({
      topicId: t.id,
      totalWords: t._count.words,
      learned: masteryMap.get(t.id)?.learned ?? 0,
      mastered: masteryMap.get(t.id)?.mastered ?? 0,
    }));
  }),
});
