/**
 * Classify words into topics based on definition keyword matching.
 * Runs directly against the database — no API calls needed.
 *
 * Usage: bun run scripts/classify-topics.ts
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const db = new PrismaClient({ adapter });

// Topic → keyword patterns (matched against word + definition)
const topicKeywords: Record<string, string[]> = {
  "Greetings": [
    "greeting", "greet", "farewell", "polite", "courtesy",
  ],
  "Family": [
    "family", "parent", "mother", "father", "child", "children", "sibling",
    "brother", "sister", "husband", "wife", "marriage", "marry", "relative",
    "daughter", "son", "aunt", "uncle", "cousin", "grandparent", "baby",
    "infant", "pregnant", "birth", "ancestor", "descendant",
  ],
  "Food & Drink": [
    "food", "eat", "drink", "cook", "meal", "breakfast", "lunch", "dinner",
    "fruit", "vegetable", "meat", "bread", "rice", "soup", "sugar", "salt",
    "taste", "flavor", "delicious", "hungry", "appetite", "recipe", "kitchen",
    "restaurant", "cafe", "coffee", "tea", "wine", "beer", "juice", "water",
    "bake", "fry", "boil", "roast", "dessert", "snack", "cheese", "butter",
    "spice", "herb", "flour", "dough", "nourish", "nutrient", "diet",
  ],
  "Travel": [
    "travel", "trip", "journey", "flight", "airport", "hotel", "tourist",
    "passport", "luggage", "destination", "vacation", "holiday", "ticket",
    "boarding", "departure", "arrival", "suitcase", "backpack", "tour",
    "abroad", "foreign", "visa", "customs", "ferry", "cruise",
  ],
  "Work": [
    "work", "job", "office", "employ", "career", "profession", "colleague",
    "salary", "wage", "meeting", "deadline", "project", "manage", "boss",
    "hire", "fire", "resign", "promote", "interview", "resume", "company",
    "corporate", "business", "staff", "team", "task", "assign", "schedule",
    "overtime", "retire", "pension", "commute", "workplace",
  ],
  "Health": [
    "health", "medical", "doctor", "hospital", "disease", "illness", "sick",
    "pain", "medicine", "drug", "symptom", "diagnos", "treatment", "cure",
    "surgery", "nurse", "patient", "wound", "injur", "blood", "heart",
    "brain", "bone", "muscle", "fever", "cough", "headache", "allergy",
    "infect", "virus", "bacteria", "immune", "vaccine", "therapy", "mental",
    "anxiety", "depress", "stress", "organ", "lung", "liver", "kidney",
  ],
  "Shopping": [
    "shop", "buy", "sell", "price", "cost", "cheap", "expensive", "money",
    "pay", "purchase", "store", "market", "discount", "bargain", "receipt",
    "refund", "brand", "product", "customer", "consumer", "retail",
    "wholesale", "merchandise", "afford",
  ],
  "Education": [
    "school", "university", "college", "student", "teacher", "learn",
    "study", "education", "class", "lesson", "exam", "test", "grade",
    "homework", "knowledge", "curriculum", "lecture", "professor",
    "academic", "scholar", "research", "diploma", "degree", "graduate",
    "tutor", "textbook", "library", "literature", "read", "write",
    "alphabet", "grammar", "vocabulary", "language", "translate",
  ],
  "Technology": [
    "computer", "software", "hardware", "internet", "website", "digital",
    "technology", "program", "code", "data", "algorithm", "network",
    "server", "device", "phone", "screen", "keyboard", "mouse", "click",
    "download", "upload", "online", "cyber", "robot", "artificial",
    "electronic", "battery", "wireless", "bluetooth", "app", "pixel",
  ],
  "Nature": [
    "nature", "environment", "weather", "climate", "mountain", "river",
    "ocean", "sea", "forest", "tree", "plant", "flower", "animal", "bird",
    "fish", "insect", "rain", "snow", "wind", "sun", "moon", "star",
    "earth", "soil", "rock", "mineral", "volcano", "earthquake",
    "ecosystem", "species", "habitat", "wildlife", "garden", "farm",
    "harvest", "crop", "seed", "leaf", "root", "branch",
  ],
  "Sports": [
    "sport", "game", "play", "team", "competition", "champion", "athlete",
    "exercise", "fitness", "gym", "run", "swim", "ball", "goal", "score",
    "match", "race", "train", "coach", "stadium", "tournament", "medal",
    "victory", "defeat", "league",
  ],
  "Entertainment": [
    "movie", "film", "music", "song", "dance", "theater", "concert",
    "perform", "entertain", "audience", "actor", "actress", "sing",
    "instrument", "guitar", "piano", "drum", "comedy", "drama", "art",
    "paint", "draw", "sculpt", "photograph", "camera", "festival",
    "celebrate", "party", "hobby",
  ],
  "Daily Life": [
    "home", "house", "room", "door", "window", "bed", "sleep", "wake",
    "morning", "evening", "night", "day", "time", "clock", "hour",
    "minute", "clean", "wash", "dress", "clothes", "wear", "shoe",
    "bath", "shower", "tooth", "hair", "mirror", "furniture", "chair",
    "table", "lamp", "floor", "wall", "roof", "neighbor", "routine",
    "daily", "habit", "chore",
  ],
  "Emotions": [
    "happy", "sad", "angry", "fear", "love", "hate", "emotion", "feel",
    "mood", "joy", "sorrow", "grief", "excite", "bore", "surprise",
    "shock", "anxious", "nervous", "calm", "relax", "frustrat", "jealous",
    "envy", "pride", "shame", "guilt", "confiden", "courage", "hope",
    "despair", "lonely", "grateful", "disappoint", "enthusiasm",
    "passion", "compassion", "empathy", "sympathy",
  ],
  "Business": [
    "profit", "loss", "invest", "stock", "market", "trade", "export",
    "import", "economy", "finance", "bank", "loan", "debt", "tax",
    "budget", "revenue", "income", "expense", "contract", "negotiate",
    "deal", "client", "partner", "startup", "entrepreneur", "strategy",
    "advertis", "marketing", "brand", "competition", "industry",
    "manufacture", "supply", "demand", "shareholder", "dividend",
  ],
};

async function main() {
  // Get all topics from DB
  const topics = await db.topic.findMany();
  const topicMap = new Map(topics.map((t) => [t.name, t.id]));

  // Get all words without a topic
  const words = await db.word.findMany({
    where: { topicId: null },
    select: { id: true, word: true, definitionEn: true },
  });

  console.log(`Classifying ${words.length} words without topics...`);

  let classified = 0;
  let unclassified = 0;

  for (const word of words) {
    const text = `${word.word} ${word.definitionEn}`.toLowerCase();

    let bestTopic: string | null = null;
    let bestScore = 0;

    for (const [topicName, keywords] of Object.entries(topicKeywords)) {
      let score = 0;
      for (const kw of keywords) {
        if (text.includes(kw)) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        bestTopic = topicName;
      }
    }

    if (bestTopic && bestScore >= 1) {
      const topicId = topicMap.get(bestTopic);
      if (topicId) {
        await db.word.update({
          where: { id: word.id },
          data: { topicId },
        });
        classified++;
      }
    } else {
      unclassified++;
    }
  }

  console.log(`Done!`);
  console.log(`  Classified: ${classified}`);
  console.log(`  Unclassified: ${unclassified}`);

  // Print topic counts
  const topicCounts = await db.topic.findMany({
    include: { _count: { select: { words: true } } },
    orderBy: { name: "asc" },
  });
  console.log(`\nTopic distribution:`);
  for (const t of topicCounts) {
    console.log(`  ${t.nameVi || t.name}: ${t._count.words} words`);
  }
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
