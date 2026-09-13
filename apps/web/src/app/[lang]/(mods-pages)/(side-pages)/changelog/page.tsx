import { Badge } from "@courseweb/ui";
import { CalendarDays } from "lucide-react";
import { useParams } from "react-router-dom";
import Footer from "@/components/Footer";
import useDictionary from "@/dictionaries/useDictionary";
import { CHANGELOG } from "@/const/changelog";

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
    <div className="flex flex-col gap-4 px-4">
      <main className="flex flex-col gap-4">
        {CHANGELOG.map((release) => (
          <article key={release.version} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="font-bold text-foreground">
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
              <h2 className="text-base font-bold">{release.title[language]}</h2>
            )}

            <ul className="flex flex-col divide-y divide-border">
              {release.items.map((item, index) => (
                <li
                  key={`${release.version}-${index}`}
                  className="flex items-start gap-2 py-4"
                >
                  <Badge variant="outline" className="mt-0.5 shrink-0">
                    {dict.changelog.types[item.type]}
                  </Badge>
                  <div className="min-w-0 flex flex-col gap-1">
                    <h3 className="font-bold leading-snug">
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
          </article>
        ))}
      </main>

      <Footer />
    </div>
  );
};

export default ChangelogPage;
