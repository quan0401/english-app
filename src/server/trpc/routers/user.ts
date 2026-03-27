import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/init";

export const userRouter = createTRPCRouter({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id!;
    return ctx.db.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        cefrLevel: true,
        dailyGoal: true,
        uiLanguage: true,
        timezone: true,
      },
    });
  }),

  updateSettings: protectedProcedure
    .input(
      z.object({
        cefrLevel: z.enum(["A1", "A2", "B1", "B2", "C1"]).optional(),
        dailyGoal: z.number().min(1).max(50).optional(),
        uiLanguage: z.enum(["vi", "en"]).optional(),
        timezone: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;
      return ctx.db.user.update({
        where: { id: userId },
        data: input,
      });
    }),
});
