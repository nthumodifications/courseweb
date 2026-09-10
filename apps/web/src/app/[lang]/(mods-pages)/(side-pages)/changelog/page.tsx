import { Badge, Card, CardContent } from "@courseweb/ui";
import { CalendarDays } from "lucide-react";
import { useParams } from "react-router-dom";
import Footer from "@/components/Footer";
import useDictionary from "@/dictionaries/useDictionary";
import { CHANGELOG, ChangelogEntryType } from "@/const/changelog";

const typeStyles: Record<ChangelogEntryType, string> = {
  feature:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200",
  improvement:
    "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900 dark:bg-purple-950 dark:text-purple-200",
  fix: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
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
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-10 flex flex-col gap-2">
        <h1 className="text-3xl font-bold md:text-4xl">
          {dict.changelog.title}
        </h1>
        <p className="text-muted-foreground">{dict.changelog.description}</p>
      </header>

      <main className="space-y-8">
        {CHANGELOG.map((release) => (
          <article key={release.version} className="space-y-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {dict.changelog.release} {release.version}
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                <time dateTime={release.date}>
                  {formatReleaseDate(release.date, locale)}
                </time>
              </span>
            </div>

            {release.title && (
              <h2 className="text-2xl font-semibold">
                {release.title[language]}
              </h2>
            )}

            <Card>
              <CardContent className="p-4 sm:p-6">
                <ul className="space-y-5">
                  {release.items.map((item, index) => (
                    <li
                      key={`${release.version}-${index}`}
                      className="flex items-start gap-3"
                    >
                      <Badge
                        variant="outline"
                        className={`mt-0.5 shrink-0 ${typeStyles[item.type]}`}
                      >
                        {dict.changelog.types[item.type]}
                      </Badge>
                      <div className="min-w-0 space-y-1">
                        <h3 className="font-semibold leading-snug">
                          {item.title[language]}
                        </h3>
                        {item.description && (
                          <p className="text-sm leading-relaxed text-muted-foreground">
                            {item.description[language]}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </article>
        ))}
      </main>

      <Footer />
    </div>
  );
};

export default ChangelogPage;
