/**
 * Word Crawler Script — $0 cost
 *
 * Combines three free sources:
 * 1. Word lists (NGSL 2800 + wordfreq-en-25000) from GitHub
 * 2. Free Dictionary API — definitions, phonetics, examples, part of speech
 * 3. MyMemory API — English→Vietnamese translations
 *
 * Usage:
 *   bun run scripts/crawl-words.ts              # NGSL only (~2800 words)
 *   bun run scripts/crawl-words.ts --25k        # NGSL + wordfreq-25000
 *   bun run scripts/crawl-words.ts --limit 5000 # Stop after N new words
 *
 * Resumable: progress saved to scripts/.crawl-progress.json
 * Output: prisma/seed/crawled-words.json
 *
 * Rate limits:
 * - Free Dictionary API: no official limit, be respectful (~1 req/sec)
 * - MyMemory API: 1000 req/day free (5000/day with email key)
 *   Set MYMEMORY_EMAIL=your@email.com for higher limit
 */

import { writeFileSync, readFileSync, existsSync } from "fs";

const OUTPUT_FILE = "prisma/seed/crawled-words.json";
const PROGRESS_FILE = "scripts/.crawl-progress.json";
const NGSL_URL =
  "https://raw.githubusercontent.com/lpmi-13/machine_readable_wordlists/master/General/NGSL/NGSL.json";
const WORDFREQ_URL =
  "https://raw.githubusercontent.com/aparrish/wordfreq-en-25000/master/wordfreq-en-25000-log.json";
const NAWL_URL =
  "https://raw.githubusercontent.com/lpmi-13/machine_readable_wordlists/master/Academic/NAWL/NAWL.json";
const AWL_URL =
  "https://raw.githubusercontent.com/lpmi-13/machine_readable_wordlists/master/Academic/AWL/AWL.json";
const GOOGLE_10K_URL =
  "https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english.txt";

const MYMEMORY_EMAIL = process.env.MYMEMORY_EMAIL || "";

// Parse CLI args
const args = process.argv.slice(2);
const use25k = args.includes("--25k");
const useAll = args.includes("--all");
const limitIdx = args.indexOf("--limit");
const wordLimit = limitIdx !== -1 ? parseInt(args[limitIdx + 1]) : Infinity;

// ─── Types ──────────────────────────────────────────────

interface WordEntry {
  word: string;
  phonetic: string | null;
  partOfSpeech: string;
  cefrLevel: string;
  definitionEn: string;
  translationVi: string;
  exampleSentence: string;
  topic: string;
  frequency: number;
}

interface DictEntry {
  word: string;
  phonetic?: string;
  phonetics?: { text?: string; audio?: string }[];
  meanings?: {
    partOfSpeech: string;
    definitions: {
      definition: string;
      example?: string;
    }[];
  }[];
}

// ─── CEFR level estimation based on frequency rank ──────

function estimateCefrLevel(rank: number): string {
  if (rank <= 500) return "A1";
  if (rank <= 1200) return "A2";
  if (rank <= 2500) return "B1";
  if (rank <= 5000) return "B2";
  return "C1";
}

// ─── Map Free Dictionary API part of speech to our enum ─

function mapPartOfSpeech(pos: string): string | null {
  const map: Record<string, string> = {
    noun: "NOUN",
    verb: "VERB",
    adjective: "ADJECTIVE",
    adverb: "ADVERB",
    preposition: "PREPOSITION",
    conjunction: "CONJUNCTION",
    pronoun: "PRONOUN",
    interjection: "INTERJECTION",
    determiner: "DETERMINER",
  };
  return map[pos.toLowerCase()] ?? null;
}

// ─── Fetch from Free Dictionary API ─────────────────────

