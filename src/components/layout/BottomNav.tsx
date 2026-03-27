"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();

  const isBrowse = pathname.startsWith("/browse");
  const isPractice = pathname.startsWith("/learn") || pathname.startsWith("/review") || pathname.startsWith("/practice");
  const isStats = pathname.startsWith("/stats") || pathname.startsWith("/settings");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/90 backdrop-blur-lg safe-area-bottom">
      <div className="mx-auto flex max-w-lg items-center justify-around py-2 px-6">
        {/* Browse */}
        <Link
          href="/browse"
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-full transition-colors",
            isBrowse ? "bg-card-hover text-primary" : "text-muted hover:text-foreground"
          )}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
            <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" opacity={isBrowse ? 1 : 0.7} />
          </svg>
        </Link>

        {/* Practice — center pill */}
        <Link
          href="/practice"
          className={cn(
            "flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium transition-colors",
            isPractice
              ? "bg-primary text-background"
              : "bg-card text-foreground hover:bg-card-hover"
          )}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d="M11.7 2.805a.75.75 0 01.6 0A60.65 60.65 0 0122.83 8.72a.75.75 0 01-.231 1.337 49.949 49.949 0 00-9.902 3.912l-.003.002-.34.18a.75.75 0 01-.707 0A50.009 50.009 0 007.5 12.174v-.224c0-.131.067-.248.172-.311a54.614 54.614 0 014.653-2.52.75.75 0 00-.65-1.352 56.129 56.129 0 00-4.78 2.589 1.858 1.858 0 00-.859 1.228 49.803 49.803 0 00-4.634-1.527.75.75 0 01-.231-1.337A60.653 60.653 0 0111.7 2.805z" />
            <path d="M13.06 15.473a48.45 48.45 0 017.666-3.282c.134 1.414.22 2.843.255 4.285a.75.75 0 01-.46.71 47.878 47.878 0 00-8.105 4.342.75.75 0 01-.832 0 47.877 47.877 0 00-8.104-4.342.75.75 0 01-.461-.71c.035-1.442.121-2.87.255-4.286A48.4 48.4 0 016 13.18v1.27a1.5 1.5 0 00-.14 2.508c-.09.38-.222.753-.397 1.11.452.213.901.434 1.346.661a6.729 6.729 0 00.551-1.608 1.5 1.5 0 00.14-2.67v-.645a48.549 48.549 0 013.44 1.668 2.25 2.25 0 002.12 0z" />
            <path d="M4.462 19.462c.42-.419.753-.89 1-1.394.453.213.902.434 1.347.661a6.743 6.743 0 01-1.286 1.794.75.75 0 11-1.06-1.06z" />
          </svg>
          Luyện tập
        </Link>

        {/* Stats */}
        <Link
          href="/stats"
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-full transition-colors",
            isStats ? "bg-card-hover text-primary" : "text-muted hover:text-foreground"
          )}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
            <path d="M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.036-.84-1.875-1.875-1.875h-.75zM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.75a1.875 1.875 0 01-1.875-1.875V8.625zM3 13.125c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v6.75c0 1.035-.84 1.875-1.875 1.875h-.75A1.875 1.875 0 013 19.875v-6.75z" />
          </svg>
        </Link>
      </div>
    </nav>
  );
}
