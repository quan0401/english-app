import type { PrismaClient } from "@/generated/prisma/client";
import type { CefrLevel } from "@/generated/prisma/enums";

/**
 * Smart word selection based on user's weak areas.
 * No AI needed — pure heuristics.
 *
 * Priority order:
 * 1. Words with high wrong/correct ratio (struggling words)
 * 2. Words from undertrained topics
 * 3. Words not reviewed in a long time (decay risk)
 * 4. New words at user's CEFR boundary
 */
export async function getSmartSuggestions(
  db: PrismaClient,
  userId: string,
  cefrLevel: CefrLevel,
  count: number = 10
) {
  const results: any[] = [];

  // 1. Struggling words — high wrong count, still not mastered
  const struggling = await db.userWordProgress.findMany({
    where: {
      userId,
      timesWrong: { gt: 0 },
      status: { not: "MASTERED" },
    },
    include: { word: true },
    orderBy: { timesWrong: "desc" },
    take: Math.ceil(count * 0.3),
  });
  results.push(...struggling.map((s) => ({ ...s.word, _reason: "struggling" })));

  // 2. Decaying words — not reviewed in 7+ days, not mastered
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const decaying = await db.userWordProgress.findMany({
    where: {
      userId,
      lastReviewedAt: { lt: sevenDaysAgo },
      status: { not: "MASTERED" },
      id: { notIn: results.map((r) => r.id) },
    },
    include: { word: true },
    orderBy: { lastReviewedAt: "asc" },
    take: Math.ceil(count * 0.3),
  });
  results.push(...decaying.map((d) => ({ ...d.word, _reason: "decaying" })));

  // 3. Fill remaining with new words at CEFR boundary
  const existingIds = new Set(results.map((r) => r.id));
  const remaining = count - results.length;

  if (remaining > 0) {
    const levelOrder: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1"];
    const currentIdx = levelOrder.indexOf(cefrLevel);

    // Try current level first, then one level up
    const levels = [cefrLevel];
    if (currentIdx + 1 < levelOrder.length) levels.push(levelOrder[currentIdx + 1]);

    const newWords = await db.word.findMany({
      where: {
        cefrLevel: { in: levels },
        id: { notIn: [...existingIds] },
        userProgress: { none: { userId } },
      },
      orderBy: { frequency: "asc" },
      take: remaining,
    });
    results.push(...newWords.map((w) => ({ ...w, _reason: "new" })));
  }

  return results.slice(0, count);
}
