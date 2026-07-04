---
name: Polaris Growth Institute
description: Quiet-luxury coaching cockpit — dark-first, gold as the only earned signal.
colors:
  gold: "#FFC804"
  gold-dim: "#EDBA01"
  gold-glow: "rgba(255, 200, 4, 0.08)"
  gold-light: "rgba(255, 200, 4, 0.12)"
  gold-line: "rgba(255, 200, 4, 0.30)"
  gold-line-subtle: "rgba(255, 200, 4, 0.15)"
  ink: "#0A0A0A"
  bg: "#090909"
  bg-deep: "#050505"
  surface: "#111111"
  surface-elevated: "#181818"
  surface-hover: "#222222"
  overlay: "#1C1C1C"
  text-primary: "#EBEBEB"
  text-warm: "#F0EBE0"
  text-secondary: "#AAAAAA"
  text-tertiary: "#888888"
  text-faint: "#444444"
  border: "rgba(255, 255, 255, 0.07)"
  border-soft: "rgba(255, 255, 255, 0.05)"
  border-hard: "rgba(255, 255, 255, 0.13)"
  border-focus: "rgba(255, 255, 255, 0.20)"
  success: "#52A878"
  danger: "#C0392B"
  danger-muted: "rgba(192, 57, 43, 0.15)"
  warning: "#D4A017"
  info: "#3D8FC0"
  wellness-purple: "#7C5CBF"
typography:
  hero:
    fontFamily: "GrandisExtended, Poppins, Arial, sans-serif"
    fontSize: "34px"
    fontWeight: 900
    lineHeight: "40px"
    letterSpacing: "2px"
  title:
    fontFamily: "GrandisExtended, Poppins, Arial, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: "26px"
    letterSpacing: "1.5px"
  section:
    fontFamily: "GrandisExtended, Poppins, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: "16px"
    letterSpacing: "2px"
  label:
    fontFamily: "GrandisExtended, Poppins, Arial, sans-serif"
    fontSize: "9px"
    fontWeight: 400
    lineHeight: "13px"
    letterSpacing: "1.8px"
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "22px"
  caption:
    fontFamily: "Inter, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "18px"
  mono:
    fontFamily: "Space Mono, monospace"
    fontSize: "11px"
    lineHeight: "16px"
    letterSpacing: "0.5px"
rounded:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
  xxxl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    height: "52px"
    padding: "0 24px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    height: "48px"
    padding: "0 24px"
  button-danger:
    backgroundColor: "{colors.danger-muted}"
    textColor: "{colors.danger}"
    rounded: "{rounded.sm}"
    height: "50px"
    padding: "0 24px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "16px"
  card-elevated:
    backgroundColor: "{colors.surface-elevated}"
    rounded: "{rounded.lg}"
---

# Design System: Polaris Growth Institute

## 1. Overview

**Creative North Star: "The Precision Instrument"**

Polaris is a cockpit, not a feed. Every screen behaves like an instrument panel for a 90-day high-performance protocol: a near-black canvas that recedes, a single gold needle that moves only when something earns it, and typography that reads like an operator's manual, not a lifestyle app. The system explicitly rejects the vocabulary of consumer wellness apps — no confetti, no badge-as-toy gamification, no mascots, no gradient hero metrics, no identical SaaS card grids. Gold is rationed: it marks the one primary action, the one key number, the one thing that changed. Everything else stays quiet so the gold reads as signal, not decoration.

The system is dark-first by identity (native apps stay dark permanently); a considered light theme exists for web/desktop, built entirely on CSS custom properties so every screen re-themes without per-component work. Brand accent and semantic status colors are constant across both themes — only neutrals (backgrounds, text, borders) and the gold-as-text token shift, because bright gold on cream fails contrast.

**Key Characteristics:**
- Near-black canvas, graphite cards, one gold accent used as a fill, never as ambient decoration.
- GrandisExtended (uppercase, bold-to-black weights) for anything that names or labels; Inter for anything meant to be read at length.
- Flat by default. Elevation exists only for things that float above the canvas (modals, toasts, overlays) — resting cards never cast a shadow.
- Desktop composes its own layout (multi-zone command grids) instead of stretching the mobile column.

