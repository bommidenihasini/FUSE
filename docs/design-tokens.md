# Fuse design tokens (C0.4 freeze)

Do not build UI or install component libraries in C0.4. Dashboard first; landing page later.

## Color palette

| Token | Hex | Use |
| --- | --- | --- |
| `bg` | `#0B0D12` | Page background |
| `panel` | `#121722` | Cards, nav, drawers |
| `text` | `#F4F1EA` | Primary text |
| `muted` | `#8D96A8` | Secondary text, labels |
| `active` | `#55D6FF` | Focus, links, allowed path |
| `running` | `#FFB84D` | In-progress / amber |
| `completed` | `#63E6BE` | Success |
| `breaker` | `#FF6B6B` | Trip / coral |

Verify contrast (text on `bg` / `panel`, `muted` on `bg`) with [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) before recording. Aim for WCAG AA for body text.

## Status colors

| Run status | Color | Copy |
| --- | --- | --- |
| `CREATED` | `muted` | Created |
| `RUNNING` | `running` | Running |
| `COMPLETED` | `completed` | Completed |
| `FAILED` | `breaker` | Failed |
| `BREAKER_TRIPPED` | `breaker` | **BREAKER TRIPPED** / **Next invocation blocked** |

Breaker moment: animate **amber (`running`) → coral (`breaker`)**. Stop counters. Highlight the blocked call. Reveal reason (repeats observed vs allowed, estimated cost). No continuous neon pulse.

## Typography

| Role | Family | Fallback |
| --- | --- | --- |
| Headings | **Sora** (one heading family) | `system-ui` |
| Body | **IBM Plex Sans** (one body family) | `system-ui` |
| IDs, signatures, JSON | **JetBrains Mono** | `ui-monospace` |

Do not add a second heading or body face. Google Fonts later; not installed in C0.4.

## Spacing scale

4px base: `4, 8, 12, 16, 24, 32, 48, 64`. Page gutters 24 (mobile) / 32 (desktop). Panel padding 16–24. Timeline row min-height 44 for touch/keyboard.

## Border radius

- Panels: `12px`
- Buttons / inputs: `8px`
- Status pills: `999px`
- Charts: `8px` clip

Hairline borders: `muted` at ~20% opacity on `panel`. No heavy drop shadows.

## Motion

- Duration: 180–280ms status; 400ms breaker color shift.
- Easing: standard decelerate; no bounce.
- `prefers-reduced-motion: reduce` — instant state change, no orbit/3D motion.
- Motion for React later, **after** backend state is correct. No frontend-only fake breaker.

## Accessibility

- Visible keyboard focus ring using `active`.
- Do not rely on color alone (icon + text for trip).
- Timeline and policy fields reachable by keyboard.
- Live region for status changes (polite).
- Hit targets ≥ 24px; labels on every input.
- Contrast AA for text; breaker banner text on coral checked before demo.

## Dashboard visual direction

Serious **AI operations control room**, not a generic admin template.

Pages: Overview, Live Run, Policies, Replay, Architecture, Documentation.

Live Run must show: status, counters from API, thresholds, current action, chart, event timeline, policy reason, blocked-call evidence.

Polling ~1s with stale/error/retry. Empty and loading states required. Mode chip: **Live Bedrock** or **Simulation**.

## Landing-page visual direction

Invitation, not the proof. Dark hero, same tokens.

Headline: **Autonomous AI needs a circuit breaker.**  
Subhead: Fuse enforces per-run limits, then blocks the next invocation when an agent spirals.  
CTAs: Launch protected demo · View architecture.  
Label: Synthetic demo environment · Amazon Bedrock integration.

Scroll narrative (roleplay of a runaway run, built later): problem (loops / retries / cost) → gate flow → blocked-next-call wording → implemented AWS only → policy knobs → limitations → demo CTA.

Preferred motion on landing: **CSS/SVG** circuit path (cyan while allowed, coral interrupt). Headline and CTAs visible immediately without WebGL.

## 3D usage boundary

- Dashboard is the product proof. 3D must not delay or replace it.
- At most **one** small hero accent (agent orbit: Fuse node + model / tool / policy).
- Prefer CSS/SVG. React Three Fiber only if lazy-loaded, DPR-capped, with static fallback.
- No Spline remote dependency, no WebGPU, no physics, no second 3D scene.
- If JS or WebGL is unavailable, static diagram + copy still explain Fuse.
- Do not spend the three-day budget on 3D before the breaker is real.
