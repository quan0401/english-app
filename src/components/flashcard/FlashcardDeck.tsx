"use client";

import { useState } from "react";
import { FlashcardItem } from "./FlashcardItem";

interface Word {
  id: string;
  word: string;
  phonetic: string | null;
  partOfSpeech: string;
  cefrLevel: string;
  definitionEn: string;
  translationVi: string;
  exampleSentence: string;
}

interface FlashcardDeckProps {
  words: Word[];
  onWordResult: (wordId: string, known: boolean) => void;
  onComplete: () => void;
}

export function FlashcardDeck({ words, onWordResult, onComplete }: FlashcardDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleResult = (known: boolean) => {
    const word = words[currentIndex];
    onWordResult(word.id, known);

    if (currentIndex + 1 < words.length) {
      setCurrentIndex((i) => i + 1);
    } else {
      onComplete();
    }
  };

  if (words.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted text-lg">Không có từ mới nào hôm nay.</p>
        <p className="text-muted text-sm mt-1">Hãy ôn tập các từ đã học!</p>
      </div>
    );
  }

  const currentWord = words[currentIndex];
  const progress = ((currentIndex) / words.length) * 100;

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-sm text-muted">
          <span>{currentIndex + 1} / {words.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 rounded-full bg-card overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <FlashcardItem
        key={currentWord.id}
        word={currentWord.word}
        phonetic={currentWord.phonetic}
        partOfSpeech={currentWord.partOfSpeech}
        cefrLevel={currentWord.cefrLevel}
        definitionEn={currentWord.definitionEn}
        translationVi={currentWord.translationVi}
        exampleSentence={currentWord.exampleSentence}
        onResult={handleResult}
      />
    </div>
  );
}
