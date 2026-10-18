import { Mascot } from "~/components/Mascot";
import type { SessionError } from "~/lib/together/session";
import { t } from "./copy";

/** What a person sees when the link or their place in the group stops working. */
export function ErrorScreen({ error }: { error: Exclude<SessionError, null> }) {
  // A rate limit is a toast, not a screen.
  if (error === "rate") return null;
  return (
    <div className="card mt-3 flex max-w-2xl flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:gap-6 sm:p-8">
      <Mascot size={72} mood="puzzled" title="" className="shrink-0" />
      <div className="flex flex-col items-start gap-4">
        <h1 className="text-[clamp(26px,3.6vw,40px)] font-extrabold leading-tight">{t.errors[error]}</h1>
        {error === "gone" && (
          <a href="/together/" className="btn btn-primary">
            {t.startNew}
          </a>
        )}
      </div>
    </div>
  );
}
