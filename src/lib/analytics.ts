/** Flat values Rybbit stores on a custom event. No names, dates, or free text. */
export type AnalyticsValue = string | number;
export type AnalyticsProps = Record<string, AnalyticsValue>;

export type PageKind =
  | "home"
  | "planner"
  | "compare"
  | "ranking"
  | "together"
  | "plans"
  | "about"
  | "contact"
  | "privacy"
  | "other";

/** Public fields shared by planner events. */
export interface UsageContext {
  country: string;
  year: number;
  locale: string;
  days: number;
  page: PageKind;
}

declare global {
  interface Window {
    rybbit?: {
      event: (name: string, properties?: AnalyticsProps) => void;
    };
  }
}

export const ANALYTICS_DEBOUNCE_MS = 400;

interface PendingEvent {
  timer: ReturnType<typeof setTimeout>;
  name: string;
  properties: AnalyticsProps;
}

const pending = new Map<string, PendingEvent>();

export function pageKind(pathname: string): PageKind {
  const path = pathname.endsWith("/") ? pathname : `${pathname}/`;
  if (path === "/" || /^\/[a-z]{2}-[a-z]{2}\/$/.test(path)) return "home";
  if (path.startsWith("/compare/")) return "compare";
  if (path.startsWith("/best/") || /^\/[a-z]{2}-[a-z]{2}\/best\//.test(path)) return "ranking";
  if (path.startsWith("/together/")) return "together";
  if (path.startsWith("/plans/")) return "plans";
  if (path === "/about/" || /^\/[a-z]{2}-[a-z]{2}\/about\/$/.test(path)) return "about";
  if (path === "/contact/" || /^\/[a-z]{2}-[a-z]{2}\/contact\/$/.test(path)) return "contact";
  if (path.startsWith("/privacy")) return "privacy";
  if (
    /^\/[a-z]{2}\/$/.test(path) ||
    /^\/[a-z]{2}\/\d{4}\//.test(path) ||
    /^\/[a-z]{2}-[a-z]{2}\/[^/]+-\d{4}\//.test(path)
  ) {
    return "planner";
  }
  return "other";
}

export function usageProps(ctx: UsageContext, extra?: AnalyticsProps): AnalyticsProps {
  return {
    country: ctx.country,
    year: ctx.year,
    locale: ctx.locale,
    days: ctx.days,
    page: ctx.page,
    ...extra,
  };
}

/**
 * Count a named interaction. No-ops when Rybbit is missing, blocked, or throws,
 * so analytics never breaks the page.
 */
export function track(name: string, properties?: AnalyticsProps): void {
  if (typeof window === "undefined") return;
  try {
    const rybbit = window.rybbit;
    if (!rybbit) return;
    if (properties) rybbit.event(name, properties);
    else rybbit.event(name);
  } catch {
    // A blocked or broken analytics script must not break the page.
  }
}

/** Coalesce rapid slider or number changes into the last value. */
export function trackDebounced(
  key: string,
  name: string,
  properties: AnalyticsProps,
  wait = ANALYTICS_DEBOUNCE_MS,
): void {
  if (typeof window === "undefined") return;
  const existing = pending.get(key);
  if (existing) clearTimeout(existing.timer);
  const snapshot = { ...properties };
  const timer = setTimeout(() => {
    pending.delete(key);
    track(name, snapshot);
  }, wait);
  pending.set(key, { timer, name, properties: snapshot });
}

/** Send debounced events that have not fired yet, for example on pagehide. */
export function flushAnalytics(): void {
  for (const [key, item] of pending) {
    clearTimeout(item.timer);
    pending.delete(key);
    track(item.name, item.properties);
  }
}

const BOUND = Symbol.for("leavemaxxing.analytics");

function trackedProperties(node: Element): AnalyticsProps {
  const root = document.documentElement;
  const properties: AnalyticsProps = {
    page: root.dataset.page || "other",
    locale: root.dataset.locale || "en",
  };
  for (const attr of node.getAttributeNames()) {
    if (!attr.startsWith("data-track-")) continue;
    const key = attr.slice("data-track-".length).replaceAll("-", "_");
    if (!key) continue;
    properties[key] = node.getAttribute(attr) ?? "";
  }
  return properties;
}

function onAnalyticsClick(event: MouseEvent): void {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const tracked = target.closest("[data-track]");
  if (tracked) {
    const name = tracked.getAttribute("data-track");
    if (name) track(name, trackedProperties(tracked));
  }
  const link = target.closest("a[href]");
  if (!(link instanceof HTMLAnchorElement)) return;
  if (tracked || link.hasAttribute("data-no-outbound")) return;
  let url: URL;
  try {
    url = new URL(link.href);
  } catch {
    return;
  }
  if (url.origin === location.origin) return;
  if (url.protocol !== "http:" && url.protocol !== "https:") return;
  track("outbound_click", {
    host: url.host,
    page: document.documentElement.dataset.page || "other",
    locale: document.documentElement.dataset.locale || "en",
  });
}

/** Click listeners for declarative events (language, privacy, outbound links). */
export function bindAnalytics(): void {
  const host = window as Window & { [BOUND]?: boolean };
  if (host[BOUND]) return;
  host[BOUND] = true;
  document.addEventListener("click", onAnalyticsClick);
  window.addEventListener("pagehide", flushAnalytics);
}
