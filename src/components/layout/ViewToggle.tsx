"use client";

import { cn } from "@/lib/utils";

interface ViewToggleProps {
  viewMode: "card" | "list";
  onChange: (mode: "card" | "list") => void;
}

export function ViewToggle({ viewMode, onChange }: ViewToggleProps) {
  return (
    <div className="flex rounded-lg bg-card overflow-hidden border border-border">
      <button
        onClick={() => onChange("card")}
        className={cn(
          "px-3 py-1.5 text-sm transition-colors",
          viewMode === "card" ? "bg-primary text-white" : "text-muted hover:text-foreground"
        )}
        aria-label="Card view"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path d="M2 4.5A2.5 2.5 0 014.5 2h11a2.5 2.5 0 010 5h-11A2.5 2.5 0 012 4.5zM2.75 9.083a.75.75 0 000 1.5h14.5a.75.75 0 000-1.5H2.75zM2.75 12.663a.75.75 0 000 1.5h14.5a.75.75 0 000-1.5H2.75zM2.75 16.25a.75.75 0 000 1.5h14.5a.75.75 0 000-1.5H2.75z" />
        </svg>
      </button>
      <button
        onClick={() => onChange("list")}
        className={cn(
          "px-3 py-1.5 text-sm transition-colors",
          viewMode === "list" ? "bg-primary text-white" : "text-muted hover:text-foreground"
        )}
        aria-label="List view"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path fillRule="evenodd" d="M2 3.75A.75.75 0 012.75 3h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 3.75zm0 4.167a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zm0 4.166a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zm0 4.167a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
}
