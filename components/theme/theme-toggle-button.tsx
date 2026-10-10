// components/theme/theme-toggle-button.tsx
"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

export function ThemeToggleButton() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  const currentTheme = theme === "system" ? systemTheme : theme;

  return (
    <AnimatedThemeToggler
      variant="circle"
      theme={currentTheme as "light" | "dark"}
      onThemeChange={(newTheme) => setTheme(newTheme)}
      className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    />
  );
}
