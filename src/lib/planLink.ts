/**
 * Indexable href is the clean path. The query (leave days, style, and so on)
 * is applied only when a person actually clicks, so rankings and compare cards
 * do not publish crawlable `?d=` variants.
 */
export function planLink(path: string, query: string): { href: string; query?: string } {
  const href = path.split(/[?#]/)[0] || "/";
  const text = query.replace(/^\?/, "");
  return text ? { href, query: text } : { href };
}

const BOUND = Symbol.for("leavemaxxing.plan-links");

export function bindPlanLinks(): void {
  const host = window as Window & { [BOUND]?: boolean };
  if (host[BOUND]) return;
  host[BOUND] = true;
  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const node = event.target instanceof Element ? event.target.closest("a[data-plan-query]") : null;
    if (!(node instanceof HTMLAnchorElement)) return;
    const extra = node.dataset.planQuery;
    if (!extra) return;
    const params = new URLSearchParams(extra);
    if ([...params].length === 0) return;
    event.preventDefault();
    const url = new URL(node.href);
    for (const [key, value] of params) url.searchParams.set(key, value);
    window.location.assign(`${url.pathname}${url.search}${url.hash}`);
  });
}
