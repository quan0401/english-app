"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

interface Word {
  id: string;
  word: string;
  definitionEn: string;
  translationVi: string;
}

interface GuessTheWordProps {
  questions: Word[];
  distractors: Word[];
  onResult: (wordId: string, correct: boolean) => void;
  onComplete: (score: number, total: number) => void;
}

export function GuessTheWord({ questions, distractors, onResult, onComplete }: GuessTheWordProps) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  const question = questions[current];

  // 4 word choices: 1 correct + 3 wrong
  const choices = useMemo(() => {
    const wrong = distractors
      .filter((d) => d.id !== question.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    return [
      { id: question.id, word: question.word, correct: true },
      ...wrong.map((w) => ({ id: w.id, word: w.word, correct: false })),
    ].sort(() => Math.random() - 0.5);
  }, [current, question.id]);

  const handleSelect = (choiceId: string, correct: boolean) => {
    if (selected) return;
    setSelected(choiceId);
    onResult(question.id, correct);
    if (correct) setScore((s) => s + 1);

    setTimeout(() => {
      if (current + 1 < questions.length) {
        setCurrent((c) => c + 1);
        setSelected(null);
      } else {
        onComplete(score + (correct ? 1 : 0), questions.length);
      }
    }, 800);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-sm text-muted mb-2">{current + 1} / {questions.length}</p>
        <p className="text-muted text-sm">Đoán từ theo nghĩa</p>
      </div>

      {/* Definition */}
      <div className="rounded-2xl bg-card p-6 text-center">
        <p className="text-lg">{question.definitionEn}</p>
        <p className="text-primary text-sm mt-2">{question.translationVi}</p>
      </div>

      {/* Word choices */}
      <div className="grid grid-cols-2 gap-3">
        {choices.map((choice) => {
          const isSelected = selected === choice.id;
          const showResult = selected !== null;

          return (
            <button
              key={choice.id}
              onClick={() => handleSelect(choice.id, choice.correct)}
              disabled={!!selected}
              className={cn(
                "rounded-2xl p-4 text-center text-lg font-bold transition-all cursor-pointer",
                !showResult && "bg-card hover:bg-card-hover",
                showResult && choice.correct && "bg-success/20 border border-success",
                showResult && isSelected && !choice.correct && "bg-danger/20 border border-danger",
                showResult && !isSelected && !choice.correct && "bg-card opacity-50"
              )}
            >
              {choice.word}
            </button>
          );
        })}
      </div>
    </div>
  );
}