## 2. Colors

The palette is intentionally narrow: one warm neutral-black canvas, one earned gold, a handful of semantic states, and nothing else competing for attention.

### Primary
- **Philippine Yellow** (`#FFC804`): the single brand accent — Pantone 7548 C from the Polaris brand manual. Used as a **fill** (primary buttons, active states, the Sovereign Score ring, focus rings) — never as text color directly (see the Gold Text/Fill split below).
- **Deep Amber** (`#EDBA01`): a slightly darker gold variant for secondary emphasis where full-brightness gold would be too loud.

### Neutral
- **Void** (`#090909` / `--c-bg`): base canvas in dark mode.
- **Absolute Dark** (`#050505` / `--c-bg-deep`): fullscreen players and immersive surfaces.
- **Graphite** (`#111111` / `--c-surface`): the default card/panel background.
- **Graphite Light** (`#181818` / `--c-surface-2`): elevated surfaces — modals, drawers, hover states.
- **Charcoal** (`#222222` / `--c-surface-3`): hover backgrounds and subtle separators.
- **Ivory** (`#EBEBEB` / `--c-text`): primary text in dark mode.
- **Ash** (`#AAAAAA` / `--c-text-2`): secondary text.
- **Smoke** (`#888888` / `--c-text-3`): tertiary/placeholder text — deliberately tuned to 5.5:1 contrast on graphite (a real regression fix; the earlier `#666666` measured 3.3:1 and failed WCAG AA).
- **Ink** (`#0A0A0A`): a constant, never-themed near-black used only for text/icons that sit on gold or light fills (e.g. button labels on a gold CTA). It is never used as a background — using it there would invert incorrectly in light mode.

### Named Rules
**The Fill-vs-Text Gold Rule.** `gold` (`#FFC804`) is for fills only — backgrounds, borders-as-accents, the score ring stroke. `gold-text` is a *separate, themeable* token: bright gold on dark, deep amber (`#8A6500`) on cream, because bright gold directly on a light background fails contrast. Never use the fill token as a text color, and never use the text token as a fill.

**The One Voice Rule.** Gold appears on a small minority of any given screen — one primary CTA, one score, one active nav item. If more than a fifth of a screen is gold, gold has stopped being a signal.

## 3. Typography

**Display Font:** GrandisExtended (fallback: Poppins, then Arial) — the Polaris brand manual typeface, used exclusively uppercase.
**Body Font:** Inter — the only font ever set in sentence case, and the only one meant to be read in paragraphs rather than scanned as a label.
**Label/Mono Font:** Space Mono — reserved for data, timestamps, and metric readouts, reinforcing the instrument-panel character.

**Character:** GrandisExtended supplies the voice of authority (bold, spaced, always shouting a little by design); Inter supplies the calm, readable counterweight. The pairing is a contrast axis — display/geometric against humanist body — not two similar sans-serifs competing.

### Hierarchy
- **Hero** (900, 34px, 40px line-height, 2px tracking, uppercase): splash and fullscreen player moments only — the rarest, loudest voice in the system.
- **Title** (700, 20px, 26px line-height, 1.5px tracking, uppercase): screen header bars.
- **Section** (500, 11px, 16px line-height, 2px tracking, uppercase): card headings and section labels — the most common display-font usage.
- **Label** (400, 9px, 13px line-height, 1.8px tracking, uppercase): micro labels, pills, tags — the smallest legible unit, floor is 11pt per the accessibility rule below applied to *readable body text*, not decorative micro-labels.
- **Body** (400, 14px, 22px line-height ≈ 1.57 ratio): the only sentence-case text in the system; capped conceptually at comfortable paragraph widths.
- **Mono** (11px, 16px line-height, 0.5px tracking): data readouts, timestamps.

