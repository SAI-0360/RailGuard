# Product

## Register

product

## Users

Railway shift operators and on-call maintenance dispatchers in an operations room. They watch this console for full shifts, under time pressure when something degrades. Their job on any screen: find what is wrong, understand why, and drive the response (dispatch, restrict, verify) to closure. A 100-segment track network is monitored autonomously by an AI agent; the human is the supervisor and decision-maker in the loop.

## Product Purpose

RailGuard is an autonomous railway safety inspection platform. An AI agent continuously scans track segments, scores risk (weighted model: vibration 40%, cracks 25%, incidents 20%, inspection age 15%), extracts defects from inspection reports, drafts work orders, and verifies repairs. The console exists to direct operator attention to degraded segments and orchestrate the detect, diagnose, dispatch, verify loop. Success: an operator can identify the worst problem, understand its cause, and act on it within seconds of looking at the screen.

## Brand Personality

Calm, precise, accountable. The interface is an instrument panel: dense, quiet at rest, loud only when reality is loud. Trustworthy enough that an operator believes the numbers and the agent's actions without second-guessing the UI.

## Anti-references

- Glassmorphic SaaS dashboards (frosted cards, decorative blur, hero-metric tiles).
- Crypto-dashboard maximalism (glows, gradients, perpetual pulse animations).
- Student-project dashboards: identical card grids, equal visual weight for unequal information.
- Anything where healthy/no-op state competes for attention with critical state.

## Design Principles

1. **Work by exception.** Degraded segments are the product. Healthy segments are a count, searchable but nearly invisible at rest.
2. **Severity owns color.** Status hues (ok/warn/crit) appear only for severity. One separate accent (signal cyan) carries selection, focus, and agent identity. Never mixed.
3. **Motion marks change, never state.** Nothing loops at rest. Transitions fire once on real events (new alert, selection, threshold crossing) and settle.
4. **Numbers are instruments.** Every numeric value, ID, and timestamp is monospaced and tabular so readings don't jitter and columns scan vertically.
5. **The agent is accountable.** Every autonomous action is logged, timestamped, attributable, and linkable. Trust through audit, not through sparkle emoji.

## Accessibility & Inclusion

WCAG AA contrast minimum for all text including secondary labels (≥4.5:1 on dark surfaces). Full `prefers-reduced-motion` support: all transitions collapse to instant/opacity. Severity never communicated by color alone (always paired with text or glyph). Keyboard focus visible on all interactive elements.
