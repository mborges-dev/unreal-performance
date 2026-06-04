"use client";

import {
  useRef,
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  Fragment,
  type ReactNode,
} from "react";
import {
  motion,
  useScroll as useScrollRaw,
  useTransform,
  useSpring,
  useMotionValue,
  useMotionValueEvent,
  useMotionTemplate,
  useInView,
  type MotionValue,
} from "framer-motion";
import { animate } from "framer-motion";

// framer-motion v12 accelerates derived motion values via the Web
// Animations API. When `useScroll({ target })` is used and the resulting
// progress feeds a `useTransform` whose result is bound to a `motion.*`
// style, framer attaches a `ViewTimeline` keyed on `target.current`.
// But that bind runs in the motion component's layout effect — which in
// React fires BEFORE the parent's ref has settled, so `target.current`
// is null and framer silently falls back to a document-wide
// `ScrollTimeline`. Result: every motion value driven by every `useScroll`
// on the page reads the same global scroll progress, so multiple sibling
// scroll-pinned sections all dim in lockstep instead of each tracking
// its own wrapper. Strip `.accelerate` to keep the JS subscription path,
// which reads `target.current` from inside a layout effect (where it IS
// attached) via framer's own deferred-ref handling.
function useScroll(opts: Parameters<typeof useScrollRaw>[0]) {
  const result = useScrollRaw(opts);
  result.scrollXProgress.accelerate = undefined;
  result.scrollYProgress.accelerate = undefined;
  return result;
}
import Image from "next/image";
import {
  Anchor,
  ArrowRight,
  BarChart3,
  Battery,
  Camera,
  Check,
  Focus,
  History,
  Home,
  Signal,
  Unlock,
  User,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import {
  SCROLL,
  FIELDS,
  NODES,
  EDGES,
  PHRASE,
  WINDOWS,
  NODE_APPEAR_RANGES,
  HERO_TIMELINE,
  HERO_FADE,
  GLOBAL_KEYS,
  CASCADE_KEYS,
  computeMounts,
  mountsEqual,
  getPrimaryScene,
  organicCubic,
  fieldLightRange,
  fieldFlyRange,
  type Field,
  type SceneNode,
  type Mounts,
  type SceneKey,
} from "./cascata/_lib/utils";
import { usePrefersReducedMotion } from "./cascata/_lib/hooks";

/* -------------------------------------------------------------------------
   Page / orchestrator
   ------------------------------------------------------------------------- */

export default function HeroPage() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: scrollRef,
    offset: ["start start", "end end"],
  });

  // Page-level mounts for the normal-flow sections. The cascade scenes
  // are tracked inside Stage's own mounts state.
  //
  // Both sections stay mounted once entered: they're NORMAL-FLOW
  // (their height is part of document scrollability). Unmounting them
  // mid-page would shift later content up out of the viewport.
  const [problemaMounted, setProblemaMounted] = useState(
    () => scrollYProgress.get() >= WINDOWS.problema[0]
  );
  const [comoPensamosMounted, setComoPensamosMounted] = useState(
    () => scrollYProgress.get() >= WINDOWS.comoPensamos[0]
  );
  const [capacidadeMounted, setCapacidadeMounted] = useState(
    () => scrollYProgress.get() >= WINDOWS.capacidade[0]
  );
  const [processoMounted, setProcessoMounted] = useState(
    () => scrollYProgress.get() >= WINDOWS.processo[0]
  );
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const nextProblema = latest >= WINDOWS.problema[0];
    if (nextProblema !== problemaMounted) setProblemaMounted(nextProblema);
    const nextComo = latest >= WINDOWS.comoPensamos[0];
    if (nextComo !== comoPensamosMounted) setComoPensamosMounted(nextComo);
    const nextCapacidade = latest >= WINDOWS.capacidade[0];
    if (nextCapacidade !== capacidadeMounted) setCapacidadeMounted(nextCapacidade);
    const nextProcesso = latest >= WINDOWS.processo[0];
    if (nextProcesso !== processoMounted) setProcessoMounted(nextProcesso);
  });

  return (
    <div ref={scrollRef} className="relative h-[3200vh]">
      {/* Cascade portion — sticky stage stays pinned for its 800vh. */}
      <div className="h-[800vh]">
        <div className="sticky top-0 h-screen w-full overflow-hidden">
          <Stage scrollYProgress={scrollYProgress} />
        </div>
      </div>
      {/* "O Problema" — data dashboard, normal-flow, 800vh. */}
      {problemaMounted && (
        <ProblemaSection scrollYProgress={scrollYProgress} />
      )}
      {/* "Como Pensamos" — philosophy section, normal-flow, 800vh. */}
      {comoPensamosMounted && (
        <ComoPensamosSection scrollYProgress={scrollYProgress} />
      )}
      {/* "Capacidade Demonstrada" — projects section, normal-flow, 800vh. */}
      {capacidadeMounted && (
        <CapacidadeSection scrollYProgress={scrollYProgress} />
      )}
      {/* "O Processo" — three editorial phase cards, normal-flow, ~562vh.
          Overflows beyond the 3200vh scrollRef wrapper; document scroll
          extends naturally to accommodate. */}
      {processoMounted && <ProcessoSection />}
    </div>
  );
}

/* -------------------------------------------------------------------------
   Stage — measures viewport + field anchor points and renders all elements
   ------------------------------------------------------------------------- */

type FieldCoords = { sx: number; sy: number; dx: number; dy: number };

function Stage({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    if (!stageRef.current) return;
    const stage = stageRef.current;
    function measure() {
      const sb = stage.getBoundingClientRect();
      setSize({ w: sb.width, h: sb.height });
    }
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  const prefersReduced = usePrefersReducedMotion();

  // The cascade still thinks in its own 0–1 scroll. We remap from the
  // global scroll piecewise so each scene's slice of global scroll keeps
  // its visible boundaries while the SCROLL.* constants stay readable.
  const cascadeProgress = useTransform(
    scrollYProgress,
    GLOBAL_KEYS as number[],
    CASCADE_KEYS as number[]
  );

  const [mounts, setMounts] = useState<Mounts>(() =>
    computeMounts(scrollYProgress.get())
  );

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    setMounts((prev) => {
      const next = computeMounts(latest);
      return mountsEqual(prev, next) ? prev : next;
    });
  });

  return (
    <div ref={stageRef} className="relative w-full h-full">
      <SvgDefs />
      {mounts.hero && <HeroPart1 scrollYProgress={scrollYProgress} />}
      {mounts.c1 && (
        <Cena1
          scrollYProgress={cascadeProgress}
          size={size}
          prefersReduced={prefersReduced}
        />
      )}
      {mounts.t12 && (
        <Transicao1Para2
          scrollYProgress={cascadeProgress}
          size={size}
        />
      )}
      {mounts.c2 && (
        <Cena2
          scrollYProgress={cascadeProgress}
          size={size}
          prefersReduced={prefersReduced}
        />
      )}
      {mounts.t23 && (
        <Transicao2Para3 scrollYProgress={cascadeProgress} />
      )}
      {mounts.c3 && <Cena3 scrollYProgress={cascadeProgress} />}
      {process.env.NODE_ENV === "development" && (
        <DebugPanel
          scrollYProgress={scrollYProgress}
          mounts={mounts}
        />
      )}
    </div>
  );
}

function DebugPanel({
  scrollYProgress,
  mounts,
}: {
  scrollYProgress: MotionValue<number>;
  mounts: Mounts;
}) {
  const [latest, setLatest] = useState(() => scrollYProgress.get());
  useMotionValueEvent(scrollYProgress, "change", (v) => setLatest(v));

  const mountedKeys = (Object.keys(mounts) as SceneKey[]).filter(
    (k) => mounts[k]
  );
  const primary = getPrimaryScene(latest);

  return (
    <div
      data-debug="scenes"
      style={{
        position: "fixed",
        bottom: 16,
        left: 16,
        zIndex: 100,
        padding: "10px 14px",
        background: "rgba(0,0,0,0.65)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 4,
        fontFamily: "var(--font-ibm-plex-mono), monospace",
        fontSize: 11,
        color: "#FAFAFA",
        lineHeight: 1.6,
        pointerEvents: "none",
        whiteSpace: "pre",
      }}
    >
      {`scroll:   ${latest.toFixed(3)}\nmounted:  ${
        mountedKeys.join(", ") || "—"
      }\nprimary:  ${primary}`}
    </div>
  );
}

/* -------------------------------------------------------------------------
   Scene wrappers — each owns its visual elements and is mount/unmounted as
   one unit. Cena1 also owns the field-position measurement because its
   refs reset whenever the scene re-mounts (e.g. on scroll-up from past
   the buffer back into Scene 1).
   ------------------------------------------------------------------------- */

function Cena1({
  scrollYProgress,
  size,
  prefersReduced,
}: {
  scrollYProgress: MotionValue<number>;
  size: { w: number; h: number };
  prefersReduced: boolean;
}) {
  const cena1Ref = useRef<HTMLDivElement>(null);
  const fieldSourceRefs = useRef<Record<string, HTMLElement | null>>({});
  const fieldDestRefs = useRef<Record<string, HTMLElement | null>>({});
  const [fieldCoords, setFieldCoords] = useState<Record<string, FieldCoords>>(
    {}
  );

  const registerSource = useCallback(
    (id: string, el: HTMLElement | null) => {
      fieldSourceRefs.current[id] = el;
    },
    []
  );
  const registerDest = useCallback((id: string, el: HTMLElement | null) => {
    fieldDestRefs.current[id] = el;
  }, []);

  useLayoutEffect(() => {
    if (!cena1Ref.current) return;
    const container = cena1Ref.current;
    function measure() {
      const sb = container.getBoundingClientRect();
      const next: Record<string, FieldCoords> = {};
      FIELDS.forEach((f) => {
        const src = fieldSourceRefs.current[f.id];
        const dst = fieldDestRefs.current[f.id];
        if (!src || !dst) return;
        const srcR = src.getBoundingClientRect();
        const dstR = dst.getBoundingClientRect();
        next[f.id] = {
          sx: srcR.left + srcR.width / 2 - sb.left,
          sy: srcR.top + srcR.height / 2 - sb.top,
          dx: dstR.left + dstR.width / 2 - sb.left,
          dy: dstR.top + dstR.height / 2 - sb.top,
        };
      });
      setFieldCoords(next);
    }
    measure();
    const t1 = window.setTimeout(measure, 80);
    const t2 = window.setTimeout(measure, 350);
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      ro.disconnect();
    };
  }, [size.w, size.h]);

  // Cena 1's factura is presented "already complete" at scroll 5%. There is
  // no materialisation animation — the Hero fade-out alone reveals it.
  return (
    <div
      ref={cena1Ref}
      className="absolute inset-0 pointer-events-none"
      data-scene="cena1"
    >
      <Invoice
        scrollYProgress={scrollYProgress}
        registerSource={registerSource}
        prefersReduced={prefersReduced}
      />
      <DataCardScene1
        scrollYProgress={scrollYProgress}
        registerDest={registerDest}
      />
      {Object.keys(fieldCoords).length === FIELDS.length && size.w > 0 && (
        <>
          <FlyTraces
            coords={fieldCoords}
            scrollYProgress={scrollYProgress}
            size={size}
          />
          <FlyingValues
            coords={fieldCoords}
            scrollYProgress={scrollYProgress}
          />
        </>
      )}
    </div>
  );
}

function Transicao1Para2({
  scrollYProgress,
  size,
}: {
  scrollYProgress: MotionValue<number>;
  size: { w: number; h: number };
}) {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      data-scene="transicao1para2"
    >
      <MorphingCard scrollYProgress={scrollYProgress} />
      {size.w > 0 && size.h > 0 && (
        <MorphParticles scrollYProgress={scrollYProgress} size={size} />
      )}
    </div>
  );
}

function Cena2({
  scrollYProgress,
  size,
  prefersReduced,
}: {
  scrollYProgress: MotionValue<number>;
  size: { w: number; h: number };
  prefersReduced: boolean;
}) {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      data-scene="cena2"
    >
      <Network
        scrollYProgress={scrollYProgress}
        size={size}
        prefersReduced={prefersReduced}
      />
    </div>
  );
}

function Transicao2Para3({
  scrollYProgress,
}: {
  scrollYProgress: MotionValue<number>;
}) {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      data-scene="transicao2para3"
    >
      <Convergence scrollYProgress={scrollYProgress} />
      <Flash scrollYProgress={scrollYProgress} />
    </div>
  );
}

function Cena3({
  scrollYProgress,
}: {
  scrollYProgress: MotionValue<number>;
}) {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      data-scene="cena3"
    >
      <Scene3Background scrollYProgress={scrollYProgress} />
      <Declaration scrollYProgress={scrollYProgress} />
    </div>
  );
}

/* -------------------------------------------------------------------------
   "O PROBLEMA" — Scroll-driven editorial data dashboard. Seven indicators
   on the state of operations in Portugal and Europe. Every number is
   static, sourced, and verifiable — no live data, no decorative graphs.
   Each indicator counts up on first viewport entry, accompanied by a
   short whisper + a crystalline settle bell. The final indicator is a
   special three-column comparison (Portugal / Europe / 2030 target).

   Layout (800vh total):
     ┌─  32vh   transition
     ├─ 100vh   label "02 — O PROBLEMA" + subtitle
     ├─ 6×80vh  alternating left/right indicators
     ├─  80vh   indicator 7 (centred, full width, 3 columns)
     ├─ 100vh   remate + bridge → "03 — COMO PENSAMOS"
     └─   8vh   trailing buffer
   ------------------------------------------------------------------------- */

const EASE_EXPO_OUT_PROBLEMA: [number, number, number, number] = [0.16, 1, 0.3, 1];
const EASE_POWER3_INOUT_PROBLEMA: [number, number, number, number] = [
  0.65, 0, 0.35, 1,
];

type IndicatorAlign = "left" | "right";

type Indicator = {
  id: string;
  align: IndicatorAlign;
  label: string;
  value: number;
  decimals: number;
  unit: string;
  unitFamily: "mono" | "sans";
  unitSize: number;
  context: string;
  source: string;
  duration: number;
};

const INDICATORS: ReadonlyArray<Indicator> = [
  {
    id: "tempo",
    align: "left",
    label: "01 — TEMPO PERDIDO",
    value: 4.5,
    decimals: 1,
    unit: "h",
    unitFamily: "mono",
    unitSize: 48,
    context:
      "é o tempo que cada trabalhador de escritório perde por semana em tarefas que poderiam ser automatizadas. Quase um dia de trabalho inteiro, todos os meses.",
    source: "FONTE — UIPATH OFFICE WORKER SURVEY, 2021",
    duration: 1400,
  },
  {
    id: "potencial",
    align: "right",
    label: "02 — POTENCIAL",
    value: 57,
    decimals: 0,
    unit: "%",
    unitFamily: "mono",
    unitSize: 48,
    context:
      "das horas de trabalho actuais podem ser automatizadas com tecnologia que já existe hoje. Há dois anos eram 30%. A linha do 'um dia' tornou-se 'agora'.",
    source: "FONTE — MCKINSEY GLOBAL INSTITUTE, NOV 2025",
    duration: 1400,
  },
  {
    id: "fecho",
    align: "left",
    label: "03 — DECISÕES A ESPERAR",
    value: 7,
    decimals: 0,
    unit: "dias",
    unitFamily: "sans",
    unitSize: 32,
    context:
      "é o tempo médio que uma empresa demora a fechar contas mensais. Durante uma semana inteira, as decisões funcionam com o mês anterior.",
    source: "FONTE — VENTANA RESEARCH BENCHMARK, 2023",
    duration: 1200,
  },
  {
    id: "fragmentacao",
    align: "right",
    label: "04 — FRAGMENTAÇÃO",
    value: 62,
    decimals: 0,
    unit: "%",
    unitFamily: "mono",
    unitSize: 48,
    context:
      "das equipas financeiras ainda usam folhas de cálculo como ferramenta principal de fecho de contas. Spreadsheets que ninguém auditou, que ninguém valida, que ninguém integra.",
    source: "FONTE — GARTNER FINANCE RESEARCH, 2024",
    duration: 1400,
  },
  {
    id: "erros",
    align: "left",
    label: "05 — ERROS INVISÍVEIS",
    value: 88,
    decimals: 0,
    unit: "%",
    unitFamily: "mono",
    unitSize: 48,
    context:
      "das folhas de cálculo contêm pelo menos um erro. As decisões financeiras das vossas empresas estão a ser tomadas com base em ficheiros que ninguém auditou.",
    source: "FONTE — RAY PANKO, UNIVERSITY OF HAWAII",
    duration: 1400,
  },
  {
    id: "dependencia",
    align: "right",
    label: "06 — DEPENDÊNCIA",
    value: 200,
    decimals: 0,
    unit: "%",
    unitFamily: "mono",
    unitSize: 48,
    context:
      "do salário anual é o custo de substituir um funcionário especializado. Para posições executivas, chega aos 213%. O conhecimento que sai com a pessoa não tem preço — mas a sua substituição tem.",
    source: "FONTE — SHRM + CENTER FOR AMERICAN PROGRESS",
    duration: 1400,
  },
];

type ColumnSpec = {
  title: string;
  value: number;
  decimals: number;
  unit: string;
  duration: number;
  freq: number;
  delay: number;
};

const INDICATOR_7_LABEL = "07 — O ATRASO";
const INDICATOR_7_COLUMNS: ReadonlyArray<ColumnSpec> = [
  { title: "PORTUGAL", value: 8.6, decimals: 1, unit: "%", duration: 1200, freq: 1600, delay: 0 },
  { title: "EUROPA", value: 13.5, decimals: 1, unit: "%", duration: 1200, freq: 1800, delay: 300 },
  { title: "META 2030", value: 75, decimals: 0, unit: "%", duration: 1400, freq: 2200, delay: 600 },
];
const INDICATOR_7_CONTEXT =
  "Adopção de IA empresarial. Portugal está abaixo da média europeia e muito longe da meta de 2030. Esta lacuna não é tecnológica — é de execução.";
const INDICATOR_7_SOURCE =
  "FONTE — DESI/DÉCADA DIGITAL 2024, COMISSÃO EUROPEIA";

function formatPT(value: number, decimals: number): string {
  return value.toFixed(decimals).replace(".", ",");
}

function ProblemaSection({
  scrollYProgress,
}: {
  scrollYProgress: MotionValue<number>;
}) {
  void scrollYProgress;
  return (
    <section
      data-scene="problema"
      className="relative"
      style={{ background: "var(--bg-base)" }}
    >
      <div aria-hidden="true" style={{ height: "32vh" }} />
      <ProblemaLabel />
      {INDICATORS.map((indicator, i) => (
        <ProblemaIndicator
          key={indicator.id}
          indicator={indicator}
          showSeparator={i < INDICATORS.length - 1}
        />
      ))}
      <ProblemaIndicator7 />
      <ProblemaClosing />
      <div aria-hidden="true" style={{ height: "8vh" }} />
    </section>
  );
}

function ProblemaLabel() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });

  return (
    <div
      ref={ref}
      className="flex min-h-screen flex-col items-center justify-center px-6"
      data-problema="label"
    >
      <motion.div
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        className="flex items-center gap-6"
        style={{ marginBottom: 96 }}
      >
        <motion.span
          variants={{
            hidden: { width: 0 },
            visible: {
              width: 64,
              transition: { duration: 0.9, ease: EASE_POWER3_INOUT_PROBLEMA },
            },
          }}
          aria-hidden="true"
          style={{
            height: 1,
            background: "var(--border)",
            display: "block",
          }}
        />
        <motion.h2
          variants={{
            hidden: { opacity: 0, y: 12 },
            visible: {
              opacity: 1,
              y: 0,
              transition: {
                duration: 1.1,
                ease: EASE_EXPO_OUT_PROBLEMA,
                delay: 0.3,
              },
            },
          }}
          className="font-mono"
          style={{
            margin: 0,
            fontSize: 14,
            textTransform: "uppercase",
            letterSpacing: "0.3em",
            color: "var(--text-support)",
          }}
        >
          02 — O PROBLEMA
        </motion.h2>
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
        transition={{
          duration: 1.1,
          delay: 0.8,
          ease: EASE_EXPO_OUT_PROBLEMA,
        }}
        className="font-display text-center"
        style={{
          margin: 0,
          fontWeight: 300,
          fontSize: 32,
          lineHeight: 1.2,
          letterSpacing: "-0.01em",
          color: "#FAFAFA",
          maxWidth: 800,
        }}
      >
        O estado das operações em Portugal e na Europa
      </motion.p>
    </div>
  );
}

