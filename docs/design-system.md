# NTHUMods Design System Documentation

**Version:** 1.0.0
**Last Updated:** 2026-02-28
**Framework:** React + Vite + Tailwind CSS

---

## Table of Contents

1. [Color Palette](#color-palette)
2. [Typography](#typography)
3. [Spacing System](#spacing-system)
4. [Border Radius & Styling](#border-radius--styling)
5. [Shadow & Elevation](#shadow--elevation)
6. [Component Patterns](#component-patterns)
7. [Layout Patterns](#layout-patterns)
8. [Animations & Transitions](#animations--transitions)
9. [Iconography](#iconography)
10. [Responsive Breakpoints](#responsive-breakpoints)
11. [Best Practices](#best-practices)

---

## Color Palette

### Primary Brand Colors - NTHU Purple

The signature NTHU brand color palette, defined in `packages/tailwind-config/base.js`:

```javascript
nthu: {
  50: "#FAF7FD",   // Lightest
  100: "#F3ECFB",
  200: "#E9DDF7",
  300: "#D9C2F0",
  400: "#C19AE6",
  500: "#A973D9",  // Primary brand color
  600: "#9558C9",
  700: "#7E42AE",
  800: "#6A3A8F",
  900: "#573073",
  950: "#3A1853",  // Darkest
}
```

**Usage:**

- `nthu-500`: Primary actions, links, brand elements
- `nthu-400/600`: Hover states, badges
- `nthu-100/900`: Subtle backgrounds (light/dark mode)

### Semantic Colors (CSS Custom Properties)

All semantic colors use HSL values and support automatic dark mode switching:

#### Light Mode

```css
--primary: hsl(272.1 71.7% 47.1%) /* Purple - main actions */ --secondary:
  hsl(240 4.8% 95.9%) /* Light gray */ --accent: hsl(240 4.8% 95.9%)
  /* Highlight background */ --destructive: hsl(0 72.22% 50.59%)
  /* Red - errors/delete */ --muted: hsl(240 4.8% 95.9%)
  /* Subtle backgrounds */ --border: hsl(240 5.9% 90%) /* Component borders */
  --input: hsl(240 5.9% 90%) /* Input borders */ --background: hsl(0 0% 100%)
  /* Page background */ --foreground: hsl(240 10% 3.9%) /* Text color */;
```

#### Dark Mode

```css
--primary: hsl(0 0% 98%) /* White - inverted */ --secondary: hsl(240 3.7% 15.9%)
  /* Dark gray */ --accent: hsl(240 3.7% 15.9%) /* Dark highlight */
  --destructive: hsl(0 62.8% 30.6%) /* Darker red */ --muted:
  hsl(240 3.7% 15.9%) /* Dark subtle bg */ --border: hsl(240 3.7% 15.9%)
  /* Dark borders */ --background: hsl(0 0% 9%) /* Dark background */
  --foreground: hsl(0 0% 98%) /* Light text */;
```

### Special Purpose Colors

#### Bus Line Colors

```javascript
Red Line:    #EF4444  // Tailwind red-500
Green Line:  #10B981  // Tailwind green-500
Blue Line:   #3B82F6  // Tailwind blue-500
```

#### Course/Timetable Colors

Dynamically generated using the `colorMap` from user timetable context.

---

## Typography

### Font Families

**Primary Stack:**

```css
font-family: var(--font-inter), var(--font-noto), sans-serif;
```

- **Inter Variable**: Latin characters, numbers
- **Noto Sans TC**: Traditional Chinese characters (unicode range U+4E00-9FFF)
- **Fallback**: System sans-serif

### Type Scale

| Element    | Tailwind Class | Font Size       | Weight          | Usage              |
| ---------- | -------------- | --------------- | --------------- | ------------------ |
| H1         | `text-4xl`     | 36px / 2.25rem  | `font-bold`     | Page titles        |
| H2         | `text-3xl`     | 30px / 1.875rem | `font-bold`     | Section headers    |
| H3         | `text-2xl`     | 24px / 1.5rem   | `font-semibold` | Card titles        |
| H4         | `text-xl`      | 20px / 1.25rem  | `font-semibold` | Subsection headers |
| Body Large | `text-lg`      | 18px / 1.125rem | `font-normal`   | Emphasized text    |
| Body       | `text-base`    | 16px / 1rem     | `font-normal`   | Primary content    |
| Body Small | `text-sm`      | 14px / 0.875rem | `font-normal`   | Secondary info     |
| Caption    | `text-xs`      | 12px / 0.75rem  | `font-medium`   | Labels, metadata   |

### Font Weights

```javascript
font-normal:    400
font-medium:    500
font-semibold:  600
font-bold:      700
```

### Line Heights

Tailwind defaults are used:

- Headings: `leading-tight` (1.25)
- Body: `leading-normal` (1.5)
- Tight contexts: `leading-none` (1)

---

## Spacing System

### Base Unit: 4px

All spacing follows Tailwind's default 4px base unit system:

| Token | Value | Tailwind Class     | Common Usage               |
| ----- | ----- | ------------------ | -------------------------- |
| 0.5   | 2px   | `gap-0.5`, `p-0.5` | Tight spacing              |
| 1     | 4px   | `gap-1`, `p-1`     | Minimal gap                |
| 2     | 8px   | `gap-2`, `p-2`     | Component gaps             |
| 3     | 12px  | `gap-3`, `p-3`     | Medium spacing             |
| 4     | 16px  | `gap-4`, `p-4`     | Default spacing            |
| 6     | 24px  | `gap-6`, `p-6`     | Section gaps, card padding |
| 8     | 32px  | `gap-8`, `p-8`     | Large gaps                 |
| 12    | 48px  | `gap-12`, `p-12`   | Extra large gaps           |
| 16    | 64px  | `gap-16`, `p-16`   | Hero sections              |

### Common Spacing Patterns

```css
/* Section gaps */
gap-6 md:gap-8

/* Card padding */
p-6

/* Component internal gaps */
gap-2 md:gap-4

/* Page level padding */
px-4 py-8

/* Button padding */
px-4 py-2

/* Input padding */
px-3 py-2
```

---

## Border Radius & Styling

### Border Radius Values

Defined via CSS custom property `--radius: 0.5rem` (8px):

```javascript
borderRadius: {
  lg: "var(--radius)",           // 8px  - cards, large components
  md: "calc(var(--radius) - 2px)", // 6px  - buttons, inputs
  sm: "calc(var(--radius) - 4px)", // 4px  - small elements
  full: "9999px",                   // full circle - badges, avatars
}
```

### Component Border Standards

| Component   | Border Radius      | Border Width   | Border Color      |
| ----------- | ------------------ | -------------- | ----------------- |
| Card        | `rounded-lg` (8px) | `border` (1px) | `border`          |
| Button      | `rounded-md` (6px) | none           | n/a               |
| Input       | `rounded-md` (6px) | `border` (1px) | `border-input`    |
| Badge       | `rounded-full`     | `border` (1px) | variant dependent |
| Tabs List   | `rounded-md` (6px) | none           | n/a               |
| Tab Trigger | `rounded-sm` (4px) | none           | n/a               |

---

## Shadow & Elevation

### Shadow Scale

```css
shadow-sm:  0 1px 2px 0 rgb(0 0 0 / 0.05)        /* Subtle elevation */
shadow:     0 1px 3px 0 rgb(0 0 0 / 0.1),         /* Default cards */
            0 1px 2px -1px rgb(0 0 0 / 0.1)
shadow-md:  0 4px 6px -1px rgb(0 0 0 / 0.1),      /* Raised elements */
            0 2px 4px -2px rgb(0 0 0 / 0.1)
shadow-lg:  0 10px 15px -3px rgb(0 0 0 / 0.1),    /* Modals, overlays */
            0 4px 6px -4px rgb(0 0 0 / 0.1)
```

### Usage Guidelines

- **Cards**: `shadow-sm` - subtle elevation
- **Active tabs**: `shadow-sm` - visual separation
- **Floating buttons**: `shadow-lg` - clear elevation
- **Dialogs/Modals**: `shadow-lg` - maximum prominence

---

## Component Patterns

### Buttons

**File:** `packages/ui/src/components/ui/button.tsx`

#### Variants

```tsx
<Button variant="default">     {/* Primary action - purple */}
<Button variant="secondary">   {/* Secondary action - gray */}
<Button variant="outline">     {/* Outlined - border only */}
<Button variant="ghost">       {/* Transparent - hover only */}
<Button variant="destructive"> {/* Danger - red */}
<Button variant="link">        {/* Link style - underline */}
```

#### Sizes

```tsx
<Button size="sm">      {/* h-9 (36px), px-3 */}
<Button size="default"> {/* h-10 (40px), px-4 */}
<Button size="lg">      {/* h-11 (44px), px-8 */}
<Button size="icon">    {/* h-10 w-10 (square) */}
```

#### Base Styles

```css
Base: rounded-md text-sm font-medium gap-2
Focus: ring-2 ring-ring ring-offset-2
Disabled: opacity-50 pointer-events-none
Icon: [&_svg]:size-4 [&_svg]:shrink-0
```

### Cards

**File:** `packages/ui/src/components/ui/card.tsx`

```tsx
<Card>
  {" "}
  {/* rounded-lg border shadow-sm */}
  <CardHeader>
    {" "}
    {/* p-6, space-y-1.5 */}
    <CardTitle>Title</CardTitle> {/* text-2xl font-semibold */}
    <CardDescription>Desc</CardDescription>{" "}
    {/* text-sm text-muted-foreground */}
  </CardHeader>
  <CardContent>
    {" "}
    {/* p-6 pt-0 */}
    Content
  </CardContent>
  <CardFooter>
    {" "}
    {/* p-6 pt-0, flex items-center */}
    Footer
  </CardFooter>
</Card>
```

### Badges

**File:** `packages/ui/src/components/ui/badge.tsx`

```tsx
<Badge variant="default">     {/* bg-primary text-primary-foreground */}
<Badge variant="secondary">   {/* bg-secondary text-secondary-foreground */}
<Badge variant="destructive"> {/* bg-destructive */}
<Badge variant="outline">     {/* border, no background */}
```

**Base:** `rounded-full px-2.5 py-0.5 text-xs font-semibold`

### Inputs

**File:** `packages/ui/src/components/ui/input.tsx`

```tsx
<Input placeholder="Search..." />
<Input type="email" />
<Input disabled />
```

**Base:**

```css
h-10 rounded-md border border-input
px-3 py-2 text-base md:text-sm
focus-visible:ring-2 focus-visible:ring-ring
```

### Tabs

**File:** `packages/ui/src/components/ui/tabs.tsx`

```tsx
<Tabs defaultValue="tab1">
  <TabsList>
    {" "}
    {/* h-10 bg-muted rounded-md p-1 */}
    <TabsTrigger value="tab1">
      {" "}
      {/* Active: bg-background shadow-sm */}
      Tab 1
    </TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">
    {" "}
    {/* mt-2 */}
    Content
  </TabsContent>
</Tabs>
```

---

## Layout Patterns

### CSS Custom Properties

```css
--header-height: 3.5rem; /* 56px - top navigation */
--bottom-nav-height: 5rem; /* 80px - mobile bottom nav */
--content-height: calc(
  calc(100dvh - env(safe-area-inset-top)) - var(--header-height) -
    var(--bottom-nav-height)
); /* Available content area */
```

### Grid Patterns

```tsx
{
  /* Responsive grid - mobile to desktop */
}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* Items */}
</div>;

{
  /* Auto-fit grid */
}
<div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
  {/* Items */}
</div>;
```

### Flex Patterns

```tsx
{/* Space between - common header pattern */}
<div className="flex flex-row justify-between items-center">

{/* Center aligned with gap */}
<div className="flex flex-row items-center gap-4">

{/* Vertical stack */}
<div className="flex flex-col gap-2">

{/* Responsive - stack on mobile, row on desktop */}
<div className="flex flex-col md:flex-row gap-4">
```

### Container Patterns

```tsx
{/* Max width container */}
<div className="max-w-7xl mx-auto px-4">

{/* Tailwind container (responsive max-width) */}
<div className="container mx-auto">

{/* Full width */}
<div className="w-full">
```

### Resizable Panels

Used in course search page:

```tsx
<ResizablePanelGroup direction="horizontal">
  <ResizablePanel>{/* Main content */}</ResizablePanel>

  <ResizableHandle className="hidden md:block px-[2px] rounded-full bg-muted" />

  <ResizablePanel collapsible minSize={30} defaultSize={30}>
    {/* Side panel */}
  </ResizablePanel>
</ResizablePanelGroup>
```

### Two-Column Settings Layout

**Used for:** Settings and configuration pages requiring section navigation

**Structure:**

```tsx
<div className="grid md:grid-cols-[200px_1fr] gap-8 min-h-screen">
  {/* Sidebar - Desktop only */}
  <aside className="hidden md:block sticky top-0 h-screen pt-8 px-4">
    <SettingsSidebar
      sections={sections}
      activeSection={activeSection}
      onSectionClick={scrollToSection}
    />
  </aside>

  {/* Main Content */}
  <main className="overflow-y-auto pb-16">
    <SettingsSection
      id="section1"
      title="Section Title"
      description="Description"
    >
      {/* Settings content */}
    </SettingsSection>
  </main>

  {/* Mobile Quick Nav */}
  <MobileQuickNav sections={sections} />
</div>
```

**Features:**

- **Sidebar:** 200px fixed width, sticky positioning, active section tracking
- **Content:** Full width (flex-1), sticky section headers with backdrop blur
- **Navigation:** Intersection Observer API for scroll tracking, smooth scroll behavior
- **Spacing:** Compact (p-4, space-y-4 instead of p-6, space-y-6)
- **Mobile:** Floating quick nav button with overlay drawer
- **Branding:** NTHU purple (#A973D9) for active states

**Components:**

- `SettingsSidebar`: Vertical navigation with icons and active tracking
- `SettingsSection`: Section wrapper with sticky header
- `SettingItem`: Individual setting row (title + description + control)
- `MobileQuickNav`: Floating button with slide-in drawer for mobile
- `useScrollTracking`: Custom hook for Intersection Observer

**Example:** `/settings` page

---

## Animations & Transitions

### Transition Standards

```css
transition-colors    /* Default - color changes, hover states */
transition-all       /* Multiple property changes */
transition-transform /* Scale, rotate, translate */
```

**Duration:** Tailwind defaults (150ms for most, 200ms for all)

### Keyframe Animations

Defined in `packages/tailwind-config/base.js`:

```javascript
keyframes: {
  "accordion-down": {
    from: { height: "0" },
    to: { height: "var(--radix-accordion-content-height)" },
  },
  "accordion-up": {
    from: { height: "var(--radix-accordion-content-height)" },
    to: { height: "0" },
  },
},
animation: {
  "accordion-down": "accordion-down 0.2s ease-out",
  "accordion-up": "accordion-up 0.2s ease-out",
}
```

### Common Animation Patterns

```tsx
{/* Loading spinner */}
<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nthu-500" />

{/* Hover scale */}
<button className="hover:scale-105 transition-transform">

{/* Fade transition */}
<div className="transition-opacity duration-300 hover:opacity-80">
```

### Hover Behavior

Custom hover variant to prevent hover states on touch devices:

```javascript
// In tailwind.config
addVariant(
  "hover",
  "@media (any-hover: hover) and (any-pointer: fine) { &:hover }",
);
```

This ensures hover effects only apply on devices with precise pointers (mouse), not touch screens.

---

## Iconography

### Primary Icon Library

**lucide-react** - Consistent stroke-based icons

```tsx
import { ChevronRight, Plus, Calendar, Settings } from "lucide-react";

{
  /* Default size */
}
<Calendar className="h-4 w-4" />;

{
  /* Larger icons */
}
<Calendar className="h-6 w-6" />;
```

### Icon Standards

- **Default size:** `h-4 w-4` (16px)
- **Button icons:** Automatically sized via `[&_svg]:size-4`
- **Stroke width:** 2px (lucide default)
- **Color:** Inherits from parent text color

### Custom SVG Icons

Bus line icons (located in `apps/web/src/components/BusIcons/`):

```tsx
import { RedLineIcon } from "@/components/BusIcons/RedLineIcon";

<RedLineIcon className="h-7 w-7" />;
```

**Format:** 30x30px viewBox, circular background, letter label

---

## Responsive Breakpoints

### Tailwind Breakpoints (Mobile-First)

```javascript
sm:   640px   // Small tablets
md:   768px   // Tablets
lg:   1024px  // Laptops
xl:   1280px  // Desktops
2xl:  1536px  // Large screens
```

### Container Max Widths

```javascript
container: {
  center: true,
  padding: "2rem",
  screens: {
    "2xl": "1400px",
  },
}
```

### Common Responsive Patterns

```tsx
{/* Hidden on mobile, visible on desktop */}
<div className="hidden md:block">

{/* Visible on mobile, hidden on desktop */}
<div className="md:hidden">

{/* Stack on mobile, row on desktop */}
<div className="flex flex-col md:flex-row">

{/* Smaller padding on mobile */}
<div className="px-4 md:px-8">

{/* Responsive grid */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">

{/* Responsive text */}
<h1 className="text-2xl md:text-4xl">
```

### Viewport Units

```css
100vh    /* Full viewport height (desktop) */
100dvh   /* Dynamic viewport height (mobile-safe, accounts for browser chrome) */
100vw    /* Full viewport width */
```

### Safe Area Insets

For iOS devices with notches/home indicators:

```css
padding: env(safe-area-inset-top) env(safe-area-inset-right)
  env(safe-area-inset-bottom) env(safe-area-inset-left);
```

### Container Queries

Using `@tailwindcss/container-queries`:

```tsx
{/* Parent container */}
<div className="@container">
  {/* Child responds to container size, not viewport */}
  <div className="@md:pt-0">
</div>
```

---

## Best Practices

### Accessibility

1. **Focus States**: All interactive elements use `focus-visible:ring-2 focus-visible:ring-ring`
2. **Color Contrast**: All text meets WCAG AA standards (4.5:1 for normal text)
3. **Semantic HTML**: Use proper heading hierarchy, buttons vs links, etc.
4. **ARIA Attributes**: Radix UI components include proper ARIA
5. **Keyboard Navigation**: All components are keyboard accessible
6. **Dark Mode**: Full support using CSS custom properties

### Performance

1. **Use Semantic Tokens**: Prefer `bg-primary` over `bg-purple-500`
2. **Minimize Custom CSS**: Leverage Tailwind utilities
3. **Lazy Loading**: Use React.lazy() for heavy components
4. **CSS Variables**: Enable instant theme switching
5. **Optimize Assets**: Compress images, use WebP, optimize SVGs

### Component Development

1. **Import Pattern**: Always import from `@courseweb/ui`

   ```tsx
   import { Button, Card } from "@courseweb/ui";
   ```

2. **Extend with className**: Use className prop for customization

   ```tsx
   <Button className="w-full">Custom Width</Button>
   ```

3. **Variants over Custom Styles**: Use built-in variants when possible

   ```tsx
   <Button variant="outline" size="sm">  {/* Good */}
   <Button className="h-9 border">      {/* Avoid */}
   ```

4. **Composition**: Build complex components from primitives
   ```tsx
   <Card>
     <CardHeader>...</CardHeader>
     <CardContent>...</CardContent>
   </Card>
   ```

### Code Organization

1. **Shared Components**: `packages/ui/src/components/ui/`
2. **App Components**: `apps/web/src/components/`
3. **Page Components**: `apps/web/src/app/[lang]/(mods-pages)/`
4. **Utilities**: `packages/ui/src/lib/utils.ts`

### Naming Conventions

1. **Components**: PascalCase (e.g., `CourseListItem`)
2. **Files**: kebab-case for utilities, PascalCase for components
3. **CSS Classes**: Use Tailwind utilities, avoid custom classes
4. **Props**: camelCase

### Testing

1. **Visual Testing**: Use Storybook or design system page
2. **Responsive Testing**: Test all breakpoints
3. **Dark Mode**: Test both themes
4. **Accessibility**: Use axe DevTools
5. **Cross-browser**: Chrome, Firefox, Safari, Edge

---

## Design Tokens Reference

### Quick Reference Sheet

```css
/* Colors */
--primary: nthu-500 (#a973d9) --text: slate-800 dark: neutral-100 --muted-text:
    text-muted-foreground /* Spacing */ --gap-sm: gap-2 (8px) --gap-md: gap-4
    (16px) --gap-lg: gap-6 md: gap-8 (24-32px) /* Radius */ --radius-sm:
    rounded-sm (4px) --radius-md: rounded-md (6px) --radius-lg: rounded-lg (8px)
    --radius-full: rounded-full /* Typography */ --font-family: Inter,
  Noto Sans TC --heading: font-bold --body: font-normal text-base --caption:
    font-medium text-xs /* Shadows */ --shadow-card: shadow-sm --shadow-elevated:
    shadow-lg;
```

---

## Changelog

### Version 1.0.0 (2026-02-28)

- Initial design system documentation
- Comprehensive analysis of calendar, course, and bus pages
- Standardized color palette and typography
- Component library documentation
- Responsive design patterns
- Accessibility guidelines

---

## Resources

- **Tailwind CSS**: https://tailwindcss.com/docs
- **Radix UI**: https://www.radix-ui.com/primitives
- **Lucide Icons**: https://lucide.dev/icons/
- **shadcn/ui**: https://ui.shadcn.com/ (component inspiration)

---

## Contributing

When adding new components or patterns:

1. Follow existing conventions
2. Use semantic color tokens
3. Ensure responsive design
4. Add dark mode support
5. Document in this file
6. Update the visual design system page

---

**Maintained by:** NTHUMods Team
**Questions?** Open an issue on GitHub
