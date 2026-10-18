import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Toasts, useToasts } from "~/components/planner/ui";
import { formatInvite, formatPersonal, parseFragment } from "~/lib/together/link";
import { GroupSession } from "~/lib/together/session";
import { CreateGroup } from "./CreateGroup";
import { t } from "./copy";
import { ErrorScreen } from "./ErrorScreen";
import { GroupView } from "./GroupView";
import { IdentityChoice } from "./IdentityChoice";
import { JoinGroup } from "./JoinGroup";
import { useGroup } from "./useGroup";

/** Shows a toast. Owned by the island, so a toast outlives the screen that raised it. */
export type Push = ReturnType<typeof useToasts>["push"];

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
  // One live region for the whole island: toasts survive screens swapping underneath them.
  const { toasts, push } = useToasts();
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

  /**
   * The address bar keeps the invite: who you are is in this browser's storage, so the invite brings
   * you back. Only when that couldn't be saved does it hold your personal link instead, so a reload
   * still knows you. Replace rather than push: Back shouldn't return to a form, and no hashchange fires.
   */
  const showLink = (s: GroupSession) => {
    const personal = s.personalLink();
    if (!personal) return;
    const url = s.saved ? formatInvite(location.origin, personal) : formatPersonal(location.origin, personal);
    if (url !== location.href) history.replaceState(null, "", url);
    shown.current = location.hash;
  };

  const onCreated = (created: GroupSession) => {
    showLink(created);
    swap(created);
    setSharing(true);
  };

  const onJoined = () => {
    if (current.current) showLink(current.current);
  };

  if (!ready) return null;
  return (
    <>
      {session ? (
        <GroupScreen
          session={session}
          sharing={sharing}
          setSharing={setSharing}
          onJoined={onJoined}
          onStayed={onJoined}
          push={push}
        />
      ) : (
        <CreateGroup onCreated={onCreated} push={push} />
      )}
      <Toasts toasts={toasts} />
    </>
  );
}

function GroupScreen({
  session,
  sharing,
  setSharing,
  onJoined,
  onStayed,
  push,
}: {
  session: GroupSession;
  sharing: boolean;
  setSharing: (open: boolean) => void;
  onJoined: () => void;
  /** This device kept who it was rather than taking someone else's personal link. */
  onStayed: () => void;
  push: Push;
}) {
  const state = useGroup(session);
  const limited = state.error === "rate";

  // A rate limit passes on its own, so it is a toast rather than a screen.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `push` is new on every render
  useEffect(() => {
    if (limited) push(t.slowDown, "warn");
  }, [limited]);

  if (state.error && state.error !== "rate") return <ErrorScreen error={state.error} />;
  if (!state.loaded || !state.group) return <Placeholder text={t.loading} />;
  // Someone else's personal link, on a device that's already someone in the group.
  if (state.choice) {
    return (
      <IdentityChoice session={session} choice={state.choice} members={state.members} onStayed={onStayed} />
    );
  }
  // Whoever has no record in the group yet joins it first. `me` can be known before the record is.
  if (!state.me || !state.members.has(state.me)) {
    return <JoinGroup session={session} onJoined={onJoined} push={push} />;
  }
  return (
    <GroupView
      session={session}
      state={{ ...state, group: state.group, me: state.me }}
      sharing={sharing}
      setSharing={setSharing}
      push={push}
    />
  );
}

/** Shown while the group opens. */
function Placeholder({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-2 pb-6 pt-3">
      <h1 className="text-[clamp(32px,4.4vw,52px)] font-extrabold leading-none">{t.title}</h1>
      <p className="text-muted">{text}</p>
    </div>
  );
}
