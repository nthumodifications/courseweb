# Customization Overhaul

**Date:** 2026-05-28  
**Status:** Planning  
**Goal:** Transform NTHUMods from a fixed-appearance app into a deeply personalizable platform — covering visual themes, typography, layout, timetable views, dashboard widgets, and navigation — comparable in customization depth to Monkeytype.

---

## Problem Statement

NTHUMods has a capable feature set but almost no visual or layout customization. Every user sees an identical interface:

- NTHU purple is hardcoded as the only accent color
- Light/dark mode is the only theme toggle
- The dashboard is a fixed 5-day schedule with no widget control
- The timetable offers only vertical/horizontal toggle and 12 color palettes
- Bottom nav and sidebar items are hardcoded and unorderable
- Typography (font, size, density) is completely fixed
- No way to express personal taste or optimize for individual workflows

Power users have different needs: some want a dense, information-packed layout; others want a calm, minimal view. Some want a custom dark theme; others want brand colors that feel different from the institutional purple. The current app serves none of these users.

---

## Design Goals

1. **Every visual preference should be expressible** — color, font, density, layout, effects
2. **Zero mandatory choices** — strong defaults, everything opt-in, always a "reset to default" path
3. **Instant feedback** — all changes apply live with no page reload
4. **Shareable** — themes encodable in a URL, importable in one click
5. **Progressive depth** — casual users see simple toggles; power users can edit raw CSS variables or inject custom CSS
6. **Persistent** — all preferences survive page reload, stored in localStorage with a structured schema

---

## Architecture

### ThemeContext (new)

A single React context that owns the entire visual preference state. Replaces the scattered `darkMode`/`timetableTheme` fields currently spread across `settings.tsx` and `useUserTimetable.tsx`.

```typescript
interface ThemeConfig {
  // Identity
  preset: string                    // named preset key, or "custom"

  // Colors (HSL strings, e.g. "273 43% 54%")
  accentHue: number                 // 0–360, drives --primary and related vars
  backgroundHsl: string
  foregroundHsl: string
  cardHsl: string
  sidebarBackgroundHsl: string
  sidebarAccentHsl: string

  // Typography
  fontId: string                    // key from FONT_OPTIONS
  fontScale: number                 // -2 to +3, multiplies rem base
  fontWeight: 'light' | 'normal' | 'medium'

  // Shape
  radiusPreset: 'sharp' | 'default' | 'pill'

  // Density & motion
  densityPreset: 'compact' | 'default' | 'comfortable'
  transitionSpeed: 'instant' | 'fast' | 'default' | 'slow'
  reduceMotion: boolean

  // Effects
  backgroundStyle: BackgroundStyle
  enableSoundEffects: boolean
  soundPack: string

  // Advanced
  customCss: string
}

interface BackgroundStyle {
  type: 'solid' | 'gradient' | 'noise' | 'dots' | 'grid' | 'image'
  color1?: string
  color2?: string
  angle?: number
  imageUrl?: string
  noiseOpacity?: number
}
```

### ThemeManager (new)

A single component mounted once at the root that watches `ThemeContext` and writes all derived CSS variables to `document.documentElement.style`. No component in the tree needs to know about the theme — they just use `var(--primary)` etc. as today.

```
ThemeManager reads ThemeConfig
  → computes derived HSL strings
  → writes to document.documentElement.style:
      --primary, --background, --foreground, --card, --radius,
      --sidebar-background, --sidebar-accent,
      --font-family, --font-scale, --spacing-multiplier,
      --transition-duration, --background-pattern
```

### Persistence

All theme config serialized as JSON to `localStorage` key `theme_config_v1`. On mount, `ThemeManager` hydrates from localStorage before first paint to avoid flash of unstyled content (FOUC).

Dark mode becomes part of `ThemeConfig` (not a separate cookie) going forward — migration needed.

### Theme Presets

`constants/themes.ts` exports a `THEME_PRESETS` map of ~15 named full-config objects:

| Key | Description |
|---|---|
| `nthu-light` | Default — NTHU purple, white background |
| `nthu-dark` | Default dark — NTHU purple, dark background |
| `serika-dark` | Yellow accent, dark warm background (Monkeytype Serika) |
| `nord` | Desaturated blues/grays |
| `catppuccin-mocha` | Mauve/pink on dark brown |
| `rose-pine` | Dusty rose, muted purples |
| `gruvbox` | Warm orange/green retro |
| `dracula` | Classic purple/pink on very dark bg |
| `solarized-light` | Warm beige background, teal accent |
| `tokyo-night` | Deep blue/purple night theme |
| `everforest` | Green/earth tones |
| `one-dark` | Atom One Dark inspired |
| `minimal-light` | Near-white, very low saturation, black accent |
| `minimal-dark` | Near-black, very low saturation, white accent |
| `custom` | User-edited, no preset key |

