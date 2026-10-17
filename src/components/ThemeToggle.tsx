import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Pref = "system" | "light" | "dark";
const KEY = "lm:theme";

function read(): Pref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

export function applyTheme(pref: Pref) {
  const dark = pref === "dark" || (pref === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#10141b" : "#eef3ea");
}

const OPTIONS: { id: Pref; label: string; Icon: typeof Sun }[] = [
  { id: "light", label: "Light", Icon: Sun },
  { id: "system", label: "System", Icon: Monitor },
  { id: "dark", label: "Dark", Icon: Moon },
];

export default function ThemeToggle({
  labels,
}: {
  labels?: { group: string; light: string; system: string; dark: string };
}) {
  const [pref, setPref] = useState<Pref>("system");

  useEffect(() => {
    setPref(read());
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme(read());
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const choose = (p: Pref) => {
    setPref(p);
    try {
      if (p === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, p);
    } catch {}
    // Crossfade the whole page rather than flashing between themes.
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (document.startViewTransition && !reduce) document.startViewTransition(() => applyTheme(p));
    else applyTheme(p);
  };

  return (
    <div
      role="radiogroup"
      aria-label={labels?.group ?? "Colour theme"}
      className="flex items-center gap-0.5 rounded-full bg-card p-1 shadow-card"
    >
      {OPTIONS.map(({ id, label, Icon }) => {
        const text = labels?.[id] ?? label;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={pref === id}
            aria-label={text}
            title={text}
            onClick={() => choose(id)}
            className={`grid size-8 place-items-center rounded-full transition-colors ${
              pref === id ? "bg-ink text-card" : "text-muted hover:text-ink"
            }`}
          >
            <Icon size={16} strokeWidth={2.2} />
          </button>
        );
      })}
    </div>
  );
}
