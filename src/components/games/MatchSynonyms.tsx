"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

interface Word {
  id: string;
  word: string;
  translationVi: string;
}

interface MatchSynonymsProps {
  questions: Word[];
  onResult: (wordId: string, correct: boolean) => void;
  onComplete: (score: number, total: number) => void;
}

/**
 * Match English words with Vietnamese translations.
 * Shows 4 words on left, 4 translations on right (shuffled).
 * User taps a word, then taps its translation.
 */
export function MatchSynonyms({ questions, onResult, onComplete }: MatchSynonymsProps) {
  const batchSize = 4;
  const [batchIndex, setBatchIndex] = useState(0);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  const batch = useMemo(() => {
    const start = batchIndex * batchSize;
    return questions.slice(start, start + batchSize);
  }, [batchIndex, questions]);

  const shuffledTranslations = useMemo(
    () => [...batch].sort(() => Math.random() - 0.5),
    [batch]
  );

  const totalBatches = Math.ceil(questions.length / batchSize);

  const handleWordClick = (wordId: string) => {
    if (matched.has(wordId)) return;
    setSelectedWord(wordId);
    setWrong(null);
  };

  const handleTranslationClick = (wordId: string) => {
    if (!selectedWord || matched.has(wordId)) return;

    if (selectedWord === wordId) {
      // Correct match
      setMatched((prev) => new Set(prev).add(wordId));
      setScore((s) => s + 1);
      onResult(wordId, true);
      setSelectedWord(null);

      // Check if batch complete
      if (matched.size + 1 >= batch.length) {
        setTimeout(() => {
          if (batchIndex + 1 < totalBatches) {
            setBatchIndex((b) => b + 1);
            setMatched(new Set());
          } else {
            onComplete(score + 1, questions.length);
          }
        }, 500);
      }
    } else {
      // Wrong match
      setWrong(wordId);
      onResult(selectedWord, false);
      setTimeout(() => {
        setWrong(null);
        setSelectedWord(null);
      }, 600);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-sm text-muted mb-2">
          Nhóm {batchIndex + 1} / {totalBatches}
        </p>
        <p className="text-muted text-sm">Nối từ với nghĩa tiếng Việt</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* English words — left column */}
        <div className="space-y-2">
          {batch.map((q) => (
            <button
              key={`w-${q.id}`}
              onClick={() => handleWordClick(q.id)}
              disabled={matched.has(q.id)}
              className={cn(
                "w-full rounded-xl p-3 text-sm font-semibold text-center transition-all cursor-pointer",
                matched.has(q.id) && "bg-success/20 text-success opacity-60",
                !matched.has(q.id) && selectedWord === q.id && "bg-primary/20 border border-primary",
                !matched.has(q.id) && selectedWord !== q.id && "bg-card hover:bg-card-hover"
              )}
            >
              {q.word}
            </button>
          ))}
        </div>

        {/* Vietnamese translations — right column */}
        <div className="space-y-2">
          {shuffledTranslations.map((q) => (
            <button
              key={`t-${q.id}`}
              onClick={() => handleTranslationClick(q.id)}
              disabled={matched.has(q.id)}
              className={cn(
                "w-full rounded-xl p-3 text-sm text-center transition-all cursor-pointer",
                matched.has(q.id) && "bg-success/20 text-success opacity-60",
                wrong === q.id && "bg-danger/20 border border-danger",
                !matched.has(q.id) && wrong !== q.id && "bg-card hover:bg-card-hover"
              )}
            >
              {q.translationVi}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
