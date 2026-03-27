"use client";

import { useState } from "react";
import { SearchBar } from "./SearchBar";

export function AppHeader() {
  const [showSearch, setShowSearch] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowSearch(true)}
        className="fixed top-4 right-4 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-card/80 backdrop-blur text-muted hover:text-foreground transition-colors cursor-pointer"
        aria-label="Search"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
          <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
        </svg>
      </button>

      {showSearch && <SearchBar onClose={() => setShowSearch(false)} />}
    </>
  );
}