async function fetchDictionary(word: string): Promise<DictEntry[] | null> {
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ─── Fetch Vietnamese translation ───────────────────────

async function fetchVietnamese(
  word: string,
  definition: string
): Promise<string> {
  try {
    const query = encodeURIComponent(word);
    let url = `https://api.mymemory.translated.net/get?q=${query}&langpair=en|vi`;
    if (MYMEMORY_EMAIL) {
      url += `&de=${encodeURIComponent(MYMEMORY_EMAIL)}`;
    }

    const res = await fetch(url);
    if (!res.ok) return word;

    const data = await res.json();
    const translation = data?.responseData?.translatedText;

    if (
      translation &&
      translation.toLowerCase() !== word.toLowerCase() &&
      translation !== translation.toUpperCase()
    ) {
      return translation;
    }

    // Fallback: translate the definition
    const defQuery = encodeURIComponent(definition.slice(0, 100));
    let defUrl = `https://api.mymemory.translated.net/get?q=${defQuery}&langpair=en|vi`;
    if (MYMEMORY_EMAIL) {
      defUrl += `&de=${encodeURIComponent(MYMEMORY_EMAIL)}`;
    }

    const defRes = await fetch(defUrl);
    if (!defRes.ok) return word;

    const defData = await defRes.json();
    return defData?.responseData?.translatedText || word;
  } catch {
    return word;
  }
}

// ─── Fetch word lists ───────────────────────────────────

async function fetchNGSL(): Promise<string[]> {
  console.log("Fetching NGSL word list...");
  const res = await fetch(NGSL_URL);
  const data: Record<string, Record<string, string[]>> = await res.json();

  const words: string[] = [];
  for (const tier of Object.keys(data).sort((a, b) => Number(a) - Number(b))) {
    for (const word of Object.keys(data[tier])) {
      words.push(word);
    }
  }

  console.log(`  Found ${words.length} NGSL words`);
  return words;
}

async function fetchWordfreq25k(): Promise<string[]> {
  console.log("Fetching wordfreq-en-25000 list...");
  const res = await fetch(WORDFREQ_URL);
  const data: [string, number][] = await res.json();

  const words = data.map(([word]) => word);
  console.log(`  Found ${words.length} wordfreq words`);
  return words;
}

async function fetchNAWL(): Promise<string[]> {
  console.log("Fetching NAWL (academic) word list...");
  const res = await fetch(NAWL_URL);
  const data: Record<string, string[]> = await res.json();
  const words = Object.keys(data);
  console.log(`  Found ${words.length} NAWL words`);
  return words;
}

async function fetchAWL(): Promise<string[]> {
  console.log("Fetching AWL (academic) word list...");
  const res = await fetch(AWL_URL);
  const data: Record<string, string[]> = await res.json();
  const words = Object.keys(data);
  console.log(`  Found ${words.length} AWL words`);
  return words;
}

async function fetchGoogle10k(): Promise<string[]> {
  console.log("Fetching Google 10K word list...");
  const res = await fetch(GOOGLE_10K_URL);
  const text = await res.text();
  const words = text.trim().split("\n").map((w) => w.trim()).filter(Boolean);
  console.log(`  Found ${words.length} Google 10K words`);
  return words;
}

// ─── Load/save progress (for resumable crawling) ────────

interface Progress {
  completed: string[];
  results: WordEntry[];
}

function loadProgress(): Progress {
  if (existsSync(PROGRESS_FILE)) {
    try {
      return JSON.parse(readFileSync(PROGRESS_FILE, "utf-8"));
    } catch {
      return { completed: [], results: [] };
    }
  }
  return { completed: [], results: [] };
}

function saveProgress(progress: Progress) {
  writeFileSync(PROGRESS_FILE, JSON.stringify(progress));
}

// ─── Main ───────────────────────────────────────────────

async function main() {
  // Build combined word list (NGSL first, then wordfreq for extras)
  const ngslWords = await fetchNGSL();
  const seen = new Set(ngslWords.map((w) => w.toLowerCase()));
  let allWords = [...ngslWords];

  if (use25k || useAll) {
    const wfWords = await fetchWordfreq25k();
    let added = 0;
    for (const w of wfWords) {
      if (!seen.has(w.toLowerCase())) {
        allWords.push(w);
        seen.add(w.toLowerCase());
        added++;
      }
    }
    console.log(`  Added ${added} new words from wordfreq (total: ${allWords.length})`);
  }

  if (useAll) {
    // Add Google 10K
    const g10k = await fetchGoogle10k();
    let added = 0;
    for (const w of g10k) {
      if (!seen.has(w.toLowerCase())) {
        allWords.push(w);
        seen.add(w.toLowerCase());
        added++;
      }
    }
    console.log(`  Added ${added} new words from Google 10K (total: ${allWords.length})`);

    // Add NAWL
    const nawl = await fetchNAWL();
    added = 0;
    for (const w of nawl) {
      if (!seen.has(w.toLowerCase())) {
        allWords.push(w);
        seen.add(w.toLowerCase());
        added++;
      }
    }
    console.log(`  Added ${added} new words from NAWL (total: ${allWords.length})`);

    // Add AWL
    const awl = await fetchAWL();
    added = 0;
    for (const w of awl) {
      if (!seen.has(w.toLowerCase())) {
        allWords.push(w);
        seen.add(w.toLowerCase());
        added++;
      }
    }
    console.log(`  Added ${added} new words from AWL (total: ${allWords.length})`);
  }

  const progress = loadProgress();
  const completedSet = new Set(progress.completed);
  const results = progress.results;

  // Filter function words that don't make good flashcards
  const skipWords = new Set([
    "be", "am", "is", "are", "was", "were", "been",
    "have", "has", "had", "do", "does", "did",
    "will", "would", "shall", "should", "can", "could", "may", "might", "must",
    "the", "a", "an", "and", "or", "but", "if", "so", "yet", "nor",
    "in", "on", "at", "to", "for", "of", "with", "by", "from", "as",
    "it", "he", "she", "we", "they", "me", "him", "her", "us", "them",
    "my", "your", "his", "its", "our", "their",
    "this", "that", "these", "those",
    "i", "you", "not", "no", "yes",
  ]);

  // Also skip words with special characters, numbers, or single letters
  const wordsToProcess = allWords.filter(
    (w) =>
      !completedSet.has(w) &&
      !skipWords.has(w.toLowerCase()) &&
      w.length > 1 &&
      /^[a-zA-Z-]+$/.test(w)
  );

  const effectiveLimit = Math.min(wordsToProcess.length, wordLimit);
  console.log(
    `\nProcessing ${effectiveLimit} words (${completedSet.size} already done, ${results.length} in results)`
  );

  if (wordLimit < Infinity) {
    console.log(`  Limit: ${wordLimit} new words`);
  }

  let frequency = results.length > 0
    ? Math.max(...results.map((r) => r.frequency)) + 1
    : completedSet.size + 1;
  let errorCount = 0;
  let newCount = 0;

  for (let i = 0; i < wordsToProcess.length && newCount < wordLimit; i++) {
    const word = wordsToProcess[i];

    // Progress logging & save every 50 words
    if (i % 50 === 0 && i > 0) {
      console.log(
        `  Progress: ${i}/${effectiveLimit} (${Math.round((i / effectiveLimit) * 100)}%) | crawled: ${newCount} | errors: ${errorCount}`
      );
      saveProgress({ completed: [...completedSet], results });
    }

    // Save every 200 words to output file too (for safety)
    if (i % 200 === 0 && i > 0) {
      writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
    }

    // Fetch dictionary data
    const dictEntries = await fetchDictionary(word);
    if (!dictEntries || dictEntries.length === 0) {
      completedSet.add(word);
      frequency++;
      errorCount++;
      // Shorter delay for errors (no translation request needed)
      await new Promise((r) => setTimeout(r, 100));
      continue;
    }

    const entry = dictEntries[0];

    // Get phonetic
    const phonetic =
      entry.phonetic ||
      entry.phonetics?.find((p) => p.text)?.text ||
      null;

    // Process first meaning only
    const meaning = entry.meanings?.[0];
    if (!meaning) {
      completedSet.add(word);
      frequency++;
      continue;
    }

    const partOfSpeech = mapPartOfSpeech(meaning.partOfSpeech);
    if (!partOfSpeech) {
      completedSet.add(word);
      frequency++;
      continue;
    }

    const def = meaning.definitions[0];
    if (!def) {
      completedSet.add(word);
      frequency++;
      continue;
    }

    // Fetch Vietnamese translation
    const translationVi = await fetchVietnamese(word, def.definition);

    results.push({
      word,
      phonetic,
      partOfSpeech,
      cefrLevel: estimateCefrLevel(frequency),
      definitionEn: def.definition,
      translationVi,
      exampleSentence:
        def.example || `She uses the word "${word}" in daily conversation.`,
      topic: "",
      frequency,
    });

    completedSet.add(word);
    frequency++;
    newCount++;

    // Rate limiting
    await new Promise((r) => setTimeout(r, 300));
  }

  // Final save
  saveProgress({ completed: [...completedSet], results });
  writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));

  console.log(`\nDone!`);
  console.log(`  New words crawled this run: ${newCount}`);
  console.log(`  Total words in output: ${results.length}`);
  console.log(`  Skipped/errors: ${errorCount}`);
  console.log(`  Output: ${OUTPUT_FILE}`);
  console.log(
    `\nNext step: bun run prisma/seed/seed.ts`
  );
}

main().catch(console.error);
