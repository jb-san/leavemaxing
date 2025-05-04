import { useEffect, useState } from "preact/hooks";

// Simple Sun/Moon Icons (can be replaced with SVGs)
const SunIcon = () => <span>☀️</span>;
const MoonIcon = () => <span>🌙</span>;

export default function HeaderIsland() {
  const [theme, setTheme] = useState("light"); // Default, will be updated

  // Effect to run only on the client to set initial theme
  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    const initialTheme = storedTheme
      ? storedTheme
      : (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light");
    setTheme(initialTheme);
    // Ensure class is set correctly on initial load (might be redundant but safe)
    if (initialTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <header class="bg-white dark:bg-gray-800 shadow sticky top-0 z-10">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          {/* Left side: Logo/Title */}
          <div class="flex-shrink-0">
            <a
              href="/"
              class="text-2xl font-bold text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-300"
            >
              LeaveMaxing
            </a>
          </div>
          {/* Right side: Theme Toggle */}
          <div>
            <button
              onClick={toggleTheme}
              aria-label={`Switch to ${
                theme === "light" ? "dark" : "light"
              } mode`}
              class="p-2 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
            >
              {theme === "light" ? <MoonIcon /> : <SunIcon />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
