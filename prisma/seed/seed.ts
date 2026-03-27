import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { existsSync, readFileSync } from "fs";
import topicsData from "./topics.json";
import wordsData from "./words.json";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. Seed topics
  console.log("Seeding topics...");
  const topicMap = new Map<string, string>();

  for (const topic of topicsData) {
    const created = await prisma.topic.upsert({
      where: { name: topic.name },
      update: { nameVi: topic.nameVi, icon: topic.icon },
      create: { name: topic.name, nameVi: topic.nameVi, icon: topic.icon },
    });
    topicMap.set(topic.name, created.id);
  }
  console.log(`  Created ${topicMap.size} topics`);

  // 2. Seed hand-curated words (words.json)
  console.log("Seeding curated words...");
  let count = 0;

  for (const word of wordsData) {
    const topicId = word.topic ? topicMap.get(word.topic) : undefined;

    await prisma.word.upsert({
      where: {
        word_partOfSpeech: {
          word: word.word,
          partOfSpeech: word.partOfSpeech as any,
        },
      },
      update: {
        phonetic: word.phonetic,
        cefrLevel: word.cefrLevel as any,
        definitionEn: word.definitionEn,
        translationVi: word.translationVi,
        exampleSentence: word.exampleSentence,
        topicId: topicId ?? null,
        frequency: word.frequency,
      },
      create: {
        word: word.word,
        phonetic: word.phonetic,
        partOfSpeech: word.partOfSpeech as any,
        cefrLevel: word.cefrLevel as any,
        definitionEn: word.definitionEn,
        translationVi: word.translationVi,
        exampleSentence: word.exampleSentence,
        topicId: topicId ?? null,
        frequency: word.frequency,
      },
    });
    count++;
  }
  console.log(`  Seeded ${count} curated words`);

  // 3. Seed crawled words (if available)
  const crawledPath = "prisma/seed/crawled-words.json";
  if (existsSync(crawledPath)) {
    console.log("Seeding crawled words...");
    const crawledWords = JSON.parse(readFileSync(crawledPath, "utf-8"));
    let crawledCount = 0;

    for (const word of crawledWords) {
      // Skip words without valid partOfSpeech
      const validPos = [
        "NOUN", "VERB", "ADJECTIVE", "ADVERB", "PREPOSITION",
        "CONJUNCTION", "PRONOUN", "INTERJECTION", "DETERMINER",
        "PHRASAL_VERB", "IDIOM",
      ];
      if (!validPos.includes(word.partOfSpeech)) continue;

      const validLevels = ["A1", "A2", "B1", "B2", "C1"];
      if (!validLevels.includes(word.cefrLevel)) continue;

      const topicId = word.topic ? topicMap.get(word.topic) : undefined;

      try {
        await prisma.word.upsert({
          where: {
            word_partOfSpeech: {
              word: word.word,
              partOfSpeech: word.partOfSpeech as any,
            },
          },
          update: {
            phonetic: word.phonetic || null,
            cefrLevel: word.cefrLevel as any,
            definitionEn: word.definitionEn,
            translationVi: word.translationVi,
            exampleSentence: word.exampleSentence,
            topicId: topicId ?? null,
            frequency: word.frequency,
          },
          create: {
            word: word.word,
            phonetic: word.phonetic || null,
            partOfSpeech: word.partOfSpeech as any,
            cefrLevel: word.cefrLevel as any,
            definitionEn: word.definitionEn,
            translationVi: word.translationVi,
            exampleSentence: word.exampleSentence,
            topicId: topicId ?? null,
            frequency: word.frequency,
          },
        });
        crawledCount++;
      } catch (e) {
        // Skip duplicates or invalid entries silently
      }
    }
    console.log(`  Seeded ${crawledCount} crawled words`);
  } else {
    console.log("  No crawled-words.json found. Run: bun run scripts/crawl-words.ts");
  }

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
