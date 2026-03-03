# Settings Page Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the Settings page to align with the design system, improve visual hierarchy, enhance mobile experience, and use semantic color tokens exclusively.

**Architecture:** Refactor existing Settings page components to use consistent spacing (4px base unit), add page header, improve card layouts with borders and proper spacing, remove Separator components in favor of gap spacing, ensure all colors use semantic tokens, and optimize responsive layouts for mobile.

**Tech Stack:** React, TypeScript, Tailwind CSS, shadcn/ui components, useDictionary hook

---

## Context

**Current File:** `apps/web/src/app/[lang]/(mods-pages)/settings/page.tsx`

**Related Files:**

- `apps/web/src/app/[lang]/(mods-pages)/settings/TimetableThemeList.tsx`
- `apps/web/src/app/[lang]/(mods-pages)/settings/TimetablePreview.tsx`
- `apps/web/src/app/[lang]/(mods-pages)/settings/TimetablePreferences.tsx`
- `apps/web/src/app/[lang]/(mods-pages)/settings/AIPreferences.tsx`

**Design System Reference:** `/docs/design-system.md`

**Key Design Principles:**

- NTHU Purple brand color (`bg-nthu-500`, `text-nthu-600`, etc.)
- Semantic color tokens (`text-muted-foreground`, `border-border`, etc.)
- Spacing: gap-2 (8px), gap-4 (16px), gap-6 (24px), gap-8 (32px)
- Card padding: p-6 on desktop, p-4 on mobile
- Typography: text-3xl for page titles, text-xl for card titles, text-base for settings items
- Responsive: flex-col sm:flex-row for mobile-first layouts

---

## Task 1: Add Page Header Component

**Files:**

- Modify: `apps/web/src/app/[lang]/(mods-pages)/settings/page.tsx:218-229`

**Goal:** Add a clear page header with title and description to improve visual hierarchy.

**Step 1: Update SettingsPage component to add header**

Modify the `SettingsPage` component:

```tsx
const SettingsPage = () => {
  const dict = useDictionary();

  return (
    <div className="flex flex-col max-w-2xl px-4 gap-4">
      {/* Page Header */}
      <div className="flex flex-col gap-2 pt-4 mb-2">
        <h1 className="text-3xl font-bold">
          {dict.settings.title || "Settings"}
        </h1>
        <p className="text-muted-foreground">
          {dict.settings.description ||
            "Manage your account settings and preferences"}
        </p>
      </div>

      <DisplaySettingsCard />
      <CalendarSettingsCard />
      <TimetableSettingsCard />
      <AISettingsCard />
      <PrivacySettingsCard />
      <Footer />
    </div>
  );
};
```

**Step 2: Verify visually**

Run dev server and check:

- Header appears at top with proper spacing
- Title is bold and 3xl size
- Description uses muted foreground color
- Works in both light and dark modes

**Step 3: Commit**

```bash
git add apps/web/src/app/[lang]/\(mods-pages\)/settings/page.tsx
git commit -m "feat(settings): add page header with title and description"
```

---

## Task 2: Redesign DisplaySettingsCard

**Files:**

- Modify: `apps/web/src/app/[lang]/(mods-pages)/settings/page.tsx:30-80`

**Goal:** Improve card structure with border on header, remove Separator, improve responsive layout, use semantic tokens.

**Step 1: Update DisplaySettingsCard component**

Replace the entire `DisplaySettingsCard` component:

```tsx
const DisplaySettingsCard = () => {
  const { darkMode, setDarkMode, language, setLanguage } = useSettings();
  const dict = useDictionary();

  return (
    <Card>
      <CardHeader className="border-b border-border pb-4">
        <CardTitle>{dict.settings.display.title}</CardTitle>
        <CardDescription>{dict.settings.display.description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Dark Mode Setting */}
        <div
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          id="darkmode"
        >
          <div className="flex-1 space-y-1">
            <h3 className="font-medium text-base">
              {dict.settings.display.dark_mode.title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {dict.settings.display.dark_mode.description ||
                "Toggle dark mode theme"}
            </p>
          </div>
          <div className="flex items-center">
            <Switch checked={darkMode} onCheckedChange={setDarkMode} />
          </div>
        </div>

        {/* Language Setting */}
        <div
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          id="language"
        >
          <div className="flex-1 space-y-1">
            <h3 className="font-medium text-base">
              {dict.settings.display.language.title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {dict.settings.display.language.description ||
                "Choose your preferred language"}
            </p>
          </div>
          <div className="flex items-center">
            <Select
              value={language}
              onValueChange={(v) => setLanguage(v as Language)}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Select Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zh">繁體中文</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
```

