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
          <strong>Last Updated:</strong> [Insert Date]
        </p>

        <p class="mb-4">
          Welcome to LeaveMaxing. We are committed to protecting your privacy.
          This Privacy Policy explains how we collect, use, and safeguard your
          information when you visit our website. Please read this policy
          carefully. If you do not agree with the terms of this privacy policy,
          please do not access the site.
        </p>

        <h2 class="text-2xl font-semibold mb-2">
          Collection of Your Information
        </h2>
        <p class="mb-4">
          <strong>
            LeaveMaxing collects absolutely no personal information or usage
            data from its visitors.
          </strong>
        </p>
        <ul class="list-disc list-inside mb-4 space-y-1">
          <li>
            <strong>Input Data:</strong>{" "}
            We process the country and year you select solely to perform the
            leave calculation at the moment you request it. This information is
            <strong>never stored</strong>, logged, or linked to any individual.
            It is immediately discarded after the calculation is displayed.
          </li>
        </ul>
        <p class="mb-4">
          We do not require you to create an account. We do not collect your
          name, email address, IP address, location, browser type, operating
          system, or any other identifiable information.
        </p>

        <h2 class="text-2xl font-semibold mb-2">Use of Your Information</h2>
        <p class="mb-4">
          Since we do not collect your information, we do not use it for any
          purpose other than the immediate, transient calculation of leave
          suggestions based on the country and year you provide.
        </p>

        <h2 class="text-2xl font-semibold mb-2">
          Disclosure of Your Information
        </h2>
        <p class="mb-4">
          We do not collect any information, therefore we do not sell, trade,
          rent, or share any information with third parties.
        </p>

        <h2 class="text-2xl font-semibold mb-2">Cookies</h2>
        <p class="mb-4">
          <strong>This website does not use cookies</strong>{" "}
          or any similar tracking technologies.
        </p>

        <h2 class="text-2xl font-semibold mb-2">Data Security</h2>
        <p class="mb-4">
          We implement appropriate security measures to protect the website
          itself. As we do not collect or store any personal data, there is no
          user data requiring specific protection beyond securing the
          operational integrity of the service.
        </p>

        <h2 class="text-2xl font-semibold mb-2">Third-Party Websites</h2>
        <p class="mb-4">
          The website may contain links to third-party websites (e.g., official
          holiday sources). We are not responsible for the privacy practices or
          the content of these third-party sites. We encourage you to read their
          privacy policies.
        </p>

        <h2 class="text-2xl font-semibold mb-2">Policy for Children</h2>
        <p class="mb-4">
          We do not knowingly solicit information from or market to children
          under the age of 13 (or the relevant age in your jurisdiction).
        </p>

        <h2 class="text-2xl font-semibold mb-2">Your Privacy Rights</h2>
        <p class="mb-4">
          Various privacy laws (like GDPR, CCPA, etc.) grant individuals rights
          regarding their personal data, such as access, correction, and
          deletion.
          <strong>
            Since LeaveMaxing does not collect or store any personal data, these
            rights are not applicable
          </strong>{" "}
          in the context of using this website. If you have general questions
          about our privacy approach, feel free to contact us.
        </p>

        <h2 class="text-2xl font-semibold mb-2">
          Changes to This Privacy Policy
        </h2>
        <p class="mb-4">
          We may update this Privacy Policy from time to time. We will notify
          you of any changes by updating the "Last Updated" date of this Privacy
          Policy. You are encouraged to periodically review this Privacy Policy
          to stay informed of updates.
        </p>

        <h2 class="text-2xl font-semibold mb-2">Contact Us</h2>
        <p class="mb-4">
          If you have questions or comments about this Privacy Policy, please
          contact us at: [Insert Contact Email or Method]
        </p>

        <p class="mt-6 mb-4 text-sm text-gray-600 dark:text-gray-400">
          <i>
            Disclaimer: This privacy policy is a template provided for
            informational purposes only and does not constitute legal advice.
            You should consult with a qualified legal professional to ensure
            compliance with applicable laws and regulations.
          </i>
        </p>
      </div>
    </>
  );
}
