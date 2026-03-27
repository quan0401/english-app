/**
 * Word Generation Script
 *
 * Uses Claude API to generate English definitions, Vietnamese translations,
 * example sentences, and IPA phonetics for a list of words.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... bun run scripts/generate-words.ts input.csv output.json
 *
 * Input CSV format: word,partOfSpeech,cefrLevel,topic
 * Output: JSON array matching the seed format
 */

import { readFileSync, writeFileSync } from "fs";

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) {
  console.error("Set ANTHROPIC_API_KEY environment variable");
  process.exit(1);
}

const [inputFile, outputFile] = process.argv.slice(2);
if (!inputFile || !outputFile) {
  console.error("Usage: bun run scripts/generate-words.ts input.csv output.json");
  process.exit(1);
}

interface WordEntry {
  word: string;
  phonetic: string;
  partOfSpeech: string;
  cefrLevel: string;
  definitionEn: string;
  translationVi: string;
  exampleSentence: string;
  topic: string;
  frequency: number;
}

async function generateForBatch(
  words: { word: string; partOfSpeech: string; cefrLevel: string; topic: string }[]
): Promise<WordEntry[]> {
  const wordList = words
    .map((w) => `- ${w.word} (${w.partOfSpeech}, ${w.cefrLevel})`)
    .join("\n");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `For each English word below, provide:
1. A clear, simple English definition (appropriate for the CEFR level)
2. The Vietnamese translation
3. One natural example sentence using the word
4. IPA phonetic notation

Words:
${wordList}

Return ONLY a JSON array with objects like:
{"word": "...", "phonetic": "/.../" , "definitionEn": "...", "translationVi": "...", "exampleSentence": "..."}

No markdown, no explanation, just the JSON array.`,
        },
      ],
    }),
  });

  const data = await response.json();
  const text = data.content[0].text;
  return JSON.parse(text);
}

async function main() {
  const csv = readFileSync(inputFile, "utf-8");
  const lines = csv.trim().split("\n").slice(1); // skip header

  const words = lines.map((line, i) => {
    const [word, partOfSpeech, cefrLevel, topic] = line.split(",").map((s) => s.trim());
    return { word, partOfSpeech, cefrLevel, topic, frequency: i + 1 };
  });

  const results: WordEntry[] = [];
  const BATCH_SIZE = 20;

  for (let i = 0; i < words.length; i += BATCH_SIZE) {
    const batch = words.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(words.length / BATCH_SIZE)}...`);

    const generated = await generateForBatch(batch);

    for (let j = 0; j < batch.length; j++) {
      const orig = batch[j];
      const gen = generated.find((g) => g.word === orig.word) ?? generated[j];
      if (gen) {
        results.push({
          word: orig.word,
          phonetic: gen.phonetic,
          partOfSpeech: orig.partOfSpeech,
          cefrLevel: orig.cefrLevel,
          definitionEn: gen.definitionEn,
          translationVi: gen.translationVi,
          exampleSentence: gen.exampleSentence,
          topic: orig.topic,
          frequency: orig.frequency,
        });
      }
    }

    // Rate limiting
    if (i + BATCH_SIZE < words.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  writeFileSync(outputFile, JSON.stringify(results, null, 2));
  console.log(`Generated ${results.length} words → ${outputFile}`);
}

main().catch(console.error);
