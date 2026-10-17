import { Head } from "$fresh/runtime.ts";

export default function Error404() {
  return (
    <>
      <Head>
        <title>404 - Page not found</title>
      </Head>
      <div class="px-4 py-16 mx-auto max-w-screen-md">
        <div class="flex flex-col items-center justify-center text-center">
          <h1 class="text-6xl font-bold mb-4">404</h1>
          <h2 class="text-2xl font-semibold mb-4">Page not found</h2>
          <p class="mb-8 text-gray-600 dark:text-gray-400">
            The page you were looking for doesn't exist.
          </p>
          <a
            href="/"
            class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go back home
          </a>
        </div>
      </div>
    </>
  );
}
