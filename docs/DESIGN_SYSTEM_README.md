# Design System Implementation Guide

## Overview

The NTHUMods Design System provides comprehensive UI/UX standards and a reusable component library for maintaining visual consistency across the application.

## Accessing the Design System

### Live Interactive Page

The design system is available as an interactive React page at:

```
https://your-app-url.com/{lang}/design-system
```

For local development:

```
http://localhost:5173/en/design-system
http://localhost:5173/zh/design-system
```

**Features:**

- Live component examples with working code
- Visual color palette demonstrations
- Interactive typography showcase
- Spacing and layout pattern examples
- Dark mode support
- Responsive design demonstrations

**File Location:**

```
apps/web/src/pages/DesignSystem.tsx
```

### Markdown Documentation

For offline reference and version control, a comprehensive markdown document is available at:

```
docs/design-system.md
```

**Use cases:**

- Quick reference during development
- Code review standards
- Onboarding new team members
- Design decision documentation
- Version-controlled source of truth

## Quick Start

### Using Components

All UI components are exported from the `@courseweb/ui` package:

```tsx
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@courseweb/ui";

function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Example Card</CardTitle>
      </CardHeader>
      <CardContent>
        <Button variant="default">Click Me</Button>
      </CardContent>
    </Card>
  );
}
```

### Using Colors

Always use semantic color tokens:

```tsx
// Good - theme-aware
<div className="bg-primary text-primary-foreground">

// Good - brand color
<div className="bg-nthu-500">

// Avoid - hard-coded colors
<div className="bg-purple-500">
```

### Responsive Design

Follow mobile-first approach:

```tsx
// Stack on mobile, row on desktop
<div className="flex flex-col md:flex-row gap-4">

// Hidden on mobile, visible on tablet+
<div className="hidden md:block">

// Responsive padding
<div className="px-4 md:px-8">
```

### Spacing

Use consistent spacing from the design system:

```tsx
// Component gaps: gap-2 or gap-4
<div className="flex gap-4">

// Section gaps: gap-6 md:gap-8
<div className="flex flex-col gap-6 md:gap-8">

// Card padding: p-6
<div className="p-6">
```

## Component Library

### Core Components

Located in `packages/ui/src/components/ui/`:

- `button.tsx` - Buttons with variants (default, secondary, outline, ghost, destructive, link)
- `card.tsx` - Card containers with header, content, and footer sections
- `badge.tsx` - Badges for labels and status indicators
- `input.tsx` - Text input fields
- `tabs.tsx` - Tabbed navigation
- `dialog.tsx` - Modal dialogs
- `select.tsx` - Dropdown selects
- `checkbox.tsx` - Checkboxes
- `switch.tsx` - Toggle switches
- `toast.tsx` - Toast notifications
- And many more...

### Styling System

The design system is built on:

- **Tailwind CSS** - Utility-first CSS framework
- **CSS Custom Properties** - Theme-aware color tokens
- **Radix UI** - Accessible component primitives
- **class-variance-authority (cva)** - Component variant management

## Design Tokens

### Colors

```javascript
// Brand Colors
nthu-50 through nthu-950

// Semantic Colors (CSS variables)
--primary
--secondary
--accent
--destructive
--muted
--border
--background
--foreground
```

### Typography

```javascript
// Font Families
var(--font-inter)     // Latin
var(--font-noto)      // Chinese

// Sizes
text-xs  (12px)
text-sm  (14px)
text-base (16px)
text-lg  (18px)
text-xl  (20px)
text-2xl (24px)
text-3xl (30px)
text-4xl (36px)

// Weights
font-normal (400)
font-medium (500)
font-semibold (600)
font-bold (700)
```

### Spacing

```javascript
// Base unit: 4px
0.5 → 2px
1   → 4px
2   → 8px
3   → 12px
4   → 16px
6   → 24px
8   → 32px
12  → 48px
16  → 64px
```

### Border Radius

```javascript
rounded-sm  → 4px
rounded-md  → 6px
rounded-lg  → 8px
rounded-full → 9999px
```

## Best Practices

### 1. Use Semantic Tokens

```tsx
// ✓ Good - adapts to theme
<div className="bg-primary text-primary-foreground">

// ✗ Avoid - breaks theming
<div className="bg-purple-500 text-white">
```

### 2. Leverage Variants

```tsx
// ✓ Good - uses built-in variants
<Button variant="outline" size="sm">

// ✗ Avoid - custom styling
<Button className="border h-9 px-3">
```

