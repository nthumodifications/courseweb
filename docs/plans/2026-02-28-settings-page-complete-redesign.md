# Settings Page Complete Redesign

**Date:** 2026-02-28
**Status:** Approved
**Goal:** Transform settings from wasteful single-column to professional two-column layout with compact sidebar navigation

---

## Problem Statement

Current settings page has excessive whitespace and unprofessional appearance:

- Max-width 672px wastes horizontal space
- Single column layout on all screen sizes
- Large gaps between cards (24px)
- Heavy padding throughout (24px)
- No quick navigation between sections

## Solution Overview

Two-column layout with compact sidebar navigation:

- 200px fixed sidebar with section links
- Full-width content area (no max-width restriction)
- All sections visible, sidebar enables smooth scrolling
- Sticky section headers + active section tracking
- Compact spacing (40% reduction in whitespace)
- Floating quick nav on mobile

---

## Architecture

### Layout Structure

**Desktop (≥768px):**

```
grid grid-cols-[200px_1fr] gap-8
├─ Sidebar (sticky, h-screen)
└─ Content (flex-1, overflow-y-auto)
```

**Mobile (<768px):**

```
Single column, full width
├─ Hidden sidebar
└─ Floating "Quick Nav" button (bottom-right)
```

### Technology Stack

- **Scroll tracking:** Intersection Observer API
- **Smooth scroll:** Native CSS `scroll-behavior: smooth`
- **Icons:** lucide-react (Monitor, Calendar, LayoutGrid, Sparkles, Shield, Menu)
- **State:** React useState for activeSection
- **Responsive:** Tailwind breakpoints (sm: 640px, md: 768px)

---

## Component Structure

### New Components

**1. SettingsSidebar.tsx**

```tsx
interface Section {
  id: string;
  label: string;
  icon: React.ReactNode;
}

<nav className="space-y-1">
  {sections.map((section) => (
    <a
      href={`#${section.id}`}
      className={activeSection === section.id ? "active" : "inactive"}
    >
      {section.icon}
      {section.label}
    </a>
  ))}
</nav>;
```

**2. SettingsSection.tsx**

```tsx
<div id={id} className="scroll-mt-20">
  <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-6 py-4">
    <h2 className="text-xl font-semibold">{title}</h2>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
  <div className="p-6">{children}</div>
</div>
```

**3. SettingItem.tsx**

```tsx
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
  <div className="flex-1 space-y-1">
    <h3 className="text-sm font-medium">{title}</h3>
    <p className="text-xs text-muted-foreground">{description}</p>
  </div>
  <div className="flex items-center">{control}</div>
</div>
```

### Modified Components

**page.tsx Structure:**

```tsx
<div className="grid md:grid-cols-[200px_1fr] gap-8 min-h-screen">
  {/* Sidebar */}
  <SettingsSidebar
    sections={sections}
    activeSection={activeSection}
    className="hidden md:block"
  />

  {/* Content */}
  <div className="overflow-y-auto">
    <SettingsSection id="display" title="Display">
      {/* Display settings */}
    </SettingsSection>

    <SettingsSection id="calendar" title="Calendar">
      {/* Calendar settings */}
    </SettingsSection>

    {/* ... more sections */}
  </div>

  {/* Mobile Quick Nav */}
  <MobileQuickNav sections={sections} />
</div>
```

---

## Spacing System (Compact)

| Element             | Current          | New              | Reduction |
| ------------------- | ---------------- | ---------------- | --------- |
| Container max-width | 672px            | none (flex-1)    | Unlimited |
| Section gaps        | 24px (gap-6)     | 32px (space-y-8) | +33%      |
| Card padding        | 24px (p-6)       | 16px (p-4)       | -33%      |
| Settings items      | 24px (space-y-6) | 16px (space-y-4) | -33%      |
| Title size          | text-base        | text-sm          | Smaller   |
| Description size    | text-sm          | text-xs          | Smaller   |

**Net result:** ~40% more content visible on screen

---

## Navigation & Scroll Behavior

### Intersection Observer

```tsx
useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    },
    {
      threshold: 0.5,
      rootMargin: "-100px 0px -50% 0px",
    },
  );

  sections.forEach((id) => {
    const element = document.getElementById(id);
    if (element) observer.observe(element);
  });

  return () => observer.disconnect();
}, []);
```

### Smooth Scroll

- CSS: `scroll-behavior: smooth` on content container
- Section offset: `scroll-margin-top: 80px` (accounts for sticky headers)
- Click sidebar link → smooth scroll to section
- Updates URL hash without reload

### Sticky Headers

Each section header:

- `position: sticky`
- `top: 0`
- `z-index: 10`
- `bg-background/95 backdrop-blur`
- `border-b border-border` (when stuck)

---

## Visual Design

### Sidebar Active State

```css
Active: bg-nthu-500 text-white
Inactive: text-muted-foreground hover:bg-accent
```

### Section Icons

- Display: `Monitor` (lucide-react)
- Calendar: `Calendar`
- Timetable: `LayoutGrid`
- AI: `Sparkles`
- Privacy: `Shield`

### Experimental Features

```tsx
<div className="p-3 rounded-lg bg-nthu-50/50 dark:bg-nthu-950/20 border border-nthu-200 dark:border-nthu-800">
  <Badge className="bg-nthu-500 text-white">Experimental</Badge>
  {/* Setting content */}
