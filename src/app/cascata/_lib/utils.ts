/**
 * Central choreography table for /cascata.
 * Every scroll-driven animation references these ranges so timing stays coherent.
 */

/**
 * Mount windows per scene, expressed in GLOBAL scroll progress (0–1 across
 * the whole hero, which is now 800vh). Hero Part 1 owns the 0–12.5% slice;
 * the cascade is mapped into 12.5–100%. Each scene gets a 5% buffer on
 * each side so entry/exit animations can settle without flicker on the
 * mount/unmount transition (including scroll-up remount).
 *
 * Cascade scenes still see a clean 0–1 local scroll (cascadeProgress),
 * computed from scrollYProgress in the Stage and passed down — so internal
 * SCROLL.* timings stay readable.
 */
/**
 * Mount windows per scene. Two kinds of boundaries:
 *
 *   • Hard cut (single-frame mount/unmount, no overlap): hero↔c1 at 5%,
 *     t12↔c2 at 37.5%, t23↔c3 at 70%. computeMounts uses a strict
 *     less-than at the end of the OUTGOING scene's window so at the
 *     boundary scroll value the outgoing is gone and the incoming is in.
 *
 *   • Buffered overlap (both mounted simultaneously to let one morphism
 *     element finish while the next is already in DOM): c1↔t12 in
 *     30–35%, c2↔t23 in 62.5–67.5%.
 *
 * Listed below: the mount window of each scene, including buffer.
 */
/**
 * The homepage is 3200vh total:
 *   • Hero + Cascade  = 800vh   (0    – 25 %)
 *   • "O Problema"    = 800vh   (25   – 50 %)
 *   • "Como Pensamos" = 800vh   (50   – 75 %)
 *   • "Capacidade"    = 800vh   (75   – 100 %)
 *
 * Each scene's pixel boundary is preserved from the prior 2400vh layout;
 * only the fraction denominators changed (multiplied by 0.75 to map the
 * old percentages onto the new total height). Mount windows include a
 * ~3 % (~80–128vh) buffer on each side so entry/exit animations have
 * room to breathe across the strict mount/unmount transitions.
 */
export const WINDOWS = {
  hero: [0.0, 0.0125],
  c1: [0.0125, 0.0875],
  t12: [0.075, 0.09375],
  // c2 starts ~15vh inside the t12 window so the four NetworkNode
  // components are already in the DOM when MorphingCard begins to fade
  // out. Without this, the nodes pop in at 0 % opacity exactly when the
  // morphism endpoint lands. The overlap is harmless: t12 is mounted in
  // 0.075–0.09375 and c2 in 0.0875–0.16875, so the cross-fade happens
  // cleanly inside 0.0875–0.09375.
  c2: [0.0875, 0.16875],
  t23: [0.15625, 0.175],
  c3: [0.175, 0.25],
  problema: [0.225, 1.0],
  comoPensamos: [0.465, 1.0],
  capacidade: [0.71, 1.0],
  // `processo` sits AFTER `capacidade` in normal flow, overflowing
  // beyond the 3200vh scrollRef wrapper (its content extends to
  // ~3762vh of document scroll). Global scrollYProgress is unclamped,
  // so a mount threshold of 0.92 fires while the user is still
  // finishing `capacidade` (~scroll 2850vh) — enough buffer for the
  // section to settle into the DOM before being visible.
  processo: [0.92, 1.0],
} as const;

export type SceneKey = keyof typeof WINDOWS;

export type Mounts = Record<SceneKey, boolean>;

export function computeMounts(p: number): Mounts {
  // Strict `<` at the end of an outgoing scene whose successor mounts at
  // the same value (hero→c1, t12→c2, t23→c3). Inclusive `<=` at the end
  // of c1 and c2 because their successor's window starts EARLIER (the
  // overlap that morphisms need to breathe).
  //
  // `problema`, `comoPensamos`, and `capacidade` are NORMAL-FLOW (not
  // sticky), so once they enter the DOM they must stay — their height
  // contributes to document scrollability. Unmounting them mid-page
  // would collapse the layout and shift later sections up off the
  // viewport.
  return {
    hero: p < WINDOWS.hero[1],
    c1: p >= WINDOWS.c1[0] && p <= WINDOWS.c1[1],
    t12: p >= WINDOWS.t12[0] && p < WINDOWS.t12[1],
    c2: p >= WINDOWS.c2[0] && p <= WINDOWS.c2[1],
    t23: p >= WINDOWS.t23[0] && p < WINDOWS.t23[1],
    c3: p >= WINDOWS.c3[0] && p < WINDOWS.c3[1],
    problema: p >= WINDOWS.problema[0],
    comoPensamos: p >= WINDOWS.comoPensamos[0],
    capacidade: p >= WINDOWS.capacidade[0],
    processo: p >= WINDOWS.processo[0],
  };
}

export function mountsEqual(a: Mounts, b: Mounts): boolean {
  return (
    a.hero === b.hero &&
    a.c1 === b.c1 &&
    a.t12 === b.t12 &&
    a.c2 === b.c2 &&
    a.t23 === b.t23 &&
    a.c3 === b.c3 &&
    a.problema === b.problema &&
    a.comoPensamos === b.comoPensamos &&
    a.capacidade === b.capacidade &&
    a.processo === b.processo
  );
}

