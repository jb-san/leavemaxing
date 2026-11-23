import type { ClientDirective } from "astro";

/**
 * `client:afterpaint`: hydrate as soon as the browser has painted the server-rendered page.
 *
 * `client:load` starts fetching the island's JavaScript the moment the parser reaches the
 * island, so on a phone the scripts compete with the first paint of the page (and Lighthouse
 * counts every script that finished before the largest paint towards that paint). The HTML
 * already shows the full plan, so let it paint first: wait until the document is parsed and the
 * frame showing it is on screen, then load and hydrate. That costs a couple of frames.
 *
 * Frames don't run in background tabs, so a short timeout starts hydration there too.
 */
const afterPaint: ClientDirective = (load) => {
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    load()
      .then((hydrate) => hydrate())
      .catch((error: unknown) => console.error(error));
  };
  const afterNextPaint = () => {
    // rAF runs before a frame is drawn. The second rAF comes after the first frame has been put on
    // screen, and the task queued from it runs once that next frame is done too.
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(start, 0)));
    setTimeout(start, 500);
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", afterNextPaint, { once: true });
  } else afterNextPaint();
};

export default afterPaint;
