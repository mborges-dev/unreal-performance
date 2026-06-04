"use client";

/**
 * Logo validation page — isolated, not linked anywhere.
 *
 * Shows the three logo sources side-by-side at 80 / 200 / 400 px so we
 * can decide which one to integrate into the site:
 *
 *   1. Original /logo.jpeg                (with black background)
 *   2. /logo.png — full version          (background removed, glow kept)
 *   3. /logo-clean.png                   (only the white glyph + CSS glow)
 *
 * Access: http://localhost:3000/logo-test
 */

import type { CSSProperties, ReactNode } from "react";

const SIZES = [80, 200, 400] as const;

export default function LogoTestPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0A0B0D",
        padding: 48,
        color: "#FAFAFA",
      }}
    >
      <h1
        style={{
          fontFamily: "var(--font-ibm-plex-mono), monospace",
          fontSize: 12,
          marginBottom: 48,
          textTransform: "uppercase",
          letterSpacing: "0.2em",
          color: "#A1A1AA",
        }}
      >
        LOGO TEST — UNREAL PERFORMANCE
      </h1>

      <Section
        title="1 · Original (logo.jpeg with black background)"
        bg="#0A0B0D"
      >
        <Row src="/logo.jpeg" />
      </Section>

      <Section
        title="2 · logo.png — background removed, glow kept (over site bg)"
        bg="#0A0B0D"
      >
        <Row src="/logo.png" />
      </Section>

      <Section
        title="3 · logo.png — background removed, glow kept (over white)"
        bg="#FAFAFA"
        textOnLight
      >
        <Row src="/logo.png" />
      </Section>

      <Section
        title="4 · logo-clean.png — bare glyph + CSS drop-shadow glow (over site bg)"
        bg="#0A0B0D"
      >
        <Row
          src="/logo-clean.png"
          imgStyle={{
            filter:
              "drop-shadow(0 0 24px rgba(59, 130, 246, 0.5))",
          }}
        />
      </Section>

      <Section
        title="5 · logo-clean.png — bare glyph (over white, no glow, purity check)"
        bg="#FAFAFA"
        textOnLight
      >
        <Row
          src="/logo-clean.png"
          imgStyle={{
            // On white, render the glyph in dark so it stays visible.
            filter:
              "invert(1) brightness(0.1)",
          }}
        />
      </Section>
    </main>
  );
}

function Section({
  title,
  bg,
  textOnLight,
  children,
}: {
  title: string;
  bg: string;
  textOnLight?: boolean;
  children: ReactNode;
}) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2
        style={{
          fontFamily: "var(--font-ibm-plex-mono), monospace",
          fontSize: 10,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "#A1A1AA",
          marginBottom: 12,
        }}
      >
        {title}
      </h2>
      <div
        style={{
          background: bg,
          padding: 32,
          borderRadius: 6,
          border: "1px solid #27272A",
          color: textOnLight ? "#0A0B0D" : "#FAFAFA",
          display: "flex",
          gap: 40,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {children}
      </div>
    </section>
  );
}

function Row({
  src,
  imgStyle,
}: {
  src: string;
  imgStyle?: CSSProperties;
}) {
  return (
    <>
      {SIZES.map((size) => (
        <div
          key={size}
          style={{ display: "flex", flexDirection: "column", gap: 8 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            width={size}
            height={size}
            style={{
              width: size,
              height: size,
              objectFit: "contain",
              ...imgStyle,
            }}
          />
          <div
            style={{
              fontFamily: "var(--font-ibm-plex-mono), monospace",
              fontSize: 10,
              letterSpacing: "0.1em",
              opacity: 0.6,
            }}
          >
            {size}px
          </div>
        </div>
      ))}
    </>
  );
}