/**
 * The "primary" scene at any scroll position — the one the narrative is
 * currently centred on, even when another is also mounted in a buffer
 * overlap. Used for the dev debug panel.
 */
export function getPrimaryScene(p: number): SceneKey {
  if (p < WINDOWS.hero[1]) return "hero";
  if (p < WINDOWS.t12[0]) return "c1";
  if (p < WINDOWS.t12[1]) return "t12";
  if (p < WINDOWS.t23[0]) return "c2";
  if (p < WINDOWS.t23[1]) return "t23";
  if (p < WINDOWS.c3[1]) return "c3";
  if (p < WINDOWS.comoPensamos[0]) return "problema";
  if (p < WINDOWS.capacidade[0]) return "comoPensamos";
  return "capacidade";
}

/**
 * Piecewise-linear cascade ↔ global scroll mapping for the 3200vh layout.
 * Cascade-local stays 0–1 so the existing SCROLL.* constants stay
 * readable; each scene's slice of global scroll preserves its pixel
 * boundaries (old global keys × 0.75 = new global keys).
 */
export const CASCADE_GLOBAL_KEYS: ReadonlyArray<[number, number]> = [
  [0.0125, 0.0],
  [0.075, 0.3],
  [0.09375, 0.38],
  [0.15625, 0.65],
  [0.175, 0.72],
  [0.25, 1.0],
];

export const GLOBAL_KEYS: readonly number[] = CASCADE_GLOBAL_KEYS.map(
  ([g]) => g
);
export const CASCADE_KEYS: readonly number[] = CASCADE_GLOBAL_KEYS.map(
  ([, c]) => c
);

/** Inverse mapping: takes a cascade-local value and returns its global equivalent. */
export function cascadeToGlobal(c: number): number {
  if (c <= CASCADE_KEYS[0]) return GLOBAL_KEYS[0];
  if (c >= CASCADE_KEYS[CASCADE_KEYS.length - 1])
    return GLOBAL_KEYS[GLOBAL_KEYS.length - 1];
  for (let i = 1; i < CASCADE_KEYS.length; i++) {
    const cPrev = CASCADE_KEYS[i - 1];
    const cThis = CASCADE_KEYS[i];
    if (c <= cThis) {
      const t = (c - cPrev) / (cThis - cPrev);
      return GLOBAL_KEYS[i - 1] + t * (GLOBAL_KEYS[i] - GLOBAL_KEYS[i - 1]);
    }
  }
  return GLOBAL_KEYS[GLOBAL_KEYS.length - 1];
}

/**
 * Per-node appearance ranges (in cascade-local scroll). The four nodes
 * materialise at their final asymmetric positions with a 50 ms-ish
 * micro-stagger in narrative order (ERP → CRM → FACT → APP), all
 * complete by ~38 % so the first Gemini line is allowed to start
 * drawing at SCROLL.s2Edges[0][0] = 0.38 with every node already
 * stable on screen.
 *
 * The ranges sit just before cascade 0.38 (the canonical "Cena 2
 * begins" mark) precisely so they overlap MorphingCard's fade-out
 * (cardOpacity drops 1→0 across cascade 0.375–0.38). The ERP node at
 * its final position cross-fades with the morphism endpoint at the
 * exact same screen coordinates, giving a continuous landing rather
 * than a hard handoff.
 */
export const NODE_APPEAR_RANGES: Record<string, readonly [number, number]> = {
  erp: [0.354, 0.366],
  crm: [0.358, 0.37],
  fact: [0.362, 0.374],
  app: [0.366, 0.378],
};

/**
 * Hero Part 1 — entrance timeline (absolute ms from mount). The new Hero
 * is a minimalist typographic composition: monumental UNREAL, supporting
 * phrase, scroll indicator. Three timed events, no stagger across pieces.
 */
export const HERO_TIMELINE = {
  logoDelay: 400,
  logoDur: 1400,
  monumentDelay: 1600,
  monumentDur: 1400,
  phraseDelay: 2800,
  phraseDur: 900,
  scrollIndicatorDelay: 3400,
  scrollIndicatorDur: 800,
} as const;

/**
 * Hero Part 1 → Cena 1 transition. A clean fade across the first 40vh
 * of global scroll (= 0–1.25 % in the 3200vh layout) — no morfismo, no
 * transformation, no particles. Eased with power3.inOut.
 */
export const HERO_FADE = {
  start: 0.0,
  end: 0.0125,
} as const;