---

## Feature Breakdown

### Phase 1 — Theme Engine (Foundation)

Everything else depends on this phase.

#### 1.1 Accent Color Picker

Single hue slider (0–360°) in the Appearance settings. Rewrites `--primary`, `--ring`, and sidebar accent vars in real time. Preset swatches for quick selection: NTHU Purple (default), Sky Blue, Rose, Amber, Teal, Lime, Indigo.

**Files:**
- `ThemeContext.tsx` (new) — context + localStorage persistence
- `ThemeManager.tsx` (new) — CSS var writer
- `settings/Appearance.tsx` (new section) — hue slider + swatches
- `globals.css` — no changes needed; vars already wired

#### 1.2 Platform Theme Presets

Visual grid of theme cards in Appearance settings. Each card shows a mini preview (colored circles + a fake timetable chip). Clicking a preset applies it immediately. "Customize" button on any preset forks it into `custom`.

#### 1.3 Live Theme Editor

A collapsible panel in Appearance settings (or a floating sidebar triggered by a button) with:
- Color pickers for every CSS variable group
- Live preview pane (shows a timetable chip + some sample text)
- "Copy theme URL" button — encodes full config as base64 in `?theme=` query param
- "Import from URL" — parses and applies

#### 1.4 Font Selection

Dropdown/grid of 6 font options. Font files loaded lazily via `<link>` injection on selection (no wasted bandwidth for unused fonts).

| Font ID | Display Name | Character |
|---|---|---|
| `inter` | Inter (default) | Clean, neutral |
| `geist` | Geist | Modern, tech |
| `jetbrains-mono` | JetBrains Mono | Monospaced |
| `noto-serif-tc` | Noto Serif TC | Traditional CJK |
| `ibm-plex-sans` | IBM Plex Sans | Corporate clean |
| `source-code-pro` | Source Code Pro | Code-editor feel |

Font scale slider: 5 steps from 87.5% to 112.5% of base 16px. All `rem`-based values scale automatically.

#### 1.5 Shape & Density

**Border radius preset:** Sharp (0px) / Default (8px) / Rounded (12px) / Pill (999px) — controls `--radius`.

**Density preset:** Compact / Default / Comfortable — sets a `--density` multiplier that component padding reads from. Compact saves ~30% vertical space.

**Transition speed:** Instant (0ms) / Fast (100ms) / Default (200ms) / Slow (400ms) — single `--transition-duration` var.

#### 1.6 Background System

Beyond flat color, the app background (and optionally sidebar) supports:

- **Solid** — any hex color (default)
- **Gradient** — two color stops, configurable angle
- **Noise** — a subtle film-grain SVG overlay at configurable opacity
- **Dot grid** — repeating dot pattern (size + spacing configurable)
- **Line grid** — graph-paper style
- **Image** — URL input; image fills with `cover`, 30% opacity overlay for readability

Implemented via a `::before` pseudo-element on `body`, no layout impact.

---

### Phase 2 — Timetable Revolution

Extends existing timetable without breaking it.

#### 2.1 Five View Modes

New `timetable_view_mode` setting with 5 options:

**Grid** (current default) — the existing vertical/horizontal grid. Unchanged.

**Agenda** — a scrollable list of course cards sorted by day then time. Each card shows full details. Visually similar to Google Calendar's Schedule view. Great on mobile.

**Timeline** — days as rows, time as the X axis (horizontal scroll). Compact and good for seeing gaps between classes.

**Dots** — a minimal week-at-a-glance. Each time slot is a small colored dot. No text. Click a dot to reveal details in a popover. Useful as a quick reference.

**Day cards** — one card per day, shows all courses for that day. Swipeable on mobile. Best for people who check one day at a time.

**New files:**
- `components/Timetable/TimetableAgenda.tsx`
- `components/Timetable/TimetableTimeline.tsx`
- `components/Timetable/TimetableDots.tsx`
- `components/Timetable/TimetableDayCards.tsx`
- `components/Timetable/ViewModeSwitcher.tsx`

#### 2.2 Day & Time Range Control

**Day range:** 3 / 4 / 5 / 6 days shown. Plus an "Auto-trim" toggle that hides any day column with zero courses. Start-of-week: Monday (default) or Sunday.

**Time range:** Custom start period and end period. Default: Period 1–14. Setting: hide Period 1 if no courses before 10am, etc. Also a manual override with a period range picker.

#### 2.3 Course Card Styles

New `timetable_card_style` setting:

