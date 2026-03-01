import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@courseweb/ui";
import {
  ChevronRight,
  Plus,
  Calendar,
  Settings,
  Search,
  Bell,
  Palette,
  Type,
  Ruler,
  Box,
  LayoutGrid,
  Sparkles,
  Monitor,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const DesignSystem = () => {
  const [activeSection, setActiveSection] = useState("colors");

  // Scroll tracking similar to settings page
  const sectionIds = useMemo(
    () => [
      "colors",
      "typography",
      "spacing",
      "components",
      "layout",
      "animations",
      "responsive",
      "best-practices",
    ],
    [],
  );

  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: "-20% 0px -70% 0px",
      threshold: 0,
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(
      observerCallback,
      observerOptions,
    );

    sectionIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [sectionIds]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -80;
      const y =
        element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  const sections = useMemo(
    () => [
      {
        id: "colors",
        label: "Color Palette",
        icon: <Palette className="h-5 w-5" />,
      },
      {
        id: "typography",
        label: "Typography",
        icon: <Type className="h-5 w-5" />,
      },
      {
        id: "spacing",
        label: "Spacing System",
        icon: <Ruler className="h-5 w-5" />,
      },
      {
        id: "components",
        label: "Components",
        icon: <Box className="h-5 w-5" />,
      },
      {
        id: "layout",
        label: "Layout Patterns",
        icon: <LayoutGrid className="h-5 w-5" />,
      },
      {
        id: "animations",
        label: "Animations",
        icon: <Sparkles className="h-5 w-5" />,
      },
      {
        id: "responsive",
        label: "Responsive Design",
        icon: <Monitor className="h-5 w-5" />,
      },
      {
        id: "best-practices",
        label: "Best Practices",
        icon: <CheckCircle className="h-5 w-5" />,
      },
    ],
    [],
  );

  return (
    <div className="w-full">
      <div className="flex flex-col lg:flex-row gap-6 px-4 sm:px-6">
        {/* Sidebar - Desktop only */}
        <aside className="hidden lg:block w-[200px] shrink-0">
          <div className="sticky top-20 pt-8">
            <nav className="space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm",
                    activeSection === section.id
                      ? "bg-nthu-500/10 text-nthu-500"
                      : "hover:bg-accent text-muted-foreground",
                  )}
                >
                  <span className="h-5 w-5 shrink-0">{section.icon}</span>
                  <span className="text-left">{section.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0 pb-8">
          {/* Header */}
          <div className="mb-8 pt-8">
            <h1 className="text-4xl font-bold mb-2">NTHUMods Design System</h1>
            <p className="text-muted-foreground text-lg">
              Comprehensive UI/UX design standards and component library
            </p>
          </div>

          <div className="flex flex-col gap-6 min-w-0 space-y-12">
            {/* Colors Section */}
            <section id="colors" className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold mb-4">Color Palette</h2>
                <p className="text-muted-foreground mb-6">
                  Our color system uses CSS custom properties with HSL values
                  for maximum flexibility and theme support.
                </p>
              </div>

              {/* Primary Brand Colors */}
              <Card>
                <CardHeader>
                  <CardTitle>Primary Brand - NTHU Purple</CardTitle>
                  <CardDescription>
                    The signature NTHU brand color palette
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {[
                    { name: "nthu-50", hex: "#FAF7FD", value: "50" },
                    { name: "nthu-100", hex: "#F3ECFB", value: "100" },
                    { name: "nthu-200", hex: "#E9DDF7", value: "200" },
                    { name: "nthu-300", hex: "#D9C2F0", value: "300" },
                    { name: "nthu-400", hex: "#C19AE6", value: "400" },
                    { name: "nthu-500", hex: "#A973D9", value: "500" },
                    { name: "nthu-600", hex: "#9558C9", value: "600" },
                    { name: "nthu-700", hex: "#7E42AE", value: "700" },
                    { name: "nthu-800", hex: "#6A3A8F", value: "800" },
                    { name: "nthu-900", hex: "#573073", value: "900" },
                    { name: "nthu-950", hex: "#3A1853", value: "950" },
                  ].map((color) => (
                    <div key={color.name} className="space-y-2">
                      <div
                        className="h-20 rounded-lg shadow-sm border"
                        style={{ backgroundColor: color.hex }}
                      />
                      <div className="text-sm font-medium">{color.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {color.hex}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Semantic Colors */}
              <Card>
                <CardHeader>
                  <CardTitle>Semantic Colors</CardTitle>
                  <CardDescription>
                    Theme-aware colors using CSS custom properties
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      {
                        name: "Primary",
                        light: "hsl(272.1 71.7% 47.1%)",
                        dark: "hsl(0 0% 98%)",
                        usage: "Main actions, links, focus states",
                      },
                      {
                        name: "Secondary",
                        light: "hsl(240 4.8% 95.9%)",
                        dark: "hsl(240 3.7% 15.9%)",
                        usage: "Secondary buttons, alternative actions",
                      },
                      {
                        name: "Accent",
                        light: "hsl(240 4.8% 95.9%)",
                        dark: "hsl(240 3.7% 15.9%)",
                        usage: "Hover states, highlights",
                      },
                      {
                        name: "Destructive",
                        light: "hsl(0 72.22% 50.59%)",
                        dark: "hsl(0 62.8% 30.6%)",
                        usage: "Errors, delete actions",
                      },
                      {
                        name: "Muted",
                        light: "hsl(240 4.8% 95.9%)",
                        dark: "hsl(240 3.7% 15.9%)",
                        usage: "Subtle backgrounds, disabled states",
                      },
                      {
                        name: "Border",
                        light: "hsl(240 5.9% 90%)",
                        dark: "hsl(240 3.7% 15.9%)",
                        usage: "Component borders, dividers",
                      },
                    ].map((color) => (
                      <div key={color.name} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-12 h-12 rounded-md border"
                            style={{ backgroundColor: color.light }}
                          />
                          <div className="w-12 h-12 rounded-md border bg-slate-900">
                            <div
                              className="w-full h-full rounded-md"
                              style={{ backgroundColor: color.dark }}
                            />
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold">{color.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {color.usage}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Bus Line Colors */}
              <Card>
                <CardHeader>
                  <CardTitle>Bus Line Colors</CardTitle>
                  <CardDescription>
                    Special colors for bus route identification
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { name: "Red Line", color: "#EF4444" },
                    { name: "Green Line", color: "#10B981" },
                    { name: "Blue Line", color: "#3B82F6" },
                  ].map((line) => (
                    <div key={line.name} className="space-y-2">
                      <div
                        className="h-16 rounded-lg shadow-sm border flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: line.color }}
                      >
                        {line.name}
                      </div>
                      <div className="text-xs text-center text-muted-foreground">
                        {line.color}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>

            {/* Typography Section */}
            <section id="typography" className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold mb-4">Typography</h2>
                <p className="text-muted-foreground mb-6">
                  Font families, sizes, weights, and hierarchy standards
                </p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Font Families</CardTitle>
                  <CardDescription>
                    Variable fonts with multilingual support
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="font-medium">Sans-Serif Stack</div>
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      var(--font-inter), var(--font-noto), sans-serif
                    </code>
                    <p className="text-sm text-muted-foreground">
                      Inter for English, Noto Sans TC for Chinese characters
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Type Scale</CardTitle>
                  <CardDescription>
                    Responsive font sizing system
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    {[
                      {
                        name: "Heading 1",
                        size: "text-4xl",
                        weight: "font-bold",
                      },
                      {
                        name: "Heading 2",
                        size: "text-3xl",
                        weight: "font-bold",
                      },
                      {
                        name: "Heading 3",
                        size: "text-2xl",
                        weight: "font-semibold",
                      },
                      {
                        name: "Heading 4",
                        size: "text-xl",
                        weight: "font-semibold",
                      },
                      {
                        name: "Body Large",
                        size: "text-lg",
                        weight: "font-normal",
                      },
                      {
                        name: "Body",
                        size: "text-base",
                        weight: "font-normal",
                      },
                      {
                        name: "Body Small",
                        size: "text-sm",
                        weight: "font-normal",
                      },
                      {
                        name: "Caption",
                        size: "text-xs",
                        weight: "font-medium",
                      },
                    ].map((type) => (
                      <div
                        key={type.name}
                        className="flex items-baseline gap-4 border-b pb-2"
                      >
                        <div className="w-32 text-sm text-muted-foreground">
                          {type.name}
                        </div>
                        <div className={`${type.size} ${type.weight} flex-1`}>
                          The quick brown fox jumps over the lazy dog
                        </div>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {type.size} {type.weight}
                        </code>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Font Weights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { name: "Normal", class: "font-normal", value: "400" },
                    { name: "Medium", class: "font-medium", value: "500" },
                    { name: "Semibold", class: "font-semibold", value: "600" },
                    { name: "Bold", class: "font-bold", value: "700" },
                  ].map((weight) => (
                    <div key={weight.name} className="flex items-center gap-4">
                      <div className="w-24 text-sm text-muted-foreground">
                        {weight.name}
                      </div>
                      <div className={`${weight.class} flex-1`}>
                        Sample text content
                      </div>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {weight.class} ({weight.value})
                      </code>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>

            {/* Spacing Section */}
            <section id="spacing" className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold mb-4">Spacing System</h2>
                <p className="text-muted-foreground mb-6">
                  Consistent spacing scale using Tailwind's 4px base unit
                </p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Spacing Scale</CardTitle>
                  <CardDescription>
                    Base 4px unit with exponential growth
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { name: "0.5", value: "2px", class: "0.5" },
                    { name: "1", value: "4px", class: "1" },
                    { name: "2", value: "8px", class: "2" },
                    { name: "3", value: "12px", class: "3" },
                    { name: "4", value: "16px", class: "4" },
                    { name: "6", value: "24px", class: "6" },
                    { name: "8", value: "32px", class: "8" },
                    { name: "12", value: "48px", class: "12" },
                    { name: "16", value: "64px", class: "16" },
                  ].map((spacing) => (
                    <div
                      key={spacing.name}
                      className="flex items-center gap-4 border-b pb-2"
                    >
                      <div className="w-16 text-sm text-muted-foreground">
                        {spacing.name}
                      </div>
                      <div
                        className="bg-nthu-500 h-8"
                        style={{ width: spacing.value }}
                      />
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {spacing.value}
                      </code>
                      <div className="text-xs text-muted-foreground">
                        gap-{spacing.class}, p-{spacing.class}, m-
                        {spacing.class}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Layout Spacing Conventions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { context: "Section gaps", value: "gap-6 md:gap-8" },
                      { context: "Card padding", value: "p-6" },
                      { context: "Component gaps", value: "gap-2 md:gap-4" },
                      { context: "Page padding", value: "px-4 py-8" },
                      { context: "Button padding", value: "px-4 py-2" },
                      { context: "Input padding", value: "px-3 py-2" },
                    ].map((item) => (
                      <div key={item.context} className="space-y-1">
                        <div className="font-medium text-sm">
                          {item.context}
                        </div>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {item.value}
                        </code>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Components Section */}
            <section id="components" className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold mb-4">Components</h2>
                <p className="text-muted-foreground mb-6">
                  Reusable UI components with variants and states
                </p>
              </div>

              {/* Buttons */}
              <Card>
                <CardHeader>
                  <CardTitle>Buttons</CardTitle>
                  <CardDescription>
                    Base height: 40px (h-10), Border radius: 6px (rounded-md)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-3">Variants</h4>
                      <div className="flex flex-wrap gap-4">
                        <Button variant="default">Primary</Button>
                        <Button variant="secondary">Secondary</Button>
                        <Button variant="outline">Outline</Button>
                        <Button variant="ghost">Ghost</Button>
                        <Button variant="destructive">Destructive</Button>
                        <Button variant="link">Link</Button>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3">Sizes</h4>
                      <div className="flex flex-wrap items-center gap-4">
                        <Button size="sm">Small (h-9)</Button>
                        <Button size="default">Default (h-10)</Button>
                        <Button size="lg">Large (h-11)</Button>
                        <Button size="icon">
                          <Plus />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3">With Icons</h4>
                      <div className="flex flex-wrap gap-4">
                        <Button>
                          <Plus className="mr-2" /> Add Event
                        </Button>
                        <Button variant="outline">
                          <Search className="mr-2" /> Search
                        </Button>
                        <Button variant="ghost">
                          Settings <Settings className="ml-2" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cards */}
              <Card>
                <CardHeader>
                  <CardTitle>Cards</CardTitle>
                  <CardDescription>
                    Border radius: 8px (rounded-lg), Shadow: sm
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Card Title</CardTitle>
                      <CardDescription>Card description text</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Card content goes here. Cards use rounded-lg borders,
                        subtle shadows, and semantic color tokens.
                      </p>
                    </CardContent>
                  </Card>

                  <div className="text-sm space-y-2">
                    <div>
                      <strong>Header padding:</strong> p-6
                    </div>
                    <div>
                      <strong>Content padding:</strong> p-6 pt-0
                    </div>
                    <div>
                      <strong>Border:</strong> border (uses semantic border
                      color)
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Badges */}
              <Card>
                <CardHeader>
                  <CardTitle>Badges</CardTitle>
                  <CardDescription>
                    Border radius: full (rounded-full), Font: semibold text-xs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    <Badge variant="default">Default</Badge>
                    <Badge variant="secondary">Secondary</Badge>
                    <Badge variant="destructive">Destructive</Badge>
                    <Badge variant="outline">Outline</Badge>
                    <Badge className="bg-nthu-400 dark:bg-nthu-600">
                      已修課
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Inputs */}
              <Card>
                <CardHeader>
                  <CardTitle>Inputs</CardTitle>
                  <CardDescription>
                    Height: 40px (h-10), Border radius: 6px (rounded-md)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input placeholder="Search courses..." />
                  <Input type="email" placeholder="Email address" />
                  <Input disabled placeholder="Disabled input" />
                  <div className="text-sm space-y-2 text-muted-foreground">
                    <div>
                      <strong>Padding:</strong> px-3 py-2
                    </div>
                    <div>
                      <strong>Focus ring:</strong> 2px offset ring
                    </div>
                    <div>
                      <strong>Border:</strong> border-input
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tabs */}
              <Card>
                <CardHeader>
                  <CardTitle>Tabs</CardTitle>
                  <CardDescription>
                    Height: 40px (h-10), Background: muted
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="tab1">
                    <TabsList>
                      <TabsTrigger value="tab1">Tab One</TabsTrigger>
                      <TabsTrigger value="tab2">Tab Two</TabsTrigger>
                      <TabsTrigger value="tab3">Tab Three</TabsTrigger>
                    </TabsList>
                    <TabsContent value="tab1">Content for tab one</TabsContent>
                    <TabsContent value="tab2">Content for tab two</TabsContent>
                    <TabsContent value="tab3">
                      Content for tab three
                    </TabsContent>
                  </Tabs>

                  <div className="mt-4 text-sm space-y-2 text-muted-foreground">
                    <div>
                      <strong>List background:</strong> bg-muted
                    </div>
                    <div>
                      <strong>Active state:</strong> bg-background with shadow
                    </div>
                    <div>
                      <strong>Border radius:</strong> rounded-md
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Layout Section */}
            <section id="layout" className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold mb-4">Layout Patterns</h2>
                <p className="text-muted-foreground mb-6">
                  Common layout structures and grid systems
                </p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>CSS Custom Properties</CardTitle>
                  <CardDescription>
                    Layout-specific CSS variables
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="space-y-2 text-sm font-mono">
                    <div className="flex justify-between border-b pb-2">
                      <span>--header-height</span>
                      <span className="text-muted-foreground">
                        3.5rem (56px)
                      </span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span>--bottom-nav-height</span>
                      <span className="text-muted-foreground">5rem (80px)</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span>--content-height</span>
                      <span className="text-muted-foreground">
                        calc(100dvh - header - bottom-nav)
                      </span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span>--radius</span>
                      <span className="text-muted-foreground">
                        0.5rem (8px)
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Grid Patterns</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Responsive Grid</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="bg-nthu-100 dark:bg-nthu-900 p-4 rounded-lg text-center"
                        >
                          Col {i}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="text-sm space-y-2">
                    <code className="block bg-muted px-2 py-1 rounded">
                      grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4
                    </code>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Flex Patterns</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    {
                      name: "Space Between",
                      class: "flex flex-row justify-between items-center",
                    },
                    {
                      name: "Center Aligned",
                      class: "flex flex-row items-center gap-4",
                    },
                    {
                      name: "Column Stack",
                      class: "flex flex-col gap-2",
                    },
                  ].map((pattern) => (
                    <div key={pattern.name} className="space-y-2">
                      <div className="font-semibold text-sm">
                        {pattern.name}
                      </div>
                      <code className="block text-xs bg-muted px-2 py-1 rounded">
                        {pattern.class}
                      </code>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Container Patterns</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    {
                      name: "Max Width Container",
                      class: "max-w-7xl mx-auto px-4",
                      usage: "Page-level containers",
                    },
                    {
                      name: "Full Width Section",
                      class: "w-full",
                      usage: "Full-width sections",
                    },
                    {
                      name: "Content Container",
                      class: "container mx-auto",
                      usage: "Tailwind container (max-width responsive)",
                    },
                  ].map((pattern) => (
                    <div key={pattern.name} className="space-y-2">
                      <div className="font-semibold text-sm">
                        {pattern.name}
                      </div>
                      <code className="block text-xs bg-muted px-2 py-1 rounded">
                        {pattern.class}
                      </code>
                      <div className="text-xs text-muted-foreground">
                        {pattern.usage}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>

            {/* Animations Section */}
            <section id="animations" className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold mb-4">
                  Animations & Transitions
                </h2>
                <p className="text-muted-foreground mb-6">
                  Motion design and transition standards
                </p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Transition Standards</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    {
                      name: "Default Transition",
                      class: "transition-colors",
                      usage: "Color changes, hover states",
                    },
                    {
                      name: "All Properties",
                      class: "transition-all",
                      usage: "Multiple property changes",
                    },
                    {
                      name: "Transform",
                      class: "transition-transform",
                      usage: "Scale, rotate, translate",
                    },
                  ].map((transition) => (
                    <div key={transition.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-sm">
                          {transition.name}
                        </div>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {transition.class}
                        </code>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {transition.usage}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Keyframe Animations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    {
                      name: "Accordion Down",
                      duration: "0.2s ease-out",
                      usage: "Expanding content",
                    },
                    {
                      name: "Accordion Up",
                      duration: "0.2s ease-out",
                      usage: "Collapsing content",
                    },
                    {
                      name: "Spin",
                      class: "animate-spin",
                      usage: "Loading indicators",
                    },
                  ].map((animation) => (
                    <div key={animation.name} className="space-y-1">
                      <div className="font-semibold text-sm">
                        {animation.name}
                      </div>
                      {animation.duration && (
                        <div className="text-xs text-muted-foreground">
                          Duration: {animation.duration}
                        </div>
                      )}
                      {animation.class && (
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {animation.class}
                        </code>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {animation.usage}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Loading States</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center p-8 bg-muted rounded-lg">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nthu-500"></div>
                  </div>
                  <code className="block mt-4 text-xs bg-muted px-2 py-1 rounded">
                    className="animate-spin rounded-full h-8 w-8 border-b-2
                    border-nthu-500"
                  </code>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Hover Effects</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button className="hover:scale-105 transition-transform">
                    Scale on Hover
                  </Button>
                  <div className="text-xs text-muted-foreground">
                    Note: Hover variant uses{" "}
                    <code className="bg-muted px-1 rounded">
                      @media (any-hover: hover) and (any-pointer: fine)
                    </code>{" "}
                    to prevent hover states on touch devices
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Responsive Section */}
            <section id="responsive" className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold mb-4">Responsive Design</h2>
                <p className="text-muted-foreground mb-6">
                  Breakpoints and mobile-first design patterns
                </p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Breakpoints</CardTitle>
                  <CardDescription>
                    Tailwind default breakpoints (mobile-first)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { name: "sm", width: "640px", usage: "Small tablets" },
                    { name: "md", width: "768px", usage: "Tablets" },
                    { name: "lg", width: "1024px", usage: "Laptops" },
                    { name: "xl", width: "1280px", usage: "Desktops" },
                    { name: "2xl", width: "1536px", usage: "Large screens" },
                  ].map((bp) => (
                    <div
                      key={bp.name}
                      className="flex items-center justify-between border-b pb-2"
                    >
                      <code className="font-mono text-sm font-semibold">
                        {bp.name}:
                      </code>
                      <div className="text-sm">{bp.width}</div>
                      <div className="text-sm text-muted-foreground">
                        {bp.usage}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Mobile-First Patterns</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    {
                      pattern: "Hidden on mobile, visible on desktop",
                      class: "hidden md:block",
                    },
                    {
                      pattern: "Visible on mobile, hidden on desktop",
                      class: "md:hidden",
                    },
                    {
                      pattern: "Stack on mobile, row on desktop",
                      class: "flex flex-col md:flex-row",
                    },
                    {
                      pattern: "Full width on mobile, fixed width on desktop",
                      class: "w-full md:w-auto",
                    },
                    {
                      pattern: "Smaller padding on mobile",
                      class: "px-4 md:px-8",
                    },
                  ].map((item) => (
                    <div key={item.pattern} className="space-y-2">
                      <div className="font-semibold text-sm">
                        {item.pattern}
                      </div>
                      <code className="block text-xs bg-muted px-2 py-1 rounded">
                        {item.class}
                      </code>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Viewport Units</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    {
                      unit: "100vh",
                      usage: "Full viewport height (desktop)",
                    },
                    {
                      unit: "100dvh",
                      usage: "Dynamic viewport height (mobile-safe)",
                    },
                    {
                      unit: "env(safe-area-inset-*)",
                      usage: "iPhone notch/home bar padding",
                    },
                  ].map((item) => (
                    <div key={item.unit} className="space-y-1">
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {item.unit}
                      </code>
                      <div className="text-xs text-muted-foreground">
                        {item.usage}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Container Queries</CardTitle>
                  <CardDescription>
                    Using @tailwindcss/container-queries
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <code className="block text-xs bg-muted px-2 py-1 rounded">
                    @container className on parent element
                  </code>
                  <div className="text-sm text-muted-foreground">
                    Example: Course list items use{" "}
                    <code className="bg-muted px-1 rounded">@md:pt-0</code> for
                    container-based responsive padding
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Best Practices */}
            <section id="best-practices" className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold mb-4">Best Practices</h2>
                <p className="text-muted-foreground mb-6">
                  Guidelines for maintaining consistency
                </p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Accessibility</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <ul className="list-disc list-inside space-y-2">
                    <li>All interactive elements have focus-visible states</li>
                    <li>Color contrast ratios meet WCAG AA standards</li>
                    <li>Semantic HTML with proper ARIA attributes</li>
                    <li>Keyboard navigation support for all components</li>
                    <li>Dark mode support using CSS custom properties</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <ul className="list-disc list-inside space-y-2">
                    <li>
                      Use semantic color tokens instead of hard-coded values
                    </li>
                    <li>Minimize custom CSS, prefer Tailwind utilities</li>
                    <li>Lazy load images and heavy components</li>
                    <li>Use CSS custom properties for theme switching</li>
                    <li>Optimize SVG icons and use appropriate formats</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Component Usage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <ul className="list-disc list-inside space-y-2">
                    <li>
                      Import from{" "}
                      <code className="bg-muted px-1">@courseweb/ui</code>{" "}
                      package
                    </li>
                    <li>Use variant props instead of custom styling</li>
                    <li>Extend with className prop when necessary</li>
                    <li>Follow established patterns for consistency</li>
                    <li>Document custom component extensions</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Iconography</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <ul className="list-disc list-inside space-y-2">
                    <li>
                      Primary icon library:{" "}
                      <code className="bg-muted px-1">lucide-react</code>
                    </li>
                    <li>
                      Default icon size:{" "}
                      <code className="bg-muted px-1">h-4 w-4</code> (16px)
                    </li>
                    <li>
                      Button icons:{" "}
                      <code className="bg-muted px-1">[&_svg]:size-4</code>
                    </li>
                    <li>Custom SVGs for bus lines and branding</li>
                    <li>Use consistent stroke width (2px default)</li>
                  </ul>
                </CardContent>
              </Card>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesignSystem;
