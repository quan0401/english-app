/**
 * Import ALL WordNet words into the database.
 * Words already in DB are skipped. New words are added as enriched (not stubs).
 *
 * Usage: bun run scripts/import-wordnet-all.ts
 */

import { readFileSync } from "fs";
import { join } from "path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const WORDNET_DIR = join(process.cwd(), "node_modules/en-wordnet/database/3.1");

const POS_MAP: Record<string, string> = {
  n: "NOUN", v: "VERB", a: "ADJECTIVE", s: "ADJECTIVE", r: "ADVERB",
};

function estimateCefr(word: string): "A1" | "A2" | "B1" | "B2" | "C1" {
  // Short common words tend to be lower level
  if (word.length <= 4) return "B1";
  if (word.length <= 6) return "B2";
  return "C1";
}

interface WordEntry {
  word: string;
  pos: string;
  definition: string;
  example: string | null;
}

function parseAllWordNet(): WordEntry[] {
  const entries: WordEntry[] = [];
  const seen = new Set<string>(); // track word+pos to avoid duplicates

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
      if (line.startsWith("  ") || !line.trim()) continue;

      const pipeIdx = line.indexOf("|");
      if (pipeIdx === -1) continue;

      const meta = line.substring(0, pipeIdx).trim();
      const gloss = line.substring(pipeIdx + 1).trim();

      const parts = meta.split(/\s+/);
      if (parts.length < 5) continue;

      const wordCount = parseInt(parts[3], 16);

      let definition = gloss;
      let example: string | null = null;
      const quoteMatch = gloss.match(/^(.*?)\s*"([^"]+)"/);
      if (quoteMatch) {
        definition = quoteMatch[1].replace(/;\s*$/, "").trim();
        example = quoteMatch[2];
      }
      definition = definition.replace(/;\s*$/, "").trim();
      if (!definition) continue;

      for (let i = 0; i < wordCount; i++) {
        const wordIdx = 4 + i * 2;
        if (wordIdx >= parts.length) continue;

        const word = parts[wordIdx].replace(/_/g, " ").toLowerCase();
        const prismaPos = POS_MAP[pos] || "NOUN";
        const key = `${word}|${prismaPos}`;

        if (seen.has(key)) continue;
        seen.add(key);

        // Only single words or 2-word phrases (filter out long multi-word entries)
        if (word.split(/\s+/).length > 2) continue;
        if (!/^[a-z][a-z\s'-]*$/.test(word)) continue;
        if (word.length < 2) continue;

        entries.push({ word, pos: prismaPos, definition, example });
      }
    }
  }

  return entries;
}

async function main() {
  console.log("=== Import ALL WordNet Words ===\n");

  // Parse WordNet
  console.log("Parsing WordNet...");
  const wordnetEntries = parseAllWordNet();
  console.log(`  Parsed ${wordnetEntries.length} unique word+POS entries\n`);

  // Get existing words from DB
  const existing = await db.word.findMany({
    select: { word: true, partOfSpeech: true },
  });
  const existingSet = new Set(existing.map((w) => `${w.word.toLowerCase()}|${w.partOfSpeech}`));
  console.log(`  Existing DB entries: ${existingSet.size}`);

  // Filter to new words only
  const toInsert = wordnetEntries.filter((e) => !existingSet.has(`${e.word}|${e.pos}`));
  console.log(`  New words to insert: ${toInsert.length}\n`);

  // Insert
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < toInsert.length; i++) {
    const entry = toInsert[i];

    try {
      await db.word.create({
        data: {
          word: entry.word,
          partOfSpeech: entry.pos as any,
          cefrLevel: estimateCefr(entry.word),
          definitionEn: entry.definition,
          translationVi: "[pending]",
          exampleSentence: entry.example || `The word "${entry.word}" is used in English.`,
          frequency: 99999,
          needsCrawl: false, // has English definition, just needs Vietnamese
        },
      });
      inserted++;
    } catch {
      errors++;
    }

    if (i % 5000 === 0 && i > 0) {
      console.log(`  Progress: ${i}/${toInsert.length} (inserted: ${inserted}, errors: ${errors})`);
    }
  }

  // Final stats
  const [total, enriched, stubs] = await Promise.all([
    db.word.count(),
    db.word.count({ where: { needsCrawl: false } }),
    db.word.count({ where: { needsCrawl: true } }),
  ]);

  console.log(`\n=== Results ===`);
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Errors (duplicates): ${errors}`);
  console.log(`\n  Total words in DB: ${total}`);
  console.log(`  Enriched: ${enriched}`);
  console.log(`  Stubs: ${stubs}`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
