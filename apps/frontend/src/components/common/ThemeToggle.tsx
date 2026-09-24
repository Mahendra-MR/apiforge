import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "../../store/useThemeStore";
import { Button } from "./Button";

export function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <Button variant="ghost" size="sm" onClick={toggleTheme} aria-label="Toggle color theme">
      {theme === "dark" ? <Moon size={14} /> : <Sun size={14} />}
      {theme === "dark" ? "Dark" : "Light"}
    </Button>
  );
}
