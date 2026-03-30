/**
 * Enrich stub words using WordNet 3.1 (offline, no API calls).
 * Then optionally fetch Vietnamese translations via MyMemory API.
 *
 * WordNet provides: definitions, examples, part of speech — for FREE.
 * MyMemory provides: Vietnamese translations (1000/day free, 5000 with email).
 *
 * Usage:
 *   bun run scripts/enrich-from-wordnet.ts                # WordNet only (instant)
 *   bun run scripts/enrich-from-wordnet.ts --translate     # + Vietnamese via MyMemory
 *   bun run scripts/enrich-from-wordnet.ts --limit 5000    # limit translations
 *   MYMEMORY_EMAIL=you@email.com bun run scripts/enrich-from-wordnet.ts --translate
 */

import { readFileSync } from "fs";
import { join } from "path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const WORDNET_DIR = join(process.cwd(), "node_modules/en-wordnet/database/3.1");
const DO_TRANSLATE = process.argv.includes("--translate");
const LIMIT_IDX = process.argv.indexOf("--limit");
const TRANSLATE_LIMIT = LIMIT_IDX !== -1 ? parseInt(process.argv[LIMIT_IDX + 1]) : 5000;
const MYMEMORY_EMAIL = process.env.MYMEMORY_EMAIL || "";

const POS_MAP: Record<string, string> = {
  n: "NOUN",
  v: "VERB",
  a: "ADJECTIVE",
  s: "ADJECTIVE", // satellite adjective
  r: "ADVERB",
};

// ─── Parse WordNet data files ────────────────────────────

interface WordNetEntry {
  word: string;
  pos: string;
  definition: string;
  example: string | null;
}

function parseWordNetData(): Map<string, WordNetEntry> {
  const entries = new Map<string, WordNetEntry>();

  const files = [
    { file: "data.noun", pos: "n" },
    { file: "data.verb", pos: "v" },
    { file: "data.adj", pos: "a" },
    { file: "data.adv", pos: "r" },
  ];

  for (const { file, pos } of files) {
    const content = readFileSync(join(WORDNET_DIR, file), "utf-8");
    const lines = content.split("\n");

    for (const line of lines) {
      if (line.startsWith("  ")) continue; // skip header

      const pipeIdx = line.indexOf("|");
      if (pipeIdx === -1) continue;

      // Parse the synset line before the pipe
      const meta = line.substring(0, pipeIdx).trim();
      const gloss = line.substring(pipeIdx + 1).trim();

      // Extract words from the synset
      // Format: offset lex_filenum ss_type w_cnt word lex_id ...
      const parts = meta.split(/\s+/);
      if (parts.length < 5) continue;

      const wordCount = parseInt(parts[3], 16);
      const words: string[] = [];
      for (let i = 0; i < wordCount; i++) {
        const wordIdx = 4 + i * 2;
        if (wordIdx < parts.length) {
          words.push(parts[wordIdx].replace(/_/g, " ").toLowerCase());
        }
      }

      // Parse definition and example from gloss
      let definition = gloss;
      let example: string | null = null;

      const quoteMatch = gloss.match(/^(.*?)\s*"([^"]+)"/);
      if (quoteMatch) {
        definition = quoteMatch[1].replace(/;\s*$/, "").trim();
        example = quoteMatch[2];
      }

      // Clean up definition
      definition = definition.replace(/;\s*$/, "").trim();
      if (!definition) continue;

      // Store for each word (first occurrence wins — most common sense)
      for (const word of words) {
        if (!entries.has(word)) {
          entries.set(word, {
            word,
            pos: POS_MAP[pos] || "NOUN",
            definition,
            example,
          });
        }
      }
    }
  }

  return entries;
}

// ─── Vietnamese translation ──────────────────────────────

