/**
 * Build word families by grouping words that share a common root.
 * Uses simple suffix-stripping (not full NLP stemming).
 *
 * Examples:
 *   happy, happiness, happily, unhappy → root "happy"
 *   run, running, runner → root "run"
 *   teach, teacher, teaching → root "teach"
 *
 * Usage: bun run scripts/build-word-families.ts
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

// Common English suffixes and their typical root transformations
const suffixes = [
  // Noun suffixes
  { suffix: "ness", minRoot: 3 },
  { suffix: "ment", minRoot: 3 },
  { suffix: "tion", minRoot: 3 },
  { suffix: "sion", minRoot: 3 },
  { suffix: "ity", minRoot: 3 },
  { suffix: "ence", minRoot: 3 },
  { suffix: "ance", minRoot: 3 },
  { suffix: "er", minRoot: 3 },
  { suffix: "or", minRoot: 3 },
  { suffix: "ist", minRoot: 3 },
  { suffix: "ism", minRoot: 3 },
  // Adjective suffixes
  { suffix: "ful", minRoot: 3 },
  { suffix: "less", minRoot: 3 },
  { suffix: "ous", minRoot: 3 },
  { suffix: "ive", minRoot: 3 },
  { suffix: "able", minRoot: 3 },
  { suffix: "ible", minRoot: 3 },
  { suffix: "al", minRoot: 3 },
  { suffix: "ial", minRoot: 3 },
  // Adverb suffix
  { suffix: "ly", minRoot: 3 },
  // Verb suffixes
  { suffix: "ing", minRoot: 3 },
  { suffix: "ed", minRoot: 3 },
  { suffix: "en", minRoot: 3 },
  { suffix: "ize", minRoot: 3 },
  { suffix: "ise", minRoot: 3 },
  { suffix: "ify", minRoot: 3 },
  // Prefix
  { suffix: "", prefix: "un", minRoot: 3 },
  { suffix: "", prefix: "re", minRoot: 3 },
  { suffix: "", prefix: "dis", minRoot: 3 },
  { suffix: "", prefix: "mis", minRoot: 3 },
  { suffix: "", prefix: "over", minRoot: 3 },
];

function getStem(word: string): string[] {
  const candidates: string[] = [word];

  for (const rule of suffixes) {
    // Handle prefixes
    if (rule.prefix && word.startsWith(rule.prefix)) {
      const stripped = word.slice(rule.prefix.length);
      if (stripped.length >= rule.minRoot) {
        candidates.push(stripped);
      }
    }

    // Handle suffixes
    if (rule.suffix && word.endsWith(rule.suffix)) {
      const stripped = word.slice(0, -rule.suffix.length);
      if (stripped.length >= rule.minRoot) {
        candidates.push(stripped);

        // Handle doubling: running → run (remove doubled consonant)
        if (stripped.length >= 2 && stripped[stripped.length - 1] === stripped[stripped.length - 2]) {
          candidates.push(stripped.slice(0, -1));
        }

        // Handle e-dropping: making → make (add back 'e')
        candidates.push(stripped + "e");

        // Handle y→i: happiness → happy (y was changed to i)
        if (stripped.endsWith("i")) {
          candidates.push(stripped.slice(0, -1) + "y");
        }
      }
    }
  }

  return [...new Set(candidates)];
}

async function main() {
  console.log("Building word families...\n");

  // Get all words
  const allWords = await db.word.findMany({
    where: { familyId: null },
    select: { id: true, word: true },
    orderBy: { frequency: "asc" },
  });

  // Build a lookup map: word → id
  const wordMap = new Map<string, string>();
  for (const w of allWords) {
    const lower = w.word.toLowerCase();
    if (!wordMap.has(lower)) {
      wordMap.set(lower, w.id);
    }
  }

  console.log(`Processing ${allWords.length} words...\n`);

  // For each word, find its potential root by checking if stem candidates exist in the DB
  const familyMap = new Map<string, Set<string>>(); // rootWord → Set of word IDs

  for (const w of allWords) {
    const lower = w.word.toLowerCase();
    const stems = getStem(lower);

    // Find the shortest existing stem as the root
    let root: string | null = null;
    for (const stem of stems.sort((a, b) => a.length - b.length)) {
      if (stem !== lower && wordMap.has(stem)) {
        root = stem;
        break;
      }
    }

    if (root) {
      if (!familyMap.has(root)) {
        familyMap.set(root, new Set());
        familyMap.get(root)!.add(wordMap.get(root)!); // add root word itself
      }
      familyMap.get(root)!.add(w.id);
    }
  }

  // Only keep families with 2+ members
  const families = [...familyMap.entries()].filter(([, members]) => members.size >= 2);

  console.log(`Found ${families.length} word families\n`);

  // Create families in DB
  let created = 0;
  for (const [rootWord, memberIds] of families) {
    try {
      const family = await db.wordFamily.upsert({
        where: { rootWord },
        update: {},
        create: { rootWord },
      });

      // Update all member words to point to this family
      await db.word.updateMany({
        where: { id: { in: [...memberIds] } },
        data: { familyId: family.id },
      });

      created++;
    } catch (err) {
      // Skip errors
    }
  }

  // Show some examples
  const examples = await db.wordFamily.findMany({
    take: 10,
    include: { words: { select: { word: true, partOfSpeech: true } } },
    orderBy: { rootWord: "asc" },
  });

  console.log(`Created ${created} families\n`);
  console.log("Examples:");
  for (const fam of examples) {
    const words = fam.words.map((w) => `${w.word} (${w.partOfSpeech})`).join(", ");
    console.log(`  ${fam.rootWord}: ${words}`);
  }

  // Stats
  const totalGrouped = await db.word.count({ where: { familyId: { not: null } } });
  console.log(`\nTotal words in families: ${totalGrouped}`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
