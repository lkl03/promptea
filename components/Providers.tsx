"use client";

import { ThemeProvider } from "next-themes";
import { THEMES } from "@/lib/themes";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      // Both a class (for Tailwind's dark variant, which matches metro) and
      // data-theme (for token blocks in globals.css).
      attribute={["class", "data-theme"]}
      themes={[...THEMES]}
      defaultTheme="system"
      enableSystem
      // System preference resolves to next-themes' internal "light"/"dark";
      // map those onto the v1.3.0 themes so `system` = Aqua by day, Metro by
      // night. Explicit picks (aqua/metro/classic) pass through unchanged.
      value={{ light: "aqua", dark: "metro", aqua: "aqua", metro: "metro", classic: "classic" }}
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