async function fetchVietnamese(word: string): Promise<string> {
  try {
    let url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|vi`;
    if (MYMEMORY_EMAIL) url += `&de=${encodeURIComponent(MYMEMORY_EMAIL)}`;

    const res = await fetch(url);
    if (!res.ok) return "[pending]";

    const data = await res.json();
    const translation = data?.responseData?.translatedText;

    if (translation && translation.toLowerCase() !== word.toLowerCase() && translation !== translation.toUpperCase()) {
      return translation;
    }
    return "[pending]";
  } catch {
    return "[pending]";
  }
}

// ─── Main ───────────────────────────────────────────────

async function main() {
  console.log("=== Enrich Stubs from WordNet 3.1 ===\n");

  // Step 1: Parse WordNet
  console.log("Parsing WordNet data files...");
  const wordnet = parseWordNetData();
  console.log(`  Loaded ${wordnet.size} WordNet entries\n`);

  // Step 2: Get stubs from DB
  const stubs = await db.word.findMany({
    where: { needsCrawl: true },
    select: { id: true, word: true },
  });
  console.log(`  Found ${stubs.length} stubs in DB\n`);

  // Step 3: Enrich from WordNet (instant — no API calls)
  let enriched = 0;
  let noMatch = 0;

  for (let i = 0; i < stubs.length; i++) {
    const stub = stubs[i];
    const wn = wordnet.get(stub.word.toLowerCase());

    if (!wn) {
      noMatch++;
      continue;
    }

    try {
      await db.word.update({
        where: { id: stub.id },
        data: {
          partOfSpeech: wn.pos as any,
          definitionEn: wn.definition,
          exampleSentence: wn.example || `The word "${stub.word}" is used in everyday English.`,
          needsCrawl: DO_TRANSLATE ? true : false, // keep true if we still need Vietnamese
        },
      });
      enriched++;
    } catch {
      // skip errors
    }

    if (i % 5000 === 0 && i > 0) {
      console.log(`  WordNet pass: ${i}/${stubs.length} (enriched: ${enriched})`);
    }
  }

  console.log(`\n  WordNet results:`);
  console.log(`    Enriched: ${enriched}`);
  console.log(`    No match: ${noMatch}`);

  // Step 4: Vietnamese translations (optional, API-based)
  if (DO_TRANSLATE) {
    console.log(`\n=== Translating to Vietnamese (limit: ${TRANSLATE_LIMIT}) ===\n`);

    const toTranslate = await db.word.findMany({
      where: {
        needsCrawl: true,
        definitionEn: { not: "[pending]" }, // only translate enriched words
      },
      select: { id: true, word: true },
      take: TRANSLATE_LIMIT,
    });

    console.log(`  ${toTranslate.length} words to translate\n`);

    let translated = 0;
    for (let i = 0; i < toTranslate.length; i++) {
      const word = toTranslate[i];
      const vi = await fetchVietnamese(word.word);

      if (vi !== "[pending]") {
        await db.word.update({
          where: { id: word.id },
          data: { translationVi: vi, needsCrawl: false },
        });
        translated++;
      }

      if (i % 200 === 0 && i > 0) {
        console.log(`  Progress: ${i}/${toTranslate.length} (translated: ${translated})`);
      }

      await new Promise((r) => setTimeout(r, 200)); // rate limit
    }

    console.log(`\n  Translated: ${translated}`);
  } else {
    // Mark WordNet-enriched words as done (even without Vietnamese)
    // They have English definitions which is useful
    const updated = await db.word.updateMany({
      where: {
        needsCrawl: true,
        definitionEn: { not: "[pending]" },
      },
      data: { needsCrawl: false },
    });
    console.log(`\n  Marked ${updated.count} words as enriched (English only, Vietnamese still [pending])`);
  }

  // Final stats
  const [total, crawled, stubsLeft] = await Promise.all([
    db.word.count(),
    db.word.count({ where: { needsCrawl: false } }),
    db.word.count({ where: { needsCrawl: true } }),
  ]);

  console.log(`\n=== Final Stats ===`);
  console.log(`  Total words: ${total}`);
  console.log(`  Enriched: ${crawled}`);
  console.log(`  Stubs remaining: ${stubsLeft}`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
