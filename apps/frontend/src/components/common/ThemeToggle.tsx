import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "../../store/useThemeStore";
import { Button } from "./Button";

export function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();
  const switchingToDark = theme === "light";

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      aria-label={switchingToDark ? "Switch to dark theme" : "Switch to light theme"}
      title={switchingToDark ? "Switch to dark theme" : "Switch to light theme"}
    >
      {switchingToDark ? <Moon size={15} /> : <Sun size={15} />}
    </Button>
  );
}
