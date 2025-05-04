import { Head } from "$fresh/runtime.ts";
// Remove default Counter import if present
// import Counter from "../islands/Counter.tsx";
// import Footer from "../components/Footer.tsx"; // <-- REMOVE Footer import
import LeaveCalculator from "../islands/LeaveCalculator.tsx"; // <-- Import our island

export default function Home() {
  return (
    <>
      <Head>
        <title>LeaveMaxing - Maximize Your Vacation Days</title>
        <meta
          name="description"
          content="Select your country and find the best days to take leave to maximize consecutive days off, including public holidays."
        />
      </Head>
      <div class="flex flex-col min-h-screen">
        <main class="flex-grow">
          {/* Remove default Fresh content */}
          {
            /* <img
            src="/logo.svg"
            width="128"
            height="128"
            alt="the Fresh logo: a sliced lemon dripping with juice"
          />
          <p class="my-6">
            Welcome to `fresh`. Try updating this message in the
            <code>./routes/index.tsx</code> file, and refresh.
          </p>
          <Counter count={3} /> */
          }

          {/* Render our main component */}
          <LeaveCalculator />
        </main>
        {/* <Footer /> */}
        {/* <-- REMOVE Footer rendering */}
      </div>
    </>
  );
}
