"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

interface Word {
  id: string;
  word: string;
  definitionEn: string;
  translationVi: string;
}

interface MeaningMatchProps {
  questions: Word[];
  distractors: Word[];
  onResult: (wordId: string, correct: boolean) => void;
  onComplete: (score: number, total: number) => void;
}

export function MeaningMatch({ questions, distractors, onResult, onComplete }: MeaningMatchProps) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  const question = questions[current];

  // Build 4 choices: 1 correct + 3 random distractors
  const choices = useMemo(() => {
    const wrong = distractors
      .filter((d) => d.id !== question.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    const all = [
      { id: question.id, text: question.definitionEn, correct: true },
      ...wrong.map((w) => ({ id: w.id, text: w.definitionEn, correct: false })),
    ].sort(() => Math.random() - 0.5);
    return all;
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
        <h2 className="text-3xl font-bold">{question.word}</h2>
        <p className="text-primary text-sm mt-1">{question.translationVi}</p>
      </div>

      <p className="text-center text-muted text-sm">Chọn nghĩa đúng</p>

      <div className="space-y-3">
        {choices.map((choice) => {
          const isSelected = selected === choice.id;
          const showResult = selected !== null;

          return (
            <button
              key={choice.id}
              onClick={() => handleSelect(choice.id, choice.correct)}
              disabled={!!selected}
              className={cn(
                "w-full rounded-2xl p-4 text-left text-sm transition-all cursor-pointer",
                !showResult && "bg-card hover:bg-card-hover",
                showResult && choice.correct && "bg-success/20 border border-success",
                showResult && isSelected && !choice.correct && "bg-danger/20 border border-danger",
                showResult && !isSelected && !choice.correct && "bg-card opacity-50"
              )}
            >
              {choice.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