function ProblemaIndicator({
  indicator,
  showSeparator,
}: {
  indicator: Indicator;
  showSeparator: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const prefersReduced = usePrefersReducedMotion();
  const fired = useRef(false);
  // Animated counter — only the animation drives it. Reduced-motion users
  // never see this state; the display value is derived below.
  const [counterValue, setCounterValue] = useState(0);

  useEffect(() => {
    if (!inView || fired.current) return;
    fired.current = true;
    if (prefersReduced) return;

    const controls = animate(0, indicator.value, {
      duration: indicator.duration / 1000,
      ease: EASE_EXPO_OUT_PROBLEMA,
      onUpdate: (v) => setCounterValue(v),
    });
    return () => controls.stop();
  }, [inView, prefersReduced, indicator.value, indicator.duration]);

  const colClass =
    indicator.align === "left"
      ? "md:col-start-1 md:col-span-3"
      : "md:col-start-4 md:col-span-3";

  const displayValue = prefersReduced ? indicator.value : counterValue;
  const display = formatPT(displayValue, indicator.decimals);
  const ariaValue = `${formatPT(indicator.value, indicator.decimals)}${indicator.unit}`;

  return (
    <>
      <article
        ref={ref}
        className="flex min-h-[80vh] items-center px-6"
        data-problema-indicator={indicator.id}
      >
        <div className="mx-auto grid w-full max-w-[1280px] grid-cols-1 md:grid-cols-6 md:gap-8">
          <div
            className={`flex flex-col items-center text-center md:items-start md:text-left ${colClass}`}
          >
            <motion.div
              initial="hidden"
              animate={inView ? "visible" : "hidden"}
              className="flex items-center gap-4"
            >
              <motion.span
                variants={{
                  hidden: { width: 0 },
                  visible: {
                    width: 40,
                    transition: {
                      duration: 0.7,
                      ease: EASE_POWER3_INOUT_PROBLEMA,
                    },
                  },
                }}
                aria-hidden="true"
                style={{
                  height: 1,
                  background: "var(--border)",
                  display: "block",
                }}
              />
              <motion.span
                variants={{
                  hidden: { opacity: 0, y: 8 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: {
                      duration: 0.7,
                      ease: EASE_EXPO_OUT_PROBLEMA,
                      delay: 0.2,
                    },
                  },
                }}
                className="font-mono"
                style={{
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.25em",
                  color: "var(--text-support)",
                }}
              >
                {indicator.label}
              </motion.span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
              transition={{
                duration: 0.7,
                delay: 0.15,
                ease: EASE_EXPO_OUT_PROBLEMA,
              }}
              className="flex items-baseline"
              style={{ marginTop: 24 }}
              aria-label={ariaValue}
            >
              <span
                className="font-display text-[clamp(56px,14vw,96px)] md:text-[clamp(64px,10vw,120px)] xl:text-[clamp(96px,12vw,180px)]"
                style={{
                  fontWeight: 300,
                  lineHeight: 1,
                  letterSpacing: "-0.04em",
                  color: "#FAFAFA",
                }}
                aria-hidden="true"
              >
                {display}
              </span>
              <span
                className={
                  indicator.unitFamily === "mono" ? "font-mono" : "font-sans"
                }
                style={{
                  marginLeft: 8,
                  fontSize: indicator.unitSize,
                  lineHeight: 1,
                  color: "#FAFAFA",
                  fontWeight: indicator.unitFamily === "sans" ? 500 : 400,
                  letterSpacing:
                    indicator.unitFamily === "mono" ? "0.05em" : "-0.01em",
                  textTransform:
                    indicator.unitFamily === "mono" ? "uppercase" : "none",
                }}
                aria-hidden="true"
              >
                {indicator.unit}
              </span>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
              transition={{
                duration: 0.9,
                delay: 0.6,
                ease: EASE_EXPO_OUT_PROBLEMA,
              }}
              className="font-sans"
              style={{
                marginTop: 32,
                marginBottom: 0,
                fontSize: 18,
                lineHeight: 1.5,
                color: "#D4D4D8",
                maxWidth: 480,
              }}
            >
              {indicator.context}
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: inView ? 1 : 0 }}
              transition={{
                duration: 0.6,
                delay: 1.0,
                ease: EASE_EXPO_OUT_PROBLEMA,
              }}
              className="font-mono"
              style={{
                marginTop: 24,
                marginBottom: 0,
                fontSize: 11,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "#52525B",
              }}
            >
              {indicator.source}
            </motion.p>
          </div>
        </div>
      </article>
      {showSeparator && <ProblemaSeparator align={indicator.align} />}
    </>
  );
}

function ProblemaSeparator({ align }: { align: IndicatorAlign }) {
  return (
    <div className="px-6" aria-hidden="true">
      <div
        className={`mx-auto flex w-full max-w-[1280px] ${
          align === "left" ? "justify-start" : "justify-end"
        }`}
      >
        <div style={{ width: "40%", height: 1, background: "#1F1F23" }} />
      </div>
    </div>
  );
}

function ProblemaIndicator7() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const prefersReduced = usePrefersReducedMotion();
  const fired = useRef(false);

  // Animation drives counterValues + settled flags. Reduced-motion is
  // applied at render time via the derived `displayValues` / `displaySettled`
  // below, so the effect never touches state when motion is off.
  const [counterValues, setCounterValues] = useState<number[]>(() =>
    INDICATOR_7_COLUMNS.map(() => 0)
  );
  const [settled, setSettled] = useState<boolean[]>(() =>
    INDICATOR_7_COLUMNS.map(() => false)
  );

  useEffect(() => {
    if (!inView || fired.current) return;
    fired.current = true;
    if (prefersReduced) return;

    const cleanups: Array<() => void> = [];
    INDICATOR_7_COLUMNS.forEach((col, i) => {
      const t = window.setTimeout(() => {
        const controls = animate(0, col.value, {
          duration: col.duration / 1000,
          ease: EASE_EXPO_OUT_PROBLEMA,
          onUpdate: (v) =>
            setCounterValues((prev) => {
              if (prev[i] === v) return prev;
              const next = [...prev];
              next[i] = v;
              return next;
            }),
          onComplete: () => {
            setSettled((prev) => {
              const next = [...prev];
              next[i] = true;
              return next;
            });
          },
        });
        cleanups.push(() => controls.stop());
      }, col.delay);
      cleanups.push(() => window.clearTimeout(t));
    });

    return () => cleanups.forEach((c) => c());
  }, [inView, prefersReduced]);

  const displayValues = prefersReduced
    ? INDICATOR_7_COLUMNS.map((c) => c.value)
    : counterValues;
  const displaySettled = prefersReduced
    ? INDICATOR_7_COLUMNS.map(() => true)
    : settled;

  return (
    <article
      ref={ref}
      className="flex min-h-[80vh] items-center px-6"
      data-problema-indicator="atraso"
    >
      <div className="mx-auto w-full max-w-[1280px]">
        <motion.div
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="flex items-center justify-center gap-4"
        >
          <motion.span
            variants={{
              hidden: { width: 0 },
              visible: {
                width: 40,
                transition: {
                  duration: 0.7,
                  ease: EASE_POWER3_INOUT_PROBLEMA,
                },
              },
            }}
            aria-hidden="true"
            style={{
              height: 1,
              background: "var(--border)",
              display: "block",
            }}
          />
          <motion.span
            variants={{
              hidden: { opacity: 0, y: 8 },
              visible: {
                opacity: 1,
                y: 0,
                transition: {
                  duration: 0.7,
                  ease: EASE_EXPO_OUT_PROBLEMA,
                  delay: 0.2,
                },
              },
            }}
            className="font-mono"
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.25em",
              color: "var(--text-support)",
            }}
          >
            {INDICATOR_7_LABEL}
          </motion.span>
        </motion.div>

        <div
          className="grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-8"
          style={{ marginTop: 56 }}
        >
          {INDICATOR_7_COLUMNS.map((col, i) => (
            <div key={col.title} className="flex flex-col items-center text-center">
              <motion.span
                initial={{ opacity: 0, y: 8 }}
                animate={
                  inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }
                }
                transition={{
                  duration: 0.7,
                  delay: 0.15 + i * 0.1,
                  ease: EASE_EXPO_OUT_PROBLEMA,
                }}
                className="font-mono"
                style={{
                  fontSize: 14,
                  textTransform: "uppercase",
                  letterSpacing: "0.25em",
                  color: "var(--text-support)",
                  marginBottom: 16,
                }}
              >
                {col.title}
              </motion.span>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: inView ? 1 : 0 }}
                transition={{
                  duration: 0.5,
                  delay: 0.2 + i * 0.1,
                  ease: EASE_EXPO_OUT_PROBLEMA,
                }}
                className="flex items-baseline justify-center"
                aria-label={`${formatPT(col.value, col.decimals)}${col.unit}`}
              >
                <span
                  className="font-display text-[clamp(56px,14vw,96px)] md:text-[clamp(56px,10vw,120px)]"
                  style={{
                    fontWeight: 300,
                    lineHeight: 1,
                    letterSpacing: "-0.04em",
                    color: "#FAFAFA",
                  }}
                  aria-hidden="true"
                >
                  {formatPT(displayValues[i], col.decimals)}
                </span>
                <span
                  className="font-mono"
                  style={{
                    marginLeft: 6,
                    fontSize: 32,
                    lineHeight: 1,
                    color: "#FAFAFA",
                    letterSpacing: "0.05em",
                  }}
                  aria-hidden="true"
                >
                  {col.unit}
                </span>
              </motion.div>
              <motion.span
                aria-hidden="true"
                initial={{ opacity: 0, y: -4 }}
                animate={
                  displaySettled[i] ? { opacity: 1, y: 0 } : { opacity: 0, y: -4 }
                }
                transition={{ duration: 0.5, ease: EASE_EXPO_OUT_PROBLEMA }}
                className="font-mono"
                style={{
                  marginTop: 12,
                  fontSize: 18,
                  color: "#52525B",
                  display: "inline-block",
                  animation: displaySettled[i]
                    ? "heroScrollArrow 2.4s ease-in-out infinite"
                    : undefined,
                }}
              >
                ↓
              </motion.span>
            </div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{
            duration: 0.9,
            delay: 1.4,
            ease: EASE_EXPO_OUT_PROBLEMA,
          }}
          className="font-sans text-center mx-auto"
          style={{
            marginTop: 56,
            marginBottom: 0,
            fontSize: 18,
            lineHeight: 1.5,
            color: "#D4D4D8",
            maxWidth: 720,
          }}
        >
          {INDICATOR_7_CONTEXT}
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: inView ? 1 : 0 }}
          transition={{
            duration: 0.6,
            delay: 1.8,
            ease: EASE_EXPO_OUT_PROBLEMA,
          }}
          className="font-mono text-center"
          style={{
            marginTop: 24,
            marginBottom: 0,
            fontSize: 11,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#52525B",
          }}
        >
          {INDICATOR_7_SOURCE}
        </motion.p>
      </div>
    </article>
  );
}

function ProblemaClosing() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });

  const phrase = "Os dados não enganam. Os processos é que ainda não acompanham.";
  const words = phrase.split(" ");

  return (
    <div
      ref={ref}
      className="flex min-h-screen items-center px-6"
      data-problema="closing"
    >
      <div className="mx-auto w-full max-w-[1280px]">
        <div className="max-w-[720px]">
          <p
            className="font-display"
            style={{
              margin: 0,
              fontWeight: 300,
              fontSize: 36,
              lineHeight: 1.3,
              letterSpacing: "-0.01em",
              color: "#A1A1AA",
            }}
          >
            {words.map((word, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 16 }}
                animate={
                  inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }
                }
                transition={{
                  duration: 0.9,
                  delay: i * 0.1,
                  ease: EASE_EXPO_OUT_PROBLEMA,
                }}
                style={{ display: "inline-block", marginRight: "0.25em" }}
              >
                {word}
              </motion.span>
            ))}
          </p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            transition={{
              duration: 0.7,
              delay: words.length * 0.1 + 0.5,
              ease: EASE_EXPO_OUT_PROBLEMA,
            }}
            className="flex items-center gap-3"
            style={{ marginTop: 64 }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 24,
                height: 1,
                background: "var(--border)",
                display: "block",
              }}
            />
            <span
              className="font-mono"
              style={{
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: "0.3em",
                color: "#52525B",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  animation: "heroScrollArrow 2s ease-in-out infinite",
                  marginRight: "0.6em",
                }}
              >
                ↓
              </span>
              03 — COMO PENSAMOS
            </span>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
   "COMO PENSAMOS" — Philosophy section, pinned horizontal scroll. Four
   large cards (~80vw × 80vh) move right-to-left as the user scrolls; the
   stage is sticky for the duration of the horizontal traversal, then
   un-pins so the page resumes vertical scroll into the closing/bridge.

   Hover (desktop only): an 800px-radius blue radial spotlight follows the
   cursor inside the focused card, driven by direct DOM setProperty calls
   on --mouse-x / --mouse-y / --gradient-opacity (see globals.css for the
   ::before that consumes them). No other state changes on hover.

   Mobile (<768px) and prefers-reduced-motion fall back to a vertical
   stack — pinned horizontal scroll is disabled, no hover spotlight, no
   progress indicator / scroll hint / persistent label.

   Layout (800vh total):
     ┌─  32vh   transition
     ├─ 100vh   label + subtitle
     ├─ 500vh   pinned wrapper (sticky 100vh stage + horizontal track)
     ├─ 100vh   remate + bridge → "04 — CAPACIDADE DEMONSTRADA"
     └─  68vh   trailing buffer
   ------------------------------------------------------------------------- */

type Principle = {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
};

const PRINCIPLES: ReadonlyArray<Principle> = [
  {
    id: "01",
    icon: ArrowRight,
    title: "IMPLEMENTAÇÃO DIRECTA",
    description:
      "Quem analisa o problema é quem o resolve. Sem camadas comerciais, sem gestores intermédios, sem equipas externas. A equipa que vos apresenta o projecto é a mesma que escreve o código.",
  },
  {
    id: "02",
    icon: Focus,
    title: "BOUTIQUE TÉCNICA",
    description:
      "Profundidade antes de volume. Não escalamos por aceitar mais — escalamos por aprofundar. Cada projecto recebe atenção dedicada.",
  },
  {
    id: "03",
    icon: Unlock,
    title: "SEM CAIXAS NEGRAS",
    description:
      "O sistema é vosso quando terminamos. Não vosso e nosso. Construímos com tecnologia que a vossa equipa pode operar sozinha — sem dependências que vos obriguem a voltar a contratar-nos.",
  },
  {
    id: "04",
    icon: Anchor,
    title: "CONTINUIDADE APÓS ENTREGA",
    description:
      "Não desaparecemos no dia da entrega. Os primeiros meses depois de um sistema ir para produção são os mais importantes. Ficamos disponíveis durante esse período sem mais contratos — porque é parte do trabalho, não um extra.",
  },
];

function ComoPensamosSection({
  scrollYProgress,
}: {
  scrollYProgress: MotionValue<number>;
}) {
  void scrollYProgress;
  return (
    <section
      data-scene="comoPensamos"
      aria-labelledby="como-pensamos-label"
      className="relative"
      style={{ background: "var(--bg-base)" }}
    >
      <div aria-hidden="true" style={{ height: "32vh" }} />
      <ComoPensamosLabel />
      <ComoPensamosCards />
      <ComoPensamosClosing />
      <div aria-hidden="true" style={{ height: "68vh" }} />
    </section>
  );
}

function ComoPensamosLabel() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });

  return (
    <div
      ref={ref}
      className="flex min-h-screen flex-col items-center justify-center px-6"
      data-como="label"
    >
      <motion.div
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        className="flex items-center gap-6"
        style={{ marginBottom: 96 }}
      >
        <motion.span
          variants={{
            hidden: { width: 0 },
            visible: {
              width: 64,
              transition: { duration: 0.9, ease: EASE_POWER3_INOUT_PROBLEMA },
            },
          }}
          aria-hidden="true"
          style={{
            height: 1,
            background: "var(--border)",
            display: "block",
          }}
        />
        <motion.h2
          id="como-pensamos-label"
          variants={{
            hidden: { opacity: 0, y: 12 },
            visible: {
              opacity: 1,
              y: 0,
              transition: {
                duration: 1.1,
                ease: EASE_EXPO_OUT_PROBLEMA,
                delay: 0.3,
              },
            },
          }}
          className="font-mono"
          style={{
            margin: 0,
            fontSize: 14,
            textTransform: "uppercase",
            letterSpacing: "0.3em",
            color: "var(--text-support)",
          }}
        >
          03 — COMO PENSAMOS
        </motion.h2>
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
        transition={{
          duration: 1.1,
          delay: 0.8,
          ease: EASE_EXPO_OUT_PROBLEMA,
        }}
        className="font-display text-center"
        style={{
          margin: 0,
          fontWeight: 300,
          fontSize: 32,
          lineHeight: 1.2,
          letterSpacing: "-0.01em",
          color: "#FAFAFA",
          maxWidth: 720,
        }}
      >
        Quatro princípios que definem como trabalhamos.
      </motion.p>
    </div>
  );
}

/**
 * Returns true on desktop+tablet (≥768px) — the breakpoint above which
 * the pinned horizontal scroll is enabled. Server render and the first
 * client render both yield false (mobile-first). The section is mounted
 * lazily via comoPensamosMounted, well after hydration, so the SSR/CSR
 * mismatch is moot in practice.
 */
function useIsDesktopOrTablet(): boolean {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setMatch(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return match;
}

function ComoPensamosCards() {
  const prefersReduced = usePrefersReducedMotion();
  const isDesktop = useIsDesktopOrTablet();

  // Mobile and reduced-motion both fall back to vertical stack.
  if (!isDesktop || prefersReduced) {
    return <ComoPensamosStackedCards prefersReduced={prefersReduced} />;
  }
  return <ComoPensamosPinnedCards />;
}

function ComoPensamosPinnedCards() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  // Local scroll progress for the pinned wrapper: 0 when its top hits
  // the viewport top, 1 when its bottom hits the viewport bottom. The
  // wrapper is 500vh tall with a 100vh sticky stage inside, so progress
  // 0→1 corresponds to 400vh of vertical scroll — exactly the budget
  // we need to slide through 4 cards (3 inter-card transitions, each
  // about a viewport's worth of scroll, plus the initial settle).
  const { scrollYProgress } = useScroll({
    target: wrapperRef,
    offset: ["start start", "end end"],
  });

  // Track geometry: 4 cards × 80vw + 3 × 5vw inter-card margin = 335vw
  // of card content, plus 10vw padding on each end so the first card
  // starts visually centred (its centre at 50vw) and the last ends
  // centred. To slide from "first centred" to "last centred" requires
  // translating by 3 × (80 + 5) = 255vw to the left. Linear easing —
  // every pixel of vertical scroll maps directly to horizontal motion.
  const xVw = useTransform(scrollYProgress, [0, 1], [0, -255]);
  const x = useMotionTemplate`${xVw}vw`;

  return (
    <div
      ref={wrapperRef}
      data-como="pinned-wrapper"
      style={{ position: "relative", height: "500vh" }}
    >
      <div
        data-como="pinned-stage"
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          width: "100%",
          overflow: "hidden",
        }}
      >
        <ComoPensamosPersistentLabel />
        <ComoPensamosProgressIndicator scrollYProgress={scrollYProgress} />
        <motion.div
          className="flex h-full items-center"
          style={{
            x,
            paddingLeft: "10vw",
            paddingRight: "10vw",
            willChange: "transform",
          }}
        >
          {PRINCIPLES.map((principle, i) => (
            <ComoPensamosBigCard
              key={principle.id}
              principle={principle}
              isLast={i === PRINCIPLES.length - 1}
            />
          ))}
        </motion.div>
        <ComoPensamosScrollHint scrollYProgress={scrollYProgress} />
      </div>
    </div>
  );
}

function ComoPensamosPersistentLabel() {
  return (
    <span
      className="font-mono"
      aria-hidden="true"
      style={{
        position: "absolute",
        top: 32,
        left: 64,
        fontSize: 12,
        textTransform: "uppercase",
        letterSpacing: "0.3em",
        color: "#52525B",
        zIndex: 5,
        pointerEvents: "none",
      }}
    >
      03 — COMO PENSAMOS
    </span>
  );
}

function ComoPensamosProgressIndicator({
  scrollYProgress,
}: {
  scrollYProgress: MotionValue<number>;
}) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        top: 32,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: 8,
        zIndex: 5,
        pointerEvents: "none",
      }}
    >
      {PRINCIPLES.map((_, i) => (
        <ComoPensamosProgressSegment
          key={i}
          index={i}
          scrollYProgress={scrollYProgress}
        />
      ))}
    </div>
  );
}

function ComoPensamosProgressSegment({
  index,
  scrollYProgress,
}: {
  index: number;
  scrollYProgress: MotionValue<number>;
}) {
  // Each segment fills as the user scrolls through that card's slice
  // of the pinned range. Slice = [index/4, (index+1)/4]. Width animates
  // from 0 to 48 (px) — clamped so it stays full once the slice is past.
  const fillWidth = useTransform(
    scrollYProgress,
    [index / PRINCIPLES.length, (index + 1) / PRINCIPLES.length],
    [0, 48],
    { clamp: true }
  );
  return (
    <span
      style={{
        position: "relative",
        width: 48,
        height: 1,
        background: "#27272A",
        display: "block",
      }}
    >
      <motion.span
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          height: 1,
          width: fillWidth,
          background: "#FAFAFA",
          display: "block",
        }}
      />
    </span>
  );
}

function ComoPensamosScrollHint({
  scrollYProgress,
}: {
  scrollYProgress: MotionValue<number>;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const arm = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setVisible(true), 2000);
    };
    arm();
    const unsub = scrollYProgress.on("change", () => {
      // User scrolled — hide hint and re-arm the 2s timer.
      setVisible(false);
      arm();
    });
    return () => {
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, [scrollYProgress]);

  return (
    <motion.div
      aria-hidden="true"
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.4, ease: EASE_EXPO_OUT_PROBLEMA }}
      className="font-mono"
      style={{
        position: "absolute",
        bottom: 32,
        right: 64,
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: "0.25em",
        color: "#52525B",
        zIndex: 5,
        pointerEvents: "none",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span
        style={{
          display: "inline-block",
          animation: "heroScrollArrow 2s ease-in-out infinite",
        }}
      >
        ↓
      </span>
      continuar a scrollar
    </motion.div>
  );
}

function ComoPensamosBigCard({
  principle,
  isLast,
}: {
  principle: Principle;
  isLast: boolean;
}) {
  const cardRef = useRef<HTMLElement>(null);
  const Icon = principle.icon;

  const onMouseMove: React.MouseEventHandler<HTMLElement> = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    cardRef.current.style.setProperty(
      "--mouse-x",
      `${e.clientX - rect.left}px`
    );
    cardRef.current.style.setProperty(
      "--mouse-y",
      `${e.clientY - rect.top}px`
    );
  };
  const onMouseEnter: React.MouseEventHandler<HTMLElement> = () => {
    cardRef.current?.style.setProperty("--gradient-opacity", "1");
  };
  const onMouseLeave: React.MouseEventHandler<HTMLElement> = () => {
    cardRef.current?.style.setProperty("--gradient-opacity", "0");
  };

  return (
    <article
      ref={cardRef}
      aria-labelledby={`principle-${principle.id}-title`}
      onMouseMove={onMouseMove}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="como-card relative flex flex-col"
      style={{
        background: "#0F1115",
        border: "1px solid #27272A",
        borderRadius: 20,
        padding: 64,
        width: "80vw",
        maxWidth: 960,
        height: "80vh",
        maxHeight: 720,
        flexShrink: 0,
        marginRight: isLast ? 0 : "5vw",
      }}
    >
      <div className="relative flex h-full flex-col">
        <span
          className="font-mono"
          style={{
            fontSize: 14,
            letterSpacing: "0.25em",
            color: "#52525B",
          }}
        >
          ( {principle.id} )
        </span>

        <div style={{ marginTop: 48 }} aria-hidden="true">
          <Icon size={48} strokeWidth={1.5} color="#FAFAFA" />
        </div>

        <div className="flex-1" />

        <h3
          id={`principle-${principle.id}-title`}
          className="font-mono"
          style={{
            margin: 0,
            marginBottom: 20,
            fontSize: 16,
            textTransform: "uppercase",
            letterSpacing: "0.25em",
            color: "#A1A1AA",
          }}
        >
          {principle.title}
        </h3>

        <p
          className="font-sans"
          style={{
            margin: 0,
            fontSize: 20,
            lineHeight: 1.55,
            color: "#D4D4D8",
            maxWidth: 560,
          }}
        >
          {principle.description}
        </p>
      </div>
    </article>
  );
}

