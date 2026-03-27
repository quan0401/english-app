/**
 * Replace generic example sentences with real ones from Tatoeba API.
 *
 * Usage: bun run scripts/improve-examples.ts
 *
 * Targets words with the fallback example: "She uses the word X in daily conversation."
 * Fetches real sentences from Tatoeba's free API.
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { writeFileSync, existsSync, readFileSync } from "fs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const PROGRESS_FILE = "scripts/.improve-examples-progress.json";

function loadProgress(): Set<string> {
  if (existsSync(PROGRESS_FILE)) {
    try {
      return new Set(JSON.parse(readFileSync(PROGRESS_FILE, "utf-8")));
    } catch { return new Set(); }
  }
  return new Set();
}

function saveProgress(done: Set<string>) {
  writeFileSync(PROGRESS_FILE, JSON.stringify([...done]));
}

async function fetchTatoeba(word: string): Promise<string | null> {
  try {
    const url = `https://tatoeba.org/en/api_v0/search?from=eng&query=${encodeURIComponent(word)}&limit=5`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const results = data?.results ?? [];

    // Find a short, clean sentence containing the word
    for (const r of results) {
      const text: string = r.text;
      if (
        text.length > 20 &&
        text.length < 120 &&
        text.toLowerCase().includes(word.toLowerCase()) &&
        !text.includes("http") &&
        !text.includes("@")
      ) {
        return text;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function main() {
  // Find words with the generic fallback example
  const genericWords = await db.word.findMany({
    where: {
      exampleSentence: { contains: "She uses the word" },
    },
    select: { id: true, word: true },
  });

  console.log(`Found ${genericWords.length} words with generic examples`);

  const done = loadProgress();
  let updated = 0;
  let failed = 0;

  for (let i = 0; i < genericWords.length; i++) {
    const w = genericWords[i];
    if (done.has(w.id)) continue;

    if (i % 50 === 0 && i > 0) {
      console.log(`  Progress: ${i}/${genericWords.length} (updated: ${updated}, failed: ${failed})`);
      saveProgress(done);
    }

    const sentence = await fetchTatoeba(w.word);
    if (sentence) {
      await db.word.update({
        where: { id: w.id },
        data: { exampleSentence: sentence },
      });
      updated++;
    } else {
      failed++;
    }

    done.add(w.id);
    await new Promise((r) => setTimeout(r, 200)); // rate limit
  }

  saveProgress(done);
  console.log(`\nDone!`);
  console.log(`  Updated: ${updated}`);
  console.log(`  No sentence found: ${failed}`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