| Style | Description |
|---|---|
| `filled` | Current — solid background fill |
| `outlined` | Transparent background, colored border only |
| `frosted` | `backdrop-filter: blur(8px)`, semi-transparent fill |
| `gradient` | Two-tone gradient using the course's assigned color |
| `minimal` | White/dark bg, left accent border only (color strip) |

Card content density (separate from global density):
- **Code only** — just the course code, max info in min space
- **Default** — code + title
- **Full** — code + title + venue + instructor

Text alignment within card: left / center (current default).

#### 2.4 Smart Auto-Coloring

New `timetable_color_mode` option alongside the existing per-course manual assignment:

- **Manual** (default) — cycle through theme colors, override per course
- **By department** — derive a hue from the department code (e.g., CS = 220°, EE = 30°), consistent across semesters
- **By building** — group courses by venue building, same building = same hue family
- **By time-of-day** — morning (green), midday (yellow/amber), afternoon (orange), evening (red/pink)

---

### Phase 3 — Dashboard Widget Canvas

Replace the hardcoded 5-day schedule in `today/page.tsx` with a composable widget grid.

#### 3.1 Widget System Architecture

```typescript
interface Widget {
  id: string
  type: WidgetType
  size: 'small' | 'medium' | 'large' | 'wide'
  config: Record<string, unknown>  // widget-specific settings
  position: { col: number; row: number }
}

type WidgetType =
  | 'schedule'        // today's courses (existing)
  | 'multi-day'       // 2–7 day course view (replaces 5-day hardcode)
  | 'bus'             // bus arrival times (existing Bus page, widgetized)
  | 'weather'         // current weather + forecast
  | 'countdown'       // custom countdown to user-defined date
  | 'pinned-apps'     // existing pinned apps grid
  | 'announcements'   // NTHU announcements feed
  | 'notepad'         // freeform sticky note (localStorage)
  | 'upcoming-events' // calendar events in next N days
  | 'quote'           // random motivational quote
```

Layout stored as `dashboard_layout: Widget[]` in localStorage.

Drag-and-drop via `@dnd-kit/core` (already likely in the project; lightweight and accessible).

#### 3.2 Widget Picker

A "+" button in the dashboard that opens a sheet/drawer listing all available widgets. Click to add. Each widget type can only be added once (except notepad).

#### 3.3 Widget Configuration

Each widget has a gear icon on hover that opens a small config popover:
- **multi-day**: choose 1–7 day range
- **bus**: pick stops + direction
- **countdown**: set target date + label
- **weather**: location auto-detect or manual NTHU default

---

### Phase 4 — Navigation Customization

#### 4.1 Configurable Bottom Nav

Currently 4 hardcoded items. New setting `bottom_nav_items: string[]` — an ordered list of 4–5 page keys. A picker UI (drag-to-reorder + checkbox) in Layout settings shows all available pages and lets users choose their 4.

Available options: Today, Timetable, Bus, Apps, Calendar, Settings, (any pinned app that has its own page).

#### 4.2 Sidebar Item Reordering

Same concept for desktop sidebar — a drag-to-reorder list in Layout settings. The 5 main items become reorderable. Users can also add shortcuts to external URLs (e.g., iLMS, MyNTHU portal) with a custom emoji icon.

#### 4.3 Nav Icon Colors Applied

Nav item colors are already defined in `SideNav.tsx` and `BottomNav.tsx` but currently unused in the UI. Wire them up: active state uses the item's own color instead of the hardcoded `bg-nthu-600`. Each item's color becomes customizable per-item.

#### 4.4 Compact Header Mode

A toggle that reduces `--header-height` from `3.5rem` to `2.5rem` and hides the app name text, showing only the logo mark. More vertical space for content.

---

### Phase 5 — Power User Tools

#### 5.1 Command Palette (⌘K / Ctrl+K)

Using the `cmdk` package. Opens with keyboard shortcut or a search icon in the header. Supports:

- Navigate to any page (`> today`, `> timetable`, `> bus`)
- Toggle settings (`toggle dark mode`, `toggle compact`)
- Switch theme (`theme nord`, `theme dracula`)
- Find a course (searches the enrolled course list)
- Open a specific settings section

#### 5.2 Zen Mode

A toggle (keyboard shortcut: `Z`) that hides sidebar, header, and bottom nav — leaving only the page content. A small floating exit button remains. Useful for presentations, focus sessions, or showing the timetable on a large display.

#### 5.3 Screensaver Mode

When the app is left idle for a configurable duration (5 / 10 / 30 min, or off), fade to a full-screen view showing:
- Large clock
- Date
- "Next class: [name] in [X] minutes" or "No more classes today"
- A subtle animated background (based on current theme)

Touch / click / keypress dismisses it.

#### 5.4 Custom CSS Injection

