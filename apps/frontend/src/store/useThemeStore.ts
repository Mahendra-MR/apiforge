import { create } from "zustand";

type Theme = "light" | "dark";

const STORAGE_KEY = "apiforge.theme";

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // localStorage can throw in private-browsing contexts; fall through to system preference.
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  applyThemeClass: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: readStoredTheme(),
  toggleTheme: () => {
    const next: Theme = get().theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Non-fatal: theme just won't persist across reloads.
    }
    set({ theme: next });
    get().applyThemeClass();
  },
  applyThemeClass: () => {
    document.documentElement.classList.toggle("dark", get().theme === "dark");
  },
}));
