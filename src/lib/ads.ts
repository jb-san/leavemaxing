const BOUND = Symbol.for("lm.ads");

/** Sidebar units stay unloaded below this width so a hidden slot is never requested. */
export const SIDEBAR_MEDIA = "(min-width: 1280px)";

type AdsWindow = Window & {
  adsbygoogle?: object[];
  [BOUND]?: boolean;
};

function pushAd(): void {
  const w = window as AdsWindow;
  if (!w.adsbygoogle) w.adsbygoogle = [];
  try {
    w.adsbygoogle.push({});
  } catch {
    // The loader throws if this slot was already requested.
  }
}

/**
 * Request each manual unit once it is near the viewport.
 * Below-the-fold slots wait on IntersectionObserver. The desktop sidebar
 * also waits until the viewport is wide enough for the rail.
 */
export function bindAdSlots(root: ParentNode = document): void {
  const w = window as AdsWindow;
  if (w[BOUND]) return;
  const units = [...root.querySelectorAll<HTMLElement>("[data-ad-lazy]")];
  if (units.length === 0) return;
  w[BOUND] = true;

  const desktop = window.matchMedia(SIDEBAR_MEDIA);
  const eligible = (unit: HTMLElement) => unit.dataset.adPlacement !== "desktopSidebar" || desktop.matches;

  const request = (unit: HTMLElement) => {
    if (unit.dataset.adPushed === "true" || !eligible(unit)) return;
    unit.dataset.adPushed = "true";
    pushAd();
  };

  if (!("IntersectionObserver" in window)) {
    for (const unit of units) request(unit);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const unit = entry.target as HTMLElement;
        if (!eligible(unit)) continue;
        observer.unobserve(unit);
        request(unit);
      }
    },
    { rootMargin: "200px 0px" },
  );

  const arm = (unit: HTMLElement) => {
    if (unit.dataset.adPushed === "true" || !eligible(unit)) return;
    observer.observe(unit);
  };

  for (const unit of units) arm(unit);
  desktop.addEventListener("change", () => {
    for (const unit of units) arm(unit);
  });
}
