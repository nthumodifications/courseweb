# UI Redesign Plan: Settings, Team (Sponsors), and Venues Pages

## Executive Summary

This plan outlines the comprehensive redesign of three key pages in the NTHUMods application to align with the newly established design system. The redesign will focus on:

1. **Settings Page** - Enhanced visual hierarchy, better organization, and improved mobile experience
2. **Team Page** (Acting as Sponsors/Contributors) - More engaging layouts with better visual appeal
3. **Venues Page** - Modern card-based interface with improved information architecture

All redesigns will strictly adhere to the design system documented in `/docs/design-system.md` and `/apps/web/src/pages/DesignSystem.tsx`.

---

## Design System Foundation

### Key Design Principles

- **NTHU Purple Brand Identity** (`--primary: 273 43% 54%`)
- **Consistent Spacing** (4px base unit, 9-level scale)
- **Semantic Color Tokens** (primary, secondary, muted, accent, destructive)
- **Typography System** (Inter + Noto Sans TC)
- **Component Patterns** (Cards with p-6, sections with gap-6 md:gap-8)
- **Responsive Breakpoints** (sm: 640px, md: 768px, lg: 1024px, xl: 1280px, 2xl: 1536px)
- **Dark Mode Support** (All designs must work in both themes)

### Color Palette (NTHU Purple)

```
nthu-50:  #FAF7FD  (lightest)
nthu-100: #F3ECFB
nthu-200: #E9DDF7
nthu-300: #D9C2F0
nthu-400: #C19AE6
nthu-500: #A973D9  (primary brand color)
nthu-600: #9558C9
nthu-700: #7E42AE
nthu-800: #6A3A8F
nthu-900: #573073
nthu-950: #3A1853  (darkest)
```

---

## Page 1: Settings Page Redesign

### Current Issues

1. **Visual Hierarchy** - All cards look equally important, hard to scan
2. **Spacing** - Inconsistent padding and gaps between elements
3. **Mobile Experience** - Cards stack awkwardly, separators create visual clutter
4. **Dark Mode** - Uses hardcoded `text-gray-600 dark:text-gray-400` instead of semantic tokens
5. **Layout** - Plain vertical stack lacks visual interest

### Design Goals

1. Create clear visual hierarchy with section grouping
2. Improve scannability with better typography and spacing
3. Enhance mobile experience with responsive layouts
4. Use semantic color tokens exclusively
5. Add visual polish with subtle accents and borders

### Redesign Specifications

#### Overall Layout

```
┌────────────────────────────────────────┐
│  Settings Header                       │
│  ├─ Title: "Settings" (text-3xl)      │
│  └─ Description (text-muted-foreground)│
├────────────────────────────────────────┤
│  Display Settings Card                 │
│  ├─ Dark Mode Toggle                   │
│  └─ Language Selector                  │
├────────────────────────────────────────┤
│  Calendar Settings Card                │
│  ├─ Academic Calendar Toggle           │
│  └─ Experimental Calendar Toggle       │
├────────────────────────────────────────┤
│  Timetable Settings Card               │
│  ├─ Theme Preview                      │
│  ├─ Theme Selection                    │
│  └─ Preferences                        │
├────────────────────────────────────────┤
│  AI Settings Card                      │
│  └─ AI Preferences Panel               │
├────────────────────────────────────────┤
│  Privacy Settings Card                 │
│  └─ Analytics Toggle                   │
├────────────────────────────────────────┤
│  Footer                                │
└────────────────────────────────────────┘
```

#### Header Section (NEW)

```tsx
<div className="flex flex-col gap-2 mb-6">
  <h1 className="text-3xl font-bold">Settings</h1>
  <p className="text-muted-foreground">
    Manage your account settings and preferences
  </p>
</div>
```

#### Card Improvements

