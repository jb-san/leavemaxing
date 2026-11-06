import { track as send } from "~/lib/analytics";

/** Count a Together event in Rybbit. No properties, so nothing about the group leaves the browser. */
export function track(event: "together_create" | "together_join"): void {
  send(event);
}
