"use client";

import { ThemeProvider } from "next-themes";
import { THEMES } from "@/lib/themes";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      // Both a class (for Tailwind's dark variant, which also matches the
      // night theme) and data-theme (for token blocks in globals.css).
      attribute={["class", "data-theme"]}
      themes={[...THEMES]}
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