function ComoPensamosStackedCards({
  prefersReduced,
}: {
  prefersReduced: boolean;
}) {
  return (
    <div
      data-como="stacked"
      className="flex flex-col items-center"
      style={{ gap: 32, padding: "32px 5vw" }}
    >
      {PRINCIPLES.map((principle) => (
        <ComoPensamosStackedCard
          key={principle.id}
          principle={principle}
          prefersReduced={prefersReduced}
        />
      ))}
    </div>
  );
}

function ComoPensamosStackedCard({
  principle,
  prefersReduced,
}: {
  principle: Principle;
  prefersReduced: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const Icon = principle.icon;

  return (
    <motion.article
      ref={ref}
      aria-labelledby={`principle-${principle.id}-title`}
      initial={{ opacity: 0, y: prefersReduced ? 0 : 24 }}
      animate={
        inView
          ? { opacity: 1, y: 0 }
          : { opacity: 0, y: prefersReduced ? 0 : 24 }
      }
      transition={{
        duration: prefersReduced ? 0.4 : 0.9,
        ease: EASE_EXPO_OUT_PROBLEMA,
      }}
      className="relative flex flex-col"
      style={{
        background: "#0F1115",
        border: "1px solid #27272A",
        borderRadius: 20,
        padding: 32,
        width: "90vw",
        maxWidth: 560,
        height: 480,
      }}
    >
      <div className="relative flex h-full flex-col">
        <span
          className="font-mono"
          style={{
            fontSize: 14,
            letterSpacing: "0.25em",
            color: "#52525B",
          }}
        >
          ( {principle.id} )
        </span>

        <div style={{ marginTop: 48 }} aria-hidden="true">
          <Icon size={48} strokeWidth={1.5} color="#FAFAFA" />
        </div>

        <div className="flex-1" />

        <h3
          id={`principle-${principle.id}-title`}
          className="font-mono"
          style={{
            margin: 0,
            marginBottom: 20,
            fontSize: 16,
            textTransform: "uppercase",
            letterSpacing: "0.25em",
            color: "#A1A1AA",
          }}
        >
          {principle.title}
        </h3>

        <p
          className="font-sans"
          style={{
            margin: 0,
            fontSize: 20,
            lineHeight: 1.55,
            color: "#D4D4D8",
            maxWidth: 560,
          }}
        >
          {principle.description}
        </p>
      </div>
    </motion.article>
  );
}

function ComoPensamosClosing() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const prefersReduced = usePrefersReducedMotion();

  const phrase = "É assim que trabalhamos. Agora vejam o que construímos.";
  const words = phrase.split(" ");

  return (
    <div
      ref={ref}
      className="flex min-h-screen items-center px-6"
      data-como="closing"
      style={{ paddingTop: 128 }}
    >
      <div className="mx-auto w-full max-w-[1280px]">
        <div className="max-w-[720px]">
          <p
            className="font-display"
            style={{
              margin: 0,
              fontWeight: 300,
              fontSize: 36,
              lineHeight: 1.3,
              letterSpacing: "-0.01em",
              color: "#A1A1AA",
            }}
          >
            {words.map((word, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 16 }}
                animate={
                  inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }
                }
                transition={{
                  duration: 0.9,
                  delay: i * 0.1,
                  ease: EASE_EXPO_OUT_PROBLEMA,
                }}
                style={{ display: "inline-block", marginRight: "0.25em" }}
              >
                {word}
              </motion.span>
            ))}
          </p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            transition={{
              duration: 0.7,
              delay: words.length * 0.1 + 0.5,
              ease: EASE_EXPO_OUT_PROBLEMA,
            }}
            className="flex items-center gap-3"
            style={{ marginTop: 64 }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 24,
                height: 1,
                background: "var(--border)",
                display: "block",
              }}
            />
            <span
              className="font-mono"
              style={{
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: "0.3em",
                color: "#52525B",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  animation: prefersReduced
                    ? undefined
                    : "heroScrollArrow 2s ease-in-out infinite",
                  marginRight: "0.6em",
                }}
              >
                ↓
              </span>
              04 — CAPACIDADE DEMONSTRADA
            </span>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
   "CAPACIDADE DEMONSTRADA" — Three projects, each in its own 180vh
   <article> with a 100vh sticky stage. Inside each stage: a rich
   left-side visual (45% width) + an editorial column (55% width) with
   sector headline, CONTEXTO/SISTEMA paragraphs, a metrics block, and
   a STACK footer. Animations are driven by each project's *local*
   scroll progress — no cross-fade between overlapping projects, no
   shared opacity choreography. Each project owns its own time, in its
   own DOM subtree.

   Per-project local progress (useScroll target=wrapperRef, offset
   ["start start","end end"]) maps to:
     • 0.00 → 0.30   entry      (still settling into sticky)
     • 0.30 → 0.70   sticky     (visual + editorial play through)
     • 0.85 → 1.00   exit fade  (whole sticky frame fades + lifts)

   Visual per project:
     • 01 (hotelier): annotated SVG diagram — five nodes including a
       highlighted "CAMADA DE VALIDAÇÃO" with internal sub-bullets,
       four organic-cubic edges that draw in sequence, and light
       packets along the flow once the structure is settled.
     • 02 (food distribution): faithful HTML mockup of a delivery app
       in the UNREAL cobalt palette (phone frame, status bar, KPIs,
       progress block, capture CTA, deliveries list, bottom nav). Each
       UI piece fades in under scroll control; the CTA pulses once the
       project is settled.
     • 03 (textile): PDF processing animation — a document slides into
       a centred "vision engine" panel, a scan line passes over it,
       two outputs appear on the right (translated PDF + JSON-shaped
       structured data), and a "real time" indicator shows up at the
       end.

   Mobile (<768px) and prefers-reduced-motion fall back to a stacked
   layout: each project becomes a flat ~120vh block (visual on top in
   its final state, editorial below). No sticky, no scroll-driven
   animations, no infinite loops. Metrics still render with static
   final values (no count-up).

   Layout (800vh total):
     ┌─  32vh   transition
     ├─ 100vh   label + subtitle
     ├─ 180vh   project 01
     ├─ 180vh   project 02
     ├─ 180vh   project 03
     ├─ 100vh   remate + bridge → "05 — O PROCESSO"
     └─  28vh   trailing buffer
   ------------------------------------------------------------------------- */

type CapacidadeMetric = {
  label: string;
  /** When set, the value counts up from 0 to this number. */
  countTo?: number;
  prefix?: string;
  suffix?: string;
  /** When countTo is unset, this string is rendered verbatim. */
  staticValue?: string;
  subtext: string;
};

type CapacidadeProjectData = {
  id: "01" | "02" | "03";
  label: string;
  sector: string;
  context: string;
  system: string;
  metrics: ReadonlyArray<CapacidadeMetric>;
  stack: string;
};

const CAPACIDADE_PROJECTS: ReadonlyArray<CapacidadeProjectData> = [
  {
    id: "01",
    label: "01 — PROJECTO",
    sector: "Grupo hoteleiro internacional",
    context:
      "Mais de 20.000 facturas processadas mensalmente, distribuídas por dezenas de unidades. Validação manual exigia equipa dedicada de dez pessoas — não para processar, mas para verificar erros e inconsistências do sistema de captura existente.",
    system:
      "Camada de validação automática sobre o fluxo de captura existente. Cada factura é cruzada com contratos activos, tabelas de fornecedores e regras fiscais. Erros tipográficos, IBANs incorrectos, IVAs mal aplicados, valores fora de tolerância — tudo identificado automaticamente.",
    metrics: [
      { label: "VOLUME", countTo: 20000, subtext: "facturas/mês" },
      {
        label: "HORAS LIBERTADAS",
        countTo: 1280,
        subtext: "horas/mês — projecção",
      },
      {
        label: "IMPACTO ANUAL",
        countTo: 144000,
        prefix: "€",
        subtext: "projecção em custo de equipa",
      },
    ],
    stack:
      "LLM com regras fiscais codificadas · Integração nativa com sistema existente · Sincronização com ecossistema do cliente",
  },
  {
    id: "02",
    label: "02 — PROJECTO",
    sector: "Distribuição alimentar nacional",
    context:
      "Aproximadamente 75.000 documentos por mês entre três polos logísticos. Recolha física de papel, digitalização externa, indexação manual. Documentos críticos perdidos em arquivos sem capacidade de pesquisa estruturada.",
    system:
      "Plataforma documental com captura híbrida — fluxo físico digitalizado e captura digital em mobilidade. Aplicação móvel para distribuidores captura guias no terreno. Cada documento processado em menos de 60 segundos. Integração com ERP do cliente lança documentos aprovados sem reintrodução manual.",
    metrics: [
      { label: "VOLUME", countTo: 75000, subtext: "docs/mês — três polos" },
      { label: "VELOCIDADE", staticValue: "<60s", subtext: "por documento" },
      {
        label: "CUSTO HUMANO EQUIV.",
        countTo: 270000,
        prefix: "€",
        suffix: "/ano",
        subtext: "projecção se manual",
      },
    ],
    stack:
      "OCR local + LLM em fallback · App iOS/Android offline · Integração SAP S/4HANA · SFTP seguro entre componentes",
  },
  {
    id: "03",
    label: "03 — PROJECTO",
    sector: "Indústria têxtil de confeção técnica",
    context:
      "Documentação técnica de produção recebida de marcas internacionais em múltiplas línguas, com terminologia específica de costura e acabamentos. Tradução manual consumia tempo de técnicos especializados — recurso escasso aplicado a trabalho que não acrescenta valor.",
    system:
      "Motor de visão computacional que processa tech packs preservando integridade visual. Tradução aplicada sobre o original sem perda de layout. Dados estruturados em paralelo para o ERP. Capacidade de resposta a marcas internacionais aumentada significativamente — tech pack pronto para fábrica em minutos, não dias.",
    metrics: [
      {
        label: "HORAS LIBERTADAS",
        staticValue: "30-40h",
        subtext: "por semana — projecção",
      },
      {
        label: "VELOCIDADE",
        staticValue: "minutos",
        subtext: "vs dias — pronto para produção",
      },
      { label: "SOBERANIA", staticValue: "zero", subtext: "dependência de cloud" },
    ],
    stack:
      "Processamento local em servidor físico do cliente · Modelo de visão computacional treinado · Léxico personalizado · Zero cloud",
  },
];

/**
 * One-way trigger: returns true once the motion value crosses the
 * threshold and stays true forever afterwards. Used to fire the
 * editorial column's stagger animations exactly once when the project
 * settles into its sticky frame.
 */
function useScrollTrigger(
  progress: MotionValue<number>,
  threshold: number
): boolean {
  const [triggered, setTriggered] = useState(
    () => progress.get() >= threshold
  );
  useMotionValueEvent(progress, "change", (v) => {
    if (!triggered && v >= threshold) setTriggered(true);
  });
  return triggered;
}

function CapacidadeSection({
  scrollYProgress,
}: {
  scrollYProgress: MotionValue<number>;
}) {
  void scrollYProgress;
  return (
    <section
      data-scene="capacidade"
      aria-labelledby="capacidade-label"
      className="relative"
      style={{ background: "var(--bg-base)" }}
    >
      <div aria-hidden="true" style={{ height: "32vh" }} />
      <CapacidadeLabel />
      <CapacidadeProjectsContainer />
      <CapacidadeClosing />
      <div aria-hidden="true" style={{ height: "28vh" }} />
    </section>
  );
}

function CapacidadeLabel() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });

  return (
    <div
      ref={ref}
      className="flex min-h-screen flex-col items-center justify-center px-6"
      data-capacidade="label"
    >
      <motion.div
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        className="flex items-center gap-6"
        style={{ marginBottom: 96 }}
      >
        <motion.span
          variants={{
            hidden: { width: 0 },
            visible: {
              width: 64,
              transition: { duration: 0.9, ease: EASE_POWER3_INOUT_PROBLEMA },
            },
          }}
          aria-hidden="true"
          style={{ height: 1, background: "var(--border)", display: "block" }}
        />
        <motion.h2
          id="capacidade-label"
          variants={{
            hidden: { opacity: 0, y: 12 },
            visible: {
              opacity: 1,
              y: 0,
              transition: {
                duration: 1.1,
                ease: EASE_EXPO_OUT_PROBLEMA,
                delay: 0.3,
              },
            },
          }}
          className="font-mono"
          style={{
            margin: 0,
            fontSize: 14,
            textTransform: "uppercase",
            letterSpacing: "0.3em",
            color: "var(--text-support)",
          }}
        >
          04 — CAPACIDADE DEMONSTRADA
        </motion.h2>
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
        transition={{
          duration: 1.1,
          delay: 0.8,
          ease: EASE_EXPO_OUT_PROBLEMA,
        }}
        className="font-display text-center"
        style={{
          margin: 0,
          fontWeight: 300,
          fontSize: 32,
          lineHeight: 1.2,
          letterSpacing: "-0.01em",
          color: "#FAFAFA",
          maxWidth: 760,
        }}
      >
        Três projectos. Três sectores. Uma capacidade técnica central.
      </motion.p>
    </div>
  );
}

function CapacidadeProjectsContainer() {
  const isDesktop = useIsDesktopOrTablet();
  const prefersReduced = usePrefersReducedMotion();

  // Mobile and reduced-motion: keep the simple vertically-stacked layout
  // (each project as a flat block, no scroll-driven choreography).
  if (!isDesktop || prefersReduced) {
    return (
      <>
        {CAPACIDADE_PROJECTS.map((project) => (
          <CapacidadeProjectStacked
            key={project.id}
            project={project}
            prefersReduced={prefersReduced}
          />
        ))}
      </>
    );
  }
  return <CapacidadeProjectsCrossfade />;
}

/* -------------------------------------------------------------------------
   Crossfade variant for desktop. The user scrolls DOWN normally, but a
   single sticky stage pins for the full 540vh of the wrapper. Inside,
   the three project layouts sit absolutely-positioned on top of each
   other, all occupying the same viewport-sized slot. As the local scroll
   progresses, one project fades out and the next fades in — no motion,
   no parallax, just opacity. Once the third project is done, the wrapper
   bottom hits the viewport bottom and the page resumes its normal
   downward scroll.

   Local progress windows (0 → 1 across the 440vh of pinned scroll):
     P1:  visible 0.00 → 0.25, fade out 0.25 → 0.35
     P2:  fade in 0.25 → 0.35, visible 0.35 → 0.65, fade out 0.65 → 0.75
     P3:  fade in 0.65 → 0.75, visible 0.75 → 1.00

   The 0.10-wide crossfade spans ~54vh of scroll — slow enough to read
   the transition, quick enough to feel responsive.
   ------------------------------------------------------------------------- */

function CapacidadeProjectsCrossfade() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: wrapperRef,
    offset: ["start start", "end end"],
  });

  // Crossfade opacity windows for each project.
  const opacity0 = useTransform(
    scrollYProgress,
    [0, 0.25, 0.35],
    [1, 1, 0],
    { clamp: true }
  );
  const opacity1 = useTransform(
    scrollYProgress,
    [0.25, 0.35, 0.65, 0.75],
    [0, 1, 1, 0],
    { clamp: true }
  );
  const opacity2 = useTransform(
    scrollYProgress,
    [0.65, 0.75, 1.0],
    [0, 1, 1],
    { clamp: true }
  );

  // One-way triggers fire when each project starts its fade-in. They
  // drive the inner visual's pseudo-progress sweep and the editorial /
  // metrics entry staggers — once active, they stay active so scrolling
  // back up doesn't replay or reset the animation.
  const trigger0 = true;
  const trigger1 = useScrollTrigger(scrollYProgress, 0.25);
  const trigger2 = useScrollTrigger(scrollYProgress, 0.65);

  return (
    <div
      ref={wrapperRef}
      data-capacidade="crossfade-wrapper"
      style={{ position: "relative", height: "540vh" }}
    >
      <div
        data-capacidade="crossfade-stage"
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          width: "100%",
          overflow: "hidden",
        }}
      >
        <CapacidadeProjectCrossfadeCard
          project={CAPACIDADE_PROJECTS[0]}
          opacity={opacity0}
          triggered={trigger0}
        />
        <CapacidadeProjectCrossfadeCard
          project={CAPACIDADE_PROJECTS[1]}
          opacity={opacity1}
          triggered={trigger1}
        />
        <CapacidadeProjectCrossfadeCard
          project={CAPACIDADE_PROJECTS[2]}
          opacity={opacity2}
          triggered={trigger2}
        />
        <CapacidadeCrossfadeProgress scrollProgress={scrollYProgress} />
      </div>
    </div>
  );
}

/**
 * Single global progress indicator pinned to the top of the sticky
 * stage. Tracks which of the three projects is currently in focus
 * based on local progress (boundaries align with the crossfade
 * midpoints).
 */
function CapacidadeCrossfadeProgress({
  scrollProgress,
}: {
  scrollProgress: MotionValue<number>;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  useMotionValueEvent(scrollProgress, "change", (v) => {
    const next = v < 0.30 ? 0 : v < 0.70 ? 1 : 2;
    if (next !== activeIdx) setActiveIdx(next);
  });
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        top: 32,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        zIndex: 5,
        pointerEvents: "none",
      }}
    >
      <span
        className="font-mono"
        style={{
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.3em",
          color: "#52525B",
          marginBottom: 8,
        }}
      >
        {String(activeIdx + 1).padStart(2, "0")} / 03
      </span>
      <div style={{ display: "flex", gap: 12 }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 64,
              height: 1,
              background: i <= activeIdx ? "#FAFAFA" : "#27272A",
              display: "block",
              transition: "background 400ms cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * One crossfade card — sits absolutely-positioned over the others in
 * the same viewport-sized slot, with opacity driven by the parent's
 * scroll progress. Entry animations (editorial stagger, metric count-up,
 * visual phased reveal) fire when the card's trigger threshold is
 * crossed, so each project plays its choreography exactly when it
 * becomes the active one.
 */
function CapacidadeProjectCrossfadeCard({
  project,
  opacity,
  triggered,
}: {
  project: CapacidadeProjectData;
  opacity: MotionValue<number>;
  triggered: boolean;
}) {
  const visualProgress = useMotionValue(0);
  useEffect(() => {
    if (!triggered) return;
    const controls = animate(visualProgress, 1, {
      duration: 1.8,
      ease: EASE_EXPO_OUT_PROBLEMA,
    });
    return () => controls.stop();
  }, [triggered, visualProgress]);

  return (
    <motion.article
      aria-labelledby={`capacidade-${project.id}-sector`}
      data-capacidade-project={project.id}
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 80px",
        opacity,
        willChange: "opacity",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          width: "100%",
          maxWidth: 1600,
          gap: 64,
          alignItems: "stretch",
          height: "82vh",
          maxHeight: 760,
        }}
      >
        {/* LEFT COLUMN — visual on top (70%), metrics below (30%) */}
        <div
          style={{
            flex: "0 0 calc(45% - 32px)",
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            gap: 24,
          }}
        >
          <div
            style={{
              flex: "7 1 0",
              minHeight: 0,
              width: "100%",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <CapacidadeProjectVisual
              projectId={project.id}
              scrollProgress={visualProgress}
              prefersReduced={false}
              isStacked={false}
            />
          </div>
          <div
            style={{
              flex: "3 1 0",
              minHeight: 0,
              display: "flex",
              alignItems: "stretch",
            }}
          >
            <CapacidadeMetricsBlock
              metrics={project.metrics}
              scrollProgress={null}
              prefersReduced={false}
              forceTriggered={triggered}
            />
          </div>
        </div>
        {/* RIGHT COLUMN — editorial */}
        <div
          style={{
            flex: "0 0 calc(55% - 32px)",
            display: "flex",
            alignItems: "center",
            minWidth: 0,
          }}
        >
          <CapacidadeProjectEditorial
            project={project}
            scrollProgress={null}
            prefersReduced={false}
            forceTriggered={triggered}
          />
        </div>
      </div>
    </motion.article>
  );
}

function CapacidadeProjectStacked({
  project,
  prefersReduced,
}: {
  project: CapacidadeProjectData;
  prefersReduced: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <article
      ref={ref}
      aria-labelledby={`capacidade-${project.id}-sector`}
      data-capacidade-project={project.id}
      style={{
        minHeight: "120vh",
        padding: "48px 24px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          height: 300,
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CapacidadeProjectVisual
          projectId={project.id}
          scrollProgress={null}
          prefersReduced={prefersReduced}
          isStacked={true}
        />
      </div>
      <div style={{ marginBottom: 32 }}>
        <CapacidadeMetricsBlock
          metrics={project.metrics}
          scrollProgress={null}
          prefersReduced={prefersReduced}
          forceTriggered={inView}
        />
      </div>
      <CapacidadeProjectEditorial
        project={project}
        scrollProgress={null}
        prefersReduced={prefersReduced}
        forceTriggered={inView}
      />
    </article>
  );
}

/**
 * Visual dispatcher — picks the right component for the project id.
 * `scrollProgress` may be null in stacked mode, in which case the
 * visual renders in its final state with no scroll-driven animation.
 */
function CapacidadeProjectVisual({
  projectId,
  scrollProgress,
  prefersReduced,
  isStacked,
}: {
  projectId: CapacidadeProjectData["id"];
  scrollProgress: MotionValue<number> | null;
  prefersReduced: boolean;
  isStacked: boolean;
}) {
  if (projectId === "01") {
    return (
      <CapacidadeHotelDiagram
        scrollProgress={scrollProgress}
        prefersReduced={prefersReduced}
        isStacked={isStacked}
      />
    );
  }
  if (projectId === "02") {
    return (
      <CapacidadeAppMockup
        scrollProgress={scrollProgress}
        prefersReduced={prefersReduced}
        isStacked={isStacked}
      />
    );
  }
  return (
    <CapacidadePdfAnimation
      scrollProgress={scrollProgress}
      prefersReduced={prefersReduced}
      isStacked={isStacked}
    />
  );
}

/**
 * Editorial column — label, sector display, CONTEXTO/SISTEMA paragraphs,
 * the metrics block, and the STACK footer. In Pinned mode each piece
 * triggers as scroll crosses a per-element threshold; in Stacked mode
 * everything triggers together once the article enters the viewport.
 */
function CapacidadeProjectEditorial({
  project,
  scrollProgress,
  prefersReduced,
  forceTriggered,
}: {
  project: CapacidadeProjectData;
  scrollProgress: MotionValue<number> | null;
  prefersReduced: boolean;
  forceTriggered: boolean;
}) {
  // Always run hooks unconditionally — when scrollProgress is null we
  // pass a constant motion value so the trigger never fires from scroll.
  // Triggers are tight inside the 0–0.30 entry window: every editorial
  // element is fully visible before sticky-stable starts (0.30 onwards).
  const placeholder = useMotionValue(0);
  const safeProgress = scrollProgress ?? placeholder;

  const labelTriggered =
    useScrollTrigger(safeProgress, 0.05) || forceTriggered;
  const sectorTriggered =
    useScrollTrigger(safeProgress, 0.08) || forceTriggered;
  const contextoTriggered =
    useScrollTrigger(safeProgress, 0.12) || forceTriggered;
  const sistemaTriggered =
    useScrollTrigger(safeProgress, 0.18) || forceTriggered;
  const stackTriggered =
    useScrollTrigger(safeProgress, 0.24) || forceTriggered;

  const ease = EASE_EXPO_OUT_PROBLEMA;
  const dur = (ms: number) => (prefersReduced ? 0.4 : ms / 1000);

  // [DEBUG] only for project 03 — read computed opacity of the editorial
  // wrapper and one of its child elements, so we can see whether the
  // dimming the user reports comes from a parent (intermediate motion.div
  // with exitOpacity) or from this column's own state.
  const editorialRef = useRef<HTMLDivElement>(null);
  const lastEditorialLogRef = useRef(0);
  useMotionValueEvent(safeProgress, "change", (v) => {
    if (project.id !== "03") return;
    const now = performance.now();
    if (now - lastEditorialLogRef.current < 200) return;
    lastEditorialLogRef.current = now;
    const root = editorialRef.current;
    if (!root) return;
    const rootCs = getComputedStyle(root);
    const firstChild = root.firstElementChild as HTMLElement | null;
    const firstCs = firstChild ? getComputedStyle(firstChild).opacity : "?";
    // eslint-disable-next-line no-console
    console.log(
      `[Editorial 03] progress=${v.toFixed(3)} root computed opacity=${rootCs.opacity} firstChild=${firstCs} triggers={label:${labelTriggered} sector:${sectorTriggered} ctx:${contextoTriggered} sis:${sistemaTriggered} stk:${stackTriggered}}`
    );
  });

  return (
    <div ref={editorialRef} style={{ width: "100%", maxWidth: 560 }}>
      <motion.div
        initial={{ opacity: 0, y: prefersReduced ? 0 : 8 }}
        animate={
          labelTriggered ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }
        }
        transition={{ duration: dur(700), ease }}
        className="flex items-center gap-3"
        style={{ marginBottom: 24 }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 48,
            height: 1,
            background: "var(--border)",
            display: "block",
          }}
        />
        <span
          className="font-mono"
          style={{
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: "0.3em",
            color: "#52525B",
          }}
        >
          {project.label}
        </span>
      </motion.div>

      <motion.h3
        id={`capacidade-${project.id}-sector`}
        initial={{ opacity: 0, y: prefersReduced ? 0 : 16 }}
        animate={
          sectorTriggered ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }
        }
        transition={{ duration: dur(900), ease, delay: prefersReduced ? 0 : 0.1 }}
        className="font-display"
        style={{
          margin: 0,
          marginBottom: 40,
          fontWeight: 300,
          fontSize: "clamp(40px, 4.5vw, 56px)",
          lineHeight: 1.05,
          letterSpacing: "-0.02em",
          color: "#FAFAFA",
        }}
      >
        {project.sector}
      </motion.h3>

      <motion.div
        initial={{ opacity: 0, y: prefersReduced ? 0 : 12 }}
        animate={
          contextoTriggered ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }
        }
        transition={{ duration: dur(800), ease }}
        style={{ marginBottom: 32 }}
      >
        <span
          className="font-mono"
          style={{
            display: "block",
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.25em",
            color: "#A1A1AA",
            marginBottom: 12,
          }}
        >
          CONTEXTO
        </span>
        <p
          className="font-sans"
          style={{
            margin: 0,
            fontSize: 15,
            lineHeight: 1.55,
            color: "#D4D4D8",
          }}
        >
          {project.context}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: prefersReduced ? 0 : 12 }}
        animate={
          sistemaTriggered ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }
        }
        transition={{ duration: dur(800), ease }}
        style={{ marginBottom: 32 }}
      >
        <span
          className="font-mono"
          style={{
            display: "block",
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.25em",
            color: "#A1A1AA",
            marginBottom: 12,
          }}
        >
          O SISTEMA
        </span>
        <p
          className="font-sans"
          style={{
            margin: 0,
            fontSize: 15,
            lineHeight: 1.55,
            color: "#D4D4D8",
          }}
        >
          {project.system}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: prefersReduced ? 0 : 8 }}
        animate={stackTriggered ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
        transition={{ duration: dur(700), ease, delay: prefersReduced ? 0 : 0.1 }}
      >
        <span
          className="font-mono"
          style={{
            display: "block",
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.25em",
            color: "#52525B",
            marginBottom: 8,
          }}
        >
          STACK
        </span>
        <p
          className="font-mono"
          style={{
            margin: 0,
            fontSize: 11,
            lineHeight: 1.55,
            color: "#A1A1AA",
          }}
        >
          {project.stack}
        </p>
      </motion.div>
    </div>
  );
}

