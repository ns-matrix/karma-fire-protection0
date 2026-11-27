---
name: "Karma Fire Protection — Admin v2"
description: "A crisp, high-trust operational admin design system for Karma Fire Protection's Telegram Leads Management platform, combining deep navy authority with cool slate surfaces and semantic status clarity."
---

## Overview

Karma Fire Protection — Admin v2 is built for operations leads, dispatchers, and sales managers tracking real-time fire safety inquiries arriving from Telegram groups, channels, and direct links. The interface projects **dependable operational authority**: high-legibility white cards rest on a cool slate canvas, anchored by a deep navy primary action color and unmistakable semantic status pills.

The design style is **Corporate / Modern** with restrained density: clear typographic hierarchy, tabular numerals for every metric and timestamp, and subtle 1px structural borders paired with light ambient elevation so data tables, charts, and lead timelines scan effortlessly during busy shifts.

## Colors

The palette pairs a deep navy primary (`#0F244A`) with a cool, high-clarity light-mode surface hierarchy (`#F4F7FC` background, `#FFFFFF` cards) and a calibrated dark-mode counterpart. Brand and semantic status colors sit at the top level so Telegram sources, lead pipeline stages, and system health indicators remain consistent across modes.

- **Primary (`#0F244A`):** Anchors primary actions (`+ Add Lead`, `Sign In`, `Add Note`), active sidebar navigation, and key headings.
- **Brand Flame (`#E54826`):** Reserved for the Karma Fire Protection shield emblem and fire-safety brand identity.
- **Semantic Status:** `info` (`#1D74D8`) for Telegram & New leads, `success` (`#15803D`) for System Online & Contacted/Active states, `warning` (`#B45309`) for Medium priority & follow-ups, `purple` (`#6D28D9`) for Converted leads, and `error` (`#BA1A1A`) for High priority & destructive actions.

```yaml
colors:
  brand-flame: "#E54826"
  info: "#1D74D8"
  on-info: "#FFFFFF"
  info-container: "#E8F2FF"
  on-info-container: "#0E4A8F"
  success: "#15803D"
  on-success: "#FFFFFF"
  success-container: "#DCFCE7"
  on-success-container: "#14532D"
  warning: "#B45309"
  on-warning: "#FFFFFF"
  warning-container: "#FEF3C7"
  on-warning-container: "#78350F"
  purple: "#6D28D9"
  on-purple: "#FFFFFF"
  purple-container: "#EDE9FE"
  on-purple-container: "#4C1D95"
  light:
    primary: "#0F244A"
    on-primary: "#FFFFFF"
    primary-container: "#E2E8F5"
    on-primary-container: "#0F244A"
    secondary: "#475569"
    on-secondary: "#FFFFFF"
    secondary-container: "#E2E8F0"
    on-secondary-container: "#1E293B"
    tertiary: "#1D74D8"
    on-tertiary: "#FFFFFF"
    tertiary-container: "#E8F2FF"
    on-tertiary-container: "#0E4A8F"
    error: "#BA1A1A"
    on-error: "#FFFFFF"
    error-container: "#FEE2E2"
    on-error-container: "#7F1D1D"
    background: "#F4F7FC"
    on-background: "#0F172A"
    surface: "#F4F7FC"
    surface-dim: "#E2E8F0"
    surface-bright: "#FFFFFF"
    surface-container-lowest: "#FFFFFF"
    surface-container-low: "#F8FAFC"
    surface-container: "#F1F5F9"
    surface-container-high: "#E8EEF6"
    surface-container-highest: "#DCE4F0"
    on-surface: "#0F172A"
    surface-variant: "#E2E8F0"
    on-surface-variant: "#475569"
    outline: "#64748B"
    outline-variant: "#DCE4F0"
    inverse-surface: "#0F244A"
    inverse-on-surface: "#F8FAFC"
    inverse-primary: "#B3C6F5"
    shadow: "#0F244A"
    scrim: "#0F172A"
  dark:
    primary: "#B3C6F5"
    on-primary: "#0F244A"
    primary-container: "#1C2F56"
    on-primary-container: "#D8E2FF"
    secondary: "#CBD5E1"
    on-secondary: "#1E293B"
    secondary-container: "#334155"
    on-secondary-container: "#E2E8F0"
    tertiary: "#93C5FD"
    on-tertiary: "#0E3A6E"
    tertiary-container: "#1E3A8A"
    on-tertiary-container: "#DBEAFE"
    error: "#FFB4AB"
    on-error: "#690005"
    error-container: "#93000A"
    on-error-container: "#FFDAD6"
    background: "#0B1120"
    on-background: "#F1F5F9"
    surface: "#0B1120"
    surface-dim: "#0B1120"
    surface-bright: "#1E293B"
    surface-container-lowest: "#0F172A"
    surface-container-low: "#131C31"
    surface-container: "#18233B"
    surface-container-high: "#1E293B"
    surface-container-highest: "#27354F"
    on-surface: "#F1F5F9"
    surface-variant: "#334155"
    on-surface-variant: "#9FACBF"
    outline: "#64748B"
    outline-variant: "#27354F"
    inverse-surface: "#F1F5F9"
    inverse-on-surface: "#0F172A"
    inverse-primary: "#0F244A"
    shadow: "#000000"
    scrim: "#000000"
```

## Typography

A disciplined three-role system pairs **Jost** for geometric, authoritative page headings and KPI figures with **Instrument Sans** for crisp UI controls, tables, and body copy, and **Source Code Pro** for Telegram handles, phone numbers, and timestamps when tabular alignment is needed. All numeric metrics and dates use `tabular-nums`.

