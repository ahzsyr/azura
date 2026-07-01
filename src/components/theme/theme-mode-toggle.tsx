"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { setThemeWithTransition, type ThemeMode } from "@/lib/theme/apply-theme-transition";
import { cn } from "@/lib/utils";

type Props = {
  size?: "sm" | "md";
  showLabels?: boolean;
  className?: string;
  onThemeChange?: (mode: "light" | "dark") => void;
};

const sizeStyles = {
  sm: {
    track: "h-7 w-12",
    thumb: "h-5 w-5",
    icon: "h-3 w-3",
    offset: 20,
  },
  md: {
    track: "h-8 w-14",
    thumb: "h-6 w-6",
    icon: "h-3.5 w-3.5",
    offset: 24,
  },
  mdLabeled: {
    track: "h-8 w-[4.5rem]",
    thumb: "h-6 w-6",
    icon: "h-3.5 w-3.5",
    offset: 38,
  },
};

export function ThemeModeToggle({ size = "md", showLabels = false, className, onThemeChange }: Props) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const reducedMotion = useReducedMotion();
  const styles = showLabels && size === "md" ? sizeStyles.mdLabeled : sizeStyles[size];
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggle = useCallback(() => {
    const next: ThemeMode = isDark ? "light" : "dark";
    setThemeWithTransition((theme) => setTheme(theme), next);
    onThemeChange?.(next);
  }, [isDark, setTheme, onThemeChange]);

  if (!mounted) {
    return (
      <div
        className={cn("rounded-full bg-muted", styles.track, className)}
        aria-hidden
      />
    );
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      }}
      className={cn(
        "relative inline-flex shrink-0 items-center rounded-full border border-border bg-muted/80 p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        styles.track,
        className,
      )}
    >
      {showLabels && (
        <>
          <span
            className={cn(
              "absolute left-2 text-[10px] font-medium transition-opacity",
              !isDark ? "opacity-100" : "opacity-40",
            )}
          >
            Light
          </span>
          <span
            className={cn(
              "absolute right-2 text-[10px] font-medium transition-opacity",
              isDark ? "opacity-100" : "opacity-40",
            )}
          >
            Dark
          </span>
        </>
      )}
      <motion.span
        layout={!reducedMotion}
        animate={{ x: isDark ? styles.offset : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 35 }}
        className={cn(
          "relative z-10 flex items-center justify-center rounded-full bg-background shadow-sm",
          styles.thumb,
        )}
      >
        <motion.span
          initial={false}
          animate={{
            opacity: isDark ? 0 : 1,
            rotate: isDark ? 90 : 0,
            scale: isDark ? 0.5 : 1,
          }}
          transition={{ duration: reducedMotion ? 0 : 0.2 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <Sun className={cn("text-amber-500", styles.icon)} />
        </motion.span>
        <motion.span
          initial={false}
          animate={{
            opacity: isDark ? 1 : 0,
            rotate: isDark ? 0 : -90,
            scale: isDark ? 1 : 0.5,
          }}
          transition={{ duration: reducedMotion ? 0 : 0.2 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <Moon className={cn("text-indigo-400", styles.icon)} />
        </motion.span>
      </motion.span>
    </button>
  );
}
