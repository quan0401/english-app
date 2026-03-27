export interface SM2Input {
  quality: number; // 0-5 (0=blackout, 5=perfect)
  repetitions: number;
  easeFactor: number; // >= 1.3
  interval: number; // days
}

export interface SM2Output {
  repetitions: number;
  easeFactor: number;
  interval: number;
  nextReviewAt: Date;
}

export function sm2(input: SM2Input): SM2Output {
  const { quality, repetitions, easeFactor, interval } = input;

  let newReps: number;
  let newInterval: number;
  let newEF: number;

  if (quality < 3) {
    // Failed — reset
    newReps = 0;
    newInterval = 1;
    newEF = easeFactor;
  } else {
    // Passed
    newReps = repetitions + 1;
    if (newReps === 1) {
      newInterval = 1;
    } else if (newReps === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * easeFactor);
    }
    newEF =
      easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  }

  newEF = Math.max(1.3, newEF);

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);

  return {
    repetitions: newReps,
    easeFactor: newEF,
    interval: newInterval,
    nextReviewAt,
  };
}

/**
 * Map simplified UI buttons to SM-2 quality scores:
 * Again = 1, Hard = 2, Good = 3, Easy = 5
 */
export type ReviewQuality = "again" | "hard" | "good" | "easy";

export const qualityMap: Record<ReviewQuality, number> = {
  again: 1,
  hard: 2,
  good: 3,
  easy: 5,
};