```yaml
typography:
  display-md:
    fontFamily: "Jost"
    fontSize: 36px
    fontWeight: 700
    lineHeight: 44px
    letterSpacing: -0.5px
  display-md-mobile:
    fontFamily: "Jost"
    fontSize: 28px
    fontWeight: 700
    lineHeight: 36px
    letterSpacing: -0.25px
  headline-lg:
    fontFamily: "Jost"
    fontSize: 24px
    fontWeight: 600
    lineHeight: 32px
    letterSpacing: -0.25px
  headline-md:
    fontFamily: "Jost"
    fontSize: 20px
    fontWeight: 600
    lineHeight: 28px
    letterSpacing: -0.15px
  title-lg:
    fontFamily: "Instrument Sans"
    fontSize: 18px
    fontWeight: 600
    lineHeight: 24px
    letterSpacing: 0px
  title-md:
    fontFamily: "Instrument Sans"
    fontSize: 15px
    fontWeight: 600
    lineHeight: 22px
    letterSpacing: 0px
  body-lg:
    fontFamily: "Instrument Sans"
    fontSize: 15px
    fontWeight: 400
    lineHeight: 22px
    letterSpacing: 0px
  body-md:
    fontFamily: "Instrument Sans"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: 0px
  body-sm:
    fontFamily: "Instrument Sans"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 16px
    letterSpacing: 0px
  label-lg:
    fontFamily: "Instrument Sans"
    fontSize: 14px
    fontWeight: 600
    lineHeight: 20px
    letterSpacing: 0px
  label-md:
    fontFamily: "Instrument Sans"
    fontSize: 13px
    fontWeight: 500
    lineHeight: 18px
    letterSpacing: 0px
  label-sm:
    fontFamily: "Instrument Sans"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 16px
    letterSpacing: 0.1px
  mono-sm:
    fontFamily: "Source Code Pro"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 16px
    letterSpacing: 0px
```

## Layout & Spacing

Desktop-first **Fluid Admin Shell** with a fixed-width left navigation sidebar (`240px`), a sticky `56px` top utility bar (`System Online` status, notification bell, date), and a fluid main content area using a 12-column CSS Grid with `20px`–`24px` gutters. On viewports below `lg` (`1024px`), the sidebar collapses behind a menu toggle and multi-column KPI and chart grids stack cleanly to single or two-column rows.

```yaml
spacing:
  gutter-xs: 4px
  gutter-sm: 8px
  gutter-md: 12px
  gutter-lg: 16px
  gutter-xl: 20px
  gutter-2xl: 24px
  section: 32px
  page-margin: 24px
```

## Elevation & Depth

Hierarchy relies on **tonal surface contrast** (`#F4F7FC` canvas vs. `#FFFFFF` elevated cards) reinforced by crisp `1px` `outline-variant` borders (`#DCE4F0`) and subtle ambient shadows (`0 1px 3px rgba(15, 36, 74, 0.05)`). Heavy drop shadows and backdrop-blur glassmorphism are avoided so dense tables and charts remain sharp.

## Shapes

Consistent, approachable medium radii (`12px` on cards and panels, `8px` on buttons, inputs, and sidebar active items, `9999px` on status badges and avatars) keep the workspace structured without feeling harsh.

```yaml
rounded:
  sm: 6px
  DEFAULT: 8px
  md: 12px
  lg: 16px
  xl: 20px
  full: 9999px
```

## Motion & Micro-interaction

Interactions are crisp and immediate. Hover states on table rows, sidebar links, and buttons resolve in `120ms`, while dropdowns and modal surfaces enter smoothly over `200ms`. No decorative looping animations; only `transform`, `opacity`, and color properties animate, honoring `prefers-reduced-motion`.

```yaml
motion:
  state-change:
    duration: 120ms
    delay: 0ms
    timingFunction: ease-out
  surface-enter:
    duration: 200ms
    delay: 0ms
    timingFunction: cubic-bezier(0.2, 0, 0, 1)
  surface-exit:
    duration: 150ms
    delay: 0ms
    timingFunction: cubic-bezier(0.3, 0, 1, 1)
```

## Voice & Content Strategy

- **Tone of voice:** Direct, operational, and calm. Avoid marketing fluff; state counts, sources, and statuses plainly (`Overview of your Telegram leads and performance`, `System Online`).
- **Capitalisation:** Title Case for page headings, navigation items, KPI titles, and button labels (`Total Leads`, `Add Lead`, `View All`). Sentence case for subtitles, empty states, and activity feed descriptions.
- **Terminology:** Use `Lead` (not "prospect" or "contact"), `Telegram Sources` (for connected groups, channels, and direct links), and `Converted` (for closed/won leads).
- **Numbers & Dates:** Format lead counts with commas (`12,450`, `2,480`), percentages with direction arrows (`↑ 12% vs last month`), and timestamps as `28 Nov, 2026` or relative minutes (`2 min ago`).

## Components

Component implementations live as individual HTML sticker sheet files in
`components/`. Each file contains the canonical, styled HTML components with
`<!-- COMPONENT: name -->` comment markers. Read each file before use.

- **Badge** → `@components/badge.html` — `badge-numeric`, `badge-dot`
- **Button** → `@components/button.html` — `button-primary`, `button-icon`, `button-with-icon`
- **Card** → `@components/card.html` — `card-elevated`, `card-action`, `card-interactive`, `card-interactive-2`
- **Table** → `@components/table.html` — `table-standard`, `table-interactive`, `table-selectable`
- **Typography** → `@components/typography.html` — `typography-display`, `typography-body`, `typography-label`