function CapacidadeMetricsBlock({
  metrics,
  scrollProgress,
  prefersReduced,
  forceTriggered,
}: {
  metrics: ReadonlyArray<CapacidadeMetric>;
  scrollProgress: MotionValue<number> | null;
  prefersReduced: boolean;
  forceTriggered: boolean;
}) {
  const placeholder = useMotionValue(0);
  const safeProgress = scrollProgress ?? placeholder;
  // Trigger inside the entry window so the count-up resolves well before
  // the project enters its sticky-stable phase.
  const triggered =
    useScrollTrigger(safeProgress, 0.20) || forceTriggered;
  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        width: "100%",
        background: "rgba(15, 17, 21, 0.6)",
        border: "1px solid #27272A",
        borderRadius: 12,
        padding: 24,
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      {metrics.map((metric, i) => (
        <CapacidadeMetricCard
          key={metric.label}
          metric={metric}
          trigger={triggered}
          delayMs={i * 100}
          prefersReduced={prefersReduced}
        />
      ))}
    </div>
  );
}

function CapacidadeMetricCard({
  metric,
  trigger,
  delayMs,
  prefersReduced,
}: {
  metric: CapacidadeMetric;
  trigger: boolean;
  delayMs: number;
  prefersReduced: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: prefersReduced ? 0 : 8 }}
      animate={trigger ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
      transition={{
        duration: prefersReduced ? 0.4 : 0.7,
        delay: prefersReduced ? 0 : delayMs / 1000,
        ease: EASE_EXPO_OUT_PROBLEMA,
      }}
      style={{
        flex: "1 1 calc((100% - 32px) / 3)",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <span
        className="font-mono"
        style={{
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.25em",
          color: "#52525B",
        }}
      >
        {metric.label}
      </span>
      <span
        className="font-display"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "baseline",
          columnGap: 2,
          fontWeight: 300,
          fontSize: "clamp(28px, 3vw, 36px)",
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
          color: "#FAFAFA",
        }}
      >
        <span style={{ whiteSpace: "nowrap" }}>
          {metric.countTo !== undefined ? (
            <CapacidadeCountUp
              to={metric.countTo}
              prefix={metric.prefix ?? ""}
              suffix=""
              trigger={trigger}
              delayMs={delayMs + 200}
              prefersReduced={prefersReduced}
            />
          ) : (
            metric.staticValue
          )}
        </span>
        {metric.suffix && (
          <span style={{ whiteSpace: "nowrap" }}>{metric.suffix}</span>
        )}
      </span>
      <span
        className="font-sans"
        style={{
          fontSize: 12,
          color: "#A1A1AA",
          lineHeight: 1.4,
        }}
      >
        {metric.subtext}
      </span>
    </motion.div>
  );
}

function CapacidadeCountUp({
  to,
  prefix,
  suffix,
  trigger,
  delayMs,
  prefersReduced,
}: {
  to: number;
  prefix: string;
  suffix: string;
  trigger: boolean;
  delayMs: number;
  prefersReduced: boolean;
}) {
  // Initial state already reflects reduced-motion users — they never run
  // the count-up effect at all.
  const [display, setDisplay] = useState(prefersReduced ? to : 0);

  useEffect(() => {
    if (!trigger || prefersReduced) return;
    let cancelled = false;
    let cleanup: (() => void) | null = null;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      const controls = animate(0, to, {
        duration: 1.4,
        ease: EASE_EXPO_OUT_PROBLEMA,
        onUpdate: (v) => setDisplay(Math.round(v)),
      });
      cleanup = () => controls.stop();
    }, delayMs);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (cleanup) cleanup();
    };
  }, [trigger, to, delayMs, prefersReduced]);

  return (
    <>
      {prefix}
      {display.toLocaleString("pt-PT")}
      {suffix}
    </>
  );
}

/* ----- Visual 01 — Hotel Diagram ----- */

/**
 * SVG diagram for project 01. Five nodes (one highlighted central
 * "CAMADA DE VALIDAÇÃO" with internal sub-bullets) and four organic
 * cubic-Bezier edges drawn in sequence. A small light packet rides each
 * edge once the structure is settled.
 */
function CapacidadeHotelDiagram({
  scrollProgress,
  prefersReduced,
  isStacked,
}: {
  scrollProgress: MotionValue<number> | null;
  prefersReduced: boolean;
  isStacked: boolean;
}) {
  // Stacked mode renders the diagram in its final state with no
  // scroll-driven animation. We still need motion values for hooks
  // consistency, so create a placeholder that sits at 1.0.
  const placeholder = useMotionValue(isStacked ? 1 : 0);
  const progress = scrollProgress ?? placeholder;

  // Per-element appearance windows tightly inside the entry phase
  // (0–0.30). By the time the project enters its sticky-stable window
  // (0.30+), every node + edge is fully drawn at opacity 1.
  const opA = useTransform(progress, [0.05, 0.09], [0, 1], { clamp: true });
  const opC = useTransform(progress, [0.08, 0.12], [0, 1], { clamp: true });
  const opD = useTransform(progress, [0.11, 0.15], [0, 1], { clamp: true });
  const opB = useTransform(progress, [0.14, 0.20], [0, 1], { clamp: true });
  const scaleB = useTransform(progress, [0.14, 0.20], [0.85, 1], {
    clamp: true,
  });
  const opE = useTransform(progress, [0.18, 0.22], [0, 1], { clamp: true });

  // Edges draw sequentially after the nodes are seated.
  const e0Length = useTransform(progress, [0.20, 0.23], [0, 1], {
    clamp: true,
  });
  const e1Length = useTransform(progress, [0.22, 0.25], [0, 1], {
    clamp: true,
  });
  const e2Length = useTransform(progress, [0.24, 0.27], [0, 1], {
    clamp: true,
  });
  const e3Length = useTransform(progress, [0.26, 0.29], [0, 1], {
    clamp: true,
  });

  // Once everything is in place, packets start cycling along each edge.
  const [stable, setStable] = useState(isStacked);
  useMotionValueEvent(progress, "change", (v) => {
    if (!stable && v >= 0.30) setStable(true);
  });

  // Node centres on the 1000×900 viewBox. The viewBox aspect (~1.11:1)
  // is intentionally narrower than the container (~1.16–1.32:1) so that
  // `preserveAspectRatio="meet"` resolves height-first — the diagram
  // fills the full vertical extent of the upper-left block instead of
  // being letterboxed top/bottom. Nodes are pushed to the corners so
  // they actually use that extra real estate: A top-left, E top-right,
  // C bottom-left, D bottom-right, B at the vertical/horizontal centre.
  const nA = { x: 40, y: 70, w: 240, h: 100, cx: 160, cy: 120 };
  const nB = { x: 340, y: 370, w: 320, h: 160, cx: 500, cy: 450 };
  const nC = { x: 40, y: 740, w: 240, h: 90, cx: 160, cy: 785 };
  const nD = { x: 720, y: 740, w: 240, h: 90, cx: 840, cy: 785 };
  const nE = { x: 720, y: 70, w: 240, h: 100, cx: 840, cy: 120 };

  // Edge anchor points (start/end on the edge of the source/target rect).
  const e0d = organicCubic(nA.x + nA.w, nA.cy, nB.x, nB.cy, +1);
  const e1d = organicCubic(nC.cx, nC.y, nB.cx - 60, nB.y + nB.h, -1);
  const e2d = organicCubic(nD.cx, nD.y, nB.cx + 60, nB.y + nB.h, +1);
  const e3d = organicCubic(nB.cx, nB.y, nE.x, nE.cy, -1);

  return (
    <svg
      role="img"
      aria-labelledby="diag01-title diag01-desc"
      viewBox="0 0 1000 900"
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <title id="diag01-title">Diagrama de validação automática</title>
      <desc id="diag01-desc">
        Factura recebida e referências (contratos, regras fiscais) convergem
        numa camada central de validação que produz o registo final
        validado.
      </desc>
      {/* Edges, behind nodes */}
      <CapacidadeEdge d={e0d} length={e0Length} />
      <CapacidadeEdge d={e1d} length={e1Length} />
      <CapacidadeEdge d={e2d} length={e2Length} />
      <CapacidadeEdge d={e3d} length={e3Length} />

      {/* Light packets along each edge once stable */}
      {stable && !prefersReduced && (
        <>
          <CapacidadePacket d={e0d} index={0} />
          <CapacidadePacket d={e1d} index={1} />
          <CapacidadePacket d={e2d} index={2} />
          <CapacidadePacket d={e3d} index={3} />
        </>
      )}

      {/* Node A — FACTURA RECEBIDA */}
      <motion.g style={{ opacity: opA }}>
        <rect
          x={nA.x}
          y={nA.y}
          width={nA.w}
          height={nA.h}
          rx={6}
          fill="#0F1115"
          stroke="#27272A"
          strokeWidth={1}
        />
        <text
          x={nA.x + 16}
          y={nA.y + 28}
          fill="#FAFAFA"
          style={{
            fontFamily: "var(--font-ibm-plex-mono), monospace",
            fontSize: 11,
            letterSpacing: "2px",
          }}
        >
          FACTURA RECEBIDA
        </text>
        <text
          x={nA.x + 16}
          y={nA.y + 52}
          fill="#52525B"
          style={{
            fontFamily: "var(--font-ibm-plex-mono), monospace",
            fontSize: 9,
          }}
        >
          INVOICE_2024_847
        </text>
        {/* Mini document icon (top-right of node) */}
        <g
          transform={`translate(${nA.x + nA.w - 28} ${nA.y + 16})`}
          stroke="#A1A1AA"
          strokeWidth={1}
          fill="none"
        >
          <rect x={0} y={0} width={14} height={14} rx={1} />
          <line x1={3} y1={5} x2={11} y2={5} />
          <line x1={3} y1={8} x2={11} y2={8} />
          <line x1={3} y1={11} x2={9} y2={11} />
        </g>
      </motion.g>

      {/* Node C — CONTRATOS */}
      <motion.g style={{ opacity: opC }}>
        <rect
          x={nC.x}
          y={nC.y}
          width={nC.w}
          height={nC.h}
          rx={6}
          fill="#0F1115"
          stroke="#27272A"
          strokeWidth={1}
        />
        <text
          x={nC.x + 16}
          y={nC.y + 28}
          fill="#FAFAFA"
          style={{
            fontFamily: "var(--font-ibm-plex-mono), monospace",
            fontSize: 10,
            letterSpacing: "2px",
          }}
        >
          CONTRATOS ACTIVOS
        </text>
        <text
          x={nC.x + 16}
          y={nC.y + 50}
          fill="#52525B"
          style={{
            fontFamily: "var(--font-ibm-plex-mono), monospace",
            fontSize: 9,
          }}
        >
          3.247 REGISTOS
        </text>
      </motion.g>

      {/* Node D — REGRAS FISCAIS */}
      <motion.g style={{ opacity: opD }}>
        <rect
          x={nD.x}
          y={nD.y}
          width={nD.w}
          height={nD.h}
          rx={6}
          fill="#0F1115"
          stroke="#27272A"
          strokeWidth={1}
        />
        <text
          x={nD.x + 16}
          y={nD.y + 28}
          fill="#FAFAFA"
          style={{
            fontFamily: "var(--font-ibm-plex-mono), monospace",
            fontSize: 10,
            letterSpacing: "2px",
          }}
        >
          REGRAS FISCAIS
        </text>
        <text
          x={nD.x + 16}
          y={nD.y + 50}
          fill="#52525B"
          style={{
            fontFamily: "var(--font-ibm-plex-mono), monospace",
            fontSize: 9,
          }}
        >
          IVA · IRC · COMPLIANCE
        </text>
      </motion.g>

      {/* Node B — CAMADA DE VALIDAÇÃO (highlighted with glow) */}
      <motion.g
        style={{
          opacity: opB,
          scale: scaleB,
          transformOrigin: `${nB.cx}px ${nB.cy}px`,
          transformBox: "fill-box" as const,
        }}
      >
        {/* Glow halo */}
        <rect
          x={nB.x - 6}
          y={nB.y - 6}
          width={nB.w + 12}
          height={nB.h + 12}
          rx={10}
          fill="none"
          stroke="rgba(59, 130, 246, 0.30)"
          strokeWidth={4}
          style={{ filter: "blur(4px)" }}
        />
        <rect
          x={nB.x}
          y={nB.y}
          width={nB.w}
          height={nB.h}
          rx={6}
          fill="rgba(37, 99, 235, 0.04)"
          stroke="#2563EB"
          strokeWidth={1}
        />
        <text
          x={nB.cx}
          y={nB.y + 24}
          textAnchor="middle"
          fill="#FAFAFA"
          style={{
            fontFamily: "var(--font-ibm-plex-mono), monospace",
            fontSize: 12,
            letterSpacing: "3px",
          }}
        >
          CAMADA DE VALIDAÇÃO
        </text>
        {/* Inner separator */}
        <line
          x1={nB.x + 20}
          y1={nB.y + 40}
          x2={nB.x + nB.w - 20}
          y2={nB.y + 40}
          stroke="#2563EB"
          strokeOpacity={0.3}
          strokeWidth={1}
        />
        {/* Sub-bullets */}
        <CapacidadeBullet
          x={nB.x + 24}
          y={nB.y + 64}
          text="CRUZAMENTO COM CONTRATOS"
        />
        <CapacidadeBullet
          x={nB.x + 24}
          y={nB.y + 88}
          text="VALIDAÇÃO FISCAL"
        />
        <CapacidadeBullet
          x={nB.x + 24}
          y={nB.y + 112}
          text="DETECÇÃO DE ANOMALIAS"
        />
      </motion.g>

      {/* Node E — REGISTO FINAL (green check) */}
      <motion.g style={{ opacity: opE }}>
        <rect
          x={nE.x}
          y={nE.y}
          width={nE.w}
          height={nE.h}
          rx={6}
          fill="#0F1115"
          stroke="#27272A"
          strokeWidth={1}
        />
        <text
          x={nE.x + 16}
          y={nE.y + 28}
          fill="#10B981"
          style={{
            fontFamily: "var(--font-ibm-plex-mono), monospace",
            fontSize: 11,
            letterSpacing: "2px",
          }}
        >
          REGISTO VALIDADO
        </text>
        <text
          x={nE.x + 16}
          y={nE.y + 52}
          fill="#52525B"
          style={{
            fontFamily: "var(--font-ibm-plex-mono), monospace",
            fontSize: 9,
          }}
        >
          ↑ AUTO-APPROVED
        </text>
        {/* Mini check icon */}
        <g
          transform={`translate(${nE.x + nE.w - 30} ${nE.y + 18})`}
          stroke="#10B981"
          strokeWidth={1.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx={7} cy={7} r={6.5} stroke="#10B981" />
          <path d="M 4 7.5 L 6.5 10 L 11 5" />
        </g>
      </motion.g>
    </svg>
  );
}

function CapacidadeBullet({
  x,
  y,
  text,
}: {
  x: number;
  y: number;
  text: string;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path
        d="M 0 5 L 3 8 L 9 1"
        stroke="#2563EB"
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x={16}
        y={7}
        fill="#A1A1AA"
        style={{
          fontFamily: "var(--font-ibm-plex-mono), monospace",
          fontSize: 9,
          letterSpacing: "2px",
        }}
      >
        {text}
      </text>
    </g>
  );
}

function CapacidadeEdge({
  d,
  length,
}: {
  d: string;
  length: MotionValue<number>;
}) {
  return (
    <motion.path
      d={d}
      fill="none"
      stroke="#3F3F46"
      strokeWidth={1}
      style={{ pathLength: length }}
    />
  );
}

function CapacidadePacket({ d, index }: { d: string; index: number }) {
  const begin = `${(index * 0.7).toFixed(2)}s`;
  return (
    <circle r={3} fill="rgba(59, 130, 246, 0.85)">
      <animateMotion
        dur="3s"
        repeatCount="indefinite"
        path={d}
        begin={begin}
      />
    </circle>
  );
}

/* ----- Visual 02 — Delivery App Mockup ----- */

/**
 * iPhone-style mockup of a delivery app in the UNREAL cobalt palette.
 * Each UI piece (status bar, header, KPI row, progress block, CTA,
 * deliveries list, bottom nav) has its own scroll-driven entry, and
 * the CTA pulses subtly once the project is settled.
 */
function CapacidadeAppMockup({
  scrollProgress,
  prefersReduced,
  isStacked,
}: {
  scrollProgress: MotionValue<number> | null;
  prefersReduced: boolean;
  isStacked: boolean;
}) {
  const placeholder = useMotionValue(isStacked ? 1 : 0);
  const progress = scrollProgress ?? placeholder;

  // All entry windows fit inside 0–0.30 of the project's local progress
  // so every UI piece is fully visible (opacity 1) before sticky-stable
  // begins. After each window the value is clamped to 1 — no inner
  // fade-out anywhere; the wrapper handles exit on its own.
  const phoneOpacity = useTransform(progress, [0.02, 0.06], [0, 1], {
    clamp: true,
  });
  const phoneScale = useTransform(progress, [0.02, 0.06], [0.95, 1], {
    clamp: true,
  });
  const headerOpacity = useTransform(progress, [0.05, 0.09], [0, 1], {
    clamp: true,
  });
  const kpi1Opacity = useTransform(progress, [0.08, 0.12], [0, 1], {
    clamp: true,
  });
  const kpi2Opacity = useTransform(progress, [0.10, 0.14], [0, 1], {
    clamp: true,
  });
  const kpi3Opacity = useTransform(progress, [0.12, 0.16], [0, 1], {
    clamp: true,
  });
  const progressOpacity = useTransform(progress, [0.14, 0.18], [0, 1], {
    clamp: true,
  });
  const progressFill = useTransform(progress, [0.14, 0.18], [0, 40], {
    clamp: true,
  });
  const progressFillStr = useMotionTemplate`${progressFill}%`;
  const ctaOpacity = useTransform(progress, [0.17, 0.21], [0, 1], {
    clamp: true,
  });
  const item1Opacity = useTransform(progress, [0.20, 0.23], [0, 1], {
    clamp: true,
  });
  const item2Opacity = useTransform(progress, [0.22, 0.25], [0, 1], {
    clamp: true,
  });
  const item3Opacity = useTransform(progress, [0.24, 0.27], [0, 1], {
    clamp: true,
  });
  const navOpacity = useTransform(progress, [0.26, 0.30], [0, 1], {
    clamp: true,
  });

  // "stable" flips on at the start of sticky-stable so the CTA pulse
  // and the pending-status pulse begin their loops from there.
  const [stable, setStable] = useState(isStacked);
  useMotionValueEvent(progress, "change", (v) => {
    if (!stable && v >= 0.30) setStable(true);
  });

  // [DEBUG] measure the outer flex container + the iPhone wrapper.
  const outerRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isStacked) return;
    const log = () => {
      const outer = outerRef.current?.getBoundingClientRect();
      const phone = phoneRef.current?.getBoundingClientRect();
      // eslint-disable-next-line no-console
      console.log(
        `[AppMockup 02] outer flex = ${outer?.width.toFixed(1)}x${outer?.height.toFixed(1)} | iPhone wrapper = ${phone?.width.toFixed(1)}x${phone?.height.toFixed(1)}`
      );
    };
    log();
    const ro = new ResizeObserver(log);
    if (outerRef.current) ro.observe(outerRef.current);
    if (phoneRef.current) ro.observe(phoneRef.current);
    return () => ro.disconnect();
  }, [isStacked]);

  // [DEBUG] throttled log of motion values inside the mockup. Picks the
  // phone wrapper, the CTA (entry ends at 0.21), and the header (entry
  // ends at 0.09) — three points across the entry timeline.
  const lastMockupLogRef = useRef(0);
  useMotionValueEvent(progress, "change", (v) => {
    if (isStacked) return;
    const now = performance.now();
    if (now - lastMockupLogRef.current < 200) return;
    lastMockupLogRef.current = now;
    // eslint-disable-next-line no-console
    console.log(
      `[AppMockup 02] progress=${v.toFixed(3)} phone=${phoneOpacity.get().toFixed(3)} header=${headerOpacity.get().toFixed(3)} cta=${ctaOpacity.get().toFixed(3)} nav=${navOpacity.get().toFixed(3)}`
    );
  });

  return (
    <div
      ref={outerRef}
      aria-hidden="true"
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        height: "100%",
      }}
    >
      <motion.div
        ref={phoneRef}
        style={{
          opacity: phoneOpacity,
          scale: phoneScale,
          width: 200,
          height: 400,
          border: "6px solid #27272A",
          borderRadius: 32,
          background: "#0A0B0D",
          position: "relative",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        {/* Notch */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: 60,
            height: 16,
            background: "#000",
            borderBottomLeftRadius: 8,
            borderBottomRightRadius: 8,
            zIndex: 10,
          }}
        />

        {/* Status bar */}
        <div
          style={{
            height: 26,
            padding: "0 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 4,
          }}
        >
          <span
            className="font-sans"
            style={{ fontSize: 10, fontWeight: 500, color: "#FAFAFA" }}
          >
            9:41
          </span>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <Signal size={9} color="#FAFAFA" strokeWidth={2} />
            <Wifi size={9} color="#FAFAFA" strokeWidth={2} />
            <Battery size={11} color="#FAFAFA" strokeWidth={2} />
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "4px 12px 0", height: "calc(100% - 62px)", overflow: "hidden" }}>
          {/* Header */}
          <motion.div style={{ opacity: headerOpacity, marginBottom: 8 }}>
            <div
              className="font-mono"
              style={{
                fontSize: 7,
                textTransform: "uppercase",
                letterSpacing: "0.3em",
                color: "#A1A1AA",
                marginBottom: 3,
              }}
            >
              BOM DIA, JOÃO
            </div>
            <div
              className="font-sans"
              style={{ fontSize: 12, fontWeight: 500, color: "#FAFAFA" }}
            >
              Rota Lisboa Norte
            </div>
          </motion.div>

          {/* KPI row */}
          <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
            <CapacidadeAppKpi
              opacity={kpi1Opacity}
              value="5"
              label="ENTREGAS"
              color="#FAFAFA"
            />
            <CapacidadeAppKpi
              opacity={kpi2Opacity}
              value="2"
              label="CONCLUÍDAS"
              color="#10B981"
            />
            <CapacidadeAppKpi
              opacity={kpi3Opacity}
              value="3"
              label="PENDENTES"
              color="#3B82F6"
            />
          </div>

          {/* Progress block */}
          <motion.div
            style={{
              opacity: progressOpacity,
              background: "#0F1115",
              border: "1px solid #27272A",
              borderRadius: 8,
              padding: 8,
              marginBottom: 8,
            }}
          >
            <div
              className="font-mono"
              style={{
                fontSize: 7,
                textTransform: "uppercase",
                letterSpacing: "0.3em",
                color: "#A1A1AA",
                marginBottom: 4,
              }}
            >
              PROGRESSO DO DIA
            </div>
            <div
              className="font-sans"
              style={{
                fontSize: 10,
                fontWeight: 500,
                color: "#FAFAFA",
                marginBottom: 6,
              }}
            >
              2/5 entregas confirmadas
            </div>
            <div
              style={{
                width: "100%",
                height: 3,
                background: "#27272A",
                borderRadius: 2,
                overflow: "hidden",
                marginBottom: 6,
              }}
            >
              <motion.div
                style={{
                  width: progressFillStr,
                  height: "100%",
                  background: "#2563EB",
                }}
              />
            </div>
            <div
              className="font-mono"
              style={{ fontSize: 7, color: "#52525B" }}
            >
              247 docs processados hoje
            </div>
          </motion.div>

          {/* CTA button. Outer controls entry fade-in; inner stays at
              solid opacity 1 during sticky-stable (no pulse). */}
          <motion.div style={{ opacity: ctaOpacity, marginBottom: 8 }}>
            <div
              style={{
                background: "#2563EB",
                borderRadius: 8,
                padding: "7px 9px",
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: "#FAFAFA",
                }}
              >
                <Camera size={12} strokeWidth={2} />
                <span
                  className="font-sans"
                  style={{ fontSize: 10, fontWeight: 600 }}
                >
                  FOTOGRAFAR GUIA
                </span>
              </div>
              <span
                className="font-mono"
                style={{
                  fontSize: 6,
                  textTransform: "uppercase",
                  letterSpacing: "0.25em",
                  color: "rgba(255,255,255,0.6)",
                }}
              >
                AI VISION · ANÁLISE INTELIGENTE
              </span>
            </div>
          </motion.div>

          {/* Deliveries list */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <span
              className="font-mono"
              style={{
                fontSize: 7,
                textTransform: "uppercase",
                letterSpacing: "0.3em",
                color: "#A1A1AA",
              }}
            >
              ENTREGAS DE HOJE
            </span>
            <span
              className="font-mono"
              style={{
                fontSize: 6,
                color: "#52525B",
                letterSpacing: "0.2em",
              }}
            >
              5 TOTAL
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <CapacidadeAppListItem
              opacity={item1Opacity}
              statusColor="#F59E0B"
              name="Supermercado Central"
              code="ENT-2026-8851"
              badge="PENDENTE"
              badgeColor="#F59E0B"
              pulsing={stable && !prefersReduced}
            />
            <CapacidadeAppListItem
              opacity={item2Opacity}
              statusColor="#10B981"
              name="Cafetaria do Porto"
              code="ENT-2026-8852"
              badge="CONCLUÍDA"
              badgeColor="#10B981"
              pulsing={false}
              checked
            />
          </div>
        </div>

        {/* Bottom nav */}
        <motion.nav
          style={{
            opacity: navOpacity,
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 36,
            background: "#0F1115",
            borderTop: "1px solid #27272A",
            display: "flex",
            justifyContent: "space-around",
            alignItems: "center",
          }}
        >
          <CapacidadeAppNavItem icon={Home} label="HOME" active />
          <CapacidadeAppNavItem icon={History} label="HISTÓRICO" />
          <CapacidadeAppNavItem icon={BarChart3} label="ANALYTICS" />
          <CapacidadeAppNavItem icon={User} label="PERFIL" />
        </motion.nav>
      </motion.div>
    </div>
  );
}

