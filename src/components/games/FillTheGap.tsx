"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface Word {
  id: string;
  word: string;
  definitionEn: string;
  exampleSentence: string;
  translationVi: string;
}

interface FillTheGapProps {
  questions: Word[];
  onResult: (wordId: string, correct: boolean) => void;
  onComplete: (score: number, total: number) => void;
}

function maskWord(sentence: string, word: string): string {
  const regex = new RegExp(`\\b${word}\\b`, "gi");
  return sentence.replace(regex, "_____");
}

export function FillTheGap({ questions, onResult, onComplete }: FillTheGapProps) {
  const [current, setCurrent] = useState(0);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [score, setScore] = useState(0);

  const question = questions[current];
  const masked = maskWord(question.exampleSentence, question.word);

  const handleSubmit = () => {
    if (!input.trim() || result) return;

    const isCorrect = input.trim().toLowerCase() === question.word.toLowerCase();
    setResult(isCorrect ? "correct" : "wrong");
    onResult(question.id, isCorrect);
    if (isCorrect) setScore((s) => s + 1);

    setTimeout(() => {
      if (current + 1 < questions.length) {
        setCurrent((c) => c + 1);
        setInput("");
        setResult(null);
      } else {
        onComplete(score + (isCorrect ? 1 : 0), questions.length);
      }
    }, 1200);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-sm text-muted mb-2">{current + 1} / {questions.length}</p>
        <p className="text-muted text-sm">Điền từ còn thiếu</p>
      </div>

      {/* Sentence with gap */}
      <div className="rounded-2xl bg-card p-6">
        <p className="text-lg leading-relaxed">{masked}</p>
        <p className="text-sm text-muted mt-3">({question.definitionEn})</p>
      </div>

      {/* Input */}
      <div className="space-y-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Nhập từ..."
          autoFocus
          disabled={!!result}
          className={cn(
            "w-full rounded-xl px-4 py-3 text-center text-lg font-medium border-2 transition-colors focus:outline-none",
            !result && "bg-card border-border focus:border-primary",
            result === "correct" && "bg-success/10 border-success text-success",
            result === "wrong" && "bg-danger/10 border-danger text-danger"
          )}
        />

        {result === "wrong" && (
          <p className="text-center text-sm">
            Đáp án: <span className="text-primary font-bold">{question.word}</span>
          </p>
        )}

        {!result && (
          <button
            onClick={handleSubmit}
            disabled={!input.trim()}
            className="w-full rounded-xl bg-primary py-3 text-sm font-medium text-white hover:bg-primary-hover transition-colors disabled:opacity-50 cursor-pointer"
          >
            Kiểm tra
          </button>
        )}
      </div>
    </div>
  );
}
