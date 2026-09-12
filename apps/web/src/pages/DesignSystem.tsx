import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  PageShell,
  PageSkeleton,
  SegmentedControl,
  Section,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  cn,
} from "@courseweb/ui";
import type { PageShellWidth } from "@courseweb/ui";
import {
  Box,
  CheckCircle2,
  Info,
  LayoutGrid,
  Palette,
  Ruler,
  Sparkles,
} from "lucide-react";
import useDictionary from "@/dictionaries/useDictionary";

const DesignSystem = () => {
  const dict = useDictionary();
  const [activeSection, setActiveSection] = useState("philosophy");
  const [segmentValue, setSegmentValue] = useState("one");

  const sectionIds = useMemo(
    () => ["philosophy", "composition", "primitives", "tokens", "gallery"],
    [],
  );

  const sections = useMemo(
    () => [
      {
        id: "philosophy",
        label: dict.design_system.nav.philosophy,
        icon: <Info className="h-4 w-4" />,
      },
      {
        id: "composition",
        label: dict.design_system.nav.composition,
        icon: <LayoutGrid className="h-4 w-4" />,
      },
      {
        id: "primitives",
        label: dict.design_system.nav.primitives,
        icon: <Box className="h-4 w-4" />,
      },
      {
        id: "tokens",
        label: dict.design_system.nav.tokens,
        icon: <Palette className="h-4 w-4" />,
      },
      {
        id: "gallery",
        label: dict.design_system.nav.gallery,
        icon: <CheckCircle2 className="h-4 w-4" />,
      },
    ],
    [dict],
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { root: null, rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    );

    sectionIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [sectionIds]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (!element) return;
    const yOffset = -80;
    const y =
      element.getBoundingClientRect().top + window.pageYOffset + yOffset;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  const pageWidths: Array<{
    width: PageShellWidth;
    label: string;
    description: string;
  }> = [
    {
      width: "content",
      label: dict.design_system.primitives.shell_content,
      description: dict.design_system.composition.content_description,
    },
    {
      width: "app",
      label: dict.design_system.primitives.shell_app,
      description: dict.design_system.composition.app_description,
    },
    {
      width: "full",
      label: dict.design_system.primitives.shell_full,
      description: dict.design_system.composition.full_description,
    },
  ];

  const tokenItems = [
    {
      key: "primary",
      className: "bg-primary text-primary-foreground",
      label: dict.design_system.tokens.primary,
    },
    {
      key: "destructive",
      className: "bg-destructive text-destructive-foreground",
      label: dict.design_system.tokens.destructive,
    },
    {
      key: "success",
      className: "bg-success text-success-foreground",
      label: dict.design_system.tokens.success,
    },
    {
      key: "warning",
      className: "bg-warning text-warning-foreground",
      label: dict.design_system.tokens.warning,
    },
    {
      key: "info",
      className: "bg-info text-info-foreground",
      label: dict.design_system.tokens.info,
    },
    {
      key: "muted",
      className: "bg-muted text-muted-foreground",
      label: dict.design_system.tokens.muted,
    },
  ];

  return (
    <PageShell width="full" gap={false}>
      <PageHeader
        title={dict.design_system.title}
        description={dict.design_system.description}
      />

      <div className="flex min-w-0 flex-col gap-6 lg:flex-row">
        <aside className="hidden w-52 shrink-0 lg:block">
          <div className="sticky top-20">
            <nav className="space-y-1" aria-label={dict.design_system.title}>
              {sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => scrollToSection(section.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    activeSection === section.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  {section.icon}
                  <span className="text-left">{section.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-6">
          <Section
            id="philosophy"
            title={dict.design_system.philosophy.title}
            description={dict.design_system.philosophy.intro}
            variant="card"
          >
            <div className="space-y-3">
              <h3 className="text-base font-semibold">
                {dict.design_system.philosophy.principles_title}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    dict.design_system.philosophy.answer_first,
                    dict.design_system.philosophy.say_once,
                    dict.design_system.philosophy.one_cloth,
                    dict.design_system.philosophy.purple,
                    dict.design_system.philosophy.quiet_craft,
                  ] as Array<{ title: string; description: string }>
                ).map((principle) => (
                  <div key={principle.title} className="space-y-1">
                    <h4 className="text-sm font-semibold">{principle.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {principle.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          <Section
            id="composition"
            title={dict.design_system.composition.title}
            description={dict.design_system.composition.description}
          >
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-base font-semibold">
                  {dict.design_system.composition.widths_title}
                </h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  {(
                    [
                      [
                        dict.design_system.composition.content,
                        dict.design_system.composition.content_description,
                      ],
                      [
                        dict.design_system.composition.app,
                        dict.design_system.composition.app_description,
                      ],
                      [
                        dict.design_system.composition.full,
                        dict.design_system.composition.full_description,
                      ],
                    ] as Array<[string, string]>
                  ).map(([name, description]) => (
                    <div key={name} className="space-y-1">
                      <code className="text-sm font-medium">{name}</code>
                      <p className="text-sm text-muted-foreground">
                        {description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="text-base font-semibold">
                    {dict.design_system.composition.header_title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {dict.design_system.composition.header_description}
                  </p>
                </div>
                <div className="space-y-3">
                  <h3 className="text-base font-semibold">
                    {dict.design_system.composition.surfaces_title}
                  </h3>
                  <div className="grid gap-3 text-sm">
                    <div className="rounded-md bg-background p-3">
                      {dict.design_system.composition.page_surface}
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3">
                      {dict.design_system.composition.card_surface}
                    </div>
                    <div className="rounded-md bg-muted p-3">
                      {dict.design_system.composition.inset_surface}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="text-base font-semibold">
                    {dict.design_system.composition.spacing_title}
                  </h3>
                  <p className="font-mono text-sm tabular-nums">
                    {dict.design_system.composition.spacing_steps}
                  </p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>{dict.design_system.composition.spacing_sections}</li>
                    <li>{dict.design_system.composition.spacing_content}</li>
                    <li>{dict.design_system.composition.spacing_card}</li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h3 className="text-base font-semibold">
                    {dict.design_system.composition.type_title}
                  </h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>{dict.design_system.composition.type_display}</li>
                    <li>{dict.design_system.composition.type_page}</li>
                    <li>{dict.design_system.composition.type_section}</li>
                    <li>{dict.design_system.composition.type_body}</li>
                    <li>{dict.design_system.composition.type_meta}</li>
                    <li>{dict.design_system.composition.type_numbers}</li>
                  </ul>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-1">
                  <h3 className="text-base font-semibold">
                    {dict.design_system.composition.states_title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {dict.design_system.composition.empty_title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {dict.design_system.composition.empty_description}
                  </p>
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-semibold">
                    {dict.design_system.composition.loading_title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {dict.design_system.composition.loading_description}
                  </p>
                </div>
              </div>
            </div>
          </Section>

          <Section
            id="primitives"
            title={dict.design_system.primitives.title}
            description={dict.design_system.primitives.description}
          >
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-base font-semibold">
                  {dict.design_system.primitives.shell_label}
                </h3>
                <div className="space-y-3">
                  {pageWidths.map((example) => (
                    <div key={example.width} className="space-y-1">
                      <p className="text-sm font-medium">{example.label}</p>
                      <PageShell
                        width={example.width}
                        gap={false}
                        className="rounded-lg border border-dashed border-border bg-muted"
                      >
                        <p className="text-xs text-muted-foreground">
                          {example.description}
                        </p>
                      </PageShell>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="text-base font-semibold">
                    {dict.design_system.primitives.header_label}
                  </h3>
                  <PageHeader
                    title={dict.design_system.title}
                    description={dict.design_system.description}
                    actions={
                      <Button size="sm" variant="outline">
                        {dict.design_system.primitives.header_action}
                      </Button>
                    }
                  />
                </div>
                <div className="space-y-3">
                  <h3 className="text-base font-semibold">
                    {dict.design_system.primitives.empty_label}
                  </h3>
                  <EmptyState
                    size="sm"
                    icon={Info}
                    title={dict.design_system.primitives.empty_title}
                    description={
                      dict.design_system.primitives.empty_description
                    }
                    action={
                      <Button size="sm" variant="outline">
                        {dict.design_system.primitives.empty_action}
                      </Button>
                    }
                  />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="text-base font-semibold">
                    {dict.design_system.primitives.error_label}
                  </h3>
                  <ErrorState
                    size="sm"
                    title={dict.design_system.primitives.error_title}
                    description={
                      dict.design_system.primitives.error_description
                    }
                    retryLabel={dict.design_system.primitives.error_action}
                    onRetry={() => undefined}
                  />
                </div>
                <div className="space-y-3">
                  <h3 className="text-base font-semibold">
                    {dict.design_system.primitives.segmented_label}
                  </h3>
                  <SegmentedControl
                    value={segmentValue}
                    options={[
                      {
                        value: "one",
                        label:
                          dict.design_system.primitives.segmented_option_one,
                      },
                      {
                        value: "two",
                        label:
                          dict.design_system.primitives.segmented_option_two,
                      },
                    ]}
                    onValueChange={setSegmentValue}
                    aria-label={dict.design_system.primitives.segmented_aria}
                  />
                </div>
              </div>

              <Section
                title={dict.design_system.primitives.section_label}
                description={dict.design_system.primitives.section_description}
                variant="card"
                actions={
                  <Button size="sm" variant="outline">
                    {dict.design_system.primitives.header_action}
                  </Button>
                }
              >
                <p className="text-sm text-muted-foreground">
                  {dict.design_system.primitives.section_content}
                </p>
              </Section>

              <div className="space-y-3">
                <h3 className="text-base font-semibold">
                  {dict.design_system.primitives.skeleton_label}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {dict.design_system.primitives.skeleton_description}
                </p>
                <PageSkeleton rows={2} />
              </div>
            </div>
          </Section>

          <Section
            id="tokens"
            title={dict.design_system.tokens.title}
            description={dict.design_system.tokens.description}
          >
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-base font-semibold">
                  {dict.design_system.tokens.semantic_title}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {tokenItems.map((token) => (
                    <div key={token.key} className="flex items-center gap-3">
                      <span
                        className={cn(
                          "h-8 w-8 shrink-0 rounded-md",
                          token.className,
                        )}
                        aria-hidden="true"
                      />
                      <code className="text-sm">{token.label}</code>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-base font-semibold">
                  {dict.design_system.tokens.font_title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {dict.design_system.tokens.font_description}
                </p>
              </div>
            </div>
          </Section>

          <Section
            id="gallery"
            title={dict.design_system.gallery.title}
            description={dict.design_system.gallery.description}
          >
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-base font-semibold">
                  {dict.design_system.gallery.buttons}
                </h3>
                <div className="flex flex-wrap gap-3">
                  <Button>{dict.design_system.gallery.default}</Button>
                  <Button variant="secondary">
                    {dict.design_system.gallery.secondary}
                  </Button>
                  <Button variant="outline">
                    {dict.design_system.gallery.outline}
                  </Button>
                  <Button variant="ghost">
                    {dict.design_system.gallery.ghost}
                  </Button>
                  <Button variant="destructive">
                    {dict.design_system.gallery.destructive}
                  </Button>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="text-base font-semibold">
                    {dict.design_system.gallery.field}
                  </h3>
                  <Input placeholder={dict.design_system.gallery.placeholder} />
                  <Badge variant="secondary">
                    {dict.design_system.gallery.secondary}
                  </Badge>
                </div>
                <div className="space-y-3">
                  <h3 className="text-base font-semibold">
                    {dict.design_system.gallery.tabs}
                  </h3>
                  <Tabs defaultValue="one">
                    <TabsList>
                      <TabsTrigger value="one">
                        {dict.design_system.gallery.tab_one}
                      </TabsTrigger>
                      <TabsTrigger value="two">
                        {dict.design_system.gallery.tab_two}
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent
                      value="one"
                      className="text-sm text-muted-foreground"
                    >
                      {dict.design_system.gallery.tab_content}
                    </TabsContent>
                    <TabsContent
                      value="two"
                      className="text-sm text-muted-foreground"
                    >
                      {dict.design_system.gallery.tab_content}
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </div>
          </Section>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Ruler className="h-4 w-4" aria-hidden="true" />
            <span>{dict.design_system.composition.spacing_steps}</span>
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </div>
        </div>
      </div>
    </PageShell>
  );
};

export default DesignSystem;
