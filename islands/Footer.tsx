// Remove useState and useEffect imports if no longer needed
// import { useEffect, useState } from "preact/hooks";

// Simple Sun/Moon Icons (can be replaced with SVGs)
const SunIcon = () => <span>☀️</span>;
const MoonIcon = () => <span>🌙</span>;

export default function FooterIsland() {
  // Remove theme state, effect, and toggle function
  // const [theme, setTheme] = useState("light");
  const currentYear = new Date().getFullYear();
  // useEffect(() => { ... }, []);
  // const toggleTheme = () => { ... };

  // Placeholder SVG paths - replace with actual SVG paths for GitHub & LinkedIn icons
  const githubIconPath =
    "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12";
  const linkedinIconPath =
    "M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.713c-.978 0-1.778-.799-1.778-1.778s.8-1.778 1.778-1.778 1.778.799 1.778 1.778-.8 1.778-1.778 1.778zm10.5 12.713h-3v-5.5c0-1.329-.026-3.037-1.85-3.037-1.853 0-2.137 1.445-2.137 2.945v5.592h-3v-11h2.888v1.32h.04c.4-.759 1.381-1.55 2.848-1.55 3.046 0 3.611 1.996 3.611 4.581v6.649z";
  const homepageIconPath = "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z";

  return (
    <footer class="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm mt-auto py-6 px-4">
      <div class="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
        {/* Left side: Copyright */}
        <p>&copy; {currentYear} Jonathan Borg. All rights reserved.</p>

        {/* Center: Links */}
        <div class="flex items-center gap-4">
          <a href="/about" class="hover:underline">About</a>
          <span class="mx-1">|</span>
          <a href="/privacy-policy" class="hover:underline">Privacy Policy</a>
        </div>

        {/* Right side: Icons */}
        <div class="flex items-center gap-4">
          <a
            href="https://github.com/jb-san"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub Profile"
            class="hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d={githubIconPath}></path>
            </svg>
          </a>
          <a
            href="https://www.linkedin.com/in/jonathan-borg-8a520b97/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn Profile"
            class="hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d={linkedinIconPath}></path>
            </svg>
          </a>
          <a
            href="https://jonathanborg.net"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Personal Homepage"
            class="hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d={homepageIconPath}></path>
            </svg>
          </a>
          {/* REMOVE Theme Toggle Button */}
          {
            /*
          <button
            onClick={toggleTheme}
            aria-label={`Switch to ${
              theme === "light" ? "dark" : "light"
            } mode`}
            class="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {theme === "light" ? <MoonIcon /> : <SunIcon />}
          </button>
          */
          }
        </div>
      </div>
    </footer>
  );
}
