# Design

Visual system for the RailGuard operations console. Register: **product** (dark instrument panel). Dials: density 8 / motion 3 / variance 5.

## Theme

Single locked dark theme. An operations room console, watched for full shifts under dim ambient light. No light mode, no per-section inversion.

## Color

OKLCH-derived hex tokens. Solid surfaces and hairlines; **no glassmorphism, no gradients, no glows.**

| Token | Value | Use |
|---|---|---|
| `bg` | `#0B0D12` | Page background (cool near-black, not pure black) |
| `surface-1` | `#12151C` | Panels |
| `surface-2` | `#181C25` | Inputs, nested rows, chart tracks |
| `surface-3` | `#1F2430` | Hover states |
| `line` | `#232936` | Hairline borders (1px only) |
| `ink` | `#E7EBF1` | Primary text |
| `ink-2` | `#9AA3B2` | Secondary text (AA on all surfaces) |
| `ink-3` | `#6A7383` | Tertiary/labels (large or non-essential only) |
| `ok` | `#3FB890` | Healthy severity. Deliberately dim; used sparingly |
| `warn` | `#E6A23C` | Warning severity |
| `crit` | `#F0524F` | Critical severity. Rarity gives it meaning |
| `accent` | `#4CB8E8` | Selection, focus rings, links, AI-agent identity. Never severity |

Rules: severity colors are reserved exclusively for severity. Tints via opacity modifiers (`/10`, `/15`) on solid surfaces, never `backdrop-blur`.

## Typography

- **UI:** Inter (explicit product-register choice for a tool; neutral, legible at 12px).
- **Data:** JetBrains Mono with `tabular-nums` for every number, ID, timestamp, and reading.
- Fixed rem scale, ratio ~1.2: 11px micro, 12px secondary, 13px body, 14px row titles, 18px panel numbers, 28px focus-risk score. No fluid type.

## Shape

One radius system: surfaces/inputs/buttons `8px` (`rounded-lg`); status chips full pill; track-strip cells `2px`. Nothing above 8px on data surfaces. Borders are 1px hairlines; elevation = surface value step, never border + big shadow together.

## Spacing

Cockpit density: panel padding 16px, row padding 10px vertical, hairline dividers (`divide-y`) instead of nested cards. Section gaps 16px.

## Motion

- Easing: `cubic-bezier(0.23, 1, 0.32, 1)` (swift-out). Never ease-in.
- Durations: press feedback 120ms, panel rebind/crossfade 150-200ms, alert entrance 220ms.
- Pressables: `active:scale-[0.98]`.
- Entrances start at `opacity 0 / y 6-8px`, never `scale(0)`.
- **Nothing loops at rest.** Single exception: one subtle opacity pulse on the agent-liveness dot in the Situation Bar while autonomous scanning is active (real semantic state, used once on the page).
- `prefers-reduced-motion: reduce` collapses all motion to instant.

## Components

- **Situation Bar:** sticky 56px top bar. Wordmark, health index, severity counts (mono), agent state + control, clock.
- **Attention Queue:** severity-grouped incident rows. Critical rows expanded with structural 2px left status edge; warnings compact; healthy collapsed to one searchable summary row.
- **Track Strip:** linear schematic of all 100 segments in physical order; healthy cells dim, degraded cells lit; collapsible.
- **Focus Panel:** vital strip (mono readouts), linear risk meter with 30/60 threshold ticks, telemetry chart, risk-factor decomposition using the real model weights, AI analysis, defect list, action forms.
- **Activity Ledger:** monospaced append-only log; agent names in accent; critical lines tinted.
- **Work-Order Pipeline:** status-grouped rows (pending/completed), hairline-divided, no nested cards.
- **Drill Panel:** dashed-border, collapsed by default, explicitly labeled SYNTHETIC; never visually confusable with live controls.

Every interactive component ships default, hover, focus-visible, active, disabled, and loading states. Empty states teach ("select from the queue"), loading uses skeletons not centered spinners.