### Named Rules
**The All-Caps Display Rule.** Every GrandisExtended usage is uppercase, no exceptions. Mixed-case GrandisExtended reads as a bug, not a style choice.

## 4. Elevation

Flat by default, with shadow reserved strictly for things that visually float above the canvas. Resting cards, panels, and list rows never cast a shadow — depth in the resting state comes from a one-step-lighter surface color (graphite → graphite-light), not from a drop shadow. Shadows appear only on modals, toasts, the wellness mini-player, and the PWA install banner — surfaces that are genuinely layered above the page, not merely "important."

### Shadow Vocabulary
- **Card** (`0 2px 8px rgba(0,0,0,0.40)`, elevation 4): reserved for the rare card that truly needs to lift (used sparingly; most cards use zero shadow).
- **Card Elevated** (`0 8px 24px rgba(0,0,0,0.60)`, elevation 12): modals, drawers, sheets.
- **Gold Glow** (`0 0 20px rgba(255,200,4,0.15)`): a glow, not a shadow — used to make the gold accent feel like it's emitting light rather than sitting on a surface.

### Named Rules
**The Floating-Only Rule.** If a shadow is on an element that sits flush in the normal document flow (a card in a list, a row in a table), remove it. Shadows are for genuine overlays only.

## 5. Components

### Buttons
- **Shape:** 8px radius (`rounded.sm`) across every button variant — one consistent shape, no per-variant radius drift.
- **Primary:** solid gold fill (`#FFC804`), ink-colored text (`#0A0A0A`), 52px minimum height, 24px horizontal padding. Uppercase, letter-spaced label (2.5px tracking) in the Section type scale.
- **Hover / Focus / Press:** a subtle spring-physics scale (0.95 on press-in, back to 1.0 on release, damping 15/stiffness 300) rather than an opacity fade — the interaction feels tactile, not flat. Disabled state drops opacity to 0.4.
- **Secondary:** transparent fill, 1px neutral border, ivory text, 48px height — same radius and padding rhythm as primary, one step quieter.
- **Danger:** muted red fill (`rgba(192,57,43,0.15)`) with red text/border, 50px height — reserved for destructive confirmations only, never for routine negative actions.

### Chips / Pills (Status Pill)
- **Style:** pill radius (`9999px`), three tones — `gold` (active/primary state), `muted` (neutral/inactive), `success` (positive confirmation). Tone communicates state; never rely on color alone without the accompanying label text.

### Cards / Containers
- **Corner Style:** 12px radius (`rounded.md`) for standard cards, 16px (`rounded.lg`) for elevated surfaces (modals) — soft-sharp, deliberately calmer than the near-zero radii the system used before this was tuned ("military tactical" reads wrong for a coaching relationship).
- **Background:** graphite (`#111111`) at rest; graphite-light (`#181818`) for elevated/modal surfaces.
- **Shadow Strategy:** none at rest (see Elevation). Elevated variants only.
- **Border:** 1px, `rgba(255,255,255,0.07)` — a whisper, not a line.
- **Gold Accent Card:** a distinct variant with a 3px solid gold **left stripe only** (`components/polaris.tsx` → `GoldAccentCard`), used deliberately as a named brand-identity marker (chat messages from the AI mentor, editorial highlight cards, Norman's quick panel, the day's mando strip) — this is the one sanctioned exception to the side-stripe-border ban below, because it is a single, consistent, intentional brand signature, not a repeated decorative accent applied indiscriminately. It optionally takes `onPress` (renders via the shared `HoverCard` hover/focus/press states instead of a plain `View`) so interactive uses (mando-de-hoy, mentoría teaser) and static uses (Norte, check-in, admin dossier) share one implementation — **first-run `/impeccable critique` (2026-07-04) found four independent hand-rolled reimplementations of this same stripe in `comando.tsx` with drifting tokens; all four were converged onto this one component.**
- **Internal Padding:** 16px (`spacing.lg`) standard.

