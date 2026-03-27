"use client";

import { useTTS } from "@/hooks/useTTS";
import Link from "next/link";

interface WordCardProps {
  id?: string;
  word: string;
  phonetic: string | null;
  partOfSpeech: string;
  cefrLevel: string;
  definitionEn: string;
  translationVi: string;
  exampleSentence: string;
}

const posLabels: Record<string, string> = {
  NOUN: "n.", VERB: "v.", ADJECTIVE: "adj.", ADVERB: "adv.",
  PREPOSITION: "prep.", CONJUNCTION: "conj.", PRONOUN: "pron.",
  INTERJECTION: "interj.", DETERMINER: "det.",
  PHRASAL_VERB: "phr.v.", IDIOM: "idiom",
};

export function WordCard({
  id, word, phonetic, partOfSpeech, definitionEn, translationVi, exampleSentence,
}: WordCardProps) {
  const { speak, isSpeaking } = useTTS();

  const Wrapper = id ? Link : "div";
  const wrapperProps = id ? { href: `/browse/${id}` } : {};

  return (
    <div className="rounded-2xl bg-card p-5 space-y-2">
      {/* Word + phonetic pill */}
      <div className="flex items-center gap-2 flex-wrap">
        {id ? (
          <Link href={`/browse/${id}`} className="text-xl font-bold hover:text-primary transition-colors">{word}</Link>
        ) : (
          <span className="text-xl font-bold">{word}</span>
        )}
        {phonetic && (
          <button
            onClick={() => speak(word)}
            className="inline-flex items-center gap-1 rounded-full bg-card-hover px-2.5 py-1 text-xs text-muted hover:text-foreground transition-colors"
          >
            {phonetic}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
              <path d="M10.5 3.75a.75.75 0 00-1.264-.546L5.203 7H2.667a.75.75 0 00-.7.48A6.985 6.985 0 001.5 10c0 .887.165 1.737.468 2.52.111.29.39.48.7.48h2.535l4.033 3.796A.75.75 0 0010.5 16.25V3.75zM14.325 4.317a.75.75 0 011.061-.02 8.479 8.479 0 010 11.406.75.75 0 11-1.06-1.06 6.979 6.979 0 000-9.265.75.75 0 01-.001-1.06z" />
            </svg>
          </button>
        )}
        {!phonetic && (
          <button
            onClick={() => speak(word)}
            className="inline-flex items-center justify-center rounded-full bg-card-hover h-7 w-7 text-muted hover:text-foreground transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
              <path d="M10.5 3.75a.75.75 0 00-1.264-.546L5.203 7H2.667a.75.75 0 00-.7.48A6.985 6.985 0 001.5 10c0 .887.165 1.737.468 2.52.111.29.39.48.7.48h2.535l4.033 3.796A.75.75 0 0010.5 16.25V3.75zM14.325 4.317a.75.75 0 011.061-.02 8.479 8.479 0 010 11.406.75.75 0 11-1.06-1.06 6.979 6.979 0 000-9.265.75.75 0 01-.001-1.06z" />
            </svg>
          </button>
        )}
      </div>

      {/* Definition */}
      <p className="text-foreground">
        <span className="text-muted">({posLabels[partOfSpeech] ?? partOfSpeech})</span> {definitionEn}
      </p>

      {/* Vietnamese */}
      <p className="text-primary font-medium">{translationVi}</p>

      {/* Example */}
      <p className="text-sm text-muted">({exampleSentence})</p>

      {/* Action icons */}
      <div className="flex items-center justify-end gap-3 pt-1">
        <button className="text-muted hover:text-primary transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        </button>
        <button className="text-muted hover:text-primary transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
          </svg>
        </button>
        <button className="text-muted hover:text-primary transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
