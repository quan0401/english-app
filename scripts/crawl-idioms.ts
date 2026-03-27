/**
 * Crawl common phrasal verbs and idioms.
 * Sources: hardcoded lists of common phrasal verbs + Free Dictionary API for definitions.
 *
 * Usage: bun run scripts/crawl-idioms.ts
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const MYMEMORY_EMAIL = process.env.MYMEMORY_EMAIL || "";

// Common phrasal verbs (top 100)
const phrasalVerbs = [
  "break down", "break up", "bring up", "call off", "carry on", "check in", "check out",
  "come across", "come up", "cut off", "deal with", "end up", "figure out", "fill in",
  "find out", "get along", "get away", "get back", "get over", "get up", "give up",
  "go ahead", "go on", "go through", "grow up", "hand in", "hang out", "hold on",
  "keep up", "let down", "look after", "look for", "look forward to", "look up",
  "make up", "move on", "pass away", "pay back", "pick up", "point out", "pull out",
  "put off", "put on", "put up with", "run into", "run out", "set up", "show up",
  "shut down", "sort out", "stand out", "take off", "take over", "throw away",
  "try on", "turn down", "turn off", "turn on", "turn out", "turn up", "wake up",
  "work out", "write down", "bring about", "carry out", "come back", "drop off",
  "fall apart", "get rid of", "give back", "go back", "keep on", "lay off",
  "leave out", "let go", "look into", "make out", "pass on", "put away",
  "run away", "settle down", "take care of", "take part in", "think over",
  "watch out", "break in", "calm down", "catch up", "clean up", "come in",
  "drop out", "fall down", "get in", "get off", "get on", "get out",
  "give in", "go out", "hold up", "hurry up", "keep out",
];

// Common idioms (top 50)
const idioms = [
  "a piece of cake", "break the ice", "hit the nail on the head", "under the weather",
  "bite the bullet", "beat around the bush", "call it a day", "cut corners",
  "get out of hand", "hang in there", "it takes two to tango", "jump on the bandwagon",
  "keep your chin up", "let the cat out of the bag", "miss the boat",
  "on the same page", "pull someone's leg", "speak of the devil",
  "the best of both worlds", "time flies", "back to square one",
  "barking up the wrong tree", "burn the midnight oil", "cost an arm and a leg",
  "cry over spilled milk", "get cold feet", "go the extra mile",
  "in the same boat", "kill two birds with one stone", "once in a blue moon",
  "play it by ear", "raining cats and dogs", "the ball is in your court",
  "when pigs fly", "add insult to injury", "break a leg",
  "every cloud has a silver lining", "hit the sack", "jump the gun",
  "keep it under your hat", "lose your touch", "no pain no gain",
  "on thin ice", "read between the lines", "spill the beans",
  "take it with a grain of salt", "the elephant in the room",
  "throw in the towel", "wrap your head around", "you can say that again",
];

async function fetchDefinition(phrase: string): Promise<{ def: string; example: string } | null> {
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(phrase)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const meaning = data[0]?.meanings?.[0];
    if (!meaning) return null;
    const d = meaning.definitions[0];
    return {
      def: d?.definition || "",
      example: d?.example || "",
    };
  } catch {
    return null;
  }
}

async function fetchVietnamese(text: string): Promise<string> {
  try {
    let url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|vi`;
    if (MYMEMORY_EMAIL) url += `&de=${encodeURIComponent(MYMEMORY_EMAIL)}`;
    const res = await fetch(url);
    if (!res.ok) return text;
    const data = await res.json();
    return data?.responseData?.translatedText || text;
  } catch {
    return text;
  }
}

async function main() {
  console.log("Crawling phrasal verbs and idioms...\n");

  let created = 0;
  let skipped = 0;

  // Process phrasal verbs
  console.log(`Processing ${phrasalVerbs.length} phrasal verbs...`);
  for (const pv of phrasalVerbs) {
    const existing = await db.word.findFirst({ where: { word: pv, partOfSpeech: "PHRASAL_VERB" } });
    if (existing) { skipped++; continue; }

    const dict = await fetchDefinition(pv);
    const def = dict?.def || `A phrasal verb meaning to ${pv}.`;
    const example = dict?.example || `You should ${pv} before it's too late.`;
    const vi = await fetchVietnamese(pv);

    await db.word.create({
      data: {
        word: pv,
        partOfSpeech: "PHRASAL_VERB",
        cefrLevel: "B1",
        definitionEn: def,
        translationVi: vi,
        exampleSentence: example,
        frequency: 5000 + created,
      },
    });
    created++;
    await new Promise((r) => setTimeout(r, 300));
  }

  // Process idioms
  console.log(`Processing ${idioms.length} idioms...`);
  for (const idiom of idioms) {
    const existing = await db.word.findFirst({ where: { word: idiom, partOfSpeech: "IDIOM" } });
    if (existing) { skipped++; continue; }

    const vi = await fetchVietnamese(idiom);

    await db.word.create({
      data: {
        word: idiom,
        partOfSpeech: "IDIOM",
        cefrLevel: "B2",
        definitionEn: `An idiom meaning "${idiom}".`,
        translationVi: vi,
        exampleSentence: `People often say "${idiom}" in everyday conversation.`,
        frequency: 6000 + created,
      },
    });
    created++;
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\nDone! Created: ${created}, Skipped (already exist): ${skipped}`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
