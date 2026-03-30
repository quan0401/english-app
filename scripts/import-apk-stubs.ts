/**
 * Import ~40K new words from APK as stubs (needsCrawl = true).
 *
 * Sources: ozdic.dat (10K), thesaurus.dat (46K)
 * Cross-references prodict.dat for corpus frequency.
 *
 * Stubs have placeholder definitions and are marked for later crawling.
 *
 * Usage: bun run scripts/import-apk-stubs.ts
 *
 * Prerequisites: APK extracted to /tmp/apk-extract/
 *   unzip -o com.dict.user.prodict_4.1.0.apk -d /tmp/apk-extract
 */

import Database from "bun:sqlite";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const APK_PATH = "/tmp/apk-extract/assets";

function estimateCefr(rank: number): "A1" | "A2" | "B1" | "B2" | "C1" {
  if (rank <= 500) return "A1";
  if (rank <= 1200) return "A2";
  if (rank <= 2500) return "B1";
  if (rank <= 5000) return "B2";
  return "C1";
}

async function main() {
  console.log("=== Import APK Stub Words ===\n");

  // 1. Load word lists from APK
  const ozdicDb = new Database(`${APK_PATH}/ozdic.dat`, { readonly: true });
  const thesaurusDb = new Database(`${APK_PATH}/thesaurus.dat`, { readonly: true });
  const prodictDb = new Database(`${APK_PATH}/prodict.dat`, { readonly: true });

  const ozdicWords = ozdicDb
    .query<{ word: string }, []>("SELECT word FROM ozdic")
    .all()
    .map((r) => r.word.toLowerCase().trim());

  const thesaurusWords = thesaurusDb
    .query<{ word: string }, []>("SELECT word FROM thesaurus")
    .all()
    .map((r) => r.word.toLowerCase().trim());

  console.log(`  Ozdic words: ${ozdicWords.length}`);
  console.log(`  Thesaurus words: ${thesaurusWords.length}`);

  // 2. Deduplicate
  const allNewWords = new Set([...ozdicWords, ...thesaurusWords]);
  console.log(`  Combined unique: ${allNewWords.size}`);

  // 3. Filter: only alphabetic, 2+ chars, max 3 words (allow phrasal verbs)
  const filtered = [...allNewWords].filter((w) => {
    if (w.length < 2) return false;
    if (!/^[a-z][a-z\s'-]*$/.test(w)) return false;
    if (w.split(/\s+/).length > 3) return false;
    return true;
  });
  console.log(`  After filtering: ${filtered.length}`);

  // 4. Build frequency lookup from prodict
  const freqRows = prodictDb
    .query<{ word: string; frequency: number }, []>(
      "SELECT word, frequency FROM prodict WHERE frequency > 0 ORDER BY frequency DESC"
    )
    .all();

  const freqRank = new Map<string, number>();
  freqRows.forEach((r, i) => freqRank.set(r.word.toLowerCase(), i + 1));
  console.log(`  Frequency data available for ${freqRank.size} words`);

  ozdicDb.close();
  thesaurusDb.close();
  prodictDb.close();

  // 5. Get existing words from our DB
  const existingWords = await db.word.findMany({
    select: { word: true },
  });
  const existingSet = new Set(existingWords.map((w) => w.word.toLowerCase()));
  console.log(`  Existing DB words: ${existingSet.size}`);

  // 6. Filter out existing
  const toInsert = filtered.filter((w) => !existingSet.has(w));
  console.log(`  New words to insert: ${toInsert.length}\n`);

  // 7. Insert stubs
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < toInsert.length; i++) {
    const word = toInsert[i];
    const rank = freqRank.get(word) ?? 99999;
    const cefrLevel = estimateCefr(rank);

    try {
      await db.word.create({
        data: {
          word,
          partOfSpeech: "NOUN", // default — will be corrected when crawled
          cefrLevel,
          definitionEn: "[pending]",
          translationVi: "[pending]",
          exampleSentence: "[pending]",
          frequency: rank,
          needsCrawl: true,
        },
      });
      inserted++;
    } catch {
      errors++; // likely duplicate (word already exists with different casing)
    }

    if (i % 2000 === 0 && i > 0) {
      console.log(`  Progress: ${i}/${toInsert.length} (inserted: ${inserted}, errors: ${errors})`);
    }
  }

  console.log(`\n=== Results ===`);
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Errors (duplicates): ${errors}`);

  // Final stats
  const [total, stubs, enriched] = await Promise.all([
    db.word.count(),
    db.word.count({ where: { needsCrawl: true } }),
    db.word.count({ where: { needsCrawl: false } }),
  ]);

  console.log(`\n  Total words in DB: ${total}`);
  console.log(`  Enriched: ${enriched}`);
  console.log(`  Stubs (need crawl): ${stubs}`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