1. **Remove internal Separators** - Use spacing instead (`space-y-6` within CardContent)
2. **Consistent Card Structure**:
   ```tsx
   <Card>
     <CardHeader className="border-b border-border pb-4">
       <CardTitle>{title}</CardTitle>
       <CardDescription>{description}</CardDescription>
     </CardHeader>
     <CardContent className="pt-6 space-y-6">
       {/* Settings items with space-y-6 */}
     </CardContent>
   </Card>
   ```
3. **Settings Item Pattern**:
   ```tsx
   <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
     <div className="flex-1 space-y-1">
       <h3 className="font-medium text-base">{title}</h3>
       <p className="text-sm text-muted-foreground">{description}</p>
     </div>
     <div className="flex items-center">{/* Switch or Select control */}</div>
   </div>
   ```

#### Specific Changes

**Display Settings Card**

- Add border-b to CardHeader
- Replace Separator with space-y-6
- Improve responsive layout: flex-col sm:flex-row
- Use semantic tokens for all text colors

**Calendar Settings Card**

- Add visual indicator for experimental features (Badge with NTHU purple accent)
- Group related toggles with subtle background: `bg-muted/30 p-4 rounded-lg`

**Timetable Settings Card**

- Add subtle border around preview: `border-2 border-border rounded-lg`
- Highlight selected theme with NTHU purple ring: `ring-2 ring-nthu-500`

**Privacy Settings Card**

- Replace hardcoded gray colors with `text-muted-foreground`
- Add info icon with tooltip explaining analytics

#### Mobile Optimization

- Settings toggles stack vertically on mobile: `flex-col sm:flex-row`
- Language selector full width on mobile: `w-full sm:w-[180px]`
- Reduce padding on mobile: `px-4 md:px-6`

#### Accessibility

- All toggles have proper labels
- Focus states use NTHU purple ring
- Color contrast meets WCAG AA standards
- Keyboard navigation supported

---

## Page 2: Team Page Redesign (Sponsors/Contributors)

### Current Issues

1. **Layout** - Basic grid lacks visual hierarchy
2. **Member Cards** - Plain design doesn't highlight contributions
3. **Photo Badges** - Position badges overlap awkwardly
4. **Spacing** - Inconsistent gaps between elements
5. **No Sponsors Section** - Missing dedicated area for sponsors/partners

### Design Goals

1. Create engaging member showcase with modern card design
2. Add dedicated sponsors section with logo grid
3. Improve visual hierarchy with typography and spacing
4. Add hover effects and animations
5. Make it shareable and visually impressive

### Redesign Specifications

#### Overall Layout

```
┌────────────────────────────────────────┐
│  Hero Section                          │
│  ├─ Title: "Our Team" (text-4xl)      │
│  ├─ Subtitle with NTHU purple accent   │
│  └─ Call-to-action                     │
├────────────────────────────────────────┤
│  Core Team Section                     │
│  └─ Grid of enhanced member cards      │
├────────────────────────────────────────┤
│  Dedicated Members Section             │
│  └─ Grid of smaller cards              │
├────────────────────────────────────────┤
│  Sponsors & Partners Section (NEW)    │
│  └─ Logo grid with hover effects       │
├────────────────────────────────────────┤
│  Join Us CTA                           │
│  └─ Contact information                │
├────────────────────────────────────────┤
│  Footer                                │
└────────────────────────────────────────┘
```

#### Hero Section (NEW)

```tsx
<div className="relative overflow-hidden bg-gradient-to-br from-nthu-50 to-background dark:from-nthu-950/20 dark:to-background border-b border-border">
  <div className="max-w-4xl mx-auto px-6 py-16 text-center space-y-4">
    <Badge variant="outline" className="mb-2">
      Student-run project
    </Badge>
    <h1 className="text-4xl md:text-5xl font-bold">
      Meet the <span className="text-nthu-600 dark:text-nthu-400">Team</span>
    </h1>
    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
      We're a group of passionate students dedicated to improving the academic
      experience at NTHU
    </p>
  </div>
</div>
```

