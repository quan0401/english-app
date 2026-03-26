# English Vocabulary Learning Web App — Implementation Plan

## Context

Vietnamese working adults need a vocabulary app that speaks their language. Existing top apps (WordUp, Drops, Duolingo) lack Vietnamese-English support with quality translations. This app replicates the clean, dark-mode experience of "Vocabulary - Learn Words Daily" (iOS) but tailored for Vietnamese speakers, with a spaced repetition system and daily learning sessions. AI conversation partner is deferred to post-MVP.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Styling | Tailwind CSS (dark mode default) |
| API | tRPC (end-to-end type safety) |
| ORM | Prisma |
| Database | PostgreSQL (Neon free tier for MVP, migrate to AWS RDS later) |
| Auth | NextAuth.js (Google + email/password) |
| Runtime | Bun |
| Deploy | Vercel (frontend + API) |
| TTS | Web Speech API (client-side) |

---

## Project Structure

```
english-app/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed/                    # Word JSON files + seed script
├── public/
│   ├── sw.js                    # Service worker (push notifications)
│   └── manifest.json            # PWA manifest
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root: dark theme, providers
│   │   ├── api/auth/[...nextauth]/route.ts
│   │   ├── api/trpc/[trpc]/route.ts
│   │   ├── (auth)/login, register
│   │   ├── (app)/               # Authenticated shell (bottom nav)
│   │   │   ├── learn/page.tsx   # Daily flashcard session
│   │   │   ├── review/page.tsx  # Spaced repetition queue
│   │   │   ├── browse/page.tsx  # Word list by level/topic
│   │   │   ├── stats/page.tsx   # Streaks, progress
│   │   │   └── settings/page.tsx
│   │   └── onboarding/page.tsx  # First-time level selection
│   ├── components/
│   │   ├── ui/                  # Button, Card, Input, Modal
│   │   ├── flashcard/           # FlashcardDeck, FlashcardItem, Actions
│   │   ├── layout/              # BottomNav, Header, SessionProgress
│   │   └── word/                # WordCard, PronunciationButton
│   ├── server/
│   │   ├── auth.ts
│   │   ├── db.ts                # Prisma singleton
│   │   ├── trpc/
│   │   │   ├── init.ts
│   │   │   ├── router.ts
│   │   │   └── routers/         # word, progress, session, streak, user
│   │   └── services/
│   │       ├── sm2.ts           # SM-2 algorithm (pure function)
│   │       ├── daily-words.ts   # Word selection logic
│   │       └── streak.ts        # Streak calculation
│   ├── lib/
│   │   ├── trpc/client.ts, server.ts
│   │   ├── tts.ts               # Web Speech API wrapper
│   │   └── utils.ts
│   └── hooks/
│       ├── useFlashcard.ts
│       ├── useSession.ts
│       └── useTTS.ts
└── scripts/
    ├── generate-words.ts        # LLM-assisted word generation
    └── import-words.ts
```

---

## Database Schema (Key Models)

### Word
- `id`, `word`, `phonetic` (IPA), `partOfSpeech`, `cefrLevel`
- `definitionEn`, `translationVi`, `exampleSentence`
- `topicId` (FK to Topic), `frequency` (corpus rank)
- Unique: `[word, partOfSpeech]` — "run" noun vs "run" verb are separate
- Indexes: `cefrLevel`, `topicId`, `frequency`

### UserWordProgress (SM-2)
- `userId`, `wordId`
- `easeFactor` (default 2.5), `interval` (days), `repetitions`
- `nextReviewAt`, `lastReviewedAt`
- `timesCorrect`, `timesWrong`, `status` (NEW/LEARNING/REVIEW/MASTERED)
- **Critical index**: `[userId, nextReviewAt]` — powers every review queue query

### DailySession
- `userId`, `date`, `wordsLearned`, `wordsReviewed`, `timeSpentSec`, `goalMet`

### Streak
- `userId`, `currentStreak`, `longestStreak`, `lastActiveDate`

### Auth tables
- Standard NextAuth: `User`, `Account`, `Session`, `VerificationToken`
- User extended with: `cefrLevel`, `dailyGoal`, `uiLanguage`, `timezone`

---

## Implementation Phases

