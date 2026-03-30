/**
 * Classify unclassified words using LOCAL embedding model.
 * No API calls, no rate limits, no cost. Runs entirely on your machine.
 *
 * Uses: all-MiniLM-L6-v2 (22M params, ~80MB download, fast)
 * First run downloads the model (~80MB), subsequent runs use cache.
 *
 * Usage:
 *   bun run scripts/classify-local-embedding.ts
 *   bun run scripts/classify-local-embedding.ts --limit 5000
 */

import { pipeline } from "@huggingface/transformers";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const limitIdx = process.argv.indexOf("--limit");
const LIMIT = limitIdx !== -1 ? parseInt(process.argv[limitIdx + 1]) : 66000;
const BATCH_SIZE = 50;

// ─── Cosine similarity ──────────────────────────────────

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ─── Main ───────────────────────────────────────────────

async function main() {
  console.log("=== Classify by Local Embedding (all-MiniLM-L6-v2) ===\n");

  // Step 1: Load model (downloads ~80MB on first run)
  console.log("Loading embedding model...");
  const embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  console.log("  Model loaded!\n");

  // Step 2: Get topics and embed them
  const topics = await db.topic.findMany();
  console.log(`  ${topics.length} topics`);

  const topicDescriptions: Record<string, string> = {
    "Greetings": "greetings, hello, goodbye, polite expressions",
    "Family": "family members, parents, children, siblings, marriage, relatives",
    "Food & Drink": "food, cooking, eating, drinking, meals, restaurants, ingredients",
    "Travel": "travel, tourism, transportation, airport, hotel, vacation, destinations",
    "Work": "work, job, office, career, employment, business, colleagues, professional",
    "Health": "health, medical, doctor, hospital, illness, medicine, body, exercise",
    "Shopping": "shopping, buying, selling, money, price, store, market, consumer",
    "Education": "education, school, learning, studying, teaching, university, knowledge",
    "Technology": "technology, computer, software, internet, digital, electronic, programming",
    "Nature": "nature, environment, animals, plants, weather, earth, ecosystem, wildlife",
    "Sports": "sports, exercise, games, athletic, competition, fitness, physical activity",
    "Entertainment": "entertainment, music, movies, art, dance, theater, performance, media",
    "Daily Life": "daily life, home, routine, household, morning, evening, chores",
    "Emotions": "emotions, feelings, mood, happiness, sadness, anger, love, fear",
    "Business": "business, finance, economy, investment, profit, trade, marketing, corporate",
  };

  console.log("  Embedding topic labels...");
  const topicVectors: number[][] = [];
  for (const topic of topics) {
    const desc = topicDescriptions[topic.name] || topic.name;
    const output = await embedder(desc, { pooling: "mean", normalize: true });
    topicVectors.push(Array.from(output.data));
  }
  console.log(`  Got ${topicVectors.length} topic vectors\n`);

  // Step 3: Get unclassified words
  const words = await db.word.findMany({
    where: {
      topicId: null,
      needsCrawl: false,
      definitionEn: { not: "[pending]" },
    },
    select: { id: true, word: true, definitionEn: true },
    orderBy: { frequency: "asc" },
    take: LIMIT,
  });

  console.log(`  ${words.length} words to classify\n`);

  // Step 4: Classify in batches
  let classified = 0;

  for (let i = 0; i < words.length; i += BATCH_SIZE) {
    const batch = words.slice(i, i + BATCH_SIZE);

    for (const word of batch) {
      const text = `${word.word}: ${word.definitionEn.slice(0, 80)}`;
      const output = await embedder(text, { pooling: "mean", normalize: true });
      const vector = Array.from(output.data) as number[];

      let bestTopicIdx = 0;
      let bestScore = -1;

      for (let k = 0; k < topicVectors.length; k++) {
        const score = cosineSimilarity(vector, topicVectors[k]);
        if (score > bestScore) {
          bestScore = score;
          bestTopicIdx = k;
        }
      }

      if (bestScore > 0.25) {
        await db.word.update({
          where: { id: word.id },
          data: { topicId: topics[bestTopicIdx].id },
        });
        classified++;
      }
    }

    if (i % 500 === 0 && i > 0) {
      console.log(`  Progress: ${i}/${words.length} (classified: ${classified})`);
    }
  }

  // Stats
  const topicCounts = await db.topic.findMany({
    include: { _count: { select: { words: true } } },
    orderBy: { name: "asc" },
  });

  console.log(`\n=== Results ===`);
  console.log(`  Classified: ${classified}`);
  console.log(`\nTopic distribution:`);
  for (const t of topicCounts) {
    console.log(`  ${t.nameVi || t.name}: ${t._count.words}`);
  }

  const remaining = await db.word.count({ where: { topicId: null, needsCrawl: false, definitionEn: { not: "[pending]" } } });
  console.log(`\n  Still unclassified: ${remaining}`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