### Inputs / Fields
- **Style:** dark surface fill, subtle 1px border, matching card radius.
- **Focus:** border shifts to the higher-contrast `border-focus` token (`rgba(255,255,255,0.20)` dark / `rgba(13,13,13,0.22)` light) — a visible but neutral focus ring, gold is never used for input focus (gold is reserved for actions, not for form state).

### Navigation
- **Desktop sidebar** (240px fixed): grouped by domain (Comando · Protocolo · Norman · Recuperación), active item marked by a 3px gold left bar plus a tinted gold background — the sidebar is the one place a persistent gold background tint is acceptable, because it marks exactly one item at a time.
- **Hover / focus states:** every interactive sidebar row and card uses the shared `HoverCard` primitive — on web, hover lifts the element 2px, tints the border to `border-hard`, and shows a solid 2px gold focus ring on keyboard focus; on native, hover is a no-op and only the press state (0.9 opacity) applies. Transitions run at 160ms.
- **Mobile:** bottom tab bar, hidden entirely on desktop (`display: none`) in favor of the sidebar.

### Sovereign Score Ring (signature component)
The one recurring "hero" visual in the system: an animated circular progress ring (SVG stroke-dasharray, 900ms ease) with a count-up number in its center, gold stroke against a charcoal track. It is the closest thing this system has to a mascot, deliberately restrained to a single ring rather than a cast of characters — the score is the character.

## 6. Do's and Don'ts

### Do:
- **Do** use `palette.*` tokens for every color; raw hex in a component is a tracked regression, not a style choice (see PRODUCT.md anti-references).
- **Do** keep gold to fills only; use the separate `gold-text` token (theme-aware) for any gold-colored text or icon.
- **Do** use spring-physics press feedback (damping 15/stiffness 300) on primary interactive elements instead of instant opacity snaps.
- **Do** respect `prefers-reduced-motion` for every animation — count-ups, ring fills, staggered entrances all need a static fallback.
- **Do** keep body text at Inter, 14px minimum, 4.5:1 contrast against its background (WCAG AA, per PRODUCT.md).

### Don't:
- **Don't** use `border-left`/`border-right` as a decorative colored stripe anywhere except the one sanctioned Gold Accent Card variant — a repeated stripe pattern across unrelated components is the generic-AI tell, not a brand signature.
- **Don't** use gradient text (`background-clip: text` + gradient) for any metric or heading — this system states its numbers plainly, in solid gold or ivory.
- **Don't** build gamified streak/badge UI in the Duolingo mold — confetti, cartoon mascots, "level up" toasts. Progress here reads as an instrument reading (the Score Ring, the Sovereign Delta tag), not a game score.
- **Don't** default to identical card grids as the answer to "how do I lay this out" — vary card size/weight by information hierarchy (see the Cockpit Polaris desktop grid: a 3/5/3 asymmetric split, not three equal columns).
- **Don't** add a shadow to anything that sits in normal document flow (list rows, resting cards) — shadows are reserved for genuine overlays.
- **Don't** put a tiny uppercase tracked "eyebrow" above every section by reflex — Polaris already uses uppercase GrandisExtended section labels deliberately; stacking a second eyebrow convention on top is redundant AI scaffolding.
- **Don't** stretch the mobile single-column layout to fill desktop width — desktop earns its own multi-zone composition (validated by the Cockpit Polaris rebuild: hero band + 3-column command grid, not a widened mobile scroll).
- **Don't** treat `npx impeccable detect` as a quality gate on this codebase — its regex rules target literal CSS/HTML (`border-left:`, `background-clip: text`) and cannot match React Native's `StyleSheet.create` object syntax; a clean/empty result here means "no signal," not "no issues." Use `/impeccable audit`/`critique` (agent-driven, reads actual source + tokens) as the real check instead.
- **Don't** let a single column carry more than one primary decision — the ACCIÓN column in Cockpit Polaris originally stacked a generic module-CTA card alongside the specific next-lesson card; they were merged into one (`mNextLessonBlock` only) and the mentoría teaser was relocated to the rail, per PRODUCT.md principle #4.
