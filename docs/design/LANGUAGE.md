# NTHUMods Design Language

Enforceable rules. Derived from `PHILOSOPHY.md`; each rule cites its principle (P1–P5).

Everything here is checkable in review. "It looked fine" is not an argument.

---

## 1. Page shell (P1, P3)

Every route renders exactly one `<PageShell>`. Pages never set their own outer
horizontal padding, max-width, or bottom-nav spacing.

```tsx
<PageShell width="app">            // "content" | "app" | "full"
  <PageHeader title={…} description={…} actions={…} />
  …sections…
</PageShell>
```

| width     | max-width   | used by                                                                                      |
| --------- | ----------- | -------------------------------------------------------------------------------------------- |
| `content` | `max-w-3xl` | prose and side pages: team, issues, contribute, recruit, changelog, privacy                  |
| `app`     | `max-w-6xl` | lists, grids, forms, detail pages: courses, apps, venues, shops, grades, settings, community |
| `full`    | none        | tools that own the viewport: timetable, calendar, map, bus, chat                             |

- Gutters live in the shell only: `px-4 md:px-6 lg:px-8`.
- Bottom-nav clearance and safe-area insets live in the shell only.
- **A `full` page must fill the viewport.** A 380px column on a 1440px screen is a
  bug (P1, P5). Either the content widens or the page is not `full`.

## 2. Page header (P1, P3)

One component, one line, one shape. There are currently five hand-rolled variants;
there is now one.

- Title: `text-xl font-semibold`, always the localised page name.
- Optional description: `text-sm text-muted-foreground`, one line, truncates.
- Actions: right-aligned, at most one primary + two icon buttons.
- No icons beside the title. No hero. No centred titles.

**There is no display-title exception.** 團隊, 貢獻, 加入我們 and 隱私權政策 open
exactly the way 今日 and 課程查詢 open: the same `PageHeader`, the same size, the same
left edge. A page that announces itself with a 36px centred hero is telling the
student they have left the product — which is precisely the complaint these rules
exist to answer. Side pages differ from app pages in **measure and density**
(`width="content"`, more air between sections, longer copy), never in chrome.

Centred text appears in exactly one place: inside `EmptyState` and `ErrorState`.
Nowhere else — not headings, not sections, not button rows, not cards.

A page may never reach into `PageHeader` with arbitrary variants
(`[&>div:first-child]:justify-center`) to get a different shape. If a page needs a
shape the header does not have, the answer is no.

## 3. Vertical rhythm and spacing (P3, P5)

Allowed spacing steps only: **4, 8, 12, 16, 24, 32, 48**.

- Between page sections: `space-y-6` (24).
- Between items inside a section: `space-y-3` (12).
- Card padding: `p-4` (16); dense list rows `px-3 py-2`.
- Never `space-y-5`, `gap-7`, `p-5`, or arbitrary `[13px]` values.

## 4. Surfaces (P3, P4)

Exactly three levels. Nothing else.

| level | classes                                   | use                                                      |
| ----- | ----------------------------------------- | -------------------------------------------------------- |
| page  | `bg-background`                           | the page itself                                          |
| card  | `bg-card border border-border rounded-lg` | a grouped, self-contained block                          |
| inset | `bg-muted rounded-md`                     | a quiet region inside a card: code, meta, secondary info |

- Shadows exist **only** on overlays: dialog, popover, dropdown, drawer, toast.
  No `shadow-sm` on cards. Ever.
- No card directly inside a card. Use `<Separator />` or an inset.
- Radius: `rounded-lg` (cards, dialogs) · `rounded-md` (controls, inputs, buttons) ·
  `rounded-full` (avatars, pills, status dots) · `rounded-sm` (4px colour chips).
  `rounded-xl`, `rounded-3xl`, `rounded-t/l/r` are banned outside the sidebar/drawer.

## 5. Colour (P4)

**Tokens only.** `text-gray-*`, `bg-gray-*`, `slate`, `zinc`, `neutral`, and every
hand-written `dark:` colour override are banned in application code. If dark mode
needs a patch, the token is wrong — fix the token.

Current violations to eliminate: 223 hardcoded grey utilities across 51 files,
196 manual `dark:` overrides.

Semantic tokens (add the three that are missing — their absence is why people reach
for `green-500` and `amber-500`):

| token              | meaning                                      |
| ------------------ | -------------------------------------------- |
| `primary`          | you are here / you can act                   |
| `destructive`      | danger, deletion, failure                    |
| `success`          | **(add)** confirmed, available, passing      |
| `warning`          | **(add)** attention, degraded, deadline near |
| `info`             | **(add)** neutral notice                     |
| `muted-foreground` | every piece of secondary text                |

Rules:

- At most **one** `variant="default"` (purple) button per screen region.
- Data colour — course colours, bus lines, status dots — comes from a fixed palette
  and never styles UI chrome.
