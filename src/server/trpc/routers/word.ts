import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/trpc/init";

const PAGE_SIZE = 20;

export const wordRouter = createTRPCRouter({
  getTopics: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.topic.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { words: true } } },
    });
  }),

  getByTopic: publicProcedure
    .input(
      z.object({
        topicId: z.string(),
        page: z.number().min(1).default(1),
      })
    )
    .query(async ({ ctx, input }) => {
      const [words, total] = await Promise.all([
        ctx.db.word.findMany({
          where: { topicId: input.topicId },
          orderBy: { frequency: "asc" },
          take: PAGE_SIZE,
          skip: (input.page - 1) * PAGE_SIZE,
          include: { topic: true },
        }),
        ctx.db.word.count({ where: { topicId: input.topicId } }),
      ]);

      return {
        words,
        total,
        page: input.page,
        totalPages: Math.ceil(total / PAGE_SIZE),
      };
    }),

  getByLevel: publicProcedure
    .input(
      z.object({
        level: z.enum(["A1", "A2", "B1", "B2", "C1"]),
        page: z.number().min(1).default(1),
      })
    )
    .query(async ({ ctx, input }) => {
      const [words, total] = await Promise.all([
        ctx.db.word.findMany({
          where: { cefrLevel: input.level },
          orderBy: { frequency: "asc" },
          take: PAGE_SIZE,
          skip: (input.page - 1) * PAGE_SIZE,
          include: { topic: true },
        }),
        ctx.db.word.count({ where: { cefrLevel: input.level } }),
      ]);

      return {
        words,
        total,
        page: input.page,
        totalPages: Math.ceil(total / PAGE_SIZE),
      };
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.word.findUnique({
        where: { id: input.id },
        include: { topic: true },
      });
    }),

  getRelated: publicProcedure
    .input(z.object({ wordId: z.string() }))
    .query(async ({ ctx, input }) => {
      const word = await ctx.db.word.findUnique({
        where: { id: input.wordId },
        select: { topicId: true, frequency: true },
      });
      if (!word) return [];

      return ctx.db.word.findMany({
        where: {
          id: { not: input.wordId },
          OR: [
            ...(word.topicId ? [{ topicId: word.topicId }] : []),
            {
              frequency: {
                gte: Math.max(0, word.frequency - 20),
                lte: word.frequency + 20,
              },
            },
          ],
        },
        take: 8,
        orderBy: { frequency: "asc" },
        select: { id: true, word: true, partOfSpeech: true, translationVi: true, cefrLevel: true },
      });
    }),

  getByPartOfSpeech: publicProcedure
    .input(z.object({
      partOfSpeech: z.enum(["PHRASAL_VERB", "IDIOM"]),
      page: z.number().min(1).default(1),
    }))
    .query(async ({ ctx, input }) => {
      const [words, total] = await Promise.all([
        ctx.db.word.findMany({
          where: { partOfSpeech: input.partOfSpeech },
          orderBy: { frequency: "asc" },
          take: PAGE_SIZE,
          skip: (input.page - 1) * PAGE_SIZE,
        }),
        ctx.db.word.count({ where: { partOfSpeech: input.partOfSpeech } }),
      ]);
      return { words, total, totalPages: Math.ceil(total / PAGE_SIZE) };
    }),

  search: publicProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.word.findMany({
        where: {
          word: { contains: input.query, mode: "insensitive" },
        },
        take: 20,
        orderBy: { frequency: "asc" },
        include: { topic: true },
      });
    }),
});
