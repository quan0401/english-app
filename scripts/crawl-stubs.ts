/**
 * Crawl definitions for stub words (needsCrawl = true).
 * Uses Free Dictionary API + MyMemory API — same as crawl-words.ts.
 *
 * Usage:
 *   bun run scripts/crawl-stubs.ts
 *   bun run scripts/crawl-stubs.ts --limit 1000
 *   MYMEMORY_EMAIL=you@email.com bun run scripts/crawl-stubs.ts
 *
 * Resumable — tracks progress by updating DB directly.
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const MYMEMORY_EMAIL = process.env.MYMEMORY_EMAIL || "";
const limitArg = process.argv.indexOf("--limit");
const LIMIT = limitArg !== -1 ? parseInt(process.argv[limitArg + 1]) : 5000;

const POS_MAP: Record<string, string> = {
  noun: "NOUN", verb: "VERB", adjective: "ADJECTIVE", adverb: "ADVERB",
  preposition: "PREPOSITION", conjunction: "CONJUNCTION", pronoun: "PRONOUN",
  interjection: "INTERJECTION", determiner: "DETERMINER",
};

interface DictEntry {
  word: string;
  phonetic?: string;
  phonetics?: { text?: string }[];
  meanings?: {
    partOfSpeech: string;
    definitions: { definition: string; example?: string }[];
  }[];
}

async function fetchDictionary(word: string): Promise<DictEntry[] | null> {
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function fetchVietnamese(word: string, definition: string): Promise<string> {
  try {
    const query = encodeURIComponent(word);
    let url = `https://api.mymemory.translated.net/get?q=${query}&langpair=en|vi`;
    if (MYMEMORY_EMAIL) url += `&de=${encodeURIComponent(MYMEMORY_EMAIL)}`;

    const res = await fetch(url);
    if (!res.ok) return "[pending]";

    const data = await res.json();
    const translation = data?.responseData?.translatedText;

    if (translation && translation.toLowerCase() !== word.toLowerCase() && translation !== translation.toUpperCase()) {
      return translation;
    }

    // Fallback: translate definition
    const defQuery = encodeURIComponent(definition.slice(0, 100));
    let defUrl = `https://api.mymemory.translated.net/get?q=${defQuery}&langpair=en|vi`;
    if (MYMEMORY_EMAIL) defUrl += `&de=${encodeURIComponent(MYMEMORY_EMAIL)}`;

    const defRes = await fetch(defUrl);
    if (!defRes.ok) return "[pending]";

    const defData = await defRes.json();
    return defData?.responseData?.translatedText || "[pending]";
  } catch {
    return "[pending]";
  }
}

async function main() {
  console.log(`=== Crawl Stub Words (limit: ${LIMIT}) ===\n`);

  // Get stubs that need crawling, ordered by frequency (most common first)
  const stubs = await db.word.findMany({
    where: { needsCrawl: true },
    select: { id: true, word: true },
    orderBy: { frequency: "asc" },
    take: LIMIT,
  });

  console.log(`  Found ${stubs.length} stubs to crawl\n`);

  let enriched = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < stubs.length; i++) {
    const stub = stubs[i];

    if (i % 100 === 0 && i > 0) {
      console.log(`  Progress: ${i}/${stubs.length} (enriched: ${enriched}, failed: ${failed})`);
    }

    // Fetch dictionary data
    const dictEntries = await fetchDictionary(stub.word);
    if (!dictEntries || dictEntries.length === 0) {
      // Mark as failed but keep needsCrawl true for retry with different source
      failed++;
      await new Promise((r) => setTimeout(r, 100));
      continue;
    }

    const entry = dictEntries[0];
    const phonetic = entry.phonetic || entry.phonetics?.find((p) => p.text)?.text || null;
    const meaning = entry.meanings?.[0];

    if (!meaning) {
      failed++;
      continue;
    }

    const partOfSpeech = POS_MAP[meaning.partOfSpeech.toLowerCase()];
    if (!partOfSpeech) {
      failed++;
      continue;
    }

    const def = meaning.definitions[0];
    if (!def) {
      failed++;
      continue;
    }

    // Fetch Vietnamese translation
    const translationVi = await fetchVietnamese(stub.word, def.definition);

    // Update the stub
    try {
      await db.word.update({
        where: { id: stub.id },
        data: {
          phonetic,
          partOfSpeech: partOfSpeech as any,
          definitionEn: def.definition,
          translationVi,
          exampleSentence: def.example || `The word "${stub.word}" is commonly used in English.`,
          needsCrawl: false,
        },
      });
      enriched++;
    } catch {
      skipped++;
    }

    // Rate limiting
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\n=== Results ===`);
  console.log(`  Enriched: ${enriched}`);
  console.log(`  Failed (no dict entry): ${failed}`);
  console.log(`  Skipped (DB error): ${skipped}`);

  const remaining = await db.word.count({ where: { needsCrawl: true } });
  console.log(`  Still need crawling: ${remaining}`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
