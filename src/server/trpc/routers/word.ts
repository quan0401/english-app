import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/trpc/init";

const PAGE_SIZE = 20;
const ENRICHED = { needsCrawl: false } as const; // filter out stub words

export const wordRouter = createTRPCRouter({
  getTopics: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.topic.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { words: { where: ENRICHED } } } },
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
      const where = { topicId: input.topicId, ...ENRICHED };
      const [words, total] = await Promise.all([
        ctx.db.word.findMany({
          where,
          orderBy: { frequency: "asc" },
          take: PAGE_SIZE,
          skip: (input.page - 1) * PAGE_SIZE,
          include: { topic: true },
        }),
        ctx.db.word.count({ where }),
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
      const where = { cefrLevel: input.level, ...ENRICHED };
      const [words, total] = await Promise.all([
        ctx.db.word.findMany({
          where,
          orderBy: { frequency: "asc" },
          take: PAGE_SIZE,
          skip: (input.page - 1) * PAGE_SIZE,
          include: { topic: true },
        }),
        ctx.db.word.count({ where }),
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

  getFamily: publicProcedure
    .input(z.object({ wordId: z.string() }))
    .query(async ({ ctx, input }) => {
      const word = await ctx.db.word.findUnique({
        where: { id: input.wordId },
        select: { familyId: true },
      });
      if (!word?.familyId) return null;

      const family = await ctx.db.wordFamily.findUnique({
        where: { id: word.familyId },
        include: {
          words: {
            where: ENRICHED,
            select: { id: true, word: true, partOfSpeech: true, translationVi: true },
            orderBy: { frequency: "asc" },
          },
        },
      });
      return family;
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
          ...ENRICHED,
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
      const where = { partOfSpeech: input.partOfSpeech, ...ENRICHED };
      const [words, total] = await Promise.all([
        ctx.db.word.findMany({
          where,
          orderBy: { frequency: "asc" },
          take: PAGE_SIZE,
          skip: (input.page - 1) * PAGE_SIZE,
        }),
        ctx.db.word.count({ where }),
      ]);
      return { words, total, totalPages: Math.ceil(total / PAGE_SIZE) };
    }),

  search: publicProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.word.findMany({
        where: {
          word: { contains: input.query, mode: "insensitive" },
          ...ENRICHED,
        },
        take: 20,
        orderBy: { frequency: "asc" },
        include: { topic: true },
      });
    }),
});