### Phase 0: Scaffolding (Days 1-2)
1. `bun create next-app` with TypeScript, Tailwind, App Router
2. Install: prisma, @trpc/*, next-auth, @auth/prisma-adapter, zod, bcryptjs
3. Prisma schema + initial migration
4. tRPC setup: init, root router, API route, React provider
5. NextAuth: Google + credentials, Prisma adapter
6. Dark theme root layout
7. **Verify**: Sign in works, tRPC hello world, Prisma connects

### Phase 1: Word Data & Seed (Days 3-7)
1. Source base list: NGSL (2800 words) + Oxford 3000 with CEFR levels
2. Run `scripts/generate-words.ts` — call Claude API to generate: English definition, Vietnamese translation, example sentence, IPA phonetic for each word
3. Organize into ~15 topics via LLM classification
4. Seed ~500 A1-A2 words to start building against
5. Build tRPC `word` router + `/browse` page + `PronunciationButton`
6. **Verify**: Browse words, hear TTS, see Vietnamese translations

### Phase 2: Flashcard & Learning Session (Days 8-14)
1. `FlashcardItem` — CSS 3D flip (`rotateY`, `perspective`, `backface-visibility`)
2. `FlashcardDeck` — swipeable stack or next/prev
3. Daily word selection service: N new words at user's level, ordered by frequency, not yet seen
4. tRPC `session` router: `getTodaySession`, `startSession`, `recordWordResult`
5. `/learn` page with progress bar (X/10 words)
6. Create `UserWordProgress` on first interaction
7. **Verify**: Complete a 10-word daily session

### Phase 3: Spaced Repetition (Days 15-21)
1. Implement SM-2 in `src/server/services/sm2.ts` (pure function)
2. UI mapping: Again (q=1), Hard (q=2), Good (q=3), Easy (q=5)
3. tRPC `progress` router: `getReviewQueue` (nextReviewAt <= now), `submitReview`
4. `/review` page — same flashcard UI + quality rating buttons
5. Status transitions: NEW → LEARNING → REVIEW → MASTERED
6. Review count badge on bottom nav
7. **Verify**: Words appear in review queue on correct scheduled day

### Phase 4: Streaks & Stats (Days 22-26)
1. Streak service — timezone-aware (user's `Asia/Ho_Chi_Minh` timezone)
2. `DailySession` upsert on each word completion
3. `/stats` page: streak flame, 30-day calendar heatmap, words by status
4. 15-min session timer (client-side, informational)
5. **Verify**: Streak increments, stats accurate

### Phase 5: Notifications & PWA (Days 27-32)
1. `manifest.json` + service worker → installable PWA
2. Push notification subscription (store endpoint in DB)
3. Vercel Cron daily reminder for inactive users
4. Email fallback via Resend
5. **Verify**: PWA installable, push notification arrives

### Phase 6: Onboarding & Polish (Days 33-40)
1. `/onboarding` — CEFR self-assessment quiz, daily goal, topic interests
2. Vietnamese UI strings (simple object map, no i18n framework)
3. Swipe gestures on flashcards
4. Loading skeletons, error boundaries, empty states
5. Expand word data to 3000-5000 words (A1-C1)
6. Mobile viewport optimization

### Phase 7: Deploy (Days 41-45)
1. Neon PostgreSQL (free tier) or AWS RDS
2. Vercel project + env vars
3. `prisma migrate deploy` + seed production
4. Vercel Cron for notifications
5. Domain + SSL
6. End-to-end smoke test

---

## SM-2 Algorithm

Pure function in `src/server/services/sm2.ts`:
- quality < 3 → reset (reps=0, interval=1, EF unchanged)
- quality >= 3 → increment reps; interval = 1 (first), 6 (second), then `interval * EF`
- EF update: `EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))`, floor at 1.3

---

## Word Data Pipeline

1. **Source**: NGSL + Oxford 3000 (free CEFR-graded lists)
2. **Enrich**: `scripts/generate-words.ts` calls Claude API per word → `{ definitionEn, translationVi, exampleSentence, phonetic }`
3. **Classify**: LLM assigns each word to 1 of ~15 topics
4. **Seed**: JSON → `prisma.word.createMany()`
5. **Cost**: ~3000 words x ~200 tokens = ~$3-5 in API costs

---

## Key Decisions

- **Dark mode only** for MVP (matches reference app, halves CSS work)
- **tRPC over REST** — end-to-end types, zero codegen, faster solo dev
- **Neon over RDS** for MVP — free tier, Vercel-native, no server management
- **Client-side TTS** — Web Speech API, no server costs
- **PWA over native** — home screen install, push notifications, one codebase
- **Timezone-aware streaks** — use user's timezone, not UTC

---

## Verification Plan

After each phase, verify by:
1. **Phase 0**: Sign in with Google, see tRPC response, check DB connection
2. **Phase 1**: Browse words at `/browse`, tap word → hear pronunciation, see Vietnamese
3. **Phase 2**: Complete a 10-word learning session at `/learn`
4. **Phase 3**: Learn words → check they appear in `/review` on the correct day
5. **Phase 4**: Practice 2 days → verify streak = 2, check `/stats`
6. **Phase 5**: Install as PWA on phone, receive push notification
7. **Phase 7**: Full flow on production URL: register → onboard → learn → review → stats
