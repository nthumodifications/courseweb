import { Badge, PageHeader, PageShell, Section } from "@courseweb/ui";
import { CalendarDays } from "lucide-react";
import { useParams } from "react-router-dom";

import { CHANGELOG, type ChangelogEntryType } from "@/const/changelog";
import Footer from "@/components/Footer";
import useDictionary from "@/dictionaries/useDictionary";

const typeVariants: Record<
  ChangelogEntryType,
  "default" | "secondary" | "outline"
> = {
  feature: "default",
  improvement: "secondary",
  fix: "outline",
};

const formatReleaseDate = (date: string, locale: string) =>
  new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(`${date}T00:00:00`));

const ChangelogPage = () => {
  const dict = useDictionary();
  const { lang } = useParams<{ lang: string }>();
  const language = lang === "en" ? "en" : "zh";
  const locale = language === "en" ? "en-US" : "zh-TW";

  return (
    <PageShell width="content">
      <PageHeader
        className="[&_h1]:overflow-visible [&_h1]:text-clip [&_h1]:whitespace-normal"
        title={
          <span className="text-4xl font-bold tracking-tight">
            {dict.changelog.title}
          </span>
        }
        description={dict.changelog.description}
      />

      {CHANGELOG.map((release) => (
        <Section
          key={release.version}
          title={`${dict.changelog.release} ${release.version}`}
        >
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            <time dateTime={release.date}>
              {formatReleaseDate(release.date, locale)}
            </time>
          </div>

          {release.title && (
            <h3 className="text-base font-semibold">
              {release.title[language]}
            </h3>
          )}

          <div className="rounded-lg border border-border bg-card p-4">
            <ul className="space-y-3">
              {release.items.map((item, index) => (
                <li
                  key={`${release.version}-${index}`}
                  className="flex min-w-0 items-start gap-3"
                >
                  <Badge
                    variant={typeVariants[item.type]}
                    className="mt-0.5 shrink-0"
                  >
                    {dict.changelog.types[item.type]}
                  </Badge>
                  <div className="min-w-0 space-y-1">
                    <h4 className="text-sm font-semibold leading-snug">
                      {item.title[language]}
                    </h4>
                    {item.description && (
                      <p className="max-w-prose text-sm text-muted-foreground">
                        {item.description[language]}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      ))}

      <Footer />
    </PageShell>
  );
};

export default ChangelogPage;
