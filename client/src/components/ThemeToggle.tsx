import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = localStorage.getItem("theme") as "light" | "dark" | null;
    if (stored) {
      setTheme(stored);
      document.documentElement.classList.toggle("dark", stored === "dark");
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    
    // Fade out effect
    document.documentElement.style.opacity = "0.95";
    document.documentElement.style.transition = "opacity 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)";
    
    // Switch theme after fade
    setTimeout(() => {
      document.documentElement.classList.toggle("dark", newTheme === "dark");
      document.documentElement.style.opacity = "1";
      document.documentElement.style.transition = "all 0.35s cubic-bezier(0.25, 0.1, 0.25, 1)";
    }, 75);
    
    // Remove transition after animation completes
    setTimeout(() => {
      document.documentElement.style.transition = "";
      document.documentElement.style.opacity = "";
    }, 410);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      data-testid="button-theme-toggle"
    >
      {theme === "light" ? (
        <Moon className="h-5 w-5" />
      ) : (
        <Sun className="h-5 w-5" />
      )}
    </Button>
  );
}
