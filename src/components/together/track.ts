declare global {
  interface Window {
    rybbit?: { event: (name: string) => void };
  }
}

/** Count a Together event in Rybbit. No properties, so nothing about the group leaves the browser. */
export function track(event: "together_create" | "together_join"): void {
  try {
    window.rybbit?.event(event);
  } catch {
    // Analytics never gets in the way.
  }
}