**Step 2: Remove Separator import**

Remove the Separator import from the top of the file:

```tsx
// Remove this line:
import { Separator } from "@courseweb/ui";
```

**Step 3: Verify visually**

Check:

- CardHeader has bottom border
- No Separator component between settings
- Settings items have space-y-6 gap
- Responsive layout: stacks on mobile, side-by-side on desktop
- Language selector is full width on mobile, 180px on desktop
- All text uses semantic tokens

**Step 4: Commit**

```bash
git add apps/web/src/app/[lang]/\(mods-pages\)/settings/page.tsx
git commit -m "feat(settings): redesign DisplaySettingsCard with improved layout and spacing"
```

---

## Task 3: Redesign CalendarSettingsCard

**Files:**

- Modify: `apps/web/src/app/[lang]/(mods-pages)/settings/page.tsx:105-168`

**Goal:** Improve card structure, add visual grouping for experimental features, use semantic tokens.

**Step 1: Update CalendarSettingsCard component**

Replace the entire `CalendarSettingsCard` component:

```tsx
const CalendarSettingsCard = () => {
  const [useNewCalendar, setUseNewCalendar] = useLocalStorage(
    "use_new_calendar",
    false,
  );
  const { showAcademicCalendar, setShowAcademicCalendar } = useSettings();
  const dict = useDictionary();

  const handleUseNewCalendar = (v: boolean) => {
    setUseNewCalendar(v);
    event({
      action: "use_new_calendar",
      category: "settings",
      label: `calendar_${v ? "on" : "off"}`,
    });
  };

  return (
    <Card>
      <CardHeader className="border-b border-border pb-4">
        <CardTitle>{dict.settings.calendar.title}</CardTitle>
        <CardDescription>{dict.settings.calendar.description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Academic Calendar Setting */}
        <div
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          id="calendar"
        >
          <div className="flex-1 space-y-1">
            <h3 className="font-medium text-base">
              {dict.settings.calendar.academic_calendar.title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {dict.settings.calendar.academic_calendar.description}
            </p>
          </div>
          <div className="flex items-center">
            <Switch
              checked={showAcademicCalendar}
              onCheckedChange={setShowAcademicCalendar}
            />
          </div>
        </div>

        {/* Experimental Calendar Setting */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg bg-muted/30 border border-border">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-medium text-base">
                {dict.settings.calendar.experimental_calendar.title}
              </h3>
              <Badge
                variant="outline"
                className="bg-nthu-50 text-nthu-700 border-nthu-200 dark:bg-nthu-950/30 dark:text-nthu-400 dark:border-nthu-800"
              >
                {dict.settings.calendar.experimental_calendar.badge}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {dict.settings.calendar.experimental_calendar.description}
            </p>
          </div>
          <div className="flex items-center">
            <Switch
              checked={useNewCalendar}
              onCheckedChange={handleUseNewCalendar}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
```

**Step 2: Verify visually**

Check:

- CardHeader has bottom border
- Academic calendar setting uses standard layout
- Experimental calendar has subtle background and border
- Badge uses NTHU purple colors
- Responsive layout works on mobile
- All colors use semantic tokens

**Step 3: Commit**

```bash
git add apps/web/src/app/[lang]/\(mods-pages\)/settings/page.tsx
git commit -m "feat(settings): redesign CalendarSettingsCard with experimental feature highlighting"
```

---

## Task 4: Redesign TimetableSettingsCard

**Files:**

- Modify: `apps/web/src/app/[lang]/(mods-pages)/settings/page.tsx:82-103`

**Goal:** Improve card structure with consistent spacing pattern.

**Step 1: Update TimetableSettingsCard component**

Replace the entire `TimetableSettingsCard` component:

```tsx
const TimetableSettingsCard = () => {
  const { preferences, setPreferences } = useUserTimetable();
  const dict = useDictionary();

  return (
    <Card>
      <CardHeader className="border-b border-border pb-4">
        <CardTitle>{dict.settings.timetable.title}</CardTitle>
        <CardDescription>{dict.settings.timetable.description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-6" id="theme">
        <TimetablePreview />
        <TimetableThemeList />
        <TimetablePreferences
          settings={preferences}
          onSettingsChange={setPreferences}
        />
      </CardContent>
    </Card>
  );
};
```

