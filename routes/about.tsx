import { Head } from "$fresh/runtime.ts";

export default function AboutPage() {
  return (
    <>
      <Head>
        <title>About LeaveMaxing - How It Works</title>
        <meta
          name="description"
          content="Learn how LeaveMaxing calculates the best leave suggestions by analyzing public holidays and weekends in your country."
        />
      </Head>
      <div class="p-4 mx-auto max-w-screen-md">
        <h1 class="text-3xl font-bold mb-4">How LeaveMaxing Works</h1>
        <p class="mb-4">
          LeaveMaxing helps you make the most of your time off by identifying
          strategic days to take leave around public holidays and weekends.
        </p>
        <h2 class="text-2xl font-semibold mb-2">The Calculation Process</h2>
        <p class="mb-4">
          When you select your country, our system:
        </p>
        <ol class="list-decimal list-inside mb-4 space-y-2">
          <li>
            Loads the official public holiday calendar for your selected country
            for the relevant year.
          </li>
          <li>
            Identifies potential leave periods by looking for gaps between
            public holidays and weekends.
          </li>
          <li>
            Calculates the number of leave days you'd need to take to bridge
            these gaps, creating longer consecutive stretches of time off.
          </li>
          <li>
            Prioritizes suggestions that give you the longest time off for the
            fewest leave days used.
          </li>
        </ol>
        <p class="mb-4">
          We aim to provide accurate suggestions based on publicly available
          holiday data. Always double-check with official sources and your
          employer's leave policy.
        </p>
      </div>
    </>
  );
}