#### Enhanced Member Cards

```tsx
<Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
  <CardContent className="p-6">
    <div className="flex flex-col items-center text-center space-y-4">
      {/* Avatar with badge */}
      <div className="relative">
        <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-background group-hover:ring-nthu-500/20 transition-all">
          <img src={photo} alt={name} className="w-full h-full object-cover" />
        </div>
        <Badge
          variant="secondary"
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-nthu-500 text-white"
        >
          {role}
        </Badge>
      </div>

      {/* Name */}
      <div className="space-y-1">
        <h3 className="font-bold text-xl">{name_zh}</h3>
        <p className="text-sm text-muted-foreground">{name_en}</p>
      </div>

      {/* Social links */}
      <div className="flex gap-2">
        {/* Icon buttons with NTHU purple hover */}
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-nthu-50 hover:text-nthu-600"
        >
          <Link2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-nthu-50 hover:text-nthu-600"
        >
          <Github className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-nthu-50 hover:text-nthu-600"
        >
          <LinkedinIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  </CardContent>
</Card>
```

#### Sponsors Section (NEW)

```tsx
<section className="py-16 bg-muted/30">
  <div className="max-w-6xl mx-auto px-6">
    <div className="text-center space-y-2 mb-12">
      <h2 className="text-3xl font-bold">Our Sponsors & Partners</h2>
      <p className="text-muted-foreground">
        Thank you to our amazing sponsors who make this possible
      </p>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
      {sponsors.map((sponsor) => (
        <Card className="group hover:shadow-md transition-all cursor-pointer">
          <CardContent className="p-8 flex items-center justify-center">
            <img
              src={sponsor.logo}
              alt={sponsor.name}
              className="max-h-16 grayscale group-hover:grayscale-0 transition-all"
            />
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
</section>
```

#### Join Us CTA

```tsx
<Card className="bg-gradient-to-r from-nthu-500 to-nthu-600 text-white border-none">
  <CardContent className="p-8 md:p-12 text-center space-y-4">
    <h2 className="text-3xl font-bold">Want to join us?</h2>
    <p className="text-nthu-50 max-w-2xl mx-auto">
      We're always looking for passionate students to join our team. Feel free
      to reach out!
    </p>
    <div className="flex flex-col sm:flex-row gap-4 justify-center">
      <Button variant="secondary" size="lg" asChild>
        <a href="mailto:nthumods@gmail.com">Contact Us</a>
      </Button>
      <Button
        variant="outline"
        size="lg"
        className="border-white text-white hover:bg-white/10"
        asChild
      >
        <a href="https://github.com/nthumodifications/courseweb">
          View on GitHub
        </a>
      </Button>
    </div>
  </CardContent>
</Card>
```

#### Grid Layouts

- Core Team: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`
- Dedicated Members: `grid grid-cols-1 md:grid-cols-2 gap-4`
- Sponsors: `grid grid-cols-2 md:grid-cols-4 gap-8`

---

## Page 3: Venues Page Redesign

### Current Issues

1. **Plain List** - VenueList is just text links, no visual hierarchy
2. **Loading States** - Generic "Loading..." text
3. **Empty State** - Uninspiring placeholder
4. **Venue Detail** - Basic timetable view lacks context
5. **Mobile Navigation** - Simple back button, no breadcrumbs

### Design Goals

1. Create engaging venue cards with building icons
2. Add search and filter functionality
3. Improve loading and empty states
4. Enhance venue detail view with stats and info
5. Better mobile navigation with breadcrumbs

### Redesign Specifications

#### Overall Layout (Two-Panel)

```
Desktop:
┌──────────────────┬─────────────────────────┐
│  Sidebar         │  Detail View            │
│  ├─ Search       │  ├─ Breadcrumb          │
│  ├─ Filters      │  ├─ Venue Header        │
│  └─ Venue Cards  │  ├─ Stats Cards         │
│                  │  └─ Timetable           │
└──────────────────┴─────────────────────────┘