**Step 2: Verify visually**

Check:

- CardHeader has bottom border
- Content has pt-6 and space-y-6
- Preview, theme list, and preferences are properly spaced
- Works in both light and dark modes

**Step 3: Commit**

```bash
git add apps/web/src/app/[lang]/\(mods-pages\)/settings/page.tsx
git commit -m "feat(settings): redesign TimetableSettingsCard with improved spacing"
```

---

## Task 5: Redesign PrivacySettingsCard

**Files:**

- Modify: `apps/web/src/app/[lang]/(mods-pages)/settings/page.tsx:170-201`

**Goal:** Fix hardcoded colors to use semantic tokens, improve layout consistency.

**Step 1: Update PrivacySettingsCard component**

Replace the entire `PrivacySettingsCard` component:

```tsx
const PrivacySettingsCard = () => {
  const { analytics, setAnalytics } = useSettings();
  const dict = useDictionary();

  return (
    <Card>
      <CardHeader className="border-b border-border pb-4">
        <CardTitle>{dict.settings.privacy.title}</CardTitle>
        <CardDescription>{dict.settings.privacy.description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          id="privacy"
        >
          <div className="flex-1 space-y-1">
            <h3 className="font-medium text-base">
              {dict.settings.privacy.analytics.title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {dict.settings.privacy.analytics.description}
            </p>
          </div>
          <div className="flex items-center">
            <Switch checked={analytics} onCheckedChange={setAnalytics} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
```

**Step 2: Verify visually**

Check:

- CardHeader has bottom border
- Hardcoded `text-gray-600 dark:text-gray-400` replaced with `text-muted-foreground`
- Layout is consistent with other cards
- Responsive layout works on mobile

**Step 3: Commit**

```bash
git add apps/web/src/app/[lang]/\(mods-pages\)/settings/page.tsx
git commit -m "fix(settings): use semantic tokens in PrivacySettingsCard"
```

---

## Task 6: Update AISettingsCard

**Files:**

- Modify: `apps/web/src/app/[lang]/(mods-pages)/settings/page.tsx:203-216`

**Goal:** Ensure consistent card structure with border on header.

**Step 1: Update AISettingsCard component**

Replace the entire `AISettingsCard` component:

```tsx
const AISettingsCard = () => {
  const dict = useDictionary();

  return (
    <Card>
      <CardHeader className="border-b border-border pb-4">
        <CardTitle>{dict.settings.ai.title}</CardTitle>
        <CardDescription>{dict.settings.ai.description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <AIPreferencesPanel />
      </CardContent>
    </Card>
  );
};
```

**Step 2: Verify visually**

Check:

- CardHeader has bottom border
- Content has pt-6 padding
- AIPreferencesPanel renders correctly

**Step 3: Commit**

```bash
git add apps/web/src/app/[lang]/\(mods-pages\)/settings/page.tsx
git commit -m "feat(settings): add consistent styling to AISettingsCard"
```

---

## Task 7: Improve Page Container Spacing

**Files:**

- Modify: `apps/web/src/app/[lang]/(mods-pages)/settings/page.tsx:218-235`

**Goal:** Optimize container spacing for better mobile and desktop experience.

**Step 1: Update SettingsPage container classes**

Update the main container div:

```tsx
const SettingsPage = () => {
  const dict = useDictionary();

  return (
    <div className="flex flex-col max-w-2xl mx-auto px-4 md:px-6 gap-6 pb-8">
      {/* Page Header */}
      <div className="flex flex-col gap-2 pt-4 mb-2">
        <h1 className="text-3xl font-bold">
          {dict.settings.title || "Settings"}
        </h1>
        <p className="text-muted-foreground">
          {dict.settings.description ||
            "Manage your account settings and preferences"}
        </p>
      </div>

      <DisplaySettingsCard />
      <CalendarSettingsCard />
      <TimetableSettingsCard />
      <AISettingsCard />
      <PrivacySettingsCard />
      <Footer />
    </div>
  );
};
```

**Changes:**

- Changed gap-4 to gap-6 for better spacing between cards (24px instead of 16px)
- Added mx-auto to center the container
- Added md:px-6 for better desktop padding
- Added pb-8 for bottom padding before footer

**Step 2: Verify visually**

Check:

