import { useEffect, useRef, useState } from "react";

/** How long typing settles before it's sent. */
export const TYPING_MS = 400;

/**
 * Edits held back while someone types: sent `delay` ms after the last keystroke, straight away with any
 * other change, and on `flush`. Fields `hold` refuses (a blank name) stay pending until they're valid.
 */
export class Draft<T extends object> {
  private pending: Partial<T> = {};
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly write: (patch: Partial<T>) => void,
    private readonly hold: (key: keyof T, value: unknown) => boolean,
    private readonly show: (draft: Partial<T>) => void,
    private readonly delay = TYPING_MS,
  ) {}

  change = (patch: Partial<T>, typing: boolean): void => {
    this.pending = { ...this.pending, ...patch };
    this.show(this.pending);
    if (!typing) {
      this.flush();
      return;
    }
    this.clear();
    this.timer = setTimeout(this.flush, this.delay);
  };

  flush = (): void => {
    this.clear();
    const ready: Partial<T> = {};
    const held: Partial<T> = {};
    for (const key of Object.keys(this.pending) as (keyof T)[]) {
      const value = this.pending[key];
      if (this.hold(key, value)) held[key] = value;
      else ready[key] = value;
    }
    this.pending = held;
    this.show(held);
    if (Object.keys(ready).length > 0) this.write(ready);
  };

  private clear(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }
}

/** A `Draft` for a form: `draft` is what to show on top of the record. Unmounting sends what's pending. */
export function useDraft<T extends object>(
  write: (patch: Partial<T>) => void,
  hold: (key: keyof T, value: unknown) => boolean,
) {
  const [draft, setDraft] = useState<Partial<T>>({});
  const writeRef = useRef(write);
  writeRef.current = write;
  const holdRef = useRef(hold);
  holdRef.current = hold;
  const [core] = useState(
    () =>
      new Draft<T>(
        (patch) => writeRef.current(patch),
        (key, value) => holdRef.current(key, value),
        setDraft,
      ),
  );
  // Closing the sheet mid-word still sends the word.
  useEffect(() => core.flush, [core]);
  return { draft, change: core.change };
}