Mobile:
┌────────────────────────────────────────┐
│  Venue List View (when no selection)  │
│  ├─ Search                             │
│  ├─ Filters                            │
│  └─ Venue Cards                        │
└────────────────────────────────────────┘
OR
┌────────────────────────────────────────┐
│  Venue Detail View (when selected)    │
│  ├─ Back Button                        │
│  ├─ Venue Header                       │
│  ├─ Stats                              │
│  └─ Timetable                          │
└────────────────────────────────────────┘
```

#### Sidebar Enhancements

**Search Bar (NEW)**

```tsx
<div className="p-4 border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-10">
  <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
      placeholder="Search venues..."
      className="pl-9"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
    />
  </div>
</div>
```

**Venue Card (Enhanced)**

```tsx
<Card
  className={cn(
    "group cursor-pointer transition-all hover:shadow-md",
    isSelected && "ring-2 ring-nthu-500 shadow-md",
  )}
>
  <CardContent className="p-4">
    <div className="flex items-center gap-3">
      {/* Building icon with NTHU purple accent */}
      <div className="p-2 rounded-lg bg-nthu-50 dark:bg-nthu-950/30 text-nthu-600 dark:text-nthu-400">
        <Building2 className="h-5 w-5" />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-medium truncate group-hover:text-nthu-600 dark:group-hover:text-nthu-400 transition-colors">
          {venueName}
        </h3>
        <p className="text-sm text-muted-foreground">{courseCount} courses</p>
      </div>

      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-nthu-500 transition-colors" />
    </div>
  </CardContent>
</Card>
```

**Filter Section (NEW)**

```tsx
<div className="p-4 space-y-3">
  <h3 className="font-medium text-sm text-muted-foreground">Building Type</h3>
  <div className="space-y-2">
    <label className="flex items-center gap-2 cursor-pointer">
      <Checkbox checked={filters.includes("academic")} />
      <span className="text-sm">Academic Buildings</span>
    </label>
    <label className="flex items-center gap-2 cursor-pointer">
      <Checkbox checked={filters.includes("labs")} />
      <span className="text-sm">Labs & Research</span>
    </label>
    <label className="flex items-center gap-2 cursor-pointer">
      <Checkbox checked={filters.includes("sports")} />
      <span className="text-sm">Sports Facilities</span>
    </label>
  </div>
</div>
```

#### Venue Detail View Enhancements

**Breadcrumb Navigation (NEW)**

```tsx
<div className="px-6 py-4 border-b border-border bg-muted/30">
  <nav className="flex items-center gap-2 text-sm">
    <Link
      to={`/${lang}/venues`}
      className="text-muted-foreground hover:text-foreground transition-colors"
    >
      Venues
    </Link>
    <ChevronRight className="h-4 w-4 text-muted-foreground" />
    <span className="font-medium">{venueId}</span>
  </nav>
</div>
```

**Venue Header (Enhanced)**

```tsx
<div className="px-6 py-8 border-b border-border">
  <div className="flex items-start gap-4">
    <div className="p-3 rounded-xl bg-nthu-50 dark:bg-nthu-950/30 text-nthu-600 dark:text-nthu-400">
      <Building2 className="h-8 w-8" />
    </div>

    <div className="flex-1 space-y-2">
      <h1 className="text-3xl font-bold">{venueId}</h1>
      <p className="text-muted-foreground">
        {toPrettySemester(lastSemester.id)} Semester
      </p>
    </div>

    <Button variant="outline" size="icon">
      <Share2 className="h-4 w-4" />
    </Button>
  </div>