- Cards have consistent 24px gaps between them
- Container is centered on wide screens
- Padding increases on desktop
- Footer has proper spacing at bottom

**Step 3: Commit**

```bash
git add apps/web/src/app/[lang]/\(mods-pages\)/settings/page.tsx
git commit -m "feat(settings): improve page container spacing and layout"
```

---

## Task 8: Final Testing and Verification

**Goal:** Ensure all changes work correctly across different screen sizes and themes.

**Step 1: Visual testing checklist**

Test the following:

**Desktop (1280px+)**

- [ ] Page header appears with proper title and description
- [ ] All cards have bottom border on headers
- [ ] Cards have 24px gaps between them
- [ ] Settings items are side-by-side (label left, control right)
- [ ] Container is centered with max-width

**Mobile (< 640px)**

- [ ] Page header is readable
- [ ] Cards stack properly
- [ ] Settings items stack vertically (label on top, control below)
- [ ] Language selector is full width
- [ ] Touch targets are large enough

**Dark Mode**

- [ ] All colors use semantic tokens
- [ ] No hardcoded gray colors
- [ ] Experimental calendar badge shows NTHU purple
- [ ] Border colors are visible but subtle
- [ ] Text contrast is sufficient

**Accessibility**

- [ ] All switches have proper labels
- [ ] Focus states are visible (NTHU purple ring)
- [ ] Keyboard navigation works
- [ ] No color-only information

**Step 2: Run dev server and manually test**

```bash
npm run dev
# or
bun dev
```

Navigate to `/en/settings` and `/zh/settings` and verify all items in checklist.

**Step 3: Take screenshots (optional)**

If everything looks good, consider taking screenshots for documentation:

- Desktop light mode
- Desktop dark mode
- Mobile light mode
- Mobile dark mode

**Step 4: Final commit**

```bash
git add -A
git commit -m "test(settings): verify redesign across all screen sizes and themes"
```

---

## Task 9: Update Documentation (Optional)

**Files:**

- Create/Modify: `docs/components/settings-page.md` (if it exists)

**Goal:** Document the new settings page structure for future reference.

**Step 1: Create or update documentation**

If there's a components documentation folder, add a note about the redesign:

```markdown
# Settings Page

## Structure

- **Page Header**: Title and description
- **Display Settings**: Dark mode and language
- **Calendar Settings**: Academic calendar and experimental features
- **Timetable Settings**: Theme and preferences
- **AI Settings**: AI preferences panel
- **Privacy Settings**: Analytics toggle

## Design Patterns

- All cards use `border-b border-border` on CardHeader
- CardContent uses `pt-6` and `space-y-6`
- Settings items use `flex flex-col sm:flex-row` for responsive layout
- Experimental features highlighted with background and NTHU purple badge
- All colors use semantic tokens (no hardcoded colors)

## Spacing

- Page container: `gap-6` (24px between cards)
- Card content: `space-y-6` (24px between settings)
- Settings items: `gap-4` (16px between label and control)
```

**Step 2: Commit documentation**

```bash
git add docs/
git commit -m "docs(settings): document redesigned settings page structure"
```

---

## Summary

**Total Tasks:** 9
**Estimated Time:** 2-3 hours
**Files Modified:** 1 main file (`apps/web/src/app/[lang]/(mods-pages)/settings/page.tsx`)
**Commits:** 8-9 commits

**Key Changes:**

1. ✅ Added page header with title and description
2. ✅ Improved card structure with borders on headers
3. ✅ Removed Separator components, using space-y-6 instead
4. ✅ Fixed all hardcoded colors to use semantic tokens
5. ✅ Improved responsive layouts (mobile-first)
6. ✅ Highlighted experimental features with NTHU purple
7. ✅ Consistent spacing throughout (4px base unit)
8. ✅ Better mobile experience with stacking layouts

**Design System Compliance:**

- ✅ NTHU Purple brand color used for accents
- ✅ Semantic color tokens exclusively
- ✅ Consistent spacing (gap-2, gap-4, gap-6, gap-8)
- ✅ Typography hierarchy (text-3xl, text-xl, text-base, text-sm)
- ✅ Responsive breakpoints (sm: 640px)
- ✅ Dark mode support

**Next Steps:**
After completing this implementation:

1. Test thoroughly on different devices
2. Get user feedback
3. Consider implementing Team page redesign next
4. Consider implementing Venues page redesign after that