</div>
```

---

## Mobile Experience

### Floating Quick Nav Button

```tsx
<button
  className="fixed bottom-20 right-4 z-50 md:hidden bg-nthu-500 text-white p-3 rounded-full shadow-lg"
  onClick={() => setShowNav(true)}
>
  <Menu className="h-5 w-5" />
</button>
```

### Overlay Navigation

```tsx
{
  showNav && (
    <div
      className="fixed inset-0 bg-black/50 z-50 md:hidden"
      onClick={() => setShowNav(false)}
    >
      <div className="absolute right-0 top-0 bottom-0 w-64 bg-background p-4">
        <div className="space-y-1">
          {sections.map((section) => (
            <a
              href={`#${section.id}`}
              className="block px-4 py-2 rounded-md hover:bg-accent"
              onClick={() => setShowNav(false)}
            >
              {section.icon} {section.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## Design System Updates

### New Patterns

**Two-Column Settings Layout:**

- Left sidebar: 200px fixed width
- Right content: flex-1 with sticky section headers
- Compact spacing throughout
- Active section tracking with NTHU purple

**Sticky Section Headers:**

- Backdrop blur for modern effect
- Border appears when stuck to content
- Smooth transitions

**Compact Settings Items:**

- Smaller text sizes (text-sm titles, text-xs descriptions)
- Tighter spacing (gap-3 instead of gap-4)
- More responsive (flex-col sm:flex-row)

### Updated Documentation

Add to `docs/design-system.md`:

**Section: Layout Patterns**

```markdown
#### Two-Column Settings Layout

Use for settings/configuration pages:

- Sidebar: 200px, sticky navigation
- Content: flex-1, sticky section headers
- Spacing: compact (p-4, space-y-4)
- Active tracking: Intersection Observer

Example: `/settings` page
```

---

## Implementation Phases

### Phase 1: Layout Structure

1. Create two-column grid layout
2. Build SettingsSidebar component
3. Build SettingsSection component
4. Add scroll tracking with Intersection Observer

### Phase 2: Settings Migration

1. Migrate Display settings to new pattern
2. Migrate Calendar settings with experimental highlight
3. Migrate Timetable settings
4. Migrate AI settings
5. Migrate Privacy settings

### Phase 3: Mobile Experience

1. Add floating quick nav button
2. Build overlay navigation
3. Test responsive behavior

### Phase 4: Polish

1. Update design system documentation
2. Add smooth scroll animations
3. Test sticky header behavior
4. Verify NTHU purple branding

---

## Success Metrics

**Before:**

- Horizontal space used: ~45% on 1920px screens
- Settings items visible (1080px height): ~8 items
- Cards per screen: 1.5 cards

**After:**

- Horizontal space used: ~85% on 1920px screens
- Settings items visible (1080px height): ~12 items
- Sections per screen: All sections visible with scrolling

**Improvement:**

- +89% horizontal space efficiency
- +50% content density
- Professional appearance with sidebar navigation

---

## Technical Notes

### Browser Support

- Intersection Observer: All modern browsers
- CSS `scroll-behavior: smooth`: All modern browsers
- Backdrop blur: Fallback to solid background

### Performance

- Intersection Observer: Minimal overhead
- Sticky positioning: Hardware accelerated
- No scroll event listeners (uses Intersection Observer)

### Accessibility

- Keyboard navigation: Tab through sidebar links
- Screen readers: Proper heading hierarchy (h1 > h2 > h3)
- Focus management: Visible focus states on all interactive elements
- ARIA labels: Navigation landmarks properly labeled

---

## Files Modified

1. `apps/web/src/app/[lang]/(mods-pages)/settings/page.tsx` - Main layout
2. `apps/web/src/app/[lang]/(mods-pages)/settings/SettingsSidebar.tsx` - New
3. `apps/web/src/app/[lang]/(mods-pages)/settings/SettingsSection.tsx` - New
4. `apps/web/src/app/[lang]/(mods-pages)/settings/SettingItem.tsx` - New
5. `apps/web/src/app/[lang]/(mods-pages)/settings/MobileQuickNav.tsx` - New
6. `docs/design-system.md` - Add two-column settings pattern

---

## Next Steps

1. Create implementation plan with writing-plans skill
2. Execute plan task-by-task
3. Test on multiple screen sizes
4. Update design system documentation
5. Commit with descriptive message