- No brand-coloured buttons. GitHub/Instagram/email actions are `variant="outline"`
  with the brand icon.
- Tinted "stat tile" backgrounds (blue/green/purple/orange washes) are banned.

## 6. Typography (P5)

Chinese-first: prefer **weight contrast over size contrast**. CJK at large sizes
reads as shouting.

| role                                  | classes                         |
| ------------------------------------- | ------------------------------- |
| page title                            | `text-xl font-semibold`         |
| section title                         | `text-base font-semibold`       |
| body                                  | `text-sm`                       |
| meta / secondary                      | `text-xs text-muted-foreground` |
| numbers, times, course codes, credits | `tabular-nums font-medium`      |

- **`text-xl` is the largest type in the product.** Not the largest in the app shell
  — the largest anywhere, side pages and marketing copy included. There is no
  display size, because there is no page that gets to look like a different product.
- Line length in `content` pages caps at ~70 characters (`max-w-prose`).
- Inline links: `text-primary underline-offset-4 hover:underline`. Never a raw
  browser-blue underlined `<a>`.

## 7. Empty states (P1, P2, P5)

One component, used everywhere:

```tsx
<EmptyState icon={Icon} title="…" description="…" action={…} />
```

- Icon 24px `text-muted-foreground`, title `text-base font-semibold`, description
  `text-sm text-muted-foreground`, at most one action.
- **Never** a bare grey sentence with no title and no way forward (today: grades,
  sports-venues, the timetable panel).
- **Never** repeated. Consecutive identical empty periods collapse into one row:
  `9/12–9/16 · 沒有課`, expandable if the student wants the days back (P2).
- The friendly voice stays — it just appears once.

## 8. Loading states (P3)

Skeletons that mirror the real layout, built from one `<Skeleton>` primitive.

- Banned: bare centred spinners, `載入中…` text, "Loading" placeholder headings.
- A route that is known to be slow shows the page shell and header immediately, and
  skeletons only where data is missing (P1).

## 9. Controls (P3, P4)

- Buttons: `default` · `secondary` · `outline` · `ghost` · `destructive`. Sizes
  `sm` · `default` · `icon`. Nothing else.
- Every interactive element has a visible focus ring: `ring-2 ring-ring ring-offset-2`.
- Minimum touch target 40px on mobile.
- Segmented choices use one pattern (a single segmented control), not four different
  chip/box/pill treatments on the same settings page.
- Badges carry meaning: `secondary` for neutral facts, `outline` for metadata,
  `destructive` for warnings. A course's badge row is not a rainbow.

## 10. Copy and localisation (P1, P2, P5)

- **zh-TW is the product's first language.** No English-only screen ships. Every
  user-facing string goes through the dictionaries; `en.json` and `zh.json` keep
  identical key trees.
- Day-relative copy must be true: `今天沒有課` only on today. Other days say `沒有課`.
  (Current bug: the same "今天沒有課喔！" renders on five different dates.)
- Empty states state the fact, then the way forward.
- No trailing `。` in labels, buttons or badges; keep it in sentences.
- English copy is sentence case. No Title Case buttons.
- Emoji only in content and warm copy — never in headings, section titles, buttons.

## 11. Motion (P5)

- State change 150ms ease-out. Enter/exit 200ms. Opacity and transform only.
- No layout-shifting animation in lists. No bouncing, no spring overshoot.
- Everything respects `prefers-reduced-motion`.

## 12. Layout integrity (P1, P3)

- **The page never scrolls horizontally.** Wide tables, timetable grids and code get
  their own `overflow-x-auto` container. (Current bugs: mobile course list, mobile
  timetable, mobile today cards all bleed past the viewport.)
- Nothing is hidden under the bottom nav; clearance comes from the shell.
- Every grid collapses to one column at `sm`, and no element carries a `min-width`
  wider than 320px.
- Desktop layouts use their width. A fixed narrow column beside a vast empty area is
  a bug, not a style.

## 13. Promotions and sponsorship (P2)

- Exactly one sponsor/donation placement in the app shell: the sidebar footer.
- Sponsor cards never appear inside a functional grid (apps page) or a tool panel
  (timetable side panel).
- The contribute page may present sponsors fully — that is its subject.

---

## Review checklist

A change is done when all of these are true:

1. Uses `PageShell` + `PageHeader`; sets no outer padding or max-width of its own.
2. No hardcoded colour utility and no `dark:` override.
3. No type size above `text-xl` inside the app shell.
4. Empty and loading states use the shared components; nothing repeats.
5. Every user-facing string is in the dictionaries, in both languages.
6. No horizontal overflow at 390px; nothing under the bottom nav.
7. Spacing steps from the allowed set; surfaces from the three levels.
8. One primary action per region; focus rings visible.
