import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/init";
import {
  syncWordsToNotion,
  syncProgressToNotion,
  syncNotesToNotion,
  syncNotesFromNotion,
  syncListsToNotion,
} from "@/server/services/notion-sync";

export const notionSyncRouter = createTRPCRouter({
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id!;
    const user = await ctx.db.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        notionAccessToken: true,
        notionWorkspaceId: true,
        notionPageId: true,
        notionWordDbId: true,
        notionListDbId: true,
        notionProgressDbId: true,
        notionNotesDbId: true,
        lastNotionSync: true,
      },
    });

    return {
      isConnected: !!user.notionAccessToken,
      isSetup: !!user.notionWordDbId,
      workspaceId: user.notionWorkspaceId,
      lastSync: user.lastNotionSync,
    };
  }),

  saveDbIds: protectedProcedure
    .input(z.object({
      wordDbId: z.string(),
      listDbId: z.string(),
      progressDbId: z.string(),
      notesDbId: z.string(),
      pageId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;
      await ctx.db.user.update({
        where: { id: userId },
        data: {
          notionWordDbId: input.wordDbId,
          notionListDbId: input.listDbId,
          notionProgressDbId: input.progressDbId,
          notionNotesDbId: input.notesDbId,
          notionPageId: input.pageId,
        },
      });
      return { success: true };
    }),

  syncToNotion: protectedProcedure
    .input(z.object({
      type: z.enum(["words", "progress", "notes", "lists", "all"]),
      wordLimit: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;
      const user = await ctx.db.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          notionAccessToken: true,
          notionWordDbId: true,
          notionListDbId: true,
          notionProgressDbId: true,
          notionNotesDbId: true,
        },
      });

      if (!user.notionAccessToken) {
        throw new Error("Notion not connected");
      }

      const results: Record<string, any> = {};

      if (input.type === "words" || input.type === "all") {
        if (user.notionWordDbId) {
          results.words = await syncWordsToNotion(
            ctx.db, userId, user.notionAccessToken, user.notionWordDbId, input.wordLimit ?? 100
          );
        }
      }

      if (input.type === "progress" || input.type === "all") {
        if (user.notionProgressDbId) {
          results.progress = await syncProgressToNotion(
            ctx.db, userId, user.notionAccessToken, user.notionProgressDbId
          );
        }
      }

      if (input.type === "notes" || input.type === "all") {
        if (user.notionNotesDbId) {
          results.notes = await syncNotesToNotion(
            ctx.db, userId, user.notionAccessToken, user.notionNotesDbId
          );
        }
      }

      if (input.type === "lists" || input.type === "all") {
        if (user.notionListDbId) {
          results.lists = await syncListsToNotion(
            ctx.db, userId, user.notionAccessToken, user.notionListDbId
          );
        }
      }

      // Update last sync time
      await ctx.db.user.update({
        where: { id: userId },
        data: { lastNotionSync: new Date() },
      });

      return results;
    }),

  syncFromNotion: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id!;
    const user = await ctx.db.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        notionAccessToken: true,
        notionNotesDbId: true,
      },
    });

    if (!user.notionAccessToken) {
      throw new Error("Notion not connected");
    }

    const results: Record<string, any> = {};

    if (user.notionNotesDbId) {
      results.notes = await syncNotesFromNotion(
        ctx.db, userId, user.notionAccessToken, user.notionNotesDbId
      );
    }

    await ctx.db.user.update({
      where: { id: userId },
      data: { lastNotionSync: new Date() },
    });

    return results;
  }),

  disconnect: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id!;
    await ctx.db.user.update({
      where: { id: userId },
      data: {
        notionAccessToken: null,
        notionWorkspaceId: null,
        notionPageId: null,
        notionWordDbId: null,
        notionListDbId: null,
        notionProgressDbId: null,
        notionNotesDbId: null,
        lastNotionSync: null,
      },
    });
    return { success: true };
  }),
});