### 3. Mobile-First Responsive

```tsx
// ✓ Good - mobile first, then desktop
<div className="text-sm md:text-base">

// ✗ Avoid - desktop first approach
<div className="text-base sm:text-sm">
```

### 4. Consistent Spacing

```tsx
// ✓ Good - uses design system scale
<div className="gap-4">

// ✗ Avoid - arbitrary values
<div className="gap-[17px]">
```

### 5. Dark Mode Support

```tsx
// ✓ Good - theme-aware
<div className="bg-background text-foreground">

// ✓ Good - explicit dark mode variant
<div className="bg-white dark:bg-slate-900">

// ✗ Avoid - no dark mode consideration
<div className="bg-white text-black">
```

## Common Patterns

### Card Layout

```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>{/* Content */}</CardContent>
  <CardFooter>{/* Actions */}</CardFooter>
</Card>
```

### Button Groups

```tsx
<div className="flex gap-2">
  <Button variant="default">Primary</Button>
  <Button variant="outline">Secondary</Button>
</div>
```

### Form Layout

```tsx
<div className="space-y-4">
  <div className="space-y-2">
    <Label htmlFor="email">Email</Label>
    <Input id="email" type="email" placeholder="your@email.com" />
  </div>
  <div className="space-y-2">
    <Label htmlFor="password">Password</Label>
    <Input id="password" type="password" />
  </div>
  <Button className="w-full">Submit</Button>
</div>
```

### Responsive Grid

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {items.map((item) => (
    <Card key={item.id}>{/* Card content */}</Card>
  ))}
</div>
```

## Extending the Design System

### Adding New Components

1. Create component in `packages/ui/src/components/ui/`
2. Use existing patterns and tokens
3. Export from `packages/ui/src/index.ts`
4. Document in design system page and markdown
5. Test in both light and dark modes
6. Ensure responsive behavior
7. Add accessibility features

### Adding New Colors

1. Add to `packages/tailwind-config/base.js`
2. Use HSL format for theme compatibility
3. Provide both light and dark mode values
4. Update design system documentation
5. Test across all existing components

### Adding New Spacing

Only add spacing values if absolutely necessary. The existing scale covers most use cases. If adding:

1. Follow the 4px base unit
2. Add to Tailwind config
3. Document in design system
4. Update spacing section

## Accessibility Guidelines

All components must meet these standards:

1. **Keyboard Navigation**: Full keyboard support
2. **Focus States**: Visible focus indicators
3. **Color Contrast**: WCAG AA minimum (4.5:1)
4. **Semantic HTML**: Proper element usage
5. **ARIA Attributes**: When semantic HTML isn't enough
6. **Screen Readers**: Test with NVDA/JAWS/VoiceOver

## Development Workflow

### When Starting a New Feature

1. Review design system for existing components
2. Use semantic tokens for colors
3. Follow responsive patterns
4. Test in both light and dark modes
5. Verify accessibility

### When Reviewing Code

Check for:

- [ ] Uses semantic color tokens
- [ ] Follows spacing scale
- [ ] Mobile-first responsive design
- [ ] Dark mode support
- [ ] Accessibility features
- [ ] Consistent with existing patterns

## Testing

### Visual Testing

1. Light and dark modes
2. All breakpoints (mobile, tablet, desktop)
3. Different screen sizes
4. High contrast mode
5. Reduced motion preference

### Accessibility Testing

1. Keyboard navigation
2. Screen reader testing
3. Color contrast checker
4. Focus management
5. ARIA validation

### Browser Testing

Test in:

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Android)

## Resources

- **Live Design System**: `/{lang}/design-system`
- **Documentation**: `docs/design-system.md`
- **Components**: `packages/ui/src/components/ui/`
- **Tailwind Config**: `packages/tailwind-config/base.js`
- **Global Styles**: `apps/web/src/app/globals.css`

## Support

For questions or suggestions:

1. Check the design system page first
2. Review existing components
3. Open an issue on GitHub
4. Discuss in team channels

## Changelog

### 2026-02-28 - Initial Release (v1.0.0)

- Created interactive design system page
- Comprehensive markdown documentation
- Analyzed and documented existing patterns:
  - Calendar page components
  - Course page components
  - Bus page components
- Established color palette
- Documented typography system
- Defined spacing standards
- Component library documentation
- Responsive design patterns
- Animation standards
- Accessibility guidelines

---

**Maintained by**: NTHUMods Team
**Last Updated**: 2026-02-28
