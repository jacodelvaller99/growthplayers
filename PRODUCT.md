# Product

## Register

product

## Users

High-performers (founders, operators) working a structured 90-day "Protocolo Soberano" personal-development program, accompanied by an AI mentor (Norman) and, behind the scenes, a real human mentor/coach using the admin panel to run the coaching relationship. Primary use is mobile-first (daily 30-second check-in, biometric read, chat with Norman) but desktop is a real, growing surface — mentors reviewing client dossiers, and operators reviewing their own progress in depth on a bigger screen. The job-to-be-done: collapse the complexity of self-improvement into one clear daily directive ("Mando de Hoy") and see operational capacity as a legible, trustworthy number — not a vague feeling.

## Product Purpose

Polaris Growth Institute delivers personal high-performance coaching through a 90-day protocol, an AI mentor, and human mentor oversight. It exists to be a *measurable change mechanism*, not just an elegant app: Norman confronts users with data (said vs. did), biometrics get interpreted in plain language without clinical jargon or alarm, and mentors get an operational cockpit (Mission Control, per-client dossier, cross-client dashboards) so a single coach can run hundreds of clients without anyone falling through the cracks. Success = strong 90-day retention, real behavior change surfaced through data confrontation, and a coach who never loses sight of who needs attention today.

## Brand Personality

**Sobrio · Preciso · Premium.** Quiet-luxury, dark-first (a considered light theme exists for web/desktop), gold used as a rare, deliberate accent — never as ambient decoration. Voice is direct and, when warranted, confrontational with evidence (Norman cites the literal data point, never guesses or moralizes). Never gamified, never cute. Typography pairs GrandisExtended (display, bold, uppercase) with Inter (body) — an editorial, serious register, not a SaaS-friendly one.

## Anti-references

- Gamified fitness/habit apps (Duolingo-style confetti streaks, badge-as-toy mechanics, playful mascots) — the opposite of this brand's sobriety.
- Generic SaaS dashboard templates: identical card grids, gradient-text hero metrics, tiny uppercase tracked eyebrows repeated on every section, colored side-stripe borders as decoration.
- Anything that reads as "AI made this" — the cross-project AI-slop bans in this skill (gradient text, glassmorphism-as-default, numbered `01/02/03` eyebrows as default scaffolding) apply directly.
- Raw hex colors hardcoded into components instead of `palette.*` tokens — a regression this project has explicitly caught and fixed more than once (see `CLAUDE.md` → "Color rules").

## Design Principles

1. **Confront with data, not vibes** — the product's core mechanic (Confrontation OS, biometric insights, Sovereign Score) extends into the UI itself: show the real number, the real trend, the real gap between what was said and what was done.
2. **Gold is earned, not decorative** — the single accent color appears deliberately (primary CTAs, key metrics, focus rings), never as ambient background noise.
3. **Sobriety over stimulation** — this is a premium coaching relationship, not a game. No confetti, no dopamine-loop patterns, no cute mascots.
4. **One primary decision per screen** — mirrors the product's own "Mando de Hoy" philosophy: reduce complexity to a single non-negotiable action instead of overwhelming the operator.
5. **Desktop earns its own composition, not a stretched mobile layout** — validated building the Cockpit Polaris redesign: desktop should use its real width for a different information architecture (a multi-zone command center), not just a widened single column.

## Accessibility & Inclusion

WCAG AA target: ≥4.5:1 contrast for body text (≥3:1 for large/bold text ≥18px/14px), minimum 44×44pt touch targets throughout, `prefers-reduced-motion` respected for every animation, visible keyboard focus rings on web (gold outline, already implemented via the shared `HoverCard` component). No specific accessibility need beyond standard AA has been flagged by the owner.
