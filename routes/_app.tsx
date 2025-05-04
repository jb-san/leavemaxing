import { type PageProps } from "$fresh/server.ts";
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
      </head>
      <body>
        <Component />
        <footer class="text-center text-gray-500 text-sm py-4">
          <a href="/about" class="hover:underline">About</a>
          <span class="mx-2">|</span>
          <a href="/privacy-policy" class="hover:underline">Privacy Policy</a>
        </footer>
      </body>
    </html>
  );
}
