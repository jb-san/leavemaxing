import { Share2, Smartphone } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { formatInvite, formatPersonal, parseFragment } from "~/lib/together/link";
import { GroupSession, type SessionError } from "~/lib/together/session";
import { CreateGroup } from "./CreateGroup";
import { t } from "./copy";
import { ShareSheet } from "./ShareSheet";
import { useGroup } from "./useGroup";

/**
 * Whether the hash should open a group. A fragment naming an element on the page (the skip link's
 * `#main`) is in-page navigation, not a group link. Anything else, even garbage, is a link to report.
 */
function isGroupHash(hash: string): boolean {
  const text = hash.replace(/^#/, "").trim();
  if (!text) return false;
  if (text.includes(".")) return true;
  try {
    return document.getElementById(decodeURIComponent(text)) === null;
  } catch {
    return true;
  }
}

/** The /together/ island: create a group, or open the one in the link. */
export default function Together() {
  const [session, setSession] = useState<GroupSession | null>(null);
  const [ready, setReady] = useState(false);
  const [sharing, setSharing] = useState(false);
  const current = useRef<GroupSession | null>(null);
  /** The hash whose screen is showing: "" for the create form, null before the first one. */
  const shown = useRef<string | null>(null);

  const swap = (next: GroupSession | null) => {
    if (current.current !== next) current.current?.close();
    current.current = next;
    setSession(next);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: opens the link once, then follows pasted links
  useLayoutEffect(() => {
    const open = () => {
      const hash = isGroupHash(location.hash) ? location.hash : "";
      // In-page anchors and the link already open leave the screen as it is.
      if (shown.current !== null && (hash === shown.current || (hash === "" && location.hash !== ""))) return;
      shown.current = hash;
      swap(hash ? new GroupSession(parseFragment(hash)) : null);
      setSharing(false);
    };
    open();
    setReady(true);
    window.addEventListener("hashchange", open);
    return () => {
      window.removeEventListener("hashchange", open);
      current.current?.close();
    };
  }, []);

  const onCreated = (created: GroupSession) => {
    const personal = created.personalLink();
    // Replace rather than push: Back shouldn't return to an empty form, and no hashchange fires.
    if (personal) history.replaceState(null, "", formatPersonal(location.origin, personal));
    shown.current = location.hash;
    swap(created);
    setSharing(true);
  };

  if (!ready) return null;
  if (!session) return <CreateGroup onCreated={onCreated} />;
  return <GroupScreen session={session} sharing={sharing} setSharing={setSharing} />;
}

function GroupScreen({
  session,
  sharing,
  setSharing,
}: {
  session: GroupSession;
  sharing: boolean;
  setSharing: (open: boolean) => void;
}) {
  const state = useGroup(session);
  const [personalOpen, setPersonalOpen] = useState(false);
  const inviteButton = useRef<HTMLButtonElement>(null);
  const wasSharing = useRef(sharing);

  // The invite sheet opens straight after creating, when the form that had focus is gone.
  // Closing it hands focus to the Invite button instead of dropping it on the page.
  useEffect(() => {
    if (wasSharing.current && !sharing) inviteButton.current?.focus();
    wasSharing.current = sharing;
  }, [sharing]);

  // "rate" passes on its own; it becomes a toast with the join screen.
  if (state.error && state.error !== "rate") return <Placeholder text={ERRORS[state.error]} />;
  if (!state.me) return <Placeholder text={state.loaded ? t.joinSoon : t.loading} />;
  if (!state.members.has(state.me)) return <Placeholder text={state.loaded ? t.joinSoon : t.loading} />;

  const personal = session.personalLink();
  const origin = location.origin;
  const name = state.group?.name ?? "";
  return (
    <div className="flex flex-col gap-5 pt-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-[clamp(32px,4.4vw,52px)] font-extrabold leading-none">{name}</h1>
        <div className="flex flex-wrap gap-2">
          <button
            ref={inviteButton}
            type="button"
            className="btn btn-primary"
            onClick={() => setSharing(true)}
          >
            <Share2 size={16} /> {t.invite}
          </button>
          <button type="button" className="btn btn-soft" onClick={() => setPersonalOpen(true)}>
            <Smartphone size={16} /> {t.personalTitle}
          </button>
        </div>
      </div>
      <div className="card p-5 sm:p-6">
        <p className="font-semibold">{t.youreIn}</p>
        <p className="text-sm text-muted">{t.groupSoon}</p>
      </div>
      {personal && (
        <>
          <ShareSheet
            open={sharing}
            onClose={() => setSharing(false)}
            url={formatInvite(origin, personal)}
            title={t.inviteTitle}
            caption={t.scanToJoin(name)}
          />
          <ShareSheet
            open={personalOpen}
            onClose={() => setPersonalOpen(false)}
            url={formatPersonal(origin, personal)}
            title={t.personalTitle}
            caption={t.personalCaption}
            warning={t.personalWarning}
          />
        </>
      )}
    </div>
  );
}

const ERRORS: Record<Exclude<SessionError, "rate" | null>, string> = {
  incomplete: "This link is incomplete. Ask for the invite again.",
  gone: "This group no longer exists",
  removed: "You were removed from this group.",
  full: "This group is full (20 people).",
};

/** Stands in for the join and group screens until they exist. */
function Placeholder({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-2 pb-6 pt-3">
      <h1 className="text-[clamp(32px,4.4vw,52px)] font-extrabold leading-none">{t.title}</h1>
      <p className="text-muted">{text}</p>
    </div>
  );
}
