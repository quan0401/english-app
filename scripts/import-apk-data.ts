/**
 * Import word families + frequencies from the ProDict APK's SQLite databases.
 *
 * Extracts:
 * 1. rootword.dat → 52,256 word-to-root mappings (26,781 families)
 * 2. prodict.dat → 56,715 word frequencies (corpus-based)
 *
 * Usage:
 *   bun run scripts/import-apk-data.ts
 *
 * Prerequisites:
 *   The APK must be extracted to /tmp/apk-extract/ first:
 *   mkdir -p /tmp/apk-extract && unzip -o com.dict.user.prodict_4.1.0.apk -d /tmp/apk-extract
 */

import Database from "bun:sqlite";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const APK_PATH = "/tmp/apk-extract/assets";

// ─── Step 1: Import word families from rootword.dat ─────

async function importWordFamilies() {
  console.log("=== Importing Word Families from rootword.dat ===\n");

  const sqlite = new Database(`${APK_PATH}/rootword.dat`, { readonly: true });

  // Get all root → word mappings
  const rows = sqlite.query<{ word: string; rootword: string; freq: number }, []>(
    "SELECT word, rootword, freq FROM rootword WHERE rootword IS NOT NULL"
  ).all();

  console.log(`  Found ${rows.length} word-root pairs`);

  // Group by root word
  const familyMap = new Map<string, Set<string>>();
  for (const row of rows) {
    const root = row.rootword.toLowerCase().trim();
    const word = row.word.toLowerCase().trim();
    if (!root || !word) continue;

    if (!familyMap.has(root)) {
      familyMap.set(root, new Set());
    }
    familyMap.get(root)!.add(word);
    // Also add the root itself
    familyMap.get(root)!.add(root);
  }

  // Filter to families with 2+ members
  const families = [...familyMap.entries()].filter(([, members]) => members.size >= 2);
  console.log(`  ${families.length} families with 2+ members`);

  // Get all words in our DB
  const existingWords = await db.word.findMany({
    select: { id: true, word: true, familyId: true },
  });
  const wordLookup = new Map(existingWords.map((w) => [w.word.toLowerCase(), w]));

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const [rootWord, members] of families) {
    // Check if any member exists in our DB
    const matchingWords = [...members]
      .map((m) => wordLookup.get(m))
      .filter(Boolean) as { id: string; word: string; familyId: string | null }[];

    if (matchingWords.length < 2) {
      skipped++;
      continue; // Need at least 2 words in our DB to form a family
    }

    // Create or get the family
    try {
      const family = await db.wordFamily.upsert({
        where: { rootWord },
        update: {},
        create: { rootWord },
      });

      // Link all matching words to this family
      const idsToUpdate = matchingWords
        .filter((w) => w.familyId !== family.id)
        .map((w) => w.id);

      if (idsToUpdate.length > 0) {
        await db.word.updateMany({
          where: { id: { in: idsToUpdate } },
          data: { familyId: family.id },
        });
        updated += idsToUpdate.length;
      }

      created++;
    } catch {
      // Skip errors (e.g., unique constraint)
    }

    if (created % 500 === 0 && created > 0) {
      console.log(`  Progress: ${created} families created, ${updated} words linked`);
    }
  }

  sqlite.close();

  console.log(`\n  Results:`);
  console.log(`    Families created: ${created}`);
  console.log(`    Words linked: ${updated}`);
  console.log(`    Skipped (< 2 DB words): ${skipped}`);
}

// ─── Step 2: Update frequencies from prodict.dat ────────

async function updateFrequencies() {
  console.log("\n=== Updating Frequencies from prodict.dat ===\n");

  const sqlite = new Database(`${APK_PATH}/prodict.dat`, { readonly: true });

  // Get all words with frequency
  const rows = sqlite.query<{ word: string; frequency: number }, []>(
    "SELECT word, frequency FROM prodict WHERE frequency > 0 ORDER BY frequency DESC"
  ).all();

  console.log(`  Found ${rows.length} words with corpus frequency`);

  // Normalize frequencies to a 1-based ranking
  // Higher corpus frequency = lower rank number (more common)
  const ranked = rows.map((r, i) => ({
    word: r.word.toLowerCase().trim(),
    rank: i + 1,
  }));

  // Get existing words
  const existingWords = await db.word.findMany({
    select: { id: true, word: true, frequency: true },
  });
  const wordLookup = new Map(existingWords.map((w) => [w.word.toLowerCase(), w]));

  let updated = 0;
  const BATCH_SIZE = 100;

  for (let i = 0; i < ranked.length; i += BATCH_SIZE) {
    const batch = ranked.slice(i, i + BATCH_SIZE);

    for (const { word, rank } of batch) {
      const existing = wordLookup.get(word);
      if (existing && existing.frequency !== rank) {
        try {
          await db.word.update({
            where: { id: existing.id },
            data: { frequency: rank },
          });
          updated++;
        } catch {
          // Skip
        }
      }
    }

    if (i % 5000 === 0 && i > 0) {
      console.log(`  Progress: ${i}/${ranked.length} checked, ${updated} updated`);
    }
  }

  sqlite.close();

  console.log(`\n  Results:`);
  console.log(`    Frequencies updated: ${updated}`);
}

// ─── Step 3: Re-estimate CEFR levels based on new frequencies ─

async function updateCefrLevels() {
  console.log("\n=== Updating CEFR Levels based on corpus frequency ===\n");

  // Words ranked 1-500 → A1, 501-1200 → A2, 1201-2500 → B1, 2501-5000 → B2, 5000+ → C1
  const updates = [
    { min: 1, max: 500, level: "A1" as const },
    { min: 501, max: 1200, level: "A2" as const },
    { min: 1201, max: 2500, level: "B1" as const },
    { min: 2501, max: 5000, level: "B2" as const },
    { min: 5001, max: 999999, level: "C1" as const },
  ];

  let total = 0;

  for (const { min, max, level } of updates) {
    const result = await db.word.updateMany({
      where: {
        frequency: { gte: min, lte: max },
        cefrLevel: { not: level },
      },
      data: { cefrLevel: level },
    });
    console.log(`  ${level}: ${result.count} words updated`);
    total += result.count;
  }

  console.log(`\n  Total CEFR updates: ${total}`);
}

// ─── Main ───────────────────────────────────────────────

async function main() {
  console.log("ProDict APK Data Import\n");
  console.log("========================\n");

  await importWordFamilies();
  await updateFrequencies();
  await updateCefrLevels();

  // Final stats
  const [wordCount, familyCount, wordsInFamilies] = await Promise.all([
    db.word.count(),
    db.wordFamily.count(),
    db.word.count({ where: { familyId: { not: null } } }),
  ]);

  console.log("\n========================");
  console.log("Final Database Stats:");
  console.log(`  Total words: ${wordCount}`);
  console.log(`  Word families: ${familyCount}`);
  console.log(`  Words in families: ${wordsInFamilies}`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
