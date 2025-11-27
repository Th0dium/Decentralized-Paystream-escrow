"use client";

import { useEffect } from "react";

export function DarkModeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Always apply dark mode by default
    document.documentElement.classList.add("dark");
  }, []);

  return <>{children}</>;
}
