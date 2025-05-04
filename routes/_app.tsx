import { type PageProps } from "$fresh/server.ts";
import FooterIsland from "../islands/Footer.tsx";
import HeaderIsland from "../islands/Header.tsx";
// NOTE: Assuming Footer component from components/Footer.tsx is NOT needed here
// as dark mode toggle seems to be elsewhere (e.g., LeaveCalculator island)
// and About/Privacy links are added manually below.

export default function App({ Component }: PageProps) {
  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta
          name="description"
          content="Maximize your time off by finding the best days to take leave based on your country's public holidays."
        />
        <title>LeaveMaxing - Optimize Your Vacation Days</title>
        <link rel="stylesheet" href="/styles.css" />
        {/* Inline script to apply theme from localStorage ASAP */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (_) {}
              })();
            `,
          }}
        />
        {/* Plausible Analytics Script */}
        <script
          defer
          data-domain="leavemaxing.com"
          src="https://plausible.io/js/script.js"
        >
        </script>
      </head>
      {/* Removed bg/text classes from body, handled by html.dark */}
      <body>
        <div class="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
          <HeaderIsland />
          <main class="flex-grow">
            <Component /> {/* Page content goes here */}
          </main>
          <FooterIsland />
        </div>
      </body>
    </html>
  );
}