</div>
```

**Stats Cards (NEW)**

```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 py-6">
  <Card>
    <CardContent className="p-4 text-center space-y-1">
      <BookOpen className="h-5 w-5 mx-auto text-muted-foreground" />
      <p className="text-2xl font-bold">{courseCount}</p>
      <p className="text-xs text-muted-foreground">Total Courses</p>
    </CardContent>
  </Card>

  <Card>
    <CardContent className="p-4 text-center space-y-1">
      <Clock className="h-5 w-5 mx-auto text-muted-foreground" />
      <p className="text-2xl font-bold">{peakHours}</p>
      <p className="text-xs text-muted-foreground">Peak Hours</p>
    </CardContent>
  </Card>

  <Card>
    <CardContent className="p-4 text-center space-y-1">
      <Users className="h-5 w-5 mx-auto text-muted-foreground" />
      <p className="text-2xl font-bold">{avgClassSize}</p>
      <p className="text-xs text-muted-foreground">Avg. Class Size</p>
    </CardContent>
  </Card>

  <Card>
    <CardContent className="p-4 text-center space-y-1">
      <Calendar className="h-5 w-5 mx-auto text-muted-foreground" />
      <p className="text-2xl font-bold">{utilization}%</p>
      <p className="text-xs text-muted-foreground">Utilization</p>
    </CardContent>
  </Card>
</div>
```

**Timetable Enhancements**

- Add subtle grid lines with `border-border`
- Highlight current time slot with NTHU purple
- Show course tags with colored badges
- Add hover effects on time slots

**Empty State**

```tsx
<div className="flex flex-col items-center justify-center h-96 text-center space-y-4">
  <div className="p-6 rounded-full bg-muted">
    <Building2 className="h-12 w-12 text-muted-foreground" />
  </div>
  <div className="space-y-2">
    <h3 className="text-xl font-semibold">Select a venue</h3>
    <p className="text-muted-foreground max-w-sm">
      Choose a venue from the sidebar to view its schedule and details
    </p>
  </div>
</div>
```

**Loading State**

```tsx
<div className="flex flex-col items-center justify-center h-64 space-y-4">
  <div className="animate-spin rounded-full h-12 w-12 border-4 border-nthu-200 border-t-nthu-500" />
  <p className="text-muted-foreground">Loading venue data...</p>