function CapacidadeAppKpi({
  opacity,
  value,
  label,
  color,
}: {
  opacity: MotionValue<number>;
  value: string;
  label: string;
  color: string;
}) {
  return (
    <motion.div
      style={{
        opacity,
        flex: 1,
        background: "#0F1115",
        border: "1px solid #27272A",
        borderRadius: 6,
        padding: "5px 4px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1,
      }}
    >
      <span
        className="font-display"
        style={{ fontSize: 15, fontWeight: 300, color, lineHeight: 1 }}
      >
        {value}
      </span>
      <span
        className="font-mono"
        style={{
          fontSize: 6,
          textTransform: "uppercase",
          letterSpacing: "0.15em",
          color: "#52525B",
        }}
      >
        {label}
      </span>
    </motion.div>
  );
}

function CapacidadeAppListItem({
  opacity,
  statusColor,
  name,
  code,
  badge,
  badgeColor,
  pulsing,
  checked = false,
}: {
  opacity: MotionValue<number>;
  statusColor: string;
  name: string;
  code: string;
  badge: string;
  badgeColor: string;
  pulsing: boolean;
  checked?: boolean;
}) {
  return (
    <motion.div
      style={{
        opacity,
        background: "#0F1115",
        borderRadius: 6,
        padding: 6,
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          background: statusColor,
          flexShrink: 0,
        }}
      />
      <div
        style={{ flex: 1, display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}
      >
        <span
          className="font-sans"
          style={{
            fontSize: 8,
            color: "#FAFAFA",
            fontWeight: 500,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {name}
        </span>
        <span
          className="font-mono"
          style={{
            fontSize: 6,
            color: "#52525B",
            letterSpacing: "0.08em",
          }}
        >
          {code}
        </span>
      </div>
      {checked && <Check size={9} color="#10B981" strokeWidth={2.5} />}
      <span
        className="font-mono"
        style={{
          fontSize: 5,
          textTransform: "uppercase",
          letterSpacing: "0.15em",
          color: badgeColor,
          padding: "2px 4px",
          border: `1px solid ${badgeColor}`,
          borderRadius: 2,
        }}
      >
        {badge}
      </span>
    </motion.div>
  );
}

function CapacidadeAppNavItem({
  icon: Icon,
  label,
  active = false,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
}) {
  const color = active ? "#3B82F6" : "#52525B";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
      }}
    >
      <Icon size={12} color={color} strokeWidth={1.8} />
      <span
        className="font-mono"
        style={{
          fontSize: 5,
          textTransform: "uppercase",
          letterSpacing: "0.15em",
          color,
        }}
      >
        {label}
      </span>
    </div>
  );
}

/* ----- Visual 03 — PDF Vision Engine Animation ----- */

/**
 * PDF processing animation. A document slides in from the left, gets
 * scanned by the central engine, and produces a translated PDF + a
 * structured-data block on the right. Three scroll-driven phases plus a
 * final "real time" indicator. After the project is settled the scan
 * line keeps cycling to suggest live processing.
 */
function CapacidadePdfAnimation({
  scrollProgress,
  prefersReduced,
  isStacked,
}: {
  scrollProgress: MotionValue<number> | null;
  prefersReduced: boolean;
  isStacked: boolean;
}) {
  const placeholder = useMotionValue(isStacked ? 1 : 0);
  const progress = scrollProgress ?? placeholder;

  // All entry windows fit inside the project's 0–0.30 entry phase. No
  // inner fade-out anywhere — the wrapper handles exit on its own, so
  // every element holds opacity 1 right through sticky-stable.
  // Phase 1 — input PDF slides in from -80px to 0
  const inputX = useTransform(progress, [0.03, 0.10], [-80, 0], {
    clamp: true,
  });
  const inputOpacity = useTransform(progress, [0.03, 0.10], [0, 1], {
    clamp: true,
  });

  // Phase 2 — processing visualisation (outline + scan + highlights)
  const processingOpacity = useTransform(progress, [0.11, 0.16], [0, 1], {
    clamp: true,
  });

  // Phase 3 — outputs slide in from +80px to 0
  const outputsX = useTransform(progress, [0.16, 0.22], [80, 0], {
    clamp: true,
  });
  const outputsOpacity = useTransform(progress, [0.16, 0.22], [0, 1], {
    clamp: true,
  });

  // Connecting lines draw alongside the outputs.
  const linesLength = useTransform(progress, [0.18, 0.24], [0, 1], {
    clamp: true,
  });

  // Time indicator lands as the entry phase wraps up.
  const timeOpacity = useTransform(progress, [0.24, 0.30], [0, 1], {
    clamp: true,
  });

  const [stable, setStable] = useState(isStacked);
  useMotionValueEvent(progress, "change", (v) => {
    if (!stable && v >= 0.30) setStable(true);
  });

  // Scan line keyframes — driven by CSS animation when scan effect is
  // visible (phase 2 + stable). Reduced-motion users get no scan.
  const scanActive = !prefersReduced;

  // [DEBUG] measure the PDF panel.
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isStacked) return;
    const log = () => {
      const panel = panelRef.current?.getBoundingClientRect();
      // eslint-disable-next-line no-console
      console.log(
        `[PdfAnimation 03] panel = ${panel?.width.toFixed(1)}x${panel?.height.toFixed(1)} | computed opacity = ${panel ? getComputedStyle(panelRef.current!).opacity : "?"}`
      );
    };
    log();
    const ro = new ResizeObserver(log);
    if (panelRef.current) ro.observe(panelRef.current);
    return () => ro.disconnect();
  }, [isStacked]);

  // [DEBUG] throttled log of motion values inside the PDF animation.
  // Snapshots input PDF, outputs, time indicator, and the computed
  // opacity of the wrapper panel — the wrapper itself has no opacity
  // transform, so reading its computed opacity tells us if any CSS or
  // parent override is bringing it down.
  const lastPdfLogRef = useRef(0);
  useMotionValueEvent(progress, "change", (v) => {
    if (isStacked) return;
    const now = performance.now();
    if (now - lastPdfLogRef.current < 200) return;
    lastPdfLogRef.current = now;
    const panelOpacity = panelRef.current
      ? getComputedStyle(panelRef.current).opacity
      : "?";
    // eslint-disable-next-line no-console
    console.log(
      `[PdfAnimation 03] progress=${v.toFixed(3)} input=${inputOpacity.get().toFixed(3)} outputs=${outputsOpacity.get().toFixed(3)} time=${timeOpacity.get().toFixed(3)} | panel computed opacity=${panelOpacity}`
    );
  });

  return (
    <div
      ref={panelRef}
      aria-hidden="true"
      style={{
        position: "relative",
        width: "100%",
        height: isStacked ? 280 : "100%",
        maxWidth: 720,
        margin: "0 auto",
        background: "#0F1115",
        border: "1px solid #27272A",
        borderRadius: 16,
        padding: 24,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          flexShrink: 0,
        }}
      >
        <span
          className="font-mono"
          style={{
            fontSize: 8,
            textTransform: "uppercase",
            letterSpacing: "0.3em",
            color: "#A1A1AA",
          }}
        >
          MOTOR DE VISÃO · LOCAL
        </span>
        <span
          className="font-mono"
          style={{
            fontSize: 7,
            textTransform: "uppercase",
            letterSpacing: "0.25em",
            color: "#10B981",
            padding: "2px 6px",
            border: "1px solid rgba(16, 185, 129, 0.4)",
            borderRadius: 3,
          }}
        >
          OFFLINE · ZERO CLOUD
        </span>
      </div>

      {/* Central processing zone */}
      <div
        style={{
          flex: 1,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 0,
        }}
      >
        {/* Connecting lines between input PDF, engine, and outputs. Path
            coords retargeted for the 80×110 PdfShape positions: input
            right edge ~24%, outputs left edge ~80%, output A center
            ~29% vertical, output B center ~71% vertical (viewBox is
            600×400 stretched by preserveAspectRatio="none"). */}
        <svg
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
          viewBox="0 0 600 400"
          preserveAspectRatio="none"
        >
          <motion.path
            d="M 145 200 C 250 200 365 115 470 115"
            fill="none"
            stroke="#3F3F46"
            strokeWidth={1}
            style={{ pathLength: linesLength }}
          />
          <motion.path
            d="M 145 200 C 250 200 365 285 470 285"
            fill="none"
            stroke="#3F3F46"
            strokeWidth={1}
            style={{ pathLength: linesLength }}
          />
        </svg>

        {/* Input PDF (centre-left) */}
        <motion.div
          style={{
            position: "absolute",
            left: "12%",
            top: "50%",
            transform: "translateY(-50%)",
            x: inputX,
            opacity: inputOpacity,
            zIndex: 2,
          }}
        >
          <CapacidadePdfShape
            label="TECH_PACK_SS26.PDF"
            content="original"
          />
          {/* Processing overlay — outline + scan + highlights. Outer
              opacity is driven by scroll (processingOpacity); no
              continuous opacity pulse during sticky-stable. */}
          <motion.div
            style={{
              opacity: processingOpacity,
              position: "absolute",
              inset: -4,
              border: "2px solid #2563EB",
              borderRadius: 8,
              boxShadow: "0 0 10px rgba(37, 99, 235, 0.35)",
              pointerEvents: "none",
            }}
          />
          {/* Scan line */}
          {scanActive && (
            <motion.div
              style={{
                opacity: processingOpacity,
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                height: 1,
                background: "#3B82F6",
                boxShadow: "0 0 6px rgba(59, 130, 246, 0.7)",
                pointerEvents: "none",
              }}
              animate={{ y: [0, 106, 0] }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          )}
          {/* Highlights — small rects suggesting field detection */}
          <motion.div
            style={{
              opacity: processingOpacity,
              position: "absolute",
              left: 10,
              top: 20,
              width: 33,
              height: 5,
              background: "rgba(59, 130, 246, 0.3)",
              borderRadius: 1,
              pointerEvents: "none",
            }}
          />
          <motion.div
            style={{
              opacity: processingOpacity,
              position: "absolute",
              left: 16,
              top: 42,
              width: 52,
              height: 4,
              background: "rgba(59, 130, 246, 0.3)",
              borderRadius: 1,
              pointerEvents: "none",
            }}
          />
          <motion.div
            style={{
              opacity: processingOpacity,
              position: "absolute",
              left: 12,
              top: 72,
              width: 42,
              height: 5,
              background: "rgba(59, 130, 246, 0.3)",
              borderRadius: 1,
              pointerEvents: "none",
            }}
          />
        </motion.div>

        {/* Phase 2 sub-label */}
        <motion.div
          style={{
            opacity: processingOpacity,
            position: "absolute",
            bottom: 6,
            left: "50%",
            transform: "translateX(-50%)",
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
          className="font-mono"
        >
          <span
            style={{
              fontSize: 7,
              textTransform: "uppercase",
              letterSpacing: "0.25em",
              color: "#A1A1AA",
            }}
          >
            EXTRAINDO CONTEÚDO · APLICANDO LÉXICO
          </span>
        </motion.div>

        {/* Output A — translated PDF (top right) */}
        <motion.div
          style={{
            position: "absolute",
            right: "8%",
            top: "12%",
            x: outputsX,
            opacity: outputsOpacity,
            zIndex: 2,
          }}
        >
          <CapacidadePdfShape
            label="TECH_PACK_SS26_PT.PDF"
            content="translated"
          />
        </motion.div>

        {/* Output B — structured data (bottom right) */}
        <motion.div
          style={{
            position: "absolute",
            right: "8%",
            bottom: "12%",
            x: outputsX,
            opacity: outputsOpacity,
            zIndex: 2,
          }}
        >
          <CapacidadePdfShape
            label="DATA.JSON · ERP READY"
            content="json"
          />
        </motion.div>
      </div>

      {/* Time indicator (bottom right) */}
      <motion.div
        style={{
          opacity: timeOpacity,
          position: "absolute",
          right: 16,
          bottom: 12,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 1,
        }}
      >
        <span
          className="font-mono"
          style={{ fontSize: 11, color: "#10B981", letterSpacing: "0.1em" }}
        >
          02:34
        </span>
        <span
          className="font-mono"
          style={{
            fontSize: 6,
            textTransform: "uppercase",
            letterSpacing: "0.25em",
            color: "#52525B",
          }}
        >
          TEMPO REAL DE PROCESSAMENTO
        </span>
      </motion.div>
    </div>
  );
}

/**
 * Visual representation of a PDF document (or JSON output) — a 80×110
 * rectangle with mini "text lines" inside. The `content` prop lightly
 * varies the inner pattern so the original / translated / json outputs
 * look distinguishable at a glance.
 */
function CapacidadePdfShape({
  label,
  content,
}: {
  label: string;
  content: "original" | "translated" | "json";
}) {
  const lines: Array<{ width: number; color: string }> =
    content === "json"
      ? [
          { width: 90, color: "#A1A1AA" },
          { width: 70, color: "#A1A1AA" },
          { width: 88, color: "#A1A1AA" },
          { width: 60, color: "#A1A1AA" },
          { width: 84, color: "#A1A1AA" },
        ]
      : content === "translated"
      ? [
          { width: 100, color: "#3F3F46" },
          { width: 80, color: "#3F3F46" },
          { width: 95, color: "#3F3F46" },
          { width: 70, color: "#3F3F46" },
          { width: 90, color: "#3F3F46" },
          { width: 60, color: "#3F3F46" },
        ]
      : [
          { width: 90, color: "#3F3F46" },
          { width: 100, color: "#3F3F46" },
          { width: 70, color: "#3F3F46" },
          { width: 95, color: "#3F3F46" },
          { width: 80, color: "#3F3F46" },
          { width: 65, color: "#3F3F46" },
        ];

  return (
    <div
      style={{
        position: "relative",
        width: 80,
        height: 110,
        border: "1px solid #27272A",
        background: "#0F1115",
        borderRadius: 4,
        padding: 8,
        display: "flex",
        flexDirection: "column",
        gap: 5,
      }}
    >
      <span
        className="font-mono"
        style={{
          position: "absolute",
          top: -11,
          left: 0,
          fontSize: 6,
          color: "#52525B",
          letterSpacing: "0.1em",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      {content === "json" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {[
            { k: "medida_1:", v: "42cm" },
            { k: "material:", v: "100% algodão" },
            { k: "quantidade:", v: "250" },
            { k: "cor:", v: "azul cobalto" },
            { k: "ref:", v: "SS26-841" },
          ].map((row, i) => (
            <div
              key={i}
              className="font-mono"
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 5,
                color: "#A1A1AA",
                gap: 3,
              }}
            >
              <span>{row.k}</span>
              <span style={{ color: "#FAFAFA" }}>{row.v}</span>
            </div>
          ))}
        </div>
      ) : (
        lines.map((line, i) => (
          <span
            key={i}
            style={{
              display: "block",
              height: 1,
              width: `${line.width}%`,
              background: line.color,
            }}
          />
        ))
      )}
    </div>
  );
}

function CapacidadeClosing() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const prefersReduced = usePrefersReducedMotion();

  const phrase =
    "Três sectores diferentes. A mesma capacidade técnica aplicada com nuance a cada contexto.";
  const words = phrase.split(" ");

  return (
    <div
      ref={ref}
      className="flex min-h-screen items-center px-6"
      data-capacidade="closing"
      style={{ paddingTop: 128 }}
    >
      <div className="mx-auto w-full max-w-[1280px]">
        <div className="max-w-[760px]">
          <p
            className="font-display"
            style={{
              margin: 0,
              fontWeight: 300,
              fontSize: 32,
              lineHeight: 1.3,
              letterSpacing: "-0.01em",
              color: "#A1A1AA",
            }}
          >
            {words.map((word, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 16 }}
                animate={
                  inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }
                }
                transition={{
                  duration: 0.9,
                  delay: i * 0.1,
                  ease: EASE_EXPO_OUT_PROBLEMA,
                }}
                style={{ display: "inline-block", marginRight: "0.25em" }}
              >
                {word}
              </motion.span>
            ))}
          </p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            transition={{
              duration: 0.7,
              delay: words.length * 0.1 + 0.5,
              ease: EASE_EXPO_OUT_PROBLEMA,
            }}
            className="flex items-center gap-3"
            style={{ marginTop: 64 }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 24,
                height: 1,
                background: "var(--border)",
                display: "block",
              }}
            />
            <span
              className="font-mono"
              style={{
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: "0.3em",
                color: "#52525B",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  animation: prefersReduced
                    ? undefined
                    : "heroScrollArrow 2s ease-in-out infinite",
                  marginRight: "0.6em",
                }}
              >
                ↓
              </span>
              05 — O PROCESSO
            </span>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
   HERO PART 1 — identification screen + morfismo into the cascade
   ------------------------------------------------------------------------- */

