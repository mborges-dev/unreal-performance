"use client";

import { ReactNode, useEffect } from "react";
import Lenis from "lenis";

export default function SmoothScroll({ children }: { children: ReactNode }) {
  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) return;

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.2,
    });

    let rafId = 0;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    // Lenis caches the scroll limit at init and only refreshes on
    // window-resize events (when wrapper=window) plus an internal
    // ResizeObserver on the content's BORDER BOX. Neither fires when a
    // section mounts dynamically inside the existing layout: the
    // `scrollRef` div has a fixed `h-[3200vh]` and its overflowing
    // children only grow `scrollHeight`, not the border-box. So Lenis
    // keeps its old limit and the wheel clamps before the user reaches
    // newly-mounted sections (e.g. `processoMounted`).
    //
    // Watch the DOM for any structural change and, if the document's
    // scrollHeight has actually shifted, ask Lenis to re-measure.
    // Cheap: a single integer compare per mutation.
    let lastScrollHeight = document.documentElement.scrollHeight;
    const mo = new MutationObserver(() => {
      const h = document.documentElement.scrollHeight;
      if (h !== lastScrollHeight) {
        lastScrollHeight = h;
        lenis.resize();
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(rafId);
      mo.disconnect();
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
