"use client";

import { trpc } from "@/lib/trpc/client";
import { useQueryClient } from "@tanstack/react-query";
import { useTTS } from "./useTTS";

/**
 * Shared hook for word actions: favorite, save, pronounce.
 * Uses optimistic updates for instant UI feedback.
 */
export function useWordActions(wordId: string) {
  const queryClient = useQueryClient();
  const { speak, isSpeaking } = useTTS();
  const utils = trpc.useUtils();

  const status = trpc.favorites.getStatus.useQuery({ wordId });

  const toggleFavorite = trpc.favorites.toggleFavorite.useMutation({
    onMutate: async () => {
      // Cancel outgoing refetches
      await utils.favorites.getStatus.cancel({ wordId });

      // Snapshot previous value
      const previous = utils.favorites.getStatus.getData({ wordId });

      // Optimistic update
      utils.favorites.getStatus.setData({ wordId }, (old) =>
        old ? { ...old, isFavorited: !old.isFavorited } : old
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previous) {
        utils.favorites.getStatus.setData({ wordId }, context.previous);
      }
    },
    onSettled: () => {
      // Refetch to sync with server
      utils.favorites.getStatus.invalidate({ wordId });
    },
  });

  const toggleSaved = trpc.favorites.toggleSaved.useMutation({
    onMutate: async () => {
      await utils.favorites.getStatus.cancel({ wordId });
      const previous = utils.favorites.getStatus.getData({ wordId });

      utils.favorites.getStatus.setData({ wordId }, (old) =>
        old ? { ...old, isSaved: !old.isSaved } : old
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        utils.favorites.getStatus.setData({ wordId }, context.previous);
      }
    },
    onSettled: () => {
      utils.favorites.getStatus.invalidate({ wordId });
    },
  });

  return {
    isFavorited: status.data?.isFavorited ?? false,
    isSaved: status.data?.isSaved ?? false,
    isLoading: status.isLoading,
    toggleFavorite: () => toggleFavorite.mutate({ wordId }),
    toggleSaved: () => toggleSaved.mutate({ wordId }),
    isFavoriting: toggleFavorite.isPending,
    isSaving: toggleSaved.isPending,
    speak: (word: string) => speak(word),
    isSpeaking,
  };
}