function HeroPart1({
  scrollYProgress,
}: {
  scrollYProgress: MotionValue<number>;
}) {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      data-scene="hero"
      style={{ zIndex: 10 }}
    >
      <HeroRadialHalo scrollYProgress={scrollYProgress} />
      {/* UNREAL + phrase are grouped and centred exactly as they were
          before the logo existed — the logo does not participate in the
          centring calculation. */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ gap: 48 }}
      >
        <HeroMonument scrollYProgress={scrollYProgress} />
        <HeroPhrase scrollYProgress={scrollYProgress} />
      </div>
      {/* Logo absolutely positioned 48px above UNREAL's top edge. The
          `top` calc subtracts: half the group height (so we hit UNREAL's
          top) + 48px gap + 120px logo height. */}
      <HeroLogo scrollYProgress={scrollYProgress} />
      <HeroScrollIndicator scrollYProgress={scrollYProgress} />
    </div>
  );
}

const EASE_EXPO_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

function useHeroFadeOpacity(
  scrollYProgress: MotionValue<number>
): MotionValue<number> {
  // 0–5% global, eased with power3.inOut. Used by every Hero sub-component.
  const t = useTransform(
    scrollYProgress,
    [HERO_FADE.start, HERO_FADE.end],
    [0, 1],
    { clamp: true }
  );
  return useTransform(t, (v) => 1 - easeInOutCubic(v));
}

function HeroLogo({
  scrollYProgress,
}: {
  scrollYProgress: MotionValue<number>;
}) {
  const prefersReduced = usePrefersReducedMotion();

  const entranceOpacity = useMotionValue(0);
  // When reduced motion is preferred we skip the scale + glow ramp and
  // settle the logo at its final state with just an opacity fade.
  const entranceScale = useMotionValue(prefersReduced ? 1 : 0.92);
  const glowAlpha = useMotionValue(prefersReduced ? 1 : 0);

  useEffect(() => {
    const delay = HERO_TIMELINE.logoDelay / 1000;
    if (prefersReduced) {
      const o = animate(entranceOpacity, 1, {
        delay,
        duration: 0.6,
        ease: EASE_EXPO_OUT,
      });
      return () => o.stop();
    }
    const duration = HERO_TIMELINE.logoDur / 1000;
    const o = animate(entranceOpacity, 1, {
      delay,
      duration,
      ease: EASE_EXPO_OUT,
    });
    const s = animate(entranceScale, 1, {
      delay,
      duration,
      ease: EASE_EXPO_OUT,
    });
    const g = animate(glowAlpha, 1, {
      delay,
      duration,
      ease: EASE_EXPO_OUT,
    });
    return () => {
      o.stop();
      s.stop();
      g.stop();
    };
  }, [entranceOpacity, entranceScale, glowAlpha, prefersReduced]);

  const fadeOpacity = useHeroFadeOpacity(scrollYProgress);
  const finalOpacity = useTransform(
    [entranceOpacity, fadeOpacity] as [
      MotionValue<number>,
      MotionValue<number>,
    ],
    ([a, b]: number[]) => a * b
  );

  // Triple drop-shadow halo. Inner intense (16px / 0.8), medium (40px /
  // 0.5), outer diffuse (80px / 0.3). All three ramp from 0 to full
  // intensity via `glowAlpha`.
  const filter = useTransform(
    glowAlpha,
    (v) =>
      `drop-shadow(0 0 ${16 * v}px rgba(59, 130, 246, ${0.8 * v})) drop-shadow(0 0 ${40 * v}px rgba(59, 130, 246, ${0.5 * v})) drop-shadow(0 0 ${80 * v}px rgba(59, 130, 246, ${0.3 * v}))`
  );

  // Position: top = 50% - (half_group + 48 gap + 120 logo height).
  //   half_group = (UNREAL_h + 48 + phrase_h) / 2
  //   UNREAL_h = clamp(120, 14vw, 240)  →  half = clamp(60, 7vw, 120)
  //   phrase_h ≈ 24px × line-height 1.3 ≈ 31.2px
  //   So half_group = clamp(60 + 24 + 15.6, 7vw + 39.6, 120 + 24 + 15.6)
  //                  ≈ clamp(99.6, 7vw + 39.6, 159.6)
  //   Logo top from 50%: -(99.6/127.6/159.6 + 168) ≈ -clamp(267.6, 7vw + 207.6, 327.6)
  // The wrapper is `overflow: visible` (default) so the drop-shadow halo
  // is not clipped.
  return (
    <motion.div
      style={{
        position: "absolute",
        left: "50%",
        top: "calc(50% - clamp(268px, calc(7vw + 208px), 328px))",
        // Use framer-motion's translateX shortcut so it composes cleanly
        // with `scale` — mixing a raw `transform` string with motion's
        // individual transform props would clobber the latter.
        translateX: "-50%",
        opacity: finalOpacity,
        scale: entranceScale,
        filter,
        width: 128,
        height: 120,
        overflow: "visible",
        willChange: "transform, opacity, filter",
      }}
    >
      <Image
        src="/logo-clean.png"
        alt="UNREAL Performance"
        width={128}
        height={120}
        priority
        quality={100}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </motion.div>
  );
}

function HeroRadialHalo({
  scrollYProgress,
}: {
  scrollYProgress: MotionValue<number>;
}) {
  const fadeOpacity = useHeroFadeOpacity(scrollYProgress);
  return (
    <motion.div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        background:
          "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(30, 64, 175, 0.04) 0%, rgba(10, 11, 13, 0) 70%)",
        opacity: fadeOpacity,
        pointerEvents: "none",
      }}
    />
  );
}

function HeroMonument({
  scrollYProgress,
}: {
  scrollYProgress: MotionValue<number>;
}) {
  const entranceOpacity = useMotionValue(0);
  const entranceScale = useMotionValue(0.98);

  useEffect(() => {
    const delay = HERO_TIMELINE.monumentDelay / 1000;
    const duration = HERO_TIMELINE.monumentDur / 1000;
    const o = animate(entranceOpacity, 1, {
      delay,
      duration,
      ease: EASE_EXPO_OUT,
    });
    const s = animate(entranceScale, 1, {
      delay,
      duration,
      ease: EASE_EXPO_OUT,
    });
    return () => {
      o.stop();
      s.stop();
    };
  }, [entranceOpacity, entranceScale]);

  const fadeOpacity = useHeroFadeOpacity(scrollYProgress);
  const finalOpacity = useTransform(
    [entranceOpacity, fadeOpacity] as [
      MotionValue<number>,
      MotionValue<number>,
    ],
    ([a, b]: number[]) => a * b
  );

  return (
    <motion.span
      style={{
        fontFamily: "var(--font-fraunces), serif",
        fontWeight: 300,
        fontSize: "clamp(120px, 14vw, 240px)",
        letterSpacing: "-0.04em",
        lineHeight: 1,
        color: "#FAFAFA",
        opacity: finalOpacity,
        scale: entranceScale,
        display: "block",
        textAlign: "center",
        willChange: "transform, opacity",
      }}
    >
      UNREAL
    </motion.span>
  );
}

function HeroPhrase({
  scrollYProgress,
}: {
  scrollYProgress: MotionValue<number>;
}) {
  const entranceOpacity = useMotionValue(0);
  const entranceY = useMotionValue(12);

  useEffect(() => {
    const delay = HERO_TIMELINE.phraseDelay / 1000;
    const duration = HERO_TIMELINE.phraseDur / 1000;
    const o = animate(entranceOpacity, 1, {
      delay,
      duration,
      ease: EASE_EXPO_OUT,
    });
    const y = animate(entranceY, 0, {
      delay,
      duration,
      ease: EASE_EXPO_OUT,
    });
    return () => {
      o.stop();
      y.stop();
    };
  }, [entranceOpacity, entranceY]);

  const fadeOpacity = useHeroFadeOpacity(scrollYProgress);
  const finalOpacity = useTransform(
    [entranceOpacity, fadeOpacity] as [
      MotionValue<number>,
      MotionValue<number>,
    ],
    ([a, b]: number[]) => a * b
  );

  return (
    <motion.span
      style={{
        fontFamily: "var(--font-fraunces), serif",
        fontWeight: 300,
        fontSize: 24,
        letterSpacing: "-0.01em",
        lineHeight: 1.3,
        color: "#A1A1AA",
        opacity: finalOpacity,
        y: entranceY,
        display: "block",
        textAlign: "center",
      }}
    >
      Construímos o sistema que vos falta.
    </motion.span>
  );
}

