"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { MeaningMatch } from "@/components/games/MeaningMatch";
import { FillTheGap } from "@/components/games/FillTheGap";
import { GuessTheWord } from "@/components/games/GuessTheWord";
import { MatchSynonyms } from "@/components/games/MatchSynonyms";
import Link from "next/link";

type GameType = "meaning" | "fill" | "guess" | "match" | "shuffle" | null;

const games = [
  { key: "shuffle" as const, emoji: "🎲", name: "Trộn ngẫu nhiên", desc: "Tổng hợp tất cả trò chơi" },
  { key: "match" as const, emoji: "🔗", name: "Nối từ", desc: "Nối từ với nghĩa tiếng Việt" },
  { key: "meaning" as const, emoji: "📝", name: "Chọn nghĩa", desc: "Chọn định nghĩa đúng" },
  { key: "fill" as const, emoji: "✏️", name: "Điền từ", desc: "Điền từ vào chỗ trống" },
  { key: "guess" as const, emoji: "🎯", name: "Đoán từ", desc: "Đoán từ theo định nghĩa" },
];

export default function PracticePage() {
  const [activeGame, setActiveGame] = useState<GameType>(null);
  const [completed, setCompleted] = useState<{ score: number; total: number } | null>(null);

  // For shuffle mode, pick a random game type per round
  const [shuffleGame, setShuffleGame] = useState<GameType>(null);

  const gameWords = trpc.game.getGameWords.useQuery(
    { count: 8 },
    { enabled: activeGame !== null, refetchOnWindowFocus: false }
  );
  const recordResult = trpc.game.recordResult.useMutation();

  const handleStart = (type: GameType) => {
    if (type === "shuffle") {
      const gameTypes: GameType[] = ["meaning", "fill", "guess", "match"];
      setShuffleGame(gameTypes[Math.floor(Math.random() * gameTypes.length)]);
    }
    setActiveGame(type);
    setCompleted(null);
    gameWords.refetch();
  };

  const handleResult = (wordId: string, correct: boolean) => {
    recordResult.mutate({ wordId, correct });
  };

  const handleComplete = (score: number, total: number) => {
    setCompleted({ score, total });
  };

  const handleBack = () => {
    setActiveGame(null);
    setCompleted(null);
    setShuffleGame(null);
  };

  // Game selection screen
  if (!activeGame) {
    return (
      <div className="mx-auto max-w-lg px-4 py-6 space-y-4">
        <h1 className="text-3xl font-bold">Luyện tập</h1>

        {/* Learn new words — word feed */}
        <Link
          href="/learn"
          className="w-full rounded-2xl bg-primary/10 border border-primary/20 p-5 flex items-center gap-4 hover:bg-primary/15 transition-colors text-left cursor-pointer block"
        >
          <div className="flex-1">
            <h3 className="text-lg font-bold">📖 Học từ mới</h3>
            <p className="text-sm text-muted mt-1">Vuốt lên để khám phá từ vựng mới mỗi ngày</p>
            <div className="mt-3">
              <span className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-white">
                Bắt đầu
              </span>
            </div>
          </div>
          <span className="text-5xl">📚</span>
        </Link>

        {/* Review — spaced repetition */}
        <Link
          href="/review"
          className="w-full rounded-2xl bg-card p-5 flex items-center gap-4 hover:bg-card-hover transition-colors text-left cursor-pointer block"
        >
          <div className="flex-1">
            <h3 className="text-lg font-bold">🔄 Ôn tập</h3>
            <p className="text-sm text-muted mt-1">Ôn lại các từ đã học theo lịch trình</p>
          </div>
          <span className="text-4xl">🧠</span>
        </Link>

        {/* Shuffle card */}
        <button
          onClick={() => handleStart("shuffle")}
          className="w-full rounded-2xl bg-card p-5 flex items-center gap-4 hover:bg-card-hover transition-colors text-left cursor-pointer"
        >
          <div className="flex-1">
            <h3 className="text-lg font-bold">🎲 Trộn ngẫu nhiên</h3>
            <p className="text-sm text-muted mt-1">Tổng hợp tất cả trò chơi</p>
          </div>
          <span className="text-4xl">🎮</span>
        </button>

        {/* Game grid */}
        <div className="grid grid-cols-2 gap-3">
          {games.filter((g) => g.key !== "shuffle").map((game) => (
            <button
              key={game.key}
              onClick={() => handleStart(game.key)}
              className="flex flex-col rounded-2xl bg-card border border-border shadow-sm p-4 hover:bg-card-hover transition-colors text-left cursor-pointer"
            >
              <span className="text-3xl mb-3">{game.emoji}</span>
              <span className="font-medium text-sm">{game.name}</span>
              <span className="text-xs text-muted mt-0.5">{game.desc}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Loading
  if (gameWords.isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="animate-pulse text-muted">Đang tải...</div>
      </div>
    );
  }

  // Error
  if (gameWords.error || !gameWords.data) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <p className="text-danger">Không thể tải dữ liệu.</p>
        <button onClick={handleBack} className="mt-4 rounded-full bg-card px-6 py-2.5 text-sm cursor-pointer">
          Quay lại
        </button>
      </div>
    );
  }

  // Completed screen
  if (completed) {
    const percent = Math.round((completed.score / completed.total) * 100);
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <div className="text-6xl mb-6">{percent >= 80 ? "🏆" : percent >= 50 ? "👍" : "💪"}</div>
        <h2 className="text-3xl font-bold">{percent}%</h2>
        <p className="text-muted mt-2">
          {completed.score} / {completed.total} câu đúng
        </p>
        <div className="flex gap-3 mt-8">
          <button
            onClick={() => handleStart(activeGame)}
            className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-hover transition-colors cursor-pointer"
          >
            Chơi lại
          </button>
          <button
            onClick={handleBack}
            className="rounded-full bg-card px-6 py-2.5 text-sm font-medium text-foreground hover:bg-card-hover transition-colors cursor-pointer"
          >
            Chọn game khác
          </button>
        </div>
      </div>
    );
  }

  // Active game
  const { questions, distractors } = gameWords.data;
  const currentGame = activeGame === "shuffle" ? shuffleGame : activeGame;

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      {/* Back button */}
      <button
        onClick={handleBack}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-muted hover:text-foreground transition-colors cursor-pointer mb-4"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
          <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
        </svg>
      </button>

      {currentGame === "meaning" && (
        <MeaningMatch
          questions={questions}
          distractors={distractors}
          onResult={handleResult}
          onComplete={handleComplete}
        />
      )}
      {currentGame === "fill" && (
        <FillTheGap
          questions={questions}
          onResult={handleResult}
          onComplete={handleComplete}
        />
      )}
      {currentGame === "guess" && (
        <GuessTheWord
          questions={questions}
          distractors={distractors}
          onResult={handleResult}
          onComplete={handleComplete}
        />
      )}
      {currentGame === "match" && (
        <MatchSynonyms
          questions={questions}
          onResult={handleResult}
          onComplete={handleComplete}
        />
      )}
    </div>
  );
}
