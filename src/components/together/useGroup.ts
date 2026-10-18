import { useCallback, useSyncExternalStore } from "react";
import type { GroupSession, GroupState } from "~/lib/together/session";

/** The session's current state, re-rendering on every change. */
export function useGroup(session: GroupSession): GroupState {
  const subscribe = useCallback((onChange: () => void) => session.subscribe(onChange), [session]);
  const get = useCallback(() => session.state, [session]);
  return useSyncExternalStore(subscribe, get, get);
}