function HeroScrollIndicator({
  scrollYProgress,
}: {
  scrollYProgress: MotionValue<number>;
}) {
  const entranceOpacity = useMotionValue(0);

  useEffect(() => {
    const o = animate(entranceOpacity, 1, {
      delay: HERO_TIMELINE.scrollIndicatorDelay / 1000,
      duration: HERO_TIMELINE.scrollIndicatorDur / 1000,
      ease: EASE_EXPO_OUT,
    });
    return () => o.stop();
  }, [entranceOpacity]);

  const fadeOpacity = useHeroFadeOpacity(scrollYProgress);
  const finalOpacity = useTransform(
    [entranceOpacity, fadeOpacity] as [
      MotionValue<number>,
      MotionValue<number>,
    ],
    ([a, b]: number[]) => a * b
  );

  return (
    <motion.div
      className="absolute flex items-center gap-2"
      style={{
        left: "50%",
        top: "92%",
        translateX: "-50%",
        opacity: finalOpacity,
      }}
    >
      <span
        className="font-mono text-[10px] uppercase tracking-[0.3em]"
        style={{
          color: "#52525B",
          animation: "heroScrollPulse 3s ease-in-out infinite",
        }}
      >
        CONTINUE
      </span>
      <span
        className="font-mono text-[10px]"
        style={{
          color: "#52525B",
          animation: "heroScrollArrow 2s ease-in-out infinite",
        }}
      >
        ↓
      </span>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------
   Reusable SVG defs (gradients, glows)
   ------------------------------------------------------------------------- */

function SvgDefs() {
  return (
    <svg
      style={{
        position: "absolute",
        width: 0,
        height: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
      aria-hidden="true"
    >
      <defs>
        <filter
          id="soft-glow"
          x="-100%"
          y="-100%"
          width="300%"
          height="300%"
        >
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter
          id="strong-glow"
          x="-100%"
          y="-100%"
          width="300%"
          height="300%"
        >
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  );
}

/* -------------------------------------------------------------------------
   SCENE 1 — Invoice (left)
   ------------------------------------------------------------------------- */

type RegisterFn = (id: string, el: HTMLElement | null) => void;

function Invoice({
  scrollYProgress,
  registerSource,
  prefersReduced,
}: {
  scrollYProgress: MotionValue<number>;
  registerSource: RegisterFn;
  prefersReduced: boolean;
}) {
  // Fade out + shrink within Cena1's mount window (30→34%) so the factura
  // is fully gone before Cena1 unmounts at 35%.
  const scale = useTransform(
    scrollYProgress,
    [SCROLL.t12Start, SCROLL.t12Start + 0.04],
    prefersReduced ? [1, 1] : [1, 0.6]
  );
  const opacity = useTransform(
    scrollYProgress,
    [SCROLL.t12Start, SCROLL.t12Start + 0.04],
    [1, 0]
  );

  return (
    <motion.div
      className="absolute"
      style={{
        left: "25%",
        top: "50%",
        translateX: "-50%",
        translateY: "-50%",
        scale,
        opacity,
        width: 480,
        height: 640,
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        padding: 48,
        boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
        willChange: "transform, opacity",
      }}
    >
      <div className="flex flex-col h-full">
        <div className="pb-3 mb-5 border-b border-border-base">
          <span className="font-mono text-[12px] uppercase tracking-[0.1em] text-text-support">
            FACTURA
          </span>
        </div>
        <InvoiceField
          id="numero"
          registerSource={registerSource}
          scrollYProgress={scrollYProgress}
        >
          <div className="font-sans text-[20px] font-medium text-text-primary">
            Nº 2024/847
          </div>
        </InvoiceField>
        <InvoiceField
          id="data"
          registerSource={registerSource}
          scrollYProgress={scrollYProgress}
        >
          <div className="font-sans text-[14px] text-text-support">
            15 de Outubro de 2024
          </div>
        </InvoiceField>

        <InvoiceLabel>EMITIDO POR</InvoiceLabel>
        <InvoiceField
          id="fornecedor"
          registerSource={registerSource}
          scrollYProgress={scrollYProgress}
        >
          <div className="font-sans text-[15px] font-medium text-text-primary">
            TechParts Lda
          </div>
        </InvoiceField>
        <InvoiceField
          id="nif"
          registerSource={registerSource}
          scrollYProgress={scrollYProgress}
          tight
        >
          <div className="font-sans text-[13px] text-text-support">
            NIF 509 234 567
          </div>
        </InvoiceField>

        <InvoiceLabel>DESCRIÇÃO</InvoiceLabel>
        <InvoiceField
          id="descricao"
          registerSource={registerSource}
          scrollYProgress={scrollYProgress}
        >
          <div className="font-sans text-[14px] text-text-secondary">
            Serviços de manutenção — Trimestre Q3
          </div>
        </InvoiceField>

        <InvoiceLabel>VALOR</InvoiceLabel>
        <InvoiceField
          id="valor"
          registerSource={registerSource}
          scrollYProgress={scrollYProgress}
        >
          <div className="font-display font-medium text-[32px] text-text-primary leading-none">
            €12.450,00
          </div>
        </InvoiceField>

        <InvoiceLabel>VENCIMENTO</InvoiceLabel>
        <InvoiceField
          id="vencimento"
          registerSource={registerSource}
          scrollYProgress={scrollYProgress}
        >
          <div className="font-sans text-[14px] text-text-secondary">
            30 dias
          </div>
        </InvoiceField>
      </div>
    </motion.div>
  );
}

function InvoiceLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mt-5 mb-1.5">
      <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-text-support">
        {children}
      </span>
    </div>
  );
}

function InvoiceField({
  id,
  registerSource,
  scrollYProgress,
  tight,
  children,
}: {
  id: string;
  registerSource: RegisterFn;
  scrollYProgress: MotionValue<number>;
  tight?: boolean;
  children: ReactNode;
}) {
  const index = FIELDS.findIndex((f) => f.id === id);
  const [lightStart, lightEnd] = fieldLightRange(index);
  const [flyStart, flyEnd] = fieldFlyRange(index);

  const glow = useTransform(
    scrollYProgress,
    [lightStart, lightEnd, flyStart],
    [0, 1, 1],
    { clamp: true }
  );
  const boxShadow = useTransform(
    glow,
    (v) => `inset 0 0 16px rgba(59,130,246,${v * 0.16})`
  );
  const filter = useTransform(glow, (v) => `brightness(${1 + v * 0.1})`);

  const opacity = useTransform(
    scrollYProgress,
    [flyStart, flyStart + 0.008, flyEnd],
    [1, 0, 0]
  );
  const translateY = useTransform(
    scrollYProgress,
    [flyStart, flyEnd],
    [0, -6]
  );

  return (
    <motion.div
      ref={(el) => registerSource(id, el)}
      style={{
        boxShadow,
        filter,
        opacity,
        y: translateY,
        position: "relative",
        paddingTop: tight ? 2 : 4,
        paddingBottom: tight ? 2 : 4,
        marginLeft: -8,
        marginRight: -8,
        paddingLeft: 8,
        paddingRight: 8,
        borderRadius: 2,
      }}
    >
      {children}
    </motion.div>
  );
}

/* -------------------------------------------------------------------------
   Cena 1's right-side data card. Static at 75%/50%, 480x640. Holds the
   field destination refs for FlyTraces. Fades out 30→33% so the handoff
   to MorphingCard is complete before Cena1 unmounts at 35%.
   ------------------------------------------------------------------------- */

function DataCardScene1({
  scrollYProgress,
  registerDest,
}: {
  scrollYProgress: MotionValue<number>;
  registerDest: RegisterFn;
}) {
  const ghostOpacity = useTransform(
    scrollYProgress,
    [0, SCROLL.s1FlyStart, SCROLL.s1SettleStart],
    [0.04, 0.18, 1]
  );
  const cardOpacity = useTransform(
    scrollYProgress,
    [SCROLL.t12Start, SCROLL.t12Start + 0.03],
    [1, 0]
  );

  return (
    <motion.div
      className="absolute"
      style={{
        left: "75%",
        top: "50%",
        translateX: "-50%",
        translateY: "-50%",
        width: 480,
        height: 640,
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
        opacity: cardOpacity,
        overflow: "hidden",
        willChange: "transform, opacity",
      }}
    >
      <div className="absolute inset-0 flex flex-col p-12">
        <div className="pb-3 mb-3 border-b border-border-base">
          <motion.span
            className="font-mono text-[12px] uppercase tracking-[0.1em] text-text-support"
            style={{ opacity: ghostOpacity }}
          >
            DADOS EXTRAÍDOS
          </motion.span>
        </div>
        {FIELDS.map((f, i) => (
          <DataRow
            key={f.id}
            field={f}
            index={i}
            registerDest={registerDest}
            scrollYProgress={scrollYProgress}
            ghostOpacity={ghostOpacity}
            isLast={i === FIELDS.length - 1}
          />
        ))}
      </div>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------
   Transição 1→2's morphing card. Interpolates position/size + cross-fades
   content from "data card" to "ERP node". Mounted in [25%, 43%]; outer
   opacity is 0 in the 25→30% and 38→43% buffer windows so the buffer is
   visually silent.
   ------------------------------------------------------------------------- */

function MorphingCard({
  scrollYProgress,
}: {
  scrollYProgress: MotionValue<number>;
}) {
  const left = useTransform(
    scrollYProgress,
    [SCROLL.t12Start, SCROLL.t12End],
    ["75%", "18%"]
  );
  const top = useTransform(
    scrollYProgress,
    [SCROLL.t12Start, SCROLL.t12End],
    ["50%", "42%"]
  );
  const width = useTransform(
    scrollYProgress,
    [SCROLL.t12Start, SCROLL.t12End],
    [480, 240]
  );
  const height = useTransform(
    scrollYProgress,
    [SCROLL.t12Start, SCROLL.t12End],
    [640, 140]
  );
  const padding = useTransform(
    scrollYProgress,
    [SCROLL.t12Start, SCROLL.t12End],
    [48, 20]
  );
  // Cascade-local only so the input array stays strictly monotonic
  // regardless of WINDOWS.t12 changes. The strict mount/unmount handles
  // the hard edges; this tiny fade-in/out just absorbs any sub-frame
  // pop at the boundary.
  const cardOpacity = useTransform(
    scrollYProgress,
    [
      SCROLL.t12Start,
      SCROLL.t12Start + 0.005,
      SCROLL.t12End - 0.005,
      SCROLL.t12End,
    ],
    [0, 1, 1, 0]
  );
  const dataOpacity = useTransform(
    scrollYProgress,
    [SCROLL.t12Start, SCROLL.t12Start + 0.02, SCROLL.t12End - 0.015],
    [1, 0.4, 0]
  );
  const erpOpacity = useTransform(
    scrollYProgress,
    [SCROLL.t12Start + 0.025, SCROLL.t12End],
    [0, 1]
  );

  return (
    <motion.div
      className="absolute"
      style={{
        left,
        top,
        translateX: "-50%",
        translateY: "-50%",
        width,
        height,
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
        opacity: cardOpacity,
        overflow: "hidden",
        willChange: "transform, opacity",
      }}
    >
      <motion.div
        className="absolute inset-0 flex flex-col"
        style={{ opacity: dataOpacity, padding }}
      >
        <div className="pb-3 mb-3 border-b border-border-base">
          <span className="font-mono text-[12px] uppercase tracking-[0.1em] text-text-support">
            DADOS EXTRAÍDOS
          </span>
        </div>
        {FIELDS.map((f, i) => (
          <div
            key={f.id}
            className={`flex items-baseline justify-between py-2 ${
              i === FIELDS.length - 1 ? "" : "border-b border-border-base"
            }`}
          >
            <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-text-support">
              {f.label}
            </span>
            <span className="font-sans text-[15px] font-medium text-text-primary">
              {f.value}
            </span>
          </div>
        ))}
      </motion.div>

      <motion.div
        className="absolute inset-0 flex flex-col items-start justify-center px-6"
        style={{ opacity: erpOpacity, pointerEvents: "none" }}
      >
        <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-text-support">
          ERP
        </span>
        <span className="font-sans text-[16px] font-medium text-text-primary mt-1">
          SAP
        </span>
      </motion.div>
    </motion.div>
  );
}

function DataRow({
  field,
  index,
  registerDest,
  scrollYProgress,
  ghostOpacity,
  isLast,
}: {
  field: Field;
  index: number;
  registerDest: RegisterFn;
  scrollYProgress: MotionValue<number>;
  ghostOpacity: MotionValue<number>;
  isLast: boolean;
}) {
  const [, flyEnd] = fieldFlyRange(index);
  const valueOpacity = useTransform(
    scrollYProgress,
    [flyEnd - 0.005, flyEnd + 0.012],
    [0, 1]
  );
  const valueY = useTransform(
    scrollYProgress,
    [flyEnd - 0.005, flyEnd + 0.012],
    [3, 0]
  );

  return (
    <div
      className={`flex items-baseline justify-between py-2 ${
        isLast ? "" : "border-b border-border-base"
      }`}
    >
      <motion.span
        className="font-mono text-[11px] uppercase tracking-[0.1em] text-text-support"
        style={{ opacity: ghostOpacity }}
      >
        {field.label}
      </motion.span>
      <div className="flex items-center gap-2">
        <motion.span
          ref={(el) => registerDest(field.id, el)}
          className="font-sans text-[15px] font-medium text-text-primary"
          style={{ opacity: valueOpacity, y: valueY }}
        >
          {field.value}
        </motion.span>
        {field.id === "valor" && (
          <CheckIcon scrollYProgress={scrollYProgress} />
        )}
      </div>
    </div>
  );
}

function CheckIcon({
  scrollYProgress,
}: {
  scrollYProgress: MotionValue<number>;
}) {
  const opacity = useTransform(
    scrollYProgress,
    [SCROLL.s1CheckStart, SCROLL.s1CheckEnd],
    [0, 1]
  );
  const scale = useTransform(
    scrollYProgress,
    [SCROLL.s1CheckStart, SCROLL.s1CheckEnd],
    [0.5, 1]
  );

  return (
    <motion.svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      style={{ opacity, scale }}
      aria-hidden="true"
    >
      <path
        d="M3 8 L7 12 L13 5"
        stroke="#10B981"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </motion.svg>
  );
}

/* -------------------------------------------------------------------------
   SCENE 1 — Fly traces (light trails) + flying values
   ------------------------------------------------------------------------- */

function FlyTraces({
  coords,
  scrollYProgress,
  size,
}: {
  coords: Record<string, FieldCoords>;
  scrollYProgress: MotionValue<number>;
  size: { w: number; h: number };
}) {
  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={size.w}
      height={size.h}
      viewBox={`0 0 ${size.w} ${size.h}`}
      style={{ overflow: "visible" }}
      aria-hidden="true"
    >
      {FIELDS.map((f, i) => {
        const c = coords[f.id];
        if (!c) return null;
        const bow = i % 2 === 0 ? -1 : 1;
        const d = organicCubic(c.sx, c.sy, c.dx, c.dy, bow);
        return (
          <Trace
            key={f.id}
            d={d}
            index={i}
            sx={c.sx}
            sy={c.sy}
            dx={c.dx}
            dy={c.dy}
            scrollYProgress={scrollYProgress}
          />
        );
      })}
    </svg>
  );
}

function Trace({
  d,
  index,
  sx,
  sy,
  dx,
  dy,
  scrollYProgress,
}: {
  d: string;
  index: number;
  sx: number;
  sy: number;
  dx: number;
  dy: number;
  scrollYProgress: MotionValue<number>;
}) {
  const gradId = `trace-grad-${index}`;
  const [flyStart, flyEnd] = fieldFlyRange(index);
  // Eased dashoffset so the line's leading edge tracks the comet (which also
  // uses easeInOutCubic for natural acceleration).
  const t = useTransform(scrollYProgress, [flyStart, flyEnd], [0, 1], {
    clamp: true,
  });
  const dashoffset = useTransform(t, (v) => 1 - easeInOutCubic(v));
  const opacity = useTransform(
    scrollYProgress,
    [
      flyStart - 0.005,
      flyStart + 0.005,
      flyEnd,
      flyEnd + 0.02,
      SCROLL.t12Start,
      SCROLL.t12Start + 0.04,
    ],
    [0, 0.85, 0.85, 0.16, 0.16, 0]
  );

  return (
    <>
      <defs>
        <linearGradient
          id={gradId}
          gradientUnits="userSpaceOnUse"
          x1={sx}
          y1={sy}
          x2={dx}
          y2={dy}
        >
          <stop offset="0%" stopColor="#1E40AF" stopOpacity="0" />
          <stop offset="50%" stopColor="#2563EB" stopOpacity="1" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={d}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth={1.5}
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={dashoffset}
        strokeLinecap="round"
        style={{
          opacity,
          filter: "drop-shadow(0 0 10px rgba(59,130,246,0.5))",
        }}
      />
    </>
  );
}

function FlyingValues({
  coords,
  scrollYProgress,
}: {
  coords: Record<string, FieldCoords>;
  scrollYProgress: MotionValue<number>;
}) {
  return (
    <>
      {FIELDS.map((f, i) => {
        const c = coords[f.id];
        if (!c) return null;
        const bow = i % 2 === 0 ? -1 : 1;
        return (
          <FlyingValue
            key={f.id}
            field={f}
            index={i}
            c={c}
            bow={bow}
            scrollYProgress={scrollYProgress}
          />
        );
      })}
    </>
  );
}

function cubic(
  u: number,
  p0: number,
  p1: number,
  p2: number,
  p3: number
): number {
  const v = 1 - u;
  return v * v * v * p0 + 3 * v * v * u * p1 + 3 * v * u * u * p2 + u * u * u * p3;
}

function FlyingValue({
  field,
  index,
  c,
  bow,
  scrollYProgress,
}: {
  field: Field;
  index: number;
  c: FieldCoords;
  bow: number;
  scrollYProgress: MotionValue<number>;
}) {
  // Three-phase typographic transformation:
  //   A — Dissolution  (first 20% of fly range): the legible value collapses
  //       into a horizontal streak of blue light at the source.
  //   B — Travel       (middle 60% of fly range): the streak follows the
  //       Bezier path, rotated to its tangent so it reads as a comet.
  //   C — Rematerialisation (last 20%): the streak reassembles into the
  //       legible value at the destination row.
  const [flyStart, flyEnd] = fieldFlyRange(index);
  const flyDur = flyEnd - flyStart;
  const phaseAEnd = flyStart + flyDur * 0.2;
  const phaseBEnd = flyStart + flyDur * 0.8;

  const t = useTransform(scrollYProgress, [flyStart, flyEnd], [0, 1], {
    clamp: true,
  });
  const eased = useTransform(t, easeInOutCubic);

  // Cubic-Bezier path with the same control points as the Trace component
  // (so the visible trail and the comet head share one curve).
  const segDx = c.dx - c.sx;
  const segDy = c.dy - c.sy;
  const len = Math.sqrt(segDx * segDx + segDy * segDy) || 1;
  const nx = -segDy / len;
  const ny = segDx / len;
  const bow1 = bow * Math.min(120, len * 0.22);
  const bow2 = bow * Math.min(80, len * 0.14);
  const c1x = c.sx + segDx * 0.32 + nx * bow1;
  const c1y = c.sy + segDy * 0.32 + ny * bow1;
  const c2x = c.sx + segDx * 0.68 + nx * bow2;
  const c2y = c.sy + segDy * 0.68 + ny * bow2;

  const x = useTransform(eased, (v) => cubic(v, c.sx, c1x, c2x, c.dx));
  const y = useTransform(eased, (v) => cubic(v, c.sy, c1y, c2y, c.dy));

  // Tangent angle of the cubic Bezier at the current eased parameter.
  const tangentDeg = useTransform(eased, (v) => {
    const u = 1 - v;
    const dxdt =
      3 * u * u * (c1x - c.sx) +
      6 * u * v * (c2x - c1x) +
      3 * v * v * (c.dx - c2x);
    const dydt =
      3 * u * u * (c1y - c.sy) +
      6 * u * v * (c2y - c1y) +
      3 * v * v * (c.dy - c2y);
    return (Math.atan2(dydt, dxdt) * 180) / Math.PI;
  });
  // Tangent rotation is only applied during Phase B (the streak). Phase A
  // and Phase C keep the text upright so it stays legible.
  const tangentAlpha = useTransform(
    scrollYProgress,
    [flyStart, phaseAEnd, phaseBEnd, flyEnd],
    [0, 1, 1, 0]
  );
  const rotate = useTransform(
    [tangentDeg, tangentAlpha] as [MotionValue<number>, MotionValue<number>],
    ([deg, alpha]: number[]) => deg * alpha
  );

  // Phase A/C transforms.
  const phaseRange = [flyStart, phaseAEnd, phaseBEnd, flyEnd];
  const scaleX = useTransform(scrollYProgress, phaseRange, [1, 1.4, 1.4, 1]);
  const scaleY = useTransform(scrollYProgress, phaseRange, [1, 0.3, 0.3, 1]);
  const blurAmount = useTransform(scrollYProgress, phaseRange, [0, 6, 6, 0]);
  const letterSpacingEm = useTransform(
    scrollYProgress,
    phaseRange,
    [0, 0.4, 0.4, 0]
  );
  const color = useTransform(scrollYProgress, phaseRange, [
    "#FAFAFA",
    "#3B82F6",
    "#3B82F6",
    "#FAFAFA",
  ]);
  const filter = useTransform(blurAmount, (v) => `blur(${v}px)`);
  const letterSpacing = useTransform(letterSpacingEm, (v) => `${v}em`);

  const opacity = useTransform(
    scrollYProgress,
    [flyStart - 0.002, flyStart, flyEnd, flyEnd + 0.002],
    [0, 1, 1, 0]
  );

  // Strong head glow during Phase B; subtler at endpoints so the legible
  // forms don't have an extra outline.
  const glowAlpha = useTransform(scrollYProgress, phaseRange, [0.2, 1, 1, 0.2]);
  const textShadow = useTransform(
    glowAlpha,
    (v) =>
      `0 0 ${10 * v}px rgba(59,130,246,${0.7 * v}), 0 0 ${24 * v}px rgba(59,130,246,${0.35 * v})`
  );

  return (
    <motion.div
      className="absolute pointer-events-none whitespace-nowrap"
      style={{
        left: 0,
        top: 0,
        x,
        y,
        translateX: "-50%",
        translateY: "-50%",
        rotate,
        scaleX,
        scaleY,
        opacity,
        color,
        filter,
        letterSpacing,
        textShadow,
        fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
        fontSize: 15,
        fontWeight: 500,
        zIndex: 5,
        willChange: "transform, opacity, filter",
      }}
    >
      {field.value}
    </motion.div>
  );
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/* -------------------------------------------------------------------------
   SCENE 2 — Network (3 other nodes + edges + packets)
   ------------------------------------------------------------------------- */

function Network({
  scrollYProgress,
  size,
  prefersReduced,
}: {
  scrollYProgress: MotionValue<number>;
  size: { w: number; h: number };
  prefersReduced: boolean;
}) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 50, damping: 22, mass: 1 });
  const sy = useSpring(my, { stiffness: 50, damping: 22, mass: 1 });

  useEffect(() => {
    if (prefersReduced) return;
    function handle(e: PointerEvent) {
      if (size.w === 0 || size.h === 0) return;
      mx.set((e.clientX / size.w - 0.5) * 16);
      my.set((e.clientY / size.h - 0.5) * 16);
    }
    window.addEventListener("pointermove", handle);
    return () => window.removeEventListener("pointermove", handle);
  }, [mx, my, size.w, size.h, prefersReduced]);

  return (
    <>
      {NODES.map((node, i) => (
        <NetworkNodeView
          key={node.id}
          node={node}
          index={i}
          scrollYProgress={scrollYProgress}
          parallaxX={sx}
          parallaxY={sy}
          prefersReduced={prefersReduced}
        />
      ))}

      {size.w > 0 && size.h > 0 && (
        <svg
          className="absolute inset-0 pointer-events-none"
          width={size.w}
          height={size.h}
          viewBox={`0 0 ${size.w} ${size.h}`}
          style={{ overflow: "visible" }}
          aria-hidden="true"
        >
          {EDGES.map((edge, i) => (
            <NetworkEdge
              key={`e-${i}`}
              edge={edge}
              index={i}
              size={size}
              scrollYProgress={scrollYProgress}
            />
          ))}
          {EDGES.map((edge, i) => (
            <NetworkPacket
              key={`p-${i}`}
              edge={edge}
              index={i}
              size={size}
              scrollYProgress={scrollYProgress}
              prefersReduced={prefersReduced}
            />
          ))}
        </svg>
      )}
    </>
  );
}

function NetworkNodeView({
  node,
  index,
  scrollYProgress,
  parallaxX,
  parallaxY,
  prefersReduced,
}: {
  node: SceneNode;
  index: number;
  scrollYProgress: MotionValue<number>;
  parallaxX: MotionValue<number>;
  parallaxY: MotionValue<number>;
  prefersReduced: boolean;
}) {
  const range = NODE_APPEAR_RANGES[node.id] ?? [0.38, 0.4];
  const [appearStart, appearEnd] = range;

  // All input ranges below are in CASCADE-LOCAL scroll (0–1 across the
  // cascade), matching the `scrollYProgress` motion value passed in.
  // Convergence ends at SCROLL.t23PulseEnd (0.70) — the moment the
  // flash overtakes everything — so the node has fully shrunk and faded
  // before Cena 2 unmounts. The earlier bug here mixed WINDOWS.c2[1]
  // (a *global* scroll value) into a cascade-local input range, which
  // made the range descending and dragged nodes from centre to their
  // final positions throughout the whole cena 2.
  const appearOp = useTransform(
    scrollYProgress,
    [appearStart, appearEnd, SCROLL.t23Start, SCROLL.t23PulseEnd],
    [0, 1, 1, 0]
  );
  const appearScale = useTransform(
    scrollYProgress,
    [
      appearStart,
      appearEnd,
      SCROLL.t23Start,
      SCROLL.t23Start + 0.04,
      SCROLL.t23PulseEnd,
    ],
    [0.8, 1, 1, 1, 0.6]
  );

  // Position morph: stays at node.x/y throughout cena 2, drifts to centre
  // only during the convergence (t23Start → t23PulseEnd).
  const xPct = useTransform(
    scrollYProgress,
    [SCROLL.t23Start, SCROLL.t23PulseEnd],
    [node.x * 100, 50]
  );
  const yPct = useTransform(
    scrollYProgress,
    [SCROLL.t23Start, SCROLL.t23PulseEnd],
    [node.y * 100, 50]
  );
  const leftCss = useTransform(xPct, (v) => `${v}%`);
  const topCss = useTransform(yPct, (v) => `${v}%`);

  const px = prefersReduced ? 0 : parallaxX;
  const py = prefersReduced ? 0 : parallaxY;

  return (
    <motion.div
      className="absolute flex flex-col items-start justify-center"
      style={{
        width: node.w,
        height: node.h,
        left: leftCss,
        top: topCss,
        marginLeft: -node.w / 2,
        marginTop: -node.h / 2,
        x: px,
        y: py,
        opacity: appearOp,
        scale: appearScale,
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: 24,
        boxShadow: "0 0 32px rgba(59,130,246,0.08)",
        animation: prefersReduced
          ? undefined
          : "pulseNode 3s ease-in-out infinite",
        animationDelay: `${index * 0.45}s`,
        willChange: "transform, opacity",
      }}
    >
      <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-text-support">
        {node.label}
      </span>
      <span className="font-sans text-[16px] font-medium text-text-primary mt-1">
        {node.name}
      </span>
    </motion.div>
  );
}

function NetworkEdge({
  edge,
  index,
  size,
  scrollYProgress,
}: {
  edge: readonly [number, number, number];
  index: number;
  size: { w: number; h: number };
  scrollYProgress: MotionValue<number>;
}) {
  const [a, b, bow] = edge;
  const na = NODES[a];
  const nb = NODES[b];
  const sx = na.x * size.w;
  const sy = na.y * size.h;
  const dx = nb.x * size.w;
  const dy = nb.y * size.h;
  const d = organicCubic(sx, sy, dx, dy, bow);

  const [eStart, eEnd] = SCROLL.s2Edges[index];
  const dashoffset = useTransform(scrollYProgress, [eStart, eEnd], [1, 0], {
    clamp: true,
  });
  const opacity = useTransform(
    scrollYProgress,
    [
      eStart - 0.005,
      eStart + 0.005,
      eEnd,
      SCROLL.t23Start,
      SCROLL.t23End - 0.03,
    ],
    [0, 0.7, 0.5, 0.5, 0]
  );

  const streakOpacity = useTransform(
    scrollYProgress,
    [eEnd - 0.005, eEnd + 0.02, SCROLL.t23Start, SCROLL.t23End - 0.03],
    [0, 0.95, 0.95, 0]
  );

  const gradId = `edge-grad-${index}`;

  return (
    <>
      <defs>
        <linearGradient
          id={gradId}
          gradientUnits="userSpaceOnUse"
          x1={sx}
          y1={sy}
          x2={dx}
          y2={dy}
        >
          <stop offset="0%" stopColor="#1E40AF" stopOpacity="0" />
          <stop offset="50%" stopColor="#2563EB" stopOpacity="1" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={d}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth={1.5}
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={dashoffset}
        strokeLinecap="round"
        style={{
          opacity,
          filter: "drop-shadow(0 0 6px rgba(59,130,246,0.4))",
        }}
      />
      <motion.path
        d={d}
        fill="none"
        stroke="#3B82F6"
        strokeWidth={1.5}
        pathLength={1}
        strokeDasharray="0.12 1"
        strokeLinecap="round"
        style={{
          opacity: streakOpacity,
          animation: "edgeFlow 4s linear infinite",
          animationDelay: `${index * 0.6}s`,
          filter: "drop-shadow(0 0 6px rgba(59,130,246,0.55))",
        }}
      />
    </>
  );
}

function NetworkPacket({
  edge,
  index,
  size,
  scrollYProgress,
  prefersReduced,
}: {
  edge: readonly [number, number, number];
  index: number;
  size: { w: number; h: number };
  scrollYProgress: MotionValue<number>;
  prefersReduced: boolean;
}) {
  const [a, b, bow] = edge;
  const na = NODES[a];
  const nb = NODES[b];
  const sx = na.x * size.w;
  const sy = na.y * size.h;
  const dx = nb.x * size.w;
  const dy = nb.y * size.h;
  const d = organicCubic(sx, sy, dx, dy, bow);

  const opacity = useTransform(
    scrollYProgress,
    [
      SCROLL.s2PacketsStart - 0.015,
      SCROLL.s2PacketsStart,
      SCROLL.t23Start,
      SCROLL.t23End - 0.04,
    ],
    [0, 1, 1, 0]
  );

  const dur = 2.1 + ((index * 0.7) % 1.6);
  const begin = (index * 0.45) % 2;

  return (
    <motion.g style={{ opacity }}>
      <defs>
        <path id={`pkt-${index}`} d={d} />
      </defs>
      <circle r={4} fill="#3B82F6" filter="url(#strong-glow)">
        {!prefersReduced && (
          <animateMotion
            dur={`${dur}s`}
            repeatCount="indefinite"
            begin={`${begin}s`}
          >
            <mpath href={`#pkt-${index}`} />
          </animateMotion>
        )}
      </circle>
    </motion.g>
  );
}

/* -------------------------------------------------------------------------
   Transition 1 → 2: Decorative particle layer
   -------------------------------------------------------------------------
   Fallback rationale: the spec's primary plan was a full fragmentation of
   every card element into 60–80 particles, each reassembling the 4 nodes
   from its own perimeter. That requires per-element bounding-box capture
   plus a target-assembly system and pushes the motion-value count past
   ~250, where Framer Motion noticeably costs frame budget on mid-range
   GPUs. We keep the card-morph that already reads cleanly and add this
   decorative layer of ~36 particles travelling between the card and the
   four node destinations to give the transition the right spatial weight.
   ------------------------------------------------------------------------- */

type Particle = {
  sx: number;
  sy: number;
  dx: number;
  dy: number;
  bow: number;
  sizePx: number;
  startOffset: number;
  dur: number;
};

function seededRand(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Particle counts per destination, in NODES order (ERP, CRM, FACT, APP).
// ERP is the dominant destination — it receives more particles because
// the node itself is the largest. Total 72 particles.
const PARTICLES_PER_DEST: readonly number[] = [28, 18, 18, 8];

function MorphParticles({
  scrollYProgress,
  size,
}: {
  scrollYProgress: MotionValue<number>;
  size: { w: number; h: number };
}) {
  const particles: Particle[] = [];
  if (size.w > 0 && size.h > 0) {
    const cardCx = size.w * 0.75;
    const cardCy = size.h * 0.5;
    const cardHalfW = 240;
    const cardHalfH = 320;
    let particleIdx = 0;
    NODES.forEach((node, destIdx) => {
      const count = PARTICLES_PER_DEST[destIdx] ?? 0;
      const destX = node.x * size.w;
      const destY = node.y * size.h;
      for (let n = 0; n < count; n++) {
        const seed = (particleIdx + 1) * 137.1;
        const sx = cardCx + (seededRand(seed) - 0.5) * cardHalfW * 1.6;
        const sy = cardCy + (seededRand(seed + 1) - 0.5) * cardHalfH * 1.6;
        const dx = destX + (seededRand(seed + 2) - 0.5) * node.w * 0.7;
        const dy = destY + (seededRand(seed + 3) - 0.5) * node.h * 0.7;
        const bow = (seededRand(seed + 4) - 0.5) * 2.4;
        const sizePx = 3 + seededRand(seed + 5) * 2;
        const startOffset = seededRand(seed + 6) * 0.022;
        const dur = 0.04 + seededRand(seed + 7) * 0.035;
        particles.push({ sx, sy, dx, dy, bow, sizePx, startOffset, dur });
        particleIdx++;
      }
    });
  }

  return (
    <>
      {particles.map((p, i) => (
        <MorphParticle
          key={i}
          particle={p}
          scrollYProgress={scrollYProgress}
        />
      ))}
    </>
  );
}

function MorphParticle({
  particle,
  scrollYProgress,
}: {
  particle: Particle;
  scrollYProgress: MotionValue<number>;
}) {
  const start = SCROLL.t12Start + particle.startOffset;
  const end = start + particle.dur;

  const segDx = particle.dx - particle.sx;
  const segDy = particle.dy - particle.sy;
  const len = Math.sqrt(segDx * segDx + segDy * segDy) || 1;
  const nx = -segDy / len;
  const ny = segDx / len;
  const bowMag = particle.bow * Math.min(160, len * 0.32);
  const c1x = particle.sx + segDx * 0.32 + nx * bowMag;
  const c1y = particle.sy + segDy * 0.32 + ny * bowMag;
  const c2x = particle.sx + segDx * 0.68 + nx * bowMag * 0.55;
  const c2y = particle.sy + segDy * 0.68 + ny * bowMag * 0.55;

  const t = useTransform(scrollYProgress, [start, end], [0, 1], {
    clamp: true,
  });
  const eased = useTransform(t, easeInOutCubic);
  const x = useTransform(eased, (v) => cubic(v, particle.sx, c1x, c2x, particle.dx));
  const y = useTransform(eased, (v) => cubic(v, particle.sy, c1y, c2y, particle.dy));
  const opacity = useTransform(
    scrollYProgress,
    [start - 0.004, start, end - 0.006, end],
    [0, 1, 1, 0]
  );

  return (
    <motion.div
      aria-hidden="true"
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        x,
        y,
        translateX: "-50%",
        translateY: "-50%",
        width: particle.sizePx,
        height: particle.sizePx,
        borderRadius: "50%",
        background: "#3B82F6",
        opacity,
        filter: "drop-shadow(0 0 4px rgba(59,130,246,0.65))",
        pointerEvents: "none",
        zIndex: 4,
      }}
    />
  );
}

