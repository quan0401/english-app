"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { WordCard } from "@/components/word/WordCard";
import { WordListItem } from "@/components/word/WordListItem";
import { ViewToggle } from "@/components/layout/ViewToggle";
import { ListEditModal } from "@/components/word/ListEditModal";
import { cn } from "@/lib/utils";

const levels = ["A1", "A2", "B1", "B2", "C1"] as const;

export default function BrowsePage() {
  const [search, setSearch] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<(typeof levels)[number]>("A1");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [showEditList, setShowEditList] = useState(false);
  const [selectedPOS, setSelectedPOS] = useState<"PHRASAL_VERB" | "IDIOM" | null>(null);

  const posQuery = trpc.word.getByPartOfSpeech.useQuery(
    { partOfSpeech: selectedPOS!, page },
    { enabled: !!selectedPOS, placeholderData: (prev: any) => prev }
  );

  const topicsQuery = trpc.word.getTopics.useQuery();
  const userListsQuery = trpc.wordLists.getAll.useQuery();
  const topicProgressQuery = trpc.progress.getTopicProgress.useQuery();
  const favoritesQuery = trpc.favorites.getFavorites.useQuery(
    { page },
    { enabled: selectedList === "__favorites" }
  );
  const listWordsQuery = trpc.wordLists.getWords.useQuery(
    { listId: selectedList!, page },
    { enabled: !!selectedList && selectedList !== "__favorites", placeholderData: (prev: any) => prev }
  );

  const byTopicQuery = trpc.word.getByTopic.useQuery(
    { topicId: selectedTopic!, page },
    { enabled: !!selectedTopic, placeholderData: (prev) => prev }
  );

  const byLevelQuery = trpc.word.getByLevel.useQuery(
    { level: selectedLevel, page },
    { enabled: !selectedTopic && search.length === 0, placeholderData: (prev) => prev }
  );

  const searchQuery = trpc.word.search.useQuery(
    { query: search },
    { enabled: search.length > 0 }
  );

  const isSearching = search.length > 0;
  const isTopicView = !!selectedTopic && !isSearching;

  const wordsData = isSearching
    ? { words: searchQuery.data ?? [], total: searchQuery.data?.length ?? 0, totalPages: 1 }
    : isTopicView
    ? byTopicQuery.data ?? { words: [], total: 0, totalPages: 1 }
    : byLevelQuery.data ?? { words: [], total: 0, totalPages: 1 };

  const isLoading = isSearching ? searchQuery.isLoading : isTopicView ? byTopicQuery.isLoading : byLevelQuery.isLoading;

  const handleTopicSelect = (topicId: string) => {
    setSelectedTopic(topicId);
    setPage(1);
  };

  const handleBack = () => {
    setSelectedTopic(null);
    setPage(1);
  };

  const getPageNumbers = (): (number | "...")[] => {
    const tp = wordsData.totalPages;
    if (tp <= 7) return Array.from({ length: tp }, (_, i) => i + 1);
    const pages: (number | "...")[] = [1];
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(tp - 1, page + 1); i++) pages.push(i);
    if (page < tp - 2) pages.push("...");
    pages.push(tp);
    return pages;
  };

  // List view (favorites or custom list)
  if (selectedList && !isSearching) {
    const listData = selectedList === "__favorites"
      ? favoritesQuery.data
      : listWordsQuery.data;
    const listName = selectedList === "__favorites"
      ? "Yêu thích"
      : userListsQuery.data?.find((l) => l.id === selectedList)?.name ?? "Danh sách";
    const isListLoading = selectedList === "__favorites" ? favoritesQuery.isLoading : listWordsQuery.isLoading;

    return (
      <div className="mx-auto max-w-lg px-4 py-6 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => { setSelectedList(null); setPage(1); }} className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-muted hover:text-foreground transition-colors cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" /></svg>
          </button>
          <h1 className="text-2xl font-bold flex-1">{listName}</h1>
          {selectedList !== "__favorites" && (
            <button
              onClick={() => setShowEditList(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-muted hover:text-foreground transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
            </button>
          )}
          <ViewToggle viewMode={viewMode} onChange={setViewMode} />
        </div>

        {/* Edit list modal */}
        {showEditList && selectedList && selectedList !== "__favorites" && (
          <ListEditModal
            listId={selectedList}
            currentName={listName}
            currentIcon={userListsQuery.data?.find((l) => l.id === selectedList)?.icon ?? "📚"}
            onClose={() => setShowEditList(false)}
            onDeleted={() => { setShowEditList(false); setSelectedList(null); }}
          />
        )}

        {isListLoading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="animate-pulse rounded-2xl bg-card h-24" />)}
          </div>
        )}

        {listData && listData.words.length > 0 && (
          <div className={viewMode === "card" ? "space-y-3" : "space-y-2"}>
            <p className="text-sm text-muted">{listData.total} từ</p>
            {viewMode === "card"
              ? listData.words.map((w: any) => <WordCard key={w.id} id={w.id} word={w.word} phonetic={w.phonetic} partOfSpeech={w.partOfSpeech} cefrLevel={w.cefrLevel} definitionEn={w.definitionEn} translationVi={w.translationVi} exampleSentence={w.exampleSentence} />)
              : listData.words.map((w: any) => <WordListItem key={w.id} word={w.word} phonetic={w.phonetic} partOfSpeech={w.partOfSpeech} definitionEn={w.definitionEn} translationVi={w.translationVi} />)
            }
          </div>
        )}

        {listData && listData.words.length === 0 && (
          <p className="text-center text-muted py-8">Danh sách trống.</p>
        )}

        {listData && listData.totalPages > 1 && (
          <div className="flex items-center justify-center gap-1 pt-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-card-hover transition-colors disabled:opacity-30 cursor-pointer">&lt;</button>
            {getPageNumbers().map((p, i) =>
              p === "..." ? <span key={`d${i}`} className="px-2 text-sm text-muted">...</span> : (
                <button key={p} onClick={() => setPage(p)} className={cn("min-w-[36px] rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer", page === p ? "bg-primary text-background" : "text-muted hover:bg-card-hover")}>{p}</button>
              )
            )}
            <button onClick={() => setPage((p) => Math.min(listData.totalPages, p + 1))} disabled={page === listData.totalPages} className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-card-hover transition-colors disabled:opacity-30 cursor-pointer">&gt;</button>
          </div>
        )}
      </div>
    );
  }

  // Phrasal verbs / idioms view
  if (selectedPOS && !isSearching) {
    const posData = posQuery.data;
    const posName = selectedPOS === "PHRASAL_VERB" ? "Cụm động từ" : "Thành ngữ";

    return (
      <div className="mx-auto max-w-lg px-4 py-6 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => { setSelectedPOS(null); setPage(1); }} className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-muted hover:text-foreground transition-colors cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" /></svg>
          </button>
          <h1 className="text-2xl font-bold flex-1">{posName}</h1>
          <ViewToggle viewMode={viewMode} onChange={setViewMode} />
        </div>

        {posQuery.isLoading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="animate-pulse rounded-2xl bg-card h-24" />)}
          </div>
        )}

        {posData && posData.words.length > 0 && (
          <div className={viewMode === "card" ? "space-y-3" : "space-y-2"}>
            <p className="text-sm text-muted">{posData.total} từ</p>
            {viewMode === "card"
              ? posData.words.map((w: any) => <WordCard key={w.id} id={w.id} word={w.word} phonetic={w.phonetic} partOfSpeech={w.partOfSpeech} cefrLevel={w.cefrLevel} definitionEn={w.definitionEn} translationVi={w.translationVi} exampleSentence={w.exampleSentence} />)
              : posData.words.map((w: any) => <WordListItem key={w.id} word={w.word} phonetic={w.phonetic} partOfSpeech={w.partOfSpeech} definitionEn={w.definitionEn} translationVi={w.translationVi} />)
            }
          </div>
        )}

        {posData && posData.words.length === 0 && (
          <p className="text-center text-muted py-8">Chưa có dữ liệu. Hãy chạy: bun run scripts/crawl-idioms.ts</p>
        )}

        {posData && posData.totalPages > 1 && (
          <div className="flex items-center justify-center gap-1 pt-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-card-hover disabled:opacity-30 cursor-pointer">&lt;</button>
            {getPageNumbers().map((p, i) =>
              p === "..." ? <span key={`d${i}`} className="px-2 text-sm text-muted">...</span> : (
                <button key={p} onClick={() => setPage(p)} className={cn("min-w-[36px] rounded-lg px-3 py-2 text-sm font-medium cursor-pointer", page === p ? "bg-primary text-background" : "text-muted hover:bg-card-hover")}>{p}</button>
              )
            )}
            <button onClick={() => setPage((p) => Math.min(posData.totalPages, p + 1))} disabled={page === posData.totalPages} className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-card-hover disabled:opacity-30 cursor-pointer">&gt;</button>
          </div>
        )}
      </div>
    );
  }

  // Topic grid view (home)
  if (!selectedTopic && !isSearching) {
    return (
      <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
        <h1 className="text-3xl font-bold">Khám phá</h1>

        {/* Search */}
        <input
          type="text"
          placeholder="Tìm kiếm từ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl bg-card px-4 py-3 text-foreground placeholder:text-muted border border-border focus:border-primary focus:outline-none transition-colors"
        />

        {/* Quick access */}
        <div className="grid grid-cols-2 gap-3">
          {levels.map((level) => (
            <button
              key={level}
              onClick={() => { setSelectedLevel(level); setSelectedTopic(null); setPage(1); }}
              className="flex items-center gap-3 rounded-2xl bg-card p-4 hover:bg-card-hover transition-colors text-left"
            >
              <span className="text-2xl">
                {level === "A1" ? "🌱" : level === "A2" ? "🌿" : level === "B1" ? "🌳" : level === "B2" ? "🏔️" : "🚀"}
              </span>
              <div>
                <div className="font-semibold">{level}</div>
                <div className="text-xs text-muted">
                  {level === "A1" ? "Mới bắt đầu" : level === "A2" ? "Sơ cấp" : level === "B1" ? "Trung cấp" : level === "B2" ? "Trung cấp cao" : "Nâng cao"}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Phrasal Verbs & Idioms */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => { setSelectedPOS("PHRASAL_VERB"); setPage(1); }}
            className="flex items-center gap-3 rounded-2xl bg-card p-4 hover:bg-card-hover transition-colors text-left cursor-pointer"
          >
            <span className="text-2xl">🔗</span>
            <div>
              <div className="font-medium text-sm">Cụm động từ</div>
              <div className="text-xs text-muted">Phrasal verbs</div>
            </div>
          </button>
          <button
            onClick={() => { setSelectedPOS("IDIOM"); setPage(1); }}
            className="flex items-center gap-3 rounded-2xl bg-card p-4 hover:bg-card-hover transition-colors text-left cursor-pointer"
          >
            <span className="text-2xl">💬</span>
            <div>
              <div className="font-medium text-sm">Thành ngữ</div>
              <div className="text-xs text-muted">Idioms</div>
            </div>
          </button>
        </div>

        {/* My Lists */}
        {userListsQuery.data && (
          <>
            <h2 className="text-xl font-bold">Danh sách của tôi</h2>
            <div className="grid grid-cols-2 gap-3">
              {/* Favorites */}
              <button
                onClick={() => { setSelectedList("__favorites"); setPage(1); }}
                className="flex items-center gap-3 rounded-2xl bg-card p-4 hover:bg-card-hover transition-colors text-left cursor-pointer"
              >
                <span className="text-2xl">❤️</span>
                <div>
                  <div className="font-medium text-sm">Yêu thích</div>
                  <div className="text-xs text-muted">Từ đã thích</div>
                </div>
              </button>

              {/* User lists */}
              {userListsQuery.data.map((list) => (
                <button
                  key={list.id}
                  onClick={() => { setSelectedList(list.id); setPage(1); }}
                  className="flex items-center gap-3 rounded-2xl bg-card p-4 hover:bg-card-hover transition-colors text-left cursor-pointer"
                >
                  <span className="text-2xl">{list.icon || "📚"}</span>
                  <div>
                    <div className="font-medium text-sm">{list.name}</div>
                    <div className="text-xs text-muted">{list._count.items} từ</div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Topics grid */}
        {topicsQuery.data && topicsQuery.data.length > 0 && (
          <>
            <h2 className="text-xl font-bold">Chủ đề</h2>
            <div className="grid grid-cols-2 gap-3">
              {topicsQuery.data.map((topic) => {
                const tp = topicProgressQuery.data?.find((p) => p.topicId === topic.id);
                const progressPct = tp && tp.totalWords > 0 ? Math.round((tp.mastered / tp.totalWords) * 100) : 0;
                return (
                  <button
                    key={topic.id}
                    onClick={() => handleTopicSelect(topic.id)}
                    className="flex flex-col rounded-2xl bg-card p-4 hover:bg-card-hover transition-colors text-left relative overflow-hidden"
                  >
                    {/* Progress bar background */}
                    {progressPct > 0 && (
                      <div
                        className="absolute bottom-0 left-0 h-1 bg-primary/40 transition-all"
                        style={{ width: `${progressPct}%` }}
                      />
                    )}
                    <span className="text-3xl mb-2">{topic.icon || "📖"}</span>
                    <span className="font-medium text-sm">{topic.nameVi || topic.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted">{topic._count.words} từ</span>
                      {progressPct > 0 && (
                        <span className="text-xs text-primary font-medium">{progressPct}%</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {topicsQuery.isLoading && (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl bg-card h-24" />
            ))}
          </div>
        )}

        {/* Level word list below */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Từ vựng {selectedLevel}</h2>
            <ViewToggle viewMode={viewMode} onChange={setViewMode} />
          </div>

          {byLevelQuery.isLoading && (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse rounded-2xl bg-card h-24" />
              ))}
            </div>
          )}

          {wordsData.words.length > 0 && (
            <div className={viewMode === "card" ? "space-y-3" : "space-y-2"}>
              {viewMode === "card"
                ? wordsData.words.map((w: any) => (
                    <WordCard key={w.id} id={w.id} word={w.word} phonetic={w.phonetic} partOfSpeech={w.partOfSpeech} cefrLevel={w.cefrLevel} definitionEn={w.definitionEn} translationVi={w.translationVi} exampleSentence={w.exampleSentence} />
                  ))
                : wordsData.words.map((w: any) => (
                    <WordListItem key={w.id} word={w.word} phonetic={w.phonetic} partOfSpeech={w.partOfSpeech} definitionEn={w.definitionEn} translationVi={w.translationVi} />
                  ))
              }
            </div>
          )}

          {/* Pagination */}
          {wordsData.totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 pt-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-card-hover transition-colors disabled:opacity-30">&lt;</button>
              {getPageNumbers().map((p, i) =>
                p === "..." ? <span key={`d${i}`} className="px-2 text-sm text-muted">...</span> : (
                  <button key={p} onClick={() => setPage(p)} className={cn("min-w-[36px] rounded-lg px-3 py-2 text-sm font-medium transition-colors", page === p ? "bg-primary text-background" : "text-muted hover:bg-card-hover")}>{p}</button>
                )
              )}
              <button onClick={() => setPage((p) => Math.min(wordsData.totalPages, p + 1))} disabled={page === wordsData.totalPages} className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-card-hover transition-colors disabled:opacity-30">&gt;</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Search results or topic word list view
  const selectedTopicData = topicsQuery.data?.find((t) => t.id === selectedTopic);

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        {!isSearching && (
          <button onClick={handleBack} className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-muted hover:text-foreground transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" /></svg>
          </button>
        )}
        <h1 className="text-2xl font-bold flex-1">
          {isSearching ? `"${search}"` : selectedTopicData?.nameVi || selectedTopicData?.name || "Từ vựng"}
        </h1>
        <ViewToggle viewMode={viewMode} onChange={setViewMode} />
      </div>

      {/* Search bar */}
      <input
        type="text"
        placeholder="Tìm kiếm từ..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        className="w-full rounded-xl bg-card px-4 py-3 text-foreground placeholder:text-muted border border-border focus:border-primary focus:outline-none transition-colors"
      />

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className={cn("animate-pulse rounded-2xl bg-card", viewMode === "card" ? "h-32" : "h-16")} />
          ))}
        </div>
      )}

      {/* Word list */}
      {!isLoading && wordsData.words.length > 0 && (
        <div className={viewMode === "card" ? "space-y-3" : "space-y-2"}>
          <p className="text-sm text-muted">{wordsData.total} từ</p>
          {viewMode === "card"
            ? wordsData.words.map((w: any) => (
                <WordCard key={w.id} id={w.id} word={w.word} phonetic={w.phonetic} partOfSpeech={w.partOfSpeech} cefrLevel={w.cefrLevel} definitionEn={w.definitionEn} translationVi={w.translationVi} exampleSentence={w.exampleSentence} />
              ))
            : wordsData.words.map((w: any) => (
                <WordListItem key={w.id} word={w.word} phonetic={w.phonetic} partOfSpeech={w.partOfSpeech} definitionEn={w.definitionEn} translationVi={w.translationVi} />
              ))
          }
        </div>
      )}

      {!isLoading && wordsData.words.length === 0 && (
        <p className="text-center text-muted py-8">Không tìm thấy từ nào.</p>
      )}

      {/* Pagination */}
      {!isSearching && wordsData.totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 pt-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-card-hover transition-colors disabled:opacity-30">&lt;</button>
          {getPageNumbers().map((p, i) =>
            p === "..." ? <span key={`d${i}`} className="px-2 text-sm text-muted">...</span> : (
              <button key={p} onClick={() => setPage(p)} className={cn("min-w-[36px] rounded-lg px-3 py-2 text-sm font-medium transition-colors", page === p ? "bg-primary text-background" : "text-muted hover:bg-card-hover")}>{p}</button>
            )
          )}
          <button onClick={() => setPage((p) => Math.min(wordsData.totalPages, p + 1))} disabled={page === wordsData.totalPages} className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-card-hover transition-colors disabled:opacity-30">&gt;</button>
        </div>
      )}
    </div>
  );
}