A `<textarea>` in the Advanced settings section. Contents applied to a `<style id="user-custom-css">` tag. Labeled clearly as "advanced — may break the layout."

Includes a "Reset" button. Content stored in `theme_config_v1.customCss`.

#### 5.5 Theme Export & Import

**Export:** "Copy theme JSON" button — copies a JSON object of the current `ThemeConfig` to clipboard.

**Import:** A textarea that parses pasted JSON and applies it after validation.

**URL sharing:** "Share theme link" encodes the theme as a base64 URL param. Recipients see a preview banner at the top ("Someone shared a theme with you — Apply / Dismiss").

---

### Phase 6 — Delight Layer

Optional, enhances personality.

#### 6.1 Sound Effects

Off by default. When enabled, plays subtle audio on:
- Navigation click (soft tick)
- Course added to timetable (soft chime)
- Settings toggle (subtle switch sound)
- Course registration success (satisfying pop)

3 sound packs: Default, Mechanical, Minimal. Audio files served as tiny WebM clips.

#### 6.2 Haptic Feedback (Mobile)

Uses `navigator.vibrate()` on:
- Course card tap in timetable (5ms pulse)
- Toggle switches (10ms)
- Bottom nav tap (3ms)

Falls back silently on unsupported devices. Configurable: on / off.

#### 6.3 Celebration Moments

`canvas-confetti` burst when:
- All courses are enrolled for a new semester for the first time
- A countdown widget hits zero

Toggleable in settings.

#### 6.4 Easter Eggs

- Konami code (↑↑↓↓←→←→BA) applies a surprise theme
- On NTHU's founding anniversary (November 1), a special anniversary theme auto-suggests
- 10+ consecutive days of app opens shows a small streak badge

---

## Settings Page Restructure

The current 5 sections (Display, Calendar, Timetable, AI, Privacy) become 7:

| Section | Contents |
|---|---|
| **Appearance** | Theme preset gallery, accent color, font, density, radius, background, transitions |
| **Display** | Dark mode (now part of theme), language |
| **Layout** | Dashboard widget canvas editor, nav item order, header compact mode |
| **Timetable** | View mode, day/time range, card style, color mode, display fields |
| **Calendar** | Academic calendar toggle, experimental calendar |
| **AI** | Existing AI preferences |
| **Advanced** | Custom CSS, export/import, sound effects, haptics, celebrations, zen mode |
| **Privacy** | Analytics |

---

## Migration Plan

1. **Settings schema migration:** On first load after deploy, migrate existing localStorage keys (`timetable_theme`, `timetable_vertical`, `timetable_display_preferences`, `pinned_apps`) into the new structured `theme_config_v1` and `layout_config_v1` objects. Old keys remain for one release cycle then are cleaned up.

2. **Dark mode cookie → ThemeConfig:** Current dark mode is stored as a cookie (for SSR). Keep the cookie for SSR hydration but also sync into `theme_config_v1`. ThemeManager reads `theme_config_v1` on client mount and overwrites if needed.

3. **Timetable theme:** `timetable_theme` localStorage key becomes `ThemeConfig.timetableColorPalette`. Existing 12 palettes preserved unchanged.

---

## Phased Rollout

| Phase | Features | Target |
|---|---|---|
| P1 | ThemeEngine (context, manager, CSS vars), accent hue picker, 15 presets, font selector, density/radius/transition controls | Foundation — enables everything else |
| P2 | Live theme editor panel, background styles, theme URL sharing | Visual completeness |
| P3 | Timetable view modes (Agenda + Dots first), day/time range, card styles | High user impact |
| P4 | Dashboard widget system (schedule + bus + pinned apps widgetized first) | High user impact |
| P5 | Nav customization (bottom nav items, reorder), compact header, nav colors | Quality of life |
| P6 | Command palette, zen mode, custom CSS | Power users |
| P7 | Sound effects, haptics, celebrations, screensaver, easter eggs | Delight layer |

---

## Open Questions

1. **SSR / hydration for theme:** Dark mode is currently set via cookie for SSR. Should we keep the cookie path for SSR or accept a single-frame flash on first load and go fully client-side for theme?

2. **Widget persistence backend:** localStorage is fine for now. Should widget layout eventually sync to the user account (Supabase) so it persists across devices?

3. **Font licensing:** Confirm all 6 chosen fonts are available on Google Fonts or have permissive licenses for self-hosting.

4. **Community themes:** Worth adding a "Browse themes" gallery that pulls from a shared source (GitHub Gist, a simple API endpoint) in a future phase?

5. **Timetable view mode on mobile vs desktop:** Some views (Timeline) are desktop-only by nature. Should mobile get a separate default view mode setting?
