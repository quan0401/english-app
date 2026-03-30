"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { WordCard } from "@/components/word/WordCard";
import { WordListItem } from "@/components/word/WordListItem";
import { ViewToggle } from "@/components/layout/ViewToggle";
import { ListEditModal } from "@/components/word/ListEditModal";
import { cn } from "@/lib/utils";

const levels = ["A1", "A2", "B1", "B2", "C1"] as const;
type Tab = "discover" | "topics" | "lists";

export default function BrowsePage() {
  const [tab, setTab] = useState<Tab>("discover");
  const [search, setSearch] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<(typeof levels)[number]>("A1");
  const [selectedPOS, setSelectedPOS] = useState<"PHRASAL_VERB" | "IDIOM" | null>(null);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"card" | "list">("list");
  const [showEditList, setShowEditList] = useState(false);

  // Queries
  const topicsQuery = trpc.word.getTopics.useQuery();
  const userListsQuery = trpc.wordLists.getAll.useQuery();
  const topicProgressQuery = trpc.progress.getTopicProgress.useQuery();
  const searchQuery = trpc.word.search.useQuery({ query: search }, { enabled: search.length > 0 });
  const byLevelQuery = trpc.word.getByLevel.useQuery(
    { level: selectedLevel, page },
    { enabled: tab === "discover" && !search && !selectedPOS, placeholderData: (prev) => prev }
  );
  const byTopicQuery = trpc.word.getByTopic.useQuery(
    { topicId: selectedTopic!, page },
    { enabled: !!selectedTopic, placeholderData: (prev) => prev }
  );
  const posQuery = trpc.word.getByPartOfSpeech.useQuery(
    { partOfSpeech: selectedPOS!, page },
    { enabled: !!selectedPOS, placeholderData: (prev: any) => prev }
  );
  const favoritesQuery = trpc.favorites.getFavorites.useQuery(
    { page },
    { enabled: selectedList === "__favorites" }
  );
  const listWordsQuery = trpc.wordLists.getWords.useQuery(
    { listId: selectedList!, page },
    { enabled: !!selectedList && selectedList !== "__favorites", placeholderData: (prev: any) => prev }
  );

  const isSearching = search.length > 0;

  const resetSub = () => {
    setSelectedTopic(null);
    setSelectedList(null);
    setSelectedPOS(null);
    setPage(1);
  };

  const getActiveData = () => {
    if (isSearching) return { words: searchQuery.data ?? [], total: searchQuery.data?.length ?? 0, totalPages: 1, loading: searchQuery.isLoading };
    if (selectedTopic) return { ...(byTopicQuery.data ?? { words: [], total: 0, totalPages: 1 }), loading: byTopicQuery.isLoading };
    if (selectedPOS) return { ...(posQuery.data ?? { words: [], total: 0, totalPages: 1 }), loading: posQuery.isLoading };
    if (selectedList === "__favorites") return { ...(favoritesQuery.data ?? { words: [], total: 0, totalPages: 1 }), loading: favoritesQuery.isLoading };
    if (selectedList) return { ...(listWordsQuery.data ?? { words: [], total: 0, totalPages: 1 }), loading: listWordsQuery.isLoading };
    return { ...(byLevelQuery.data ?? { words: [], total: 0, totalPages: 1 }), loading: byLevelQuery.isLoading };
  };

  const getPageNumbers = (tp: number): (number | "...")[] => {
    if (tp <= 7) return Array.from({ length: tp }, (_, i) => i + 1);
    const pages: (number | "...")[] = [1];
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(tp - 1, page + 1); i++) pages.push(i);
    if (page < tp - 2) pages.push("...");
    pages.push(tp);
    return pages;
  };

  // ─── Sub-view: Topic / POS / List word list ───────────
  const isSubView = selectedTopic || selectedPOS || selectedList;

  if (isSubView && !isSearching) {
    const data = getActiveData();
    const title = selectedTopic
      ? topicsQuery.data?.find((t) => t.id === selectedTopic)?.nameVi ?? "Chủ đề"
      : selectedPOS === "PHRASAL_VERB" ? "Cụm động từ"
      : selectedPOS === "IDIOM" ? "Thành ngữ"
      : selectedList === "__favorites" ? "Yêu thích"
      : userListsQuery.data?.find((l) => l.id === selectedList)?.name ?? "Danh sách";

    return (
      <div className="mx-auto max-w-lg px-4 py-6 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={resetSub} className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-muted hover:text-foreground transition-colors cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" /></svg>
          </button>
          <h1 className="text-2xl font-bold flex-1">{title}</h1>
          {selectedList && selectedList !== "__favorites" && (
            <button onClick={() => setShowEditList(true)} className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-muted hover:text-foreground transition-colors cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
            </button>
          )}
          <ViewToggle viewMode={viewMode} onChange={setViewMode} />
        </div>

        {showEditList && selectedList && selectedList !== "__favorites" && (
          <ListEditModal
            listId={selectedList}
            currentName={title}
            currentIcon={userListsQuery.data?.find((l) => l.id === selectedList)?.icon ?? "📚"}
            onClose={() => setShowEditList(false)}
            onDeleted={() => { setShowEditList(false); resetSub(); }}
          />
        )}

        <WordListView data={data} viewMode={viewMode} page={page} setPage={setPage} getPageNumbers={getPageNumbers} />
      </div>
    );
  }

  // ─── Main browse home ─────────────────────────────────
  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-5">
      <h1 className="text-3xl font-bold">Khám phá</h1>

      {/* Search */}
      <div className="relative">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-muted absolute left-3 top-1/2 -translate-y-1/2">
          <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
        </svg>
        <input
          type="text"
          placeholder="Tìm kiếm từ..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full rounded-full bg-card pl-10 pr-4 py-3 text-foreground placeholder:text-muted border border-border focus:border-primary focus:outline-none transition-colors"
        />
      </div>

      {/* Search results */}
      {isSearching && (
        <WordListView data={getActiveData()} viewMode={viewMode} page={page} setPage={setPage} getPageNumbers={getPageNumbers} />
      )}

      {/* Tabs */}
      {!isSearching && (
        <>
          <div className="flex gap-1 rounded-full bg-card p-1">
            {([
              { key: "discover" as Tab, label: "Khám phá" },
              { key: "topics" as Tab, label: "Chủ đề" },
              { key: "lists" as Tab, label: "Của tôi" },
            ]).map((t) => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); resetSub(); }}
                className={cn(
                  "flex-1 rounded-full py-2 text-sm font-medium transition-colors cursor-pointer",
                  tab === t.key ? "bg-primary text-white" : "text-muted hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Discover tab ── */}
          {tab === "discover" && (
            <div className="space-y-5">
              {/* CEFR + special horizontal pills */}
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
                {levels.map((level) => (
                  <button
                    key={level}
                    onClick={() => { setSelectedLevel(level); setSelectedPOS(null); setPage(1); }}
                    className={cn(
                      "shrink-0 rounded-full px-5 py-2 text-sm font-medium transition-colors cursor-pointer",
                      selectedLevel === level && !selectedPOS ? "bg-primary text-white" : "bg-card text-muted hover:text-foreground"
                    )}
                  >
                    {level}
                  </button>
                ))}
                <button
                  onClick={() => { setSelectedPOS("PHRASAL_VERB"); setPage(1); }}
                  className={cn(
                    "shrink-0 rounded-full px-5 py-2 text-sm font-medium transition-colors cursor-pointer",
                    selectedPOS === "PHRASAL_VERB" ? "bg-primary text-white" : "bg-card text-muted hover:text-foreground"
                  )}
                >
                  Phrasal Verbs
                </button>
                <button
                  onClick={() => { setSelectedPOS("IDIOM"); setPage(1); }}
                  className={cn(
                    "shrink-0 rounded-full px-5 py-2 text-sm font-medium transition-colors cursor-pointer",
                    selectedPOS === "IDIOM" ? "bg-primary text-white" : "bg-card text-muted hover:text-foreground"
                  )}
                >
                  Idioms
                </button>
              </div>

              {/* Word count + view toggle */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted">{getActiveData().total} từ</p>
                <ViewToggle viewMode={viewMode} onChange={setViewMode} />
              </div>

              <WordListView data={getActiveData()} viewMode={viewMode} page={page} setPage={setPage} getPageNumbers={getPageNumbers} />
            </div>
          )}

          {/* ── Topics tab ── */}
          {tab === "topics" && (
            <div className="space-y-3">
              {topicsQuery.isLoading && (
                <div className="grid grid-cols-2 gap-3">
                  {[...Array(6)].map((_, i) => <div key={i} className="animate-pulse rounded-2xl bg-card h-20" />)}
                </div>
              )}
              {topicsQuery.data && (
                <div className="grid grid-cols-2 gap-3">
                  {topicsQuery.data.map((topic) => {
                    const tp = topicProgressQuery.data?.find((p) => p.topicId === topic.id);
                    const pct = tp && tp.totalWords > 0 ? Math.round((tp.mastered / tp.totalWords) * 100) : 0;
                    return (
                      <button
                        key={topic.id}
                        onClick={() => setSelectedTopic(topic.id)}
                        className="flex items-start gap-3 rounded-2xl bg-card border border-border p-4 hover:bg-card-hover transition-colors text-left relative overflow-hidden cursor-pointer"
                      >
                        {pct > 0 && <div className="absolute bottom-0 left-0 h-1 bg-primary/40" style={{ width: `${pct}%` }} />}
                        <span className="text-2xl shrink-0">{topic.icon || "📖"}</span>
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{topic.nameVi || topic.name}</div>
                          <div className="text-xs text-muted">{topic._count.words} từ{pct > 0 && <span className="text-primary ml-1">{pct}%</span>}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── My Lists tab ── */}
          {tab === "lists" && (
            <div className="space-y-3">
              <button
                onClick={() => setSelectedList("__favorites")}
                className="flex items-center gap-3 w-full rounded-2xl bg-card p-4 hover:bg-card-hover transition-colors text-left cursor-pointer"
              >
                <span className="text-2xl">❤️</span>
                <div className="flex-1">
                  <div className="font-medium text-sm">Yêu thích</div>
                  <div className="text-xs text-muted">Từ đã thích</div>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-muted"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
              </button>

              {userListsQuery.data?.map((list) => (
                <button
                  key={list.id}
                  onClick={() => setSelectedList(list.id)}
                  className="flex items-center gap-3 w-full rounded-2xl bg-card p-4 hover:bg-card-hover transition-colors text-left cursor-pointer"
                >
                  <span className="text-2xl">{list.icon || "📚"}</span>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{list.name}</div>
                    <div className="text-xs text-muted">{list._count.items} từ</div>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-muted"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
                </button>
              ))}

              {userListsQuery.data?.length === 0 && (
                <p className="text-center text-muted py-4 text-sm">Chưa có danh sách nào.</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Shared word list + pagination component ────────────

function WordListView({
  data,
  viewMode,
  page,
  setPage,
  getPageNumbers,
}: {
  data: { words: any[]; total: number; totalPages: number; loading: boolean };
  viewMode: "card" | "list";
  page: number;
  setPage: (p: number | ((p: number) => number)) => void;
  getPageNumbers: (tp: number) => (number | "...")[];
}) {
  if (data.loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className={cn("animate-pulse rounded-2xl bg-card", viewMode === "card" ? "h-28" : "h-14")} />
        ))}
      </div>
    );
  }

  if (data.words.length === 0) {
    return <p className="text-center text-muted py-8 text-sm">Không có từ nào.</p>;
  }

  return (
    <div className="space-y-3">
      <div className={viewMode === "card" ? "space-y-3" : "space-y-1.5"}>
        {viewMode === "card"
          ? data.words.map((w: any) => <WordCard key={w.id} id={w.id} word={w.word} phonetic={w.phonetic} partOfSpeech={w.partOfSpeech} cefrLevel={w.cefrLevel} definitionEn={w.definitionEn} translationVi={w.translationVi} exampleSentence={w.exampleSentence} />)
          : data.words.map((w: any) => <WordListItem key={w.id} id={w.id} word={w.word} phonetic={w.phonetic} partOfSpeech={w.partOfSpeech} definitionEn={w.definitionEn} translationVi={w.translationVi} />)
        }
      </div>

      {data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 pt-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-card-hover transition-colors disabled:opacity-30 cursor-pointer">&lt;</button>
          {getPageNumbers(data.totalPages).map((p, i) =>
            p === "..." ? <span key={`d${i}`} className="px-2 text-sm text-muted">...</span> : (
              <button key={p} onClick={() => setPage(p)} className={cn("min-w-[36px] rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer", page === p ? "bg-primary text-white" : "text-muted hover:bg-card-hover")}>{p}</button>
            )
          )}
          <button onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages} className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-card-hover transition-colors disabled:opacity-30 cursor-pointer">&gt;</button>
        </div>
      )}
    </div>
  );
}
