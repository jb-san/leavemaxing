import { Head } from "$fresh/runtime.ts";

export default function PrivacyPolicyPage() {
  return (
    <>
      <Head>
        <title>Privacy Policy - LeaveMaxing</title>
        <meta
          name="description"
          content="Understand how LeaveMaxing handles your data and respects your privacy."
        />
        {/* Add noindex for now until reviewed by legal? Consider removing later. */}
        <meta name="robots" content="noindex" />
      </Head>
      <div class="p-4 mx-auto max-w-screen-md">
        <h1 class="text-3xl font-bold mb-4">Privacy Policy</h1>
        <p class="mb-2">
          <strong>Last Updated:</strong> 2025-05-04
        </p>

        <p class="mb-4">
          Welcome to LeaveMaxing. We are committed to protecting your privacy.
          This Privacy Policy explains how we collect, use, and safeguard your
          information when you visit our website. Please read this policy
          carefully. If you do not agree with the terms of this privacy policy,
          please do not access the site.
        </p>

        <strong>
          We don't collect any personal information
        </strong>
      </div>
    </>
  );
}
