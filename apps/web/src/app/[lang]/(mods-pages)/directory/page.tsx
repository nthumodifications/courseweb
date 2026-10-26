import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Building2,
  Check,
  Copy,
  ExternalLink,
  Mail,
  Phone,
  RefreshCw,
  Search,
} from "lucide-react";
import { Button, ErrorState, Input, Skeleton } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import { useLocalizedZhData } from "@/hooks/useLocalizedZh";
import {
  filterDirectoryUnits,
  getDirectoryTelHref,
  splitDirectoryExtensions,
} from "@/lib/directory-core";
import { useDirectory, type DirectoryUnit } from "@/lib/directory";

const DIRECTORY_SOURCE_URL = "https://tel.net.nthu.edu.tw/nthusearch/";

const DirectoryUnitRow = ({
  unit,
  localize,
  copied,
  onCopy,
}: {
  unit: DirectoryUnit;
  localize: (value: string) => string;
  copied: string | null;
  onCopy: (key: string, value: string) => void;
}) => {
  const dict = useDictionary();
  const extensions = splitDirectoryExtensions(unit.extension);
  const phoneLinks = unit.phone
    ? (extensions.length > 0 ? extensions : [null]).map((extension) => ({
        extension,
        href: getDirectoryTelHref(unit.phone, extension),
      }))
    : [];
  const website = unit.website ?? unit.url;

  return (
    <div className="flex flex-col gap-3 py-4">
      <div className="flex flex-row items-start gap-4">
        <Building2 className="h-7 w-7 shrink-0 text-primary" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="font-bold text-foreground">{localize(unit.name)}</h2>
          {unit.parentName && (
            <span className="text-sm text-muted-foreground">
              {localize(unit.parentName)}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-sm font-medium">
        {phoneLinks.length > 0 && (
          <div className="flex min-w-0 items-start gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <div className="flex min-w-0 flex-wrap gap-2">
              {phoneLinks.map(({ extension, href }) =>
                href ? (
                  <a
                    href={href}
                    className="text-foreground underline hover:text-primary"
                    key={extension ?? "phone"}
                  >
                    {unit.phone}
                    {extension && ` ${dict.directory.extension} ${extension}`}
                  </a>
                ) : null,
              )}
            </div>
            <button
              type="button"
              className="rounded p-1 text-muted-foreground hover:text-primary"
              title={dict.directory.copy}
              aria-label={`${dict.directory.copy} ${unit.phone}`}
              onClick={() => onCopy(`phone-${unit.id}`, unit.phone!)}
            >
              {copied === `phone-${unit.id}` ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        )}

        {unit.email && (
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <a
              href={`mailto:${unit.email}`}
              className="break-all text-foreground underline hover:text-primary"
            >
              {unit.email}
            </a>
            <button
              type="button"
              className="rounded p-1 text-muted-foreground hover:text-primary"
              title={dict.directory.copy}
              aria-label={`${dict.directory.copy} ${unit.email}`}
              onClick={() => onCopy(`email-${unit.id}`, unit.email!)}
            >
              {copied === `email-${unit.id}` ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        )}

        {website && (
          <a
            href={website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-muted-foreground underline hover:text-primary"
          >
            {dict.directory.website}
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
};

const DirectoryPage = () => {
  const dict = useDictionary();
  const localize = useLocalizedZhData();
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const { data: response, isLoading, error, refetch } = useDirectory();
  const units = response?.data ?? [];
  const filteredUnits = useMemo(
    () => filterDirectoryUnits(units, searchQuery, localize),
    [localize, searchQuery, units],
  );

  const copyValue = (key: string, value: string) => {
    if (!navigator.clipboard) return;
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1500);
    });
  };

  const hasLoadError = Boolean(error) || response?.error === true;

  return (
    <>
      <Helmet>
        <title>{dict.directory.meta_title} | NTHUMods</title>
        <meta name="description" content={dict.directory.meta_description} />
      </Helmet>

      <div className="flex flex-col px-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-4">
          <h1 className="text-base font-bold text-foreground">
            {dict.directory.title}
          </h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void refetch()}
            aria-label={dict.directory.refresh}
            title={dict.directory.refresh}
          >
            <RefreshCw className={isLoading ? "animate-spin" : ""} />
          </Button>
        </div>

        <div className="border-b border-border py-3">
          <div className="relative">
            <Search
              className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={dict.directory.search_placeholder}
              aria-label={dict.directory.search_placeholder}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col divide-y divide-border">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex flex-col gap-3 py-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-7 w-7 rounded" />
                  <Skeleton className="h-4 w-40" />
                </div>
                <Skeleton className="h-4 w-64" />
              </div>
            ))}
          </div>
        ) : hasLoadError && units.length === 0 ? (
          <div className="py-4">
            <ErrorState
              title={dict.directory.load_error}
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void refetch()}
                >
                  {dict.directory.try_again}
                </Button>
              }
            />
          </div>
        ) : filteredUnits.length === 0 ? (
          <div className="py-4 text-sm text-muted-foreground">
            {dict.directory.no_results}
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {filteredUnits.map((unit) => (
              <DirectoryUnitRow
                key={unit.id}
                unit={unit}
                localize={localize}
                copied={copied}
                onCopy={copyValue}
              />
            ))}
          </div>
        )}

        {hasLoadError && units.length > 0 && (
          <p className="border-t border-border py-2 text-sm text-muted-foreground">
            {dict.directory.load_error}
          </p>
        )}

        <div className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
          {dict.directory.data_source}{" "}
          <a
            href={response?.source.url ?? DIRECTORY_SOURCE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            {dict.directory.source_name}
          </a>
        </div>
        <div className="h-6" />
      </div>
    </>
  );
};

export default DirectoryPage;
