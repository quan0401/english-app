/**
 * Classify unclassified words into topics using Voyage AI embeddings.
 *
 * How it works:
 * 1. Embed the 15 topic labels into vectors
 * 2. Embed each unclassified word + definition in batches
 * 3. Cosine similarity → assign the best-matching topic
 *
 * Usage:
 *   VOYAGE_API_KEY=pa-... bun run scripts/classify-by-embedding.ts
 *   VOYAGE_API_KEY=pa-... bun run scripts/classify-by-embedding.ts --limit 10000
 *
 * Cost: ~$0 (200M free tokens covers ~500K words)
 * Model: voyage-3.5-lite (fast, cheap, good enough for classification)
 */

import { VoyageAIClient } from "voyageai";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY;
if (!VOYAGE_API_KEY) {
  console.error("Set VOYAGE_API_KEY environment variable");
  console.error("Get one free at: https://dash.voyageai.com/");
  process.exit(1);
}

const voyage = new VoyageAIClient({ apiKey: VOYAGE_API_KEY });
const MODEL = "voyage-3.5-lite";
// Free tier without payment: 3 RPM, 10K TPM
// 3 RPM = 1 request every 22s. Use 5 words per batch to stay under 10K TPM.
const BATCH_SIZE = 5;

const limitIdx = process.argv.indexOf("--limit");
const LIMIT = limitIdx !== -1 ? parseInt(process.argv[limitIdx + 1]) : 66000;

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
  console.log("=== Classify by Embedding (Voyage AI) ===\n");

  // Step 1: Get topics
  const topics = await db.topic.findMany();
  console.log(`  ${topics.length} topics loaded`);

  // Step 2: Embed topic descriptions
  const topicTexts = topics.map((t) => {
    const descriptions: Record<string, string> = {
      "Greetings": "greetings, hello, goodbye, polite expressions, courtesy phrases",
      "Family": "family members, parents, children, siblings, marriage, relatives, household",
      "Food & Drink": "food, cooking, eating, drinking, meals, restaurants, ingredients, recipes, taste",
      "Travel": "travel, tourism, transportation, airport, hotel, vacation, journey, destinations",
      "Work": "work, job, office, career, employment, business, colleagues, meetings, professional",
      "Health": "health, medical, doctor, hospital, illness, medicine, body, exercise, mental health",
      "Shopping": "shopping, buying, selling, money, price, store, market, retail, consumer",
      "Education": "education, school, learning, studying, teaching, university, knowledge, academic",
      "Technology": "technology, computer, software, internet, digital, electronic, programming, device",
      "Nature": "nature, environment, animals, plants, weather, climate, earth, ecosystem, wildlife",
      "Sports": "sports, exercise, games, athletic, competition, fitness, team, physical activity",
      "Entertainment": "entertainment, music, movies, art, dance, theater, performance, media, fun",
      "Daily Life": "daily life, home, routine, household, morning, evening, chores, lifestyle",
      "Emotions": "emotions, feelings, mood, happiness, sadness, anger, love, fear, psychological",
      "Business": "business, finance, economy, investment, profit, trade, marketing, corporate, entrepreneurship",
    };
    return descriptions[t.name] || t.name;
  });

  console.log("  Embedding topic labels...");
  const topicEmbeddings = await voyage.embed({
    input: topicTexts,
    model: MODEL,
  });
  const topicVectors = topicEmbeddings.data!.map((d) => d.embedding!);
  console.log(`  Got ${topicVectors.length} topic vectors`);
  console.log("  Waiting 25s for rate limit...\n");
  await new Promise((r) => setTimeout(r, 25000));

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

  // Step 4: Embed and classify in batches
  let classified = 0;
  let errors = 0;

  for (let i = 0; i < words.length; i += BATCH_SIZE) {
    const batch = words.slice(i, i + BATCH_SIZE);

    // Create text for embedding: "word: definition"
    const texts = batch.map((w) => `${w.word}: ${w.definitionEn.slice(0, 100)}`);

    try {
      const embeddings = await voyage.embed({
        input: texts,
        model: MODEL,
      });

      const vectors = embeddings.data!.map((d) => d.embedding!);

      // Find best topic for each word
      for (let j = 0; j < vectors.length; j++) {
        let bestTopicIdx = 0;
        let bestScore = -1;

        for (let k = 0; k < topicVectors.length; k++) {
          const score = cosineSimilarity(vectors[j], topicVectors[k]);
          if (score > bestScore) {
            bestScore = score;
            bestTopicIdx = k;
          }
        }

        // Only assign if similarity is above threshold
        if (bestScore > 0.2) {
          await db.word.update({
            where: { id: batch[j].id },
            data: { topicId: topics[bestTopicIdx].id },
          });
          classified++;
        }
      }
    } catch (err: any) {
      if (err.message?.includes("429") || err.statusCode === 429) {
        console.log(`  Rate limited at ${i}, waiting 90s...`);
        await new Promise((r) => setTimeout(r, 90000));
        i -= BATCH_SIZE; // retry this batch
      } else {
        console.error(`  Batch error at ${i}: ${err.message}`);
        errors++;
      }
    }

    if (i % 500 === 0 && i > 0) {
      console.log(`  Progress: ${i}/${words.length} (classified: ${classified})`);
    }

    // Delay to respect rate limits (free tier: 3 RPM → need 1 request per 22s minimum)
    // Using 35s to be safe and avoid retry loops
    await new Promise((r) => setTimeout(r, 35000));
  }

  // Stats
  const topicCounts = await db.topic.findMany({
    include: { _count: { select: { words: true } } },
    orderBy: { name: "asc" },
  });

  console.log(`\n=== Results ===`);
  console.log(`  Classified: ${classified}`);
  console.log(`  Errors: ${errors}`);
  console.log(`\nTopic distribution:`);
  for (const t of topicCounts) {
    console.log(`  ${t.nameVi || t.name}: ${t._count.words} words`);
  }
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
