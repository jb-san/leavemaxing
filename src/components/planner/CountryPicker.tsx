import { ChevronDown, Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useI18n } from "~/i18n/context";
import type { CountryInfo } from "~/lib/holidays";
import { cx } from "./ui";

const normalise = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function CountryPicker({
  countries,
  value,
  onChange,
  label,
  exclude = [],
  className,
}: {
  countries: CountryInfo[];
  value: string | null;
  onChange: (code: string) => void;
  label?: string;
  exclude?: string[];
  /** Extra classes for the field button, e.g. a fixed height to line up with other inputs. */
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const i18n = useI18n();
  const field = label ?? i18n.m.planner.country;
  const nameOf = (c: CountryInfo) => (i18n.code === "en" ? c.name : i18n.place(c.code, c.name));
  const current = countries.find((c) => c.code === value);

  const results = useMemo(() => {
    const q = normalise(query.trim());
    const list = countries.filter((c) => !exclude.includes(c.code));
    if (!q) return list;
    return list
      .filter((c) => {
        const local = i18n.code === "en" ? c.name : i18n.place(c.code, c.name);
        return normalise(c.name).includes(q) || normalise(local).includes(q) || c.code.toLowerCase() === q;
      })
      .sort((a, b) => {
        const an = i18n.code === "en" ? a.name : i18n.place(a.code, a.name);
        const bn = i18n.code === "en" ? b.name : i18n.place(b.code, b.name);
        return Number(!normalise(an).startsWith(q)) - Number(!normalise(bn).startsWith(q));
      });
  }, [countries, query, exclude, i18n]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const pick = (code: string) => {
    onChange(code);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${field}: ${current ? nameOf(current) : i18n.m.planner.chooseCountry}`}
        onClick={() => {
          setOpen((o) => !o);
          setActive(0);
        }}
        className={cx("input flex items-center justify-between gap-2 text-left", className)}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="text-lg leading-none">{current?.flag ?? "🌍"}</span>
          <span className="truncate">{current ? nameOf(current) : i18n.m.planner.chooseCountry}</span>
        </span>
        <ChevronDown
          size={16}
          className={cx(
            "shrink-0 text-muted transition-transform duration-200 ease-[var(--ease-out)]",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="dropdown absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-3xl border border-line bg-card shadow-lift">
          <div className="flex items-center gap-2 border-b border-line px-3.5">
            <Search size={16} className="text-muted" />
            <input
              ref={inputRef}
              role="combobox"
              aria-expanded="true"
              aria-controls={`${id}-list`}
              aria-activedescendant={results[active] ? `${id}-${results[active].code}` : undefined}
              aria-label={i18n.m.planner.searchCountries}
              placeholder={i18n.m.planner.searchCountries}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((a) => Math.min(results.length - 1, a + 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((a) => Math.max(0, a - 1));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  const c = results[active];
                  if (c) pick(c.code);
                } else if (e.key === "Escape") {
                  e.stopPropagation();
                  setOpen(false);
                }
              }}
              className="w-full bg-transparent py-3 font-semibold outline-none placeholder:text-muted"
            />
          </div>
          <ul
            ref={listRef}
            id={`${id}-list`}
            role="listbox"
            aria-label={field}
            className="max-h-72 overflow-y-auto p-1.5"
          >
            {results.length === 0 && (
              <li className="px-3 py-4 text-sm text-muted">
                {i18n.text(i18n.m.planner.noCountry, { query })}
              </li>
            )}
            {results.map((c, i) => (
              <li
                key={c.code}
                id={`${id}-${c.code}`}
                data-i={i}
                role="option"
                aria-selected={c.code === value}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(c.code)}
                className={cx(
                  "flex cursor-pointer items-center gap-2.5 rounded-2xl px-3 py-2 text-sm font-semibold",
                  i === active && "bg-card-2",
                  c.code === value && "text-lime-strong",
                )}
              >
                <span className="text-lg leading-none">{c.flag}</span>
                {nameOf(c)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