export const SCROLL = {
  // Scene 1 — Document → Data
  s1Start: 0.0,
  s1End: 0.3,
  s1LightStart: 0.0,
  s1LightEnd: 0.08,
  s1FlyStart: 0.08,
  s1FlyEnd: 0.22,
  s1SettleStart: 0.22,
  s1SettleEnd: 0.3,
  s1CheckStart: 0.27,
  s1CheckEnd: 0.3,

  // Transition 1 → 2
  t12Start: 0.3,
  t12End: 0.38,

  // Scene 2 — Network
  s2Start: 0.38,
  s2End: 0.65,
  s2Edges: [
    [0.38, 0.43], // ERP → CRM
    [0.43, 0.48], // ERP → FACT
    [0.48, 0.53], // FACT → APP
    [0.53, 0.58], // CRM → APP
  ] as const,
  s2PacketsStart: 0.6,
  s2PacketsEnd: 0.65,

  // Transition 2 → 3
  t23Start: 0.65,
  t23PulseStart: 0.68,
  t23PulseMid: 0.69,
  t23PulseEnd: 0.7,
  flashStart: 0.7,
  flashPeak: 0.706,
  flashEnd: 0.715,
  unmountAt: 0.715,
  t23End: 0.72,

  // Scene 3 — Declaration
  s3Start: 0.72,
  s3End: 1.0,
  s3WordsStart: 0.72,
  s3WordsEnd: 0.78,
  s3WordStagger: 0.012, // ~180ms in scroll fraction
  s3SubtitleStart: 0.78,
  s3SubtitleEnd: 0.85,
  s3ContinueStart: 0.95,
  s3ContinueEnd: 1.0,
} as const;

export type Field = {
  id: string;
  label: string;
  value: string;
};

export const FIELDS: Field[] = [
  { id: "numero", label: "NÚMERO", value: "2024/847" },
  { id: "data", label: "DATA", value: "15-10-2024" },
  { id: "fornecedor", label: "FORNECEDOR", value: "TechParts Lda" },
  { id: "nif", label: "NIF", value: "509 234 567" },
  { id: "descricao", label: "DESCRIÇÃO", value: "Manutenção Q3" },
  { id: "valor", label: "VALOR", value: "€12.450,00" },
  { id: "vencimento", label: "VENCIMENTO", value: "30 dias" },
];

/** Per-field stagger inside Scene 1 (each phase is split into 7 slots). */
export function fieldLightRange(index: number): [number, number] {
  const span = SCROLL.s1LightEnd - SCROLL.s1LightStart;
  const step = span / FIELDS.length;
  const start = SCROLL.s1LightStart + step * index;
  return [start, start + step + 0.005];
}

export function fieldFlyRange(index: number): [number, number] {
  // Stagger field starts so the last fly still ends before settle.
  const start = SCROLL.s1FlyStart + index * 0.012;
  const end = start + 0.07;
  return [start, end];
}

export function edgeRange(index: number): readonly [number, number] {
  return SCROLL.s2Edges[index];
}

export type SceneNode = {
  id: string;
  label: string;
  name: string;
  /** Position of node CENTER as fraction of viewport. */
  x: number;
  y: number;
  w: number;
  h: number;
};

export const NODES: SceneNode[] = [
  {
    id: "erp",
    label: "ERP",
    name: "SAP",
    x: 0.18,
    y: 0.42,
    w: 240,
    h: 140,
  },
  {
    id: "crm",
    label: "CRM",
    name: "SALESFORCE",
    x: 0.58,
    y: 0.22,
    w: 180,
    h: 100,
  },
  {
    id: "fact",
    label: "FACTURAÇÃO",
    name: "PRIMAVERA",
    x: 0.72,
    y: 0.68,
    w: 180,
    h: 100,
  },
  {
    id: "app",
    label: "APP MÓVEL",
    name: "UNREAL ONE",
    x: 0.42,
    y: 0.78,
    w: 140,
    h: 80,
  },
];

/** Edges in narrative order: ERP-CRM, ERP-FACT, FACT-APP, CRM-APP. */
export const EDGES: ReadonlyArray<readonly [number, number, number]> = [
  // [fromNodeIndex, toNodeIndex, bowSign] — bow controls which side the curve bulges to.
  [0, 1, +1],
  [0, 2, +1],
  [2, 3, -1],
  [1, 3, -1],
];

/**
 * Generate an organic cubic-Bezier path string with two control points.
 * The control points sit at 30% / 70% along the segment with a perpendicular
 * offset, and the offset magnitudes differ so the curve isn't a symmetric arc.
 */
export function organicCubic(
  sx: number,
  sy: number,
  dx: number,
  dy: number,
  bow = 1
): string {
  const segDx = dx - sx;
  const segDy = dy - sy;
  const len = Math.sqrt(segDx * segDx + segDy * segDy) || 1;
  const nx = -segDy / len;
  const ny = segDx / len;

  const bow1 = bow * Math.min(120, len * 0.22);
  const bow2 = bow * Math.min(80, len * 0.14);

  const c1x = sx + segDx * 0.32 + nx * bow1;
  const c1y = sy + segDy * 0.32 + ny * bow1;
  const c2x = sx + segDx * 0.68 + nx * bow2;
  const c2y = sy + segDy * 0.68 + ny * bow2;

  return `M ${sx} ${sy} C ${c1x} ${c1y} ${c2x} ${c2y} ${dx} ${dy}`;
}

export const PHRASE = [
  "Construímos",
  "o",
  "sistema",
  "que",
  "vos",
  "falta.",
];
