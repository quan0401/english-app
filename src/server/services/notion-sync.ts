import type { PrismaClient } from "@/generated/prisma/client";

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

const POS_MAP: Record<string, string> = {
  NOUN: "noun", VERB: "verb", ADJECTIVE: "adjective", ADVERB: "adverb",
  PREPOSITION: "preposition", CONJUNCTION: "conjunction", PRONOUN: "pronoun",
  INTERJECTION: "interjection", PHRASAL_VERB: "phrasal verb", IDIOM: "idiom",
};

async function notionFetch(token: string, path: string, method = "GET", body?: any) {
  const res = await fetch(`${NOTION_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Notion API error: ${res.status} ${err}`);
  }
  return res.json();
}

async function queryDatabase(token: string, dbId: string, filter?: any) {
  return notionFetch(token, `/databases/${dbId}/query`, "POST", { filter, page_size: 100 });
}

async function createPage(token: string, dbId: string, properties: any) {
  return notionFetch(token, "/pages", "POST", {
    parent: { database_id: dbId },
    properties,
  });
}

async function updatePage(token: string, pageId: string, properties: any) {
  return notionFetch(token, `/pages/${pageId}`, "PATCH", { properties });
}

function richText(content: string) {
  return { rich_text: [{ text: { content: content.slice(0, 2000) } }] };
}

function titleProp(content: string) {
  return { title: [{ text: { content } }] };
}

// ─── Export words to Notion ──────────────────────────────

export async function syncWordsToNotion(
  db: PrismaClient,
  _userId: string,
  token: string,
  wordDbId: string,
  limit: number = 100
) {
  const words = await db.word.findMany({
    include: { topic: true },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  let synced = 0;

  for (const word of words) {
    try {
      const existing = await queryDatabase(token, wordDbId, {
        property: "App ID",
        rich_text: { equals: word.id },
      });

      const properties: any = {
        "Word": titleProp(word.word),
        "Phonetic": richText(word.phonetic || ""),
        "Part of Speech": { select: { name: POS_MAP[word.partOfSpeech] || "noun" } },
        "CEFR Level": { select: { name: word.cefrLevel } },
        "Definition": richText(word.definitionEn),
        "Vietnamese": richText(word.translationVi),
        "Example": richText(word.exampleSentence),
        "App ID": richText(word.id),
      };

      if (word.topic) {
        properties["Topic"] = { select: { name: word.topic.name } };
      }

      if (existing.results.length > 0) {
        await updatePage(token, existing.results[0].id, properties);
      } else {
        await createPage(token, wordDbId, properties);
      }
      synced++;
    } catch (err) {
      console.error(`Failed to sync word "${word.word}":`, err);
    }
  }

  return { synced, total: words.length };
}

// ─── Export progress to Notion ───────────────────────────

export async function syncProgressToNotion(
  db: PrismaClient,
  userId: string,
  token: string,
  progressDbId: string
) {
  const [sessions, streak, mastered, learning] = await Promise.all([
    db.dailySession.findMany({ where: { userId }, orderBy: { date: "desc" }, take: 7 }),
    db.streak.findUnique({ where: { userId } }),
    db.userWordProgress.count({ where: { userId, status: "MASTERED" } }),
    db.userWordProgress.count({ where: { userId, status: "LEARNING" } }),
  ]);

  let synced = 0;

  for (const session of sessions) {
    const dateStr = new Date(session.date).toISOString().split("T")[0];
    try {
      const existing = await queryDatabase(token, progressDbId, {
        property: "Date",
        title: { equals: dateStr },
      });

      const properties = {
        "Date": titleProp(dateStr),
        "Words Learned": { number: session.wordsLearned },
        "Words Reviewed": { number: session.wordsReviewed },
        "Current Streak": { number: streak?.currentStreak ?? 0 },
        "Total Mastered": { number: mastered },
        "Total Learning": { number: learning },
        "Goal Met": { checkbox: session.goalMet },
      };

      if (existing.results.length > 0) {
        await updatePage(token, existing.results[0].id, properties);
      } else {
        await createPage(token, progressDbId, properties);
      }
      synced++;
    } catch (err) {
      console.error(`Failed to sync progress for ${dateStr}:`, err);
    }
  }

  return { synced };
}

// ─── Export study notes to Notion ────────────────────────

export async function syncNotesToNotion(
  db: PrismaClient,
  userId: string,
  token: string,
  notesDbId: string
) {
  const progress = await db.userWordProgress.findMany({
    where: { userId, notes: { not: null } },
    include: { word: true },
    take: 100,
  });

  let synced = 0;
  const statusMap: Record<string, string> = {
    NEW: "New", LEARNING: "Learning", REVIEW: "Review", MASTERED: "Mastered",
  };

  for (const p of progress) {
    try {
      const existing = await queryDatabase(token, notesDbId, {
        property: "App ID",
        rich_text: { equals: p.id },
      });

      const properties = {
        "Word": titleProp(p.word.word),
        "Notes": richText(p.notes || ""),
        "Status": { select: { name: statusMap[p.status] || "New" } },
        "Times Correct": { number: p.timesCorrect },
        "Times Wrong": { number: p.timesWrong },
        "App ID": richText(p.id),
      };

      if (existing.results.length > 0) {
        await updatePage(token, existing.results[0].id, properties);
      } else {
        await createPage(token, notesDbId, properties);
      }
      synced++;
    } catch (err) {
      console.error(`Failed to sync note for "${p.word.word}":`, err);
    }
  }

  return { synced };
}

// ─── Import notes from Notion ────────────────────────────

export async function syncNotesFromNotion(
  db: PrismaClient,
  _userId: string,
  token: string,
  notesDbId: string
) {
  const response = await queryDatabase(token, notesDbId);
  let imported = 0;

  for (const page of response.results) {
    const props = page.properties;
    const appId = props?.["App ID"]?.rich_text?.[0]?.plain_text;
    const notes = props?.["Notes"]?.rich_text?.[0]?.plain_text;
    const mnemonic = props?.["Mnemonic"]?.rich_text?.[0]?.plain_text;

    if (!appId) continue;

    try {
      const combined = [notes, mnemonic].filter(Boolean).join("\n\n");
      if (combined) {
        await db.userWordProgress.update({
          where: { id: appId },
          data: { notes: combined },
        });
        imported++;
      }
    } catch { /* record may not exist */ }
  }

  return { imported };
}

// ─── Export word lists to Notion ─────────────────────────

export async function syncListsToNotion(
  db: PrismaClient,
  userId: string,
  token: string,
  listDbId: string
) {
  const lists = await db.wordList.findMany({
    where: { userId },
    include: { _count: { select: { items: true } } },
  });

  let synced = 0;

  for (const list of lists) {
    try {
      const existing = await queryDatabase(token, listDbId, {
        property: "App ID",
        rich_text: { equals: list.id },
      });

      const properties = {
        "List Name": titleProp(list.name),
        "Icon": richText(list.icon || "📚"),
        "Word Count": { number: list._count.items },
        "App ID": richText(list.id),
      };

      if (existing.results.length > 0) {
        await updatePage(token, existing.results[0].id, properties);
      } else {
        await createPage(token, listDbId, properties);
      }
      synced++;
    } catch (err) {
      console.error(`Failed to sync list "${list.name}":`, err);
    }
  }

  return { synced };
}