</div>
```

---

## Implementation Plan

### Phase 1: Settings Page (Days 1-2)

1. **Day 1 Morning**: Fix layout structure and header

   - Add page header
   - Update card structure with borders
   - Remove separators, add spacing

2. **Day 1 Afternoon**: Improve settings items

   - Update responsive layouts
   - Replace hardcoded colors with semantic tokens
   - Enhance focus states

3. **Day 2 Morning**: Polish and features

   - Add tooltips for complex settings
   - Improve badge styling for experimental features
   - Add loading states

4. **Day 2 Afternoon**: Testing and refinement
   - Test responsive behavior
   - Test dark mode
   - Test accessibility

### Phase 2: Team Page (Days 3-4)

1. **Day 3 Morning**: Hero and structure

   - Create hero section
   - Update page layout
   - Add section headers

2. **Day 3 Afternoon**: Member cards

   - Redesign core team cards
   - Redesign dedicated members cards
   - Add hover effects

3. **Day 4 Morning**: Sponsors and CTA

   - Create sponsors section
   - Add sponsor data structure
   - Create join CTA section

4. **Day 4 Afternoon**: Testing and refinement
   - Test all interactions
   - Optimize images
   - Test on mobile

### Phase 3: Venues Page (Days 5-7)

1. **Day 5 Morning**: Sidebar enhancements

   - Add search functionality
   - Create venue cards
   - Add filters

2. **Day 5 Afternoon**: Detail view header

   - Add breadcrumbs
   - Redesign venue header
   - Create stats cards

3. **Day 6**: Timetable and states

   - Enhance timetable styling
   - Create empty state
   - Create loading state
   - Add animations

4. **Day 7**: Testing and polish
   - Test two-panel responsive behavior
   - Test all states
   - Performance optimization
   - Final accessibility audit

### Phase 4: Integration & Testing (Day 8)

1. **Cross-page consistency check**

   - Verify all pages use design system correctly
   - Check color consistency
   - Check spacing consistency

2. **Accessibility audit**

   - Keyboard navigation
   - Screen reader testing
   - Color contrast verification

3. **Performance testing**

   - Lighthouse audit
   - Image optimization
   - Bundle size check

4. **Documentation**
   - Update design system if needed
   - Create component examples
   - Document new patterns

---

## Component Inventory

### New Components to Create

1. **PageHeader** - Reusable header with title and description
2. **VenueCard** - Enhanced venue list item
3. **MemberCard** - Team member showcase card
4. **SponsorCard** - Sponsor logo card
5. **StatCard** - Quick stats display
6. **SearchBar** - Venue search with icon
7. **EmptyState** - Generic empty state with icon

### Components to Enhance

1. **Card** - Already good, ensure consistent usage
2. **Button** - Add NTHU purple hover states
3. **Badge** - Add NTHU purple variant
4. **Input** - Ensure consistent styling

---

## Success Metrics

### Visual Quality

- ✅ All pages use design system colors exclusively
- ✅ Consistent spacing throughout (4px base unit)
- ✅ Typography hierarchy is clear
- ✅ Dark mode works perfectly

### User Experience

- ✅ Settings are easier to find and understand
- ✅ Team page is more engaging and professional
- ✅ Venues are easier to browse and compare
- ✅ Mobile experience is smooth

### Technical Quality

- ✅ Lighthouse score > 90 for all pages
- ✅ No accessibility violations
- ✅ Fast loading times
- ✅ Semantic HTML structure

### Brand Consistency

- ✅ NTHU purple is prominent throughout
- ✅ Professional and polished appearance
- ✅ Consistent with calendar/course/bus designs

---

## Risk Mitigation

### Potential Issues

1. **Breaking Changes** - Component API changes might break existing code

   - Mitigation: Careful testing, gradual rollout

2. **Performance** - Enhanced cards might slow down rendering

   - Mitigation: Virtualization for long lists, lazy loading images

3. **Accessibility** - New interactions might have a11y issues

   - Mitigation: Test with screen readers, keyboard nav early

4. **Mobile** - Complex layouts might not translate well
   - Mitigation: Mobile-first design, test on real devices

---

## Appendix: Design System Quick Reference

### Spacing Scale

- `gap-2` = 8px
- `gap-4` = 16px
- `gap-6` = 24px (section spacing)
- `gap-8` = 32px (large section spacing)

### Card Padding

- Mobile: `p-4`
- Desktop: `p-6`
- Large cards: `p-8`

### Border Radius

- Small: `rounded-sm` (4px)
- Medium: `rounded-md` (6px)
- Large: `rounded-lg` (8px)
- XL: `rounded-xl` (12px)

### Text Hierarchy

- Page Title: `text-3xl md:text-4xl font-bold`
- Section Title: `text-2xl md:text-3xl font-bold`
- Card Title: `text-xl font-semibold`
- Item Title: `text-base font-medium`
- Description: `text-sm text-muted-foreground`

### Interactive States

- Hover: `hover:shadow-md transition-all`
- Active: `ring-2 ring-nthu-500`
- Focus: `focus:ring-2 focus:ring-nthu-500 focus:ring-offset-2`
- Disabled: `opacity-50 cursor-not-allowed`

---

## Next Steps

1. ✅ Review this plan with team
2. ⏳ Get approval for design direction
3. ⏳ Set up development branch
4. ⏳ Begin Phase 1 (Settings Page)
5. ⏳ Iterate based on feedback

---

**Document Version**: 1.0
**Last Updated**: 2026-02-28
**Author**: Claude Code (UI Engineer Agent)
**Status**: Awaiting Approval
