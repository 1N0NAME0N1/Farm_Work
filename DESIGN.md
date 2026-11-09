---
name: Farmnote
description: A quiet, dark work log for daily game-farming reports and completed income.
colors:
  graphite: "#090a0b"
  sidebar: "#0e0f10"
  surface: "#141618"
  raised-surface: "#1b1e20"
  olive: "#a9b08d"
  olive-ink: "#11130e"
  warm-white: "#e9e9e4"
  secondary-text: "#a1a5a6"
  divider: "#2a2d30"
  control-border: "#34383a"
typography:
  display:
    fontFamily: "DM Sans, Noto Sans Thai, sans-serif"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "DM Sans, Noto Sans Thai, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.025em"
  title:
    fontFamily: "DM Sans, Noto Sans Thai, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: "DM Sans, Noto Sans Thai, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "DM Sans, Noto Sans Thai, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
spacing:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.olive}"
    textColor: "{colors.olive-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  button-secondary:
    backgroundColor: "{colors.raised-surface}"
    textColor: "{colors.warm-white}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.warm-white}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
---

# Design System: Farmnote

## Overview

**Creative North Star: “The Daily Contact Sheet”**

Farmnote treats paid game-farming work as a sequence of dated records. Its dark graphite canvas and small olive signals keep attention on what changed today, while compact summaries make income, active work, and the latest report easy to scan. The visual redesign shifts the prior metric-first dashboard toward a work-log view: progress belongs beside its dated history, and quiet separators take the place of large, heavily boxed panels.

Use the existing sans-serif stack and standard app controls. Keep the interface practical and information-dense without making it cramped; the work history remains readable in both game jobs and account-care calendars. The established mobile pattern moves navigation to the bottom and lets work details adapt to the narrower viewport.

**Key Characteristics:**
- Matte near-black graphite with warm white text.
- Muted olive reserved for primary actions, selected states, focus, and progress.
- Fine neutral dividers and mostly flat surfaces.
- Compact reports and totals use tabular figures where numeric alignment matters.

## Colors

Graphite and warm neutrals carry the interface; olive is the single clear interaction accent. Semantic warning and deletion colors appear only in their relevant states.

### Primary
- **Muted Olive** ({colors.olive}): Primary actions, selected navigation, focus outlines, and progress marks. Keep it limited so the current action or state is easy to find.

### Neutral
- **Graphite** ({colors.graphite}): Main page canvas.
- **Sidebar Graphite** ({colors.sidebar}): Navigation rail and mobile navigation base.
- **Deep Surface** ({colors.surface}): Forms, dialogs, and contained surfaces.
- **Raised Graphite** ({colors.raised-surface}): Secondary controls and lightly lifted content.
- **Warm White** ({colors.warm-white}): Main text and key figures.
- **Quiet Gray** ({colors.secondary-text}): Supporting labels, metadata, and helper copy.
- **Divider Gray** ({colors.divider}): Section rules and row separators.
- **Control Stroke** ({colors.control-border}): Button and input borders.
- **Olive Ink** ({colors.olive-ink}): Text on the olive primary action.

**The Single Accent Rule.** Use olive for a meaningful action or state; do not turn it into a decorative wash across the page.

## Typography

**Display Font:** DM Sans (with Noto Sans Thai, sans-serif fallbacks)
**Body Font:** DM Sans (with Noto Sans Thai, sans-serif fallbacks)
**Label/Mono Font:** No separate label or mono family; use tabular numerals for aligned amounts and counts.

**Character:** A neutral, compact sans-serif keeps Thai and Latin interface copy legible and consistent. Tight tracking and semibold weight give titles hierarchy without introducing a display face.

### Hierarchy
- **Display** (600, 30px, 1.2): Main page heading on wide screens.
- **Headline** (600, 24px, 1.3): Page and prominent metric headings; may scale from 24px to 30px.
- **Title** (600, 14px, 1.5): Job titles and compact section labels.
- **Body** (400, 14px, 1.5): Primary descriptions, form text, and job details.
- **Label** (400, 12px, 1.5): Supporting metadata and compact control labels; smaller uppercase navigation group labels use generous tracking.

**The Quiet Label Rule.** Keep metadata smaller and lower contrast than the value or job title it explains.

## Layout

On desktop, use a fixed-width left navigation rail, a slim top context bar, and a centered work area that grows to a maximum width of about 1500px. Dashboard content is narrower than the overall shell. Use a compact 12–16px gap between related cards and rows, with larger section breaks around 32px.

At medium widths (768px), the side rail becomes a fixed bottom navigation bar and the main content reserves bottom padding for it. Keep dashboards in a responsive two-to-three-column grid; job cards collapse into readable stacked content and must not overflow at 320px. Keep date strips, calendar marks, and labels understandable without color alone.

## Elevation & Depth

The system is flat by default and has no recurring shadow vocabulary. Separate regions with tonal shifts between graphite surfaces and thin neutral borders. Hover and focus changes provide the needed interaction feedback; do not add ornamental drop shadows.

**The Divider-Over-Shadow Rule.** Use a quiet border or surface shift to define an edge instead of a resting shadow.

## Shapes

Controls and compact cards use gently rounded corners, most often 8px; larger dialogs and grouped panels use 12px. Small calendar cells use 6px. Borders stay thin and low contrast. Keep card silhouettes simple and rectangular; reserve fully rounded shapes for pills and status markers.

## Components

### Buttons
- **Shape:** Gently rounded corners (8px).
- **Primary:** Muted olive fill, dark olive-ink text, and compact 10px by 16px padding.
- **Hover / Focus:** A subtle lighter olive hover; keyboard focus uses a 2px olive outline with a 2px offset.
- **Secondary:** Raised graphite fill or transparent dark fill with a quiet border and warm-white text.

### Cards / Containers
- **Corner Style:** Flat rows and metric summaries are common; contained cards use 8px or 12px corners.
- **Background:** Deep or raised graphite when a filled container is needed; many list rows remain unfilled.
- **Shadow Strategy:** No resting shadow; use tonal layering and divider borders.
- **Border:** Fine neutral gray, especially around controls, modals, and calendar groupings.
- **Internal Padding:** Compact card rows use 12–16px; larger modal sections use 16px.

### Inputs / Fields
- **Style:** Deep graphite fill, control-gray stroke, 8px corners, and 12px horizontal padding.
- **Focus:** Olive border or visible olive outline; preserve the global keyboard focus indicator.

### Navigation
- **Style:** A quiet dark rail on desktop and a fixed bottom bar on mobile. Active navigation gets a subdued olive-tinted surface with an olive icon or text cue; inactive items remain neutral. Group labels are small, uppercase, and letter-spaced.

### Daily Report Marks
Show actual report dates as compact, repeated marks beside the job's progress summary. Filled olive marks indicate recorded progress; muted graphite marks indicate remaining target steps. Pair the strip with a numeric total or date so meaning never depends on color alone.

## Do's and Don'ts

### Do:
- **Do** keep completed monthly income visually tied to completed jobs.
- **Do** put a job's latest report date near its progress summary.
- **Do** use tabular figures for currency, counts, and progress totals.
- **Do** keep focus visible with the olive outline.
- **Do** let mobile layouts use bottom navigation and stack dense job details.

### Don't:
- **Don't** use olive as a large decorative background.
- **Don't** make a date mark the only way to understand whether a report exists.
- **Don't** use shadows as the default way to separate content.
- **Don't** turn the work log into a spacious, oversized marketing dashboard.
