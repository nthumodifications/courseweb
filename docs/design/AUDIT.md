# Visual + UX audit — 2026-09-11

Findings from a sweep of every main route at 1440×900 and 390×844 (zh locale,
signed out), plus a code sweep of `apps/web/src`. Each item names the rule it
breaks in `LANGUAGE.md`.

## Systemic (affects every page)

| #   | Finding                                                                                                                                                                                                                                                            | Rule |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- |
| S1  | `MainLayout` gives pages only `pt-4 md:pl-2` — no container, no max-width, no gutters, no page-header slot. Every page therefore invents its own. 72 separate `px-*` declarations across 107 page files.                                                           | §1   |
| S2  | Five different page-header treatments: none (grades, today), small-bold + icon-button + source line (sports-venues), inline icon + right-aligned description (community), icon + title + dotted subtitle bar (chat), centred marketing hero (recruit, contribute). | §2   |
| S3  | Four loading treatments: centred spinner (bus, community), `載入中…` text (shops), skeletons (course detail), "Loading" + animated bar (route Suspense fallback).                                                                                                  | §8   |
| S4  | At least four empty-state treatments: emoji + bold line (today), bordered centred box (calendar), bare grey sentence (grades, sidebar), icon + title + description + CTA (chat — the one that is right).                                                           | §7   |
| S5  | 223 hardcoded grey utilities across 51 files; 196 hand-written `dark:` colour overrides (58 of them `dark:bg-neutral-800`). Dark mode is patched by hand rather than tokenised.                                                                                    | §5   |
| S6  | No `success` / `warning` / `info` tokens exist, so status colour is improvised per component.                                                                                                                                                                      | §5   |
| S7  | Sponsor/donation cards appear in the sidebar footer **and** inside the apps grid **and** inside the timetable side panel — up to three times on one screen.                                                                                                        | §13  |
| S8  | Type scale is unbounded inside the app: `text-5xl` ×8, `text-4xl` ×4, `text-3xl` ×2, `text-2xl` ×23.                                                                                                                                                               | §6   |
| S9  | Radius is unsystematic: `rounded-md` 116, `rounded-full` 82, `rounded-lg` 71, `rounded-sm` 13, `rounded-xl` 6, `rounded-3xl` 1, plus `rounded-t/l/r`.                                                                                                              | §4   |

## Per page

### 今日 / today

- T1 **The complaint.** `今天沒有課喔！` renders five times, once per day in the 5-day
  strip — and says "今天" on 明天, 星期一, 星期二, 星期三. Wrong copy _and_ repeated. (§7, §10)
- T2 Desktop wastes ~60% of the viewport: a `380px` grid column on a 1440px page with
  an empty second column. (§1, §12)
- T3 Three different container treatments stacked at the top: a bordered promo card, a
  bare bordered box (`沒有其他安排`), and a bordered section card. (§4)
- T4 `即將到來的行程` and its empty state appear in the sidebar **and** in the content
  column simultaneously. (§2 P2)
- T5 Mobile: the top cards bleed past the right edge; the last day's text sits under the
  bottom nav. (§12)
- T6 Page `<title>` is `行事曆` on /today and `今日` on /calendar — swapped. (§10)

### 行事曆 / calendar

- C1 Same repetition disease: `無行程 · 你的行事曆、課表與校務日期會顯示在這裡。` repeated
  per day down the upcoming rail. (§7)
- C2 A third empty-state style for the same concept. (§7)
- C3 Grid renders from 01:00, spending a third of the viewport on hours with no classes. (§1)

### 時間表 / timetable

- TT1 Right panel is a pile of ungrouped blocks: two full-width outline buttons, a centred
  empty line, a centred button, a settings row, a bare icon row, then a donation card. (§4, §13)
- TT2 Mobile: the grid overflows right (週五 clipped, weekend gone); `總學分` and the
  share row are cut off. (§12)
- TT3 The below-grid stack has no section grouping or headers. (§2, §3)

### 課程查詢 / courses

- CR1 Mobile: list rows overflow the viewport — `加入` buttons, badges and descriptions are
  cut off at the right edge; "Search by Algolia" is clipped. (§12)
- CR2 Badge row is a rainbow — purple/blue/orange/yellow/green tints with no semantics. (§9)
- CR3 Filter rail, results column and the right tab panel each set their own padding and
  heading style. (§1, §2)

### 社群課表 / community ← called out by name

- CM1 English-only on the zh locale: "Community Timetables", "Public timetables from NTHU
  students", "All semesters". (§10)
- CM2 Bespoke header: inline icon + title left, grey description right-aligned on the same
  line. Exists nowhere else. (§2)
- CM3 Content is indented by an ad-hoc left offset instead of the shell container. (§1)
- CM4 Bare centred spinner. (§8)

### 加入我們 / recruit ← "resume page"

- R1 Centred marketing hero, then a left-aligned section title — mixed alignment on one page. (§2)
- R2 Load failure is raw red sentence text, not an error component. (§7)
- R3 A bare underlined `<a>` sits beside a filled button as if they were peers. (§6, §9)
- R4 Footer appears here but not on app pages, and in a different variant than on /issues. (§3)

### 團隊 / team

- TM1 Entirely English on the zh locale. (§10)
- TM2 `text-5xl` headings inside the app shell. (§6)
- TM3 Member grid breaks: the second row floats out of alignment with the first. (§12)
- TM4 `Dedicated Members` renders as a heading with nothing beneath it. (§7)

### 貢獻 / contribute

- CT1 A completely different visual language: pastel blue/green/purple/orange stat tiles
  that exist nowhere else in the product. (§5)
- CT2 Brand-coloured solid buttons (black / red / indigo) outside the token system. (§5)
- CT3 Emoji in section headings (💰). (§10)
- CT4 Centred hero + CTA band; reads as a landing page bolted onto an app. (§2)

### 問題回報 / issues

- I1 Entirely English on the zh locale. (§10)
- I2 Raw underlined links in body copy. (§6)
- I3 Form width, label style and submit alignment match no other form in the product. (§1, §9)

### 成績 / grades

- G1 Empty state is an icon plus one grey sentence — no title, no action, dead end. (§7)
- G2 No page header at all. (§2)

### 體育場館 / sports-venues

- SV1 Sixth header variant: small bold title + icon button + a `資料來源：` line. (§2)
- SV2 Empty result renders as nothing at all. (§7)

### 餐廳 / shops, 校車 / bus

- B1 `載入中…` plain text and a bare spinner respectively. (§8)

### 功能清單 / apps

- A1 Sponsor cards sit inside the functional app grid as if they were categories. (§13)
- A2 Grid cards have uneven heights; the two-row masonry leaves ragged gaps. (§12)
- A3 Icon language is mixed: lucide line icons in purple alongside a full-colour raster
  logo. (§5)
- A4 BETA badges overlap the icons they label. (§9)
- A5 `常用功能` empty state is centred grey text with no action. (§7)

### 設定 / settings

- ST1 Four different segmented-control treatments on one page (pill row, boxed row,
  full-width thirds, chip row). (§9)
- ST2 Bottom-nav and side-nav item toggles are duplicated lists of the same items. (P2)
- ST3 Fifteen themes, seven fonts, five radii, five backgrounds, density and an accent
  override — customisation standing in for an identity. (PHILOSOPHY, "On customisation")

### /design-system

- DS1 Documents a `nthu-50…950` ramp and font variables (`--font-inter`, `--font-noto`)
  that the app does not actually use. (§5, §6)
- DS2 Documents components but no composition rules — no page shell, no header, no empty
  state, no copy rules. This is why it did not prevent any of the above.
