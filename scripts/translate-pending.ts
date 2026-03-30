/**
 * Translate words with [pending] Vietnamese translation.
 * Detects rate limits and stops automatically instead of burning through all words.
 *
 * Usage:
 *   bun run scripts/translate-pending.ts
 *   bun run scripts/translate-pending.ts --limit 1000
 *   MYMEMORY_EMAIL=you@email.com bun run scripts/translate-pending.ts
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const MYMEMORY_EMAIL = process.env.MYMEMORY_EMAIL || "";
const limitIdx = process.argv.indexOf("--limit");
const LIMIT = limitIdx !== -1 ? parseInt(process.argv[limitIdx + 1]) : 5000;
const MAX_CONSECUTIVE_FAILS = 20; // stop after this many fails in a row

async function fetchVietnamese(word: string): Promise<{ translation: string | null; rateLimited: boolean }> {
  try {
    let url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|vi`;
    if (MYMEMORY_EMAIL) url += `&de=${encodeURIComponent(MYMEMORY_EMAIL)}`;

    const res = await fetch(url);
    if (!res.ok) return { translation: null, rateLimited: res.status === 429 };

    const data = await res.json();

    // Detect rate limit response
    if (data.responseStatus === 429 || data.responseDetails?.includes("USED ALL AVAILABLE")) {
      return { translation: null, rateLimited: true };
    }

    const translation = data?.responseData?.translatedText;

    if (
      translation &&
      translation.toLowerCase() !== word.toLowerCase() &&
      translation !== translation.toUpperCase() &&
      !translation.includes("MYMEMORY WARNING")
    ) {
      return { translation, rateLimited: false };
    }
    return { translation: null, rateLimited: false };
  } catch {
    return { translation: null, rateLimited: false };
  }
}

async function main() {
  console.log(`=== Translate Pending Vietnamese (limit: ${LIMIT}) ===\n`);

  const pending = await db.word.findMany({
    where: { translationVi: "[pending]" },
    select: { id: true, word: true },
    orderBy: { frequency: "asc" },
    take: LIMIT,
  });

  console.log(`  Found ${pending.length} words to translate\n`);

  let translated = 0;
  let failed = 0;
  let consecutiveFails = 0;

  for (let i = 0; i < pending.length; i++) {
    const word = pending[i];
    const result = await fetchVietnamese(word.word);

    if (result.rateLimited) {
      console.log(`\n  ⚠ Rate limited! Stopping after ${translated} translations.`);
      console.log(`  Try again in a few hours, or use MYMEMORY_EMAIL for higher limits.`);
      break;
    }

    if (result.translation) {
      await db.word.update({
        where: { id: word.id },
        data: { translationVi: result.translation },
      });
      translated++;
      consecutiveFails = 0;
    } else {
      failed++;
      consecutiveFails++;

      if (consecutiveFails >= MAX_CONSECUTIVE_FAILS) {
        console.log(`\n  ⚠ ${MAX_CONSECUTIVE_FAILS} consecutive failures — stopping.`);
        break;
      }
    }

    if (i % 200 === 0 && i > 0) {
      console.log(`  Progress: ${i}/${pending.length} (translated: ${translated}, failed: ${failed})`);
    }

    await new Promise((r) => setTimeout(r, 250));
  }

  const remaining = await db.word.count({ where: { translationVi: "[pending]" } });

  console.log(`\n=== Results ===`);
  console.log(`  Translated: ${translated}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Still pending: ${remaining}`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
