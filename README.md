# UNREAL Performance

[![CI](https://github.com/mborges-dev/unreal-performance/actions/workflows/ci.yml/badge.svg)](https://github.com/mborges-dev/unreal-performance/actions/workflows/ci.yml)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)
[![Framer Motion](https://img.shields.io/badge/Framer%20Motion-12-pink.svg)](https://framer.com/motion)

Marketing site for UNREAL Performance — an AI automation studio based in Lisbon, Portugal.

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.6 (App Router) |
| Runtime | React 19 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 with custom `@theme inline` config |
| Animation | Framer Motion v12 + Lenis v1 (smooth scroll) |
| Fonts | Fraunces (display) · DM Sans (body) · IBM Plex Mono (technical) |

## Architecture notes

### Framer Motion v12 — ViewTimeline race condition fix

Framer Motion v12 accelerates derived motion values through the Web Animations API (`ViewTimeline`). When `useScroll({ target })` feeds a `useTransform` bound to a `motion.*` style, framer attaches the `ViewTimeline` keyed on `target.current` in the motion component's layout effect — which fires **before** the parent ref has settled. The result: `target.current` is null at attach time, framer silently falls back to a document-wide `ScrollTimeline`, and every scroll-pinned section tracks the same global progress.

Fix: strip `.accelerate` from the returned motion values to force the JS subscription path, which reads `target.current` from inside a deferred ref callback where it is already attached:

```ts
function useScroll(opts: Parameters<typeof useScrollRaw>[0]) {
  const result = useScrollRaw(opts);
  result.scrollXProgress.accelerate = undefined;
  result.scrollYProgress.accelerate = undefined;
  return result;
}
```

### Tailwind v4 — bridging CSS variables

Tailwind v4 drops the JavaScript config object in favour of CSS-native `@theme` blocks. Design tokens are defined once as CSS custom properties and re-exported into Tailwind's namespace with `@theme inline`, keeping a single source of truth:

```css
:root {
  --bg-base: #0A0B0D;
  --ease-expo-out: cubic-bezier(0.16, 1, 0.3, 1);
}

@theme inline {
  --color-bg-base: var(--bg-base);
  --ease-expo-out: var(--ease-expo-out);
}
```

### Smooth scroll

Lenis is initialised at the root layout level and its `raf` loop driven by a single `requestAnimationFrame` callback, keeping it synchronised with Framer Motion's own animation frame budget. The `SmoothScroll` component exposes the Lenis instance via context for child components that need scroll position data.

### Noise background

A `NoiseBackground` component renders a procedural grain texture via a small `<canvas>` element (drawn once, then used as a CSS `background-image`). No external image assets needed, no layout shift.

## Project structure

```
src/
  app/
    layout.tsx          Root layout — fonts, Lenis, metadata
    page.tsx            Main landing page — full scroll-driven scene
    globals.css         CSS custom properties + @theme inline + base styles
    cascata/            Waterfall/cascade interactive section
    logo-test/          Isolated logo composition testing route
  components/
    NoiseBackground.tsx Procedural grain texture via canvas
    SmoothScroll.tsx    Lenis context provider + RAF integration
  scripts/
    process-logo.js     Node script — logo asset pre-processing
```

## Develop

```bash
npm install
npm run dev         # http://localhost:3000
```

## Build

```bash
npm run build
npm run start
```

## Deploy

Standard Next.js deployment. No server-side data fetching — static-friendly. Deploy to Vercel, Cloudflare Pages, or any Node host.

---


## Notice

This repository is published as a **portfolio showcase** of my work. The code is **not licensed for reuse, redistribution, or modification.** You're welcome to read it, but it is not open source. If you'd like to discuss similar work, [get in touch](mailto:hello@miguelborges.dev).

---

Built by [Miguel Borges](https://miguelborges.dev) · [hello@miguelborges.dev](mailto:hello@miguelborges.dev)