/* -------------------------------------------------------------------------
   Transition 2 → 3: Convergence pulse
   ------------------------------------------------------------------------- */

function Convergence({
  scrollYProgress,
}: {
  scrollYProgress: MotionValue<number>;
}) {
  // The central mass condenses while the network fades (0.65–0.68),
  // then pulses (0.68–0.70) right before the flash overtakes it.
  const dotOpacity = useTransform(
    scrollYProgress,
    [SCROLL.t23Start, SCROLL.t23PulseStart, SCROLL.t23PulseEnd, SCROLL.flashStart],
    [0, 0.6, 1, 0.4]
  );
  const dotScale = useTransform(
    scrollYProgress,
    [
      SCROLL.t23Start,
      SCROLL.t23PulseStart,
      SCROLL.t23PulseMid,
      SCROLL.t23PulseEnd,
    ],
    [0.4, 0.5, 2, 1]
  );

  // Wave: a soft ring that rides the pulse and continues outward into the
  // flash, where it gets washed out by the white overlay.
  const waveOpacity = useTransform(
    scrollYProgress,
    [SCROLL.t23PulseMid, SCROLL.t23PulseEnd, SCROLL.flashStart],
    [0.55, 0.2, 0]
  );
  const waveScale = useTransform(
    scrollYProgress,
    [SCROLL.t23PulseMid, SCROLL.flashStart],
    [0.5, 10]
  );
  const waveBlurMV = useTransform(
    scrollYProgress,
    [SCROLL.t23PulseMid, SCROLL.flashStart],
    [0, 14]
  );
  const waveFilter = useTransform(waveBlurMV, (v) => `blur(${v}px)`);

  return (
    <>
      <motion.div
        className="absolute"
        style={{
          left: "50%",
          top: "50%",
          translateX: "-50%",
          translateY: "-50%",
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "#3B82F6",
          opacity: dotOpacity,
          scale: dotScale,
          boxShadow:
            "0 0 32px rgba(59,130,246,0.9), 0 0 80px rgba(59,130,246,0.6), 0 0 140px rgba(59,130,246,0.35)",
          pointerEvents: "none",
        }}
      />
      <motion.div
        className="absolute"
        style={{
          left: "50%",
          top: "50%",
          translateX: "-50%",
          translateY: "-50%",
          width: 80,
          height: 80,
          borderRadius: "50%",
          border: "1px solid #3B82F6",
          opacity: waveOpacity,
          scale: waveScale,
          filter: waveFilter,
          pointerEvents: "none",
        }}
      />
    </>
  );
}

function Flash({
  scrollYProgress,
}: {
  scrollYProgress: MotionValue<number>;
}) {
  // 80ms (≈1.5% of scroll) bright pulse capped at 0.6 opacity so it never
  // becomes pure white. power3.inOut shape achieved with a 4-point ramp.
  const opacity = useTransform(
    scrollYProgress,
    [
      SCROLL.flashStart,
      SCROLL.flashStart + 0.004,
      SCROLL.flashPeak,
      SCROLL.flashEnd - 0.003,
      SCROLL.flashEnd,
    ],
    [0, 0.45, 0.6, 0.2, 0]
  );
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      aria-hidden="true"
      style={{
        background: "#FAFAFA",
        opacity,
        mixBlendMode: "screen",
        zIndex: 20,
      }}
    />
  );
}

/* -------------------------------------------------------------------------
   SCENE 3 — Background (radial gradient) + Declaration
   ------------------------------------------------------------------------- */

function Scene3Background({
  scrollYProgress,
}: {
  scrollYProgress: MotionValue<number>;
}) {
  // Fade in as the flash lifts so the gradient is fully present by the time
  // the words start arriving at s3WordsStart (0.72).
  const opacity = useTransform(
    scrollYProgress,
    [SCROLL.flashStart, SCROLL.unmountAt, SCROLL.s3Start],
    [0, 0.6, 1]
  );
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      aria-hidden="true"
      style={{
        opacity,
        background:
          "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(30,64,175,0.06) 0%, rgba(30,64,175,0.02) 40%, rgba(10,11,13,0) 80%)",
      }}
    />
  );
}

function Declaration({
  scrollYProgress,
}: {
  scrollYProgress: MotionValue<number>;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
      <div
        className="flex flex-wrap items-baseline justify-center gap-x-[18px] gap-y-2 px-8"
        style={{ maxWidth: 920 }}
      >
        {PHRASE.map((word, i) => (
          <Word
            key={i}
            word={word}
            index={i}
            scrollYProgress={scrollYProgress}
          />
        ))}
      </div>
      <BrandSubtitle scrollYProgress={scrollYProgress} />
      <ContinueIndicator scrollYProgress={scrollYProgress} />
    </div>
  );
}

function Word({
  word,
  index,
  scrollYProgress,
}: {
  word: string;
  index: number;
  scrollYProgress: MotionValue<number>;
}) {
  const start = SCROLL.s3WordsStart + index * SCROLL.s3WordStagger;
  const end = start + 0.018;
  const opacity = useTransform(scrollYProgress, [start, end], [0, 1]);
  const y = useTransform(scrollYProgress, [start, end], [24, 0]);

  const isLast = index === PHRASE.length - 1;

  return (
    <motion.span
      className="font-display"
      style={{
        opacity,
        y,
        fontWeight: 300,
        fontSize: 72,
        lineHeight: 1.15,
        letterSpacing: "-0.02em",
        color: "#FAFAFA",
        display: "inline-block",
        textShadow: isLast ? "0 0 16px rgba(59,130,246,0.4)" : undefined,
        animation: isLast ? "faltaPulse 4s ease-in-out infinite" : undefined,
      }}
    >
      {word}
    </motion.span>
  );
}

function BrandSubtitle({
  scrollYProgress,
}: {
  scrollYProgress: MotionValue<number>;
}) {
  const opacity = useTransform(
    scrollYProgress,
    [SCROLL.s3SubtitleStart, SCROLL.s3SubtitleEnd - 0.03],
    [0, 1]
  );
  const y = useTransform(
    scrollYProgress,
    [SCROLL.s3SubtitleStart, SCROLL.s3SubtitleEnd - 0.03],
    [12, 0]
  );
  const lineWidth = useTransform(
    scrollYProgress,
    [
      SCROLL.s3SubtitleStart + 0.005,
      SCROLL.s3SubtitleEnd - 0.02,
    ],
    [0, 32]
  );

  return (
    <motion.div
      className="flex items-center gap-4 mt-12"
      style={{ opacity, y }}
    >
      <motion.span
        className="block h-px"
        style={{ width: lineWidth, background: "var(--border)" }}
      />
      <span className="font-mono text-[12px] uppercase tracking-[0.2em] text-text-support">
        UNREAL PERFORMANCE — IA E AUTOMAÇÃO
      </span>
    </motion.div>
  );
}

function ContinueIndicator({
  scrollYProgress,
}: {
  scrollYProgress: MotionValue<number>;
}) {
  const opacity = useTransform(
    scrollYProgress,
    [SCROLL.s3ContinueStart, SCROLL.s3ContinueStart + 0.02],
    [0, 1]
  );

  return (
    <motion.div
      className="absolute bottom-10 left-1/2 flex flex-col items-center gap-2"
      style={{ opacity, translateX: "-50%" }}
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#52525B]">
        CONTINUE
      </span>
      <span
        className="font-mono text-[10px] text-[#52525B]"
        style={{ animation: "continueBounce 2s ease-out infinite" }}
      >
        ↓
      </span>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------
   "O PROCESSO" — section 05. Three editorial phase cards stacked
   vertically. No scroll-pinning, no cross-fade, no sticky stage — each
   phase is a normal-flow article that animates its elements in once it
   crosses the viewport. The force here is the typography and the
   asymmetric grid composition, not motion choreography.

   Layout (~562vh total):
     ┌─  32vh   transition
     ├─ 100vh   label + subtitle ("05 — O PROCESSO")
     ├─ 110vh   FASE 01 — Entender
     ├─   1px   separator (40 % width)
     ├─ 110vh   FASE 02 — Construir
     ├─   1px   separator
     ├─ 110vh   FASE 03 — Operar
     └─ 100vh   remate + bridge → "06 — QUEM SOMOS"

   Each phase uses `useInView({ once: true })` so animations fire ONCE on
   first viewport entry and stay in their final state thereafter — scrolling
   back up does not re-run them.
   ------------------------------------------------------------------------- */

type ProcessoPhase = {
  id: "01" | "02" | "03";
  number: string;
  title: string;
  subtitle: string;
  description: string;
  doing: ReadonlyArray<string>;
  deliverable: string;
};

const PROCESSO_PHASES: ReadonlyArray<ProcessoPhase> = [
  {
    id: "01",
    number: "01",
    title: "Entender",
    subtitle: "O que existe, como funciona, onde dói.",
    description:
      "Antes de construir, mapeamos. Auditamos o sistema técnico existente — ERPs, bases de dados, fluxos documentais, integrações em uso. Identificamos onde o trabalho manual está a consumir tempo, onde os dados se perdem entre sistemas, onde as regras de compliance criam fricção. O que sai desta fase não é diagnóstico genérico — é o desenho técnico específico do sistema que vamos construir.",
    doing: [
      "Auditoria técnica ao sistema existente",
      "Mapeamento de fluxos operacionais",
      "Definição de regras de negócio e compliance",
      "Identificação de pontos críticos de integração",
      "Desenho da arquitectura técnica",
    ],
    deliverable:
      "Documento técnico de arquitectura e plano de implementação.",
  },
  {
    id: "02",
    number: "02",
    title: "Construir",
    subtitle: "O sistema que falta, desenhado à medida.",
    description:
      "Construímos o sistema. LLMs com regras de negócio codificadas, motores de OCR ou visão computacional treinados para o vosso contexto, integrações nativas com os sistemas que já usam. Em paralelo ao vosso processo actual — nunca substituindo prematuramente. Validamos cada componente em ambiente controlado antes de qualquer impacto operacional.",
    doing: [
      "Configuração e treino dos motores de IA",
      "Codificação das regras de negócio específicas",
      "Desenvolvimento de interfaces e integrações nativas",
      "Teste em paralelo ao processo existente",
      "Validação técnica contra dados reais",
    ],
    deliverable: "Sistema funcional validado, pronto para transição.",
  },
  {
    id: "03",
    number: "03",
    title: "Operar",
    subtitle: "Em produção, com vocês a operar sozinhos.",
    description:
      "Transição faseada para produção. Formamos a vossa equipa, monitorizamos o sistema em condições reais, ajustamos o que precisar de ajuste. Os primeiros meses depois do go-live são os mais importantes — ficamos disponíveis durante esse período sem mais contratos, porque é parte do trabalho. Quando saímos, o sistema é vosso e a vossa equipa opera-o sozinha.",
    doing: [
      "Transição faseada para produção",
      "Formação da equipa do cliente",
      "Monitorização contínua e ajuste fino",
      "Suporte durante período de estabilização",
      "Documentação técnica completa",
    ],
    deliverable:
      "Sistema em produção, equipa autónoma, documentação completa.",
  },
];

function ProcessoSection() {
  return (
    <section
      data-scene="processo"
      aria-labelledby="processo-label"
      className="relative"
      style={{ background: "var(--bg-base)" }}
    >
      <div aria-hidden="true" style={{ height: "32vh" }} />
      <ProcessoLabel />
      {PROCESSO_PHASES.map((phase, i) => (
        <Fragment key={phase.id}>
          {i > 0 && <ProcessoSeparator />}
          <ProcessoPhaseCard phase={phase} />
        </Fragment>
      ))}
      <ProcessoClosing />
    </section>
  );
}

function ProcessoLabel() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });

  return (
    <div
      ref={ref}
      className="flex min-h-screen flex-col items-center justify-center px-6"
      data-processo="label"
    >
      <motion.div
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        className="flex items-center gap-6"
        style={{ marginBottom: 96 }}
      >
        <motion.span
          variants={{
            hidden: { width: 0 },
            visible: {
              width: 64,
              transition: { duration: 0.9, ease: EASE_POWER3_INOUT_PROBLEMA },
            },
          }}
          aria-hidden="true"
          style={{ height: 1, background: "var(--border)", display: "block" }}
        />
        <motion.h2
          id="processo-label"
          variants={{
            hidden: { opacity: 0, y: 12 },
            visible: {
              opacity: 1,
              y: 0,
              transition: {
                duration: 1.1,
                ease: EASE_EXPO_OUT_PROBLEMA,
                delay: 0.3,
              },
            },
          }}
          className="font-mono"
          style={{
            margin: 0,
            fontSize: 14,
            textTransform: "uppercase",
            letterSpacing: "0.3em",
            color: "var(--text-support)",
          }}
        >
          05 — O PROCESSO
        </motion.h2>
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
        transition={{
          duration: 1.1,
          delay: 0.8,
          ease: EASE_EXPO_OUT_PROBLEMA,
        }}
        className="font-display text-center"
        style={{
          margin: 0,
          fontWeight: 300,
          fontSize: 32,
          lineHeight: 1.2,
          letterSpacing: "-0.01em",
          color: "#FAFAFA",
          maxWidth: 760,
        }}
      >
        Três fases. Um caminho do problema ao sistema em produção.
      </motion.p>
    </div>
  );
}

function ProcessoPhaseCard({ phase }: { phase: ProcessoPhase }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.25 });
  const isDesktop = useIsDesktopOrTablet();
  const prefersReduced = usePrefersReducedMotion();

  const descColumn = isDesktop ? "1 / span 3" : "1 / span 6";
  const rightColumn = isDesktop ? "4 / span 3" : "1 / span 6";
  const padX = isDesktop ? 80 : 24;
  const phaseHeight = isDesktop ? "110vh" : "160vh";
  const numberSize = isDesktop
    ? "clamp(80px, 9vw, 140px)"
    : "clamp(64px, 18vw, 96px)";
  const titleSize = isDesktop
    ? "clamp(56px, 6vw, 88px)"
    : "clamp(40px, 10vw, 56px)";

  const ease = EASE_EXPO_OUT_PROBLEMA;
  const dur = (ms: number) => (prefersReduced ? 0.4 : ms / 1000);
  const y = (px: number) => (prefersReduced ? 0 : px);
  const xShift = (px: number) => (prefersReduced ? 0 : px);

  return (
    <motion.article
      ref={ref}
      aria-labelledby={`processo-${phase.id}-title`}
      data-processo-phase={phase.id}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      style={{
        minHeight: phaseHeight,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: `64px ${padX}px`,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1280,
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: 32,
          alignItems: "start",
        }}
      >
        {/* LINHA 1+2 — number + title + subtitle (col 1-4) */}
        <div style={{ gridColumn: isDesktop ? "1 / span 4" : "1 / span 6" }}>
          <motion.span
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 0.3,
                transition: { duration: dur(1200), ease },
              },
            }}
            aria-hidden="true"
            className="font-display"
            style={{
              display: "block",
              fontWeight: 300,
              fontSize: numberSize,
              color: "#27272A",
              letterSpacing: "-0.04em",
              lineHeight: 1,
              marginBottom: -32,
            }}
          >
            {phase.number}
          </motion.span>
          <motion.h3
            id={`processo-${phase.id}-title`}
            variants={{
              hidden: { opacity: 0, y: y(24) },
              visible: {
                opacity: 1,
                y: 0,
                transition: {
                  duration: dur(900),
                  ease,
                  delay: prefersReduced ? 0 : 0.2,
                },
              },
            }}
            className="font-display"
            style={{
              margin: 0,
              marginBottom: 24,
              fontWeight: 300,
              fontSize: titleSize,
              color: "#FAFAFA",
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
            }}
          >
            {phase.title}
          </motion.h3>
          <motion.p
            variants={{
              hidden: { opacity: 0, y: y(16) },
              visible: {
                opacity: 1,
                y: 0,
                transition: {
                  duration: dur(800),
                  ease,
                  delay: prefersReduced ? 0 : 0.5,
                },
              },
            }}
            className="font-display"
            style={{
              margin: 0,
              marginBottom: 64,
              fontStyle: "italic",
              fontWeight: 300,
              fontSize: "clamp(22px, 2.2vw, 28px)",
              color: "#A1A1AA",
              letterSpacing: "-0.01em",
              lineHeight: 1.4,
            }}
          >
            “{phase.subtitle}”
          </motion.p>
        </div>

        {/* LINHA 3 — description (col 1-3 on desktop, full on mobile) */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: y(12) },
            visible: {
              opacity: 1,
              y: 0,
              transition: {
                duration: dur(800),
                ease,
                delay: prefersReduced ? 0 : 0.7,
              },
            },
          }}
          style={{
            gridColumn: descColumn,
            marginBottom: isDesktop ? 0 : 32,
          }}
        >
          <p
            className="font-sans"
            style={{
              margin: 0,
              maxWidth: 540,
              fontSize: 17,
              lineHeight: 1.6,
              color: "#D4D4D8",
            }}
          >
            {phase.description}
          </p>
        </motion.div>

        {/* LINHA 4 — right column: O QUE FAZEMOS + O QUE ENTREGAMOS */}
        <div style={{ gridColumn: rightColumn }}>
          <motion.div
            variants={{
              hidden: { opacity: 0, y: y(12) },
              visible: {
                opacity: 1,
                y: 0,
                transition: {
                  duration: dur(800),
                  ease,
                  delay: prefersReduced ? 0 : 0.9,
                },
              },
            }}
            style={{ marginBottom: 40 }}
          >
            <span
              className="font-mono"
              style={{
                display: "block",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.25em",
                color: "#A1A1AA",
                marginBottom: 16,
              }}
            >
              O QUE FAZEMOS
            </span>
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {phase.doing.map((item, i) => (
                <motion.li
                  key={i}
                  variants={{
                    hidden: { opacity: 0, x: xShift(8) },
                    visible: {
                      opacity: 1,
                      x: 0,
                      transition: {
                        duration: dur(500),
                        ease,
                        delay: prefersReduced ? 0 : 1.1 + i * 0.08,
                      },
                    },
                  }}
                  className="font-sans"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    fontSize: 14,
                    lineHeight: 1.5,
                    color: "#FAFAFA",
                    marginBottom:
                      i < phase.doing.length - 1 ? 12 : 0,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 16,
                      height: 1,
                      background: "#27272A",
                      display: "block",
                      flexShrink: 0,
                    }}
                  />
                  {item}
                </motion.li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            variants={{
              hidden: { opacity: 0, y: y(12) },
              visible: {
                opacity: 1,
                y: 0,
                transition: {
                  duration: dur(800),
                  ease,
                  delay: prefersReduced ? 0 : 1.05,
                },
              },
            }}
          >
            <span
              className="font-mono"
              style={{
                display: "block",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.25em",
                color: "#A1A1AA",
                marginBottom: 12,
              }}
            >
              O QUE ENTREGAMOS
            </span>
            <p
              className="font-sans"
              style={{
                margin: 0,
                fontWeight: 500,
                fontSize: 15,
                lineHeight: 1.5,
                color: "#FAFAFA",
              }}
            >
              {phase.deliverable}
            </p>
          </motion.div>
        </div>
      </div>
    </motion.article>
  );
}

function ProcessoSeparator() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{
        display: "flex",
        justifyContent: "center",
        padding: "0 80px",
      }}
    >
      <motion.span
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.8, ease: EASE_EXPO_OUT_PROBLEMA }}
        style={{
          display: "block",
          width: "40%",
          maxWidth: 512,
          height: 1,
          background: "#1F1F23",
        }}
      />
    </div>
  );
}

function ProcessoClosing() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const prefersReduced = usePrefersReducedMotion();

  const phrase =
    "Três fases. Sem caixas negras, sem dependências, sem surpresas no final.";
  const words = phrase.split(" ");

  return (
    <div
      ref={ref}
      className="flex min-h-screen items-center px-6"
      data-processo="closing"
      style={{ paddingTop: 128 }}
    >
      <div className="mx-auto w-full max-w-[1280px]">
        <div className="max-w-[760px]">
          <p
            className="font-display"
            style={{
              margin: 0,
              fontWeight: 300,
              fontSize: 32,
              lineHeight: 1.3,
              letterSpacing: "-0.01em",
              color: "#A1A1AA",
            }}
          >
            {words.map((word, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 16 }}
                animate={
                  inView
                    ? { opacity: 1, y: 0 }
                    : { opacity: 0, y: 16 }
                }
                transition={{
                  duration: 0.9,
                  delay: prefersReduced ? 0 : i * 0.1,
                  ease: EASE_EXPO_OUT_PROBLEMA,
                }}
                style={{
                  display: "inline-block",
                  marginRight: "0.25em",
                }}
              >
                {word}
              </motion.span>
            ))}
          </p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={
              inView
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: 12 }
            }
            transition={{
              duration: 0.7,
              delay: prefersReduced ? 0 : words.length * 0.1 + 0.5,
              ease: EASE_EXPO_OUT_PROBLEMA,
            }}
            className="flex items-center gap-3"
            style={{ marginTop: 64 }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 24,
                height: 1,
                background: "var(--border)",
                display: "block",
              }}
            />
            <span
              className="font-mono"
              style={{
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: "0.3em",
                color: "#52525B",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  animation: prefersReduced
                    ? undefined
                    : "heroScrollArrow 2s ease-in-out infinite",
                  marginRight: "0.6em",
                }}
              >
                ↓
              </span>
              06 — QUEM SOMOS
            </span>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
