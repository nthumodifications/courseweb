import { Link, useParams } from "react-router-dom";
import { Button } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import { useSpacesIndex } from "./api";

const SpacesPage = () => {
  const dict = useDictionary();
  const { lang } = useParams<{ lang: string }>();
  const query = useSpacesIndex();

  if (query.isLoading) {
    return (
      <div className="flex flex-col px-4 divide-y divide-border">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-2 py-4">
            <div className="h-4 w-40 rounded bg-muted" />
            <div className="h-4 w-64 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }
  if (query.error) {
    return (
      <div className="flex flex-col gap-2 px-4 py-4 text-sm">
        <p className="text-destructive">{dict.spaces.error}</p>
        <Button
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => void query.refetch()}
        >
          {dict.spaces.tryAgain}
        </Button>
      </div>
    );
  }

  const organisations = query.data?.organisations ?? [];
  return (
    <div className="flex flex-col px-4">
      <div className="flex flex-row flex-wrap items-center gap-2 py-2">
        <h1 className="flex-1 font-bold">{dict.spaces.browse}</h1>
        <Button asChild variant="outline" size="sm">
          <Link to={`/${lang}/spaces/mine`}>{dict.spaces.myBookings}</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to={`/${lang}/spaces/manage`}>{dict.spaces.manage}</Link>
        </Button>
      </div>
      {organisations.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">
          {dict.spaces.emptySpaces}
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {organisations.map((organisation) => (
            <section key={organisation.id} className="flex flex-col gap-2 py-4">
              <div className="flex flex-row items-baseline gap-4">
                <h2 className="font-bold">{organisation.name}</h2>
                <span className="flex-1" />
                <span className="whitespace-nowrap text-sm text-muted-foreground">
                  {organisation.spaces.length} {dict.spaces.spaces}
                </span>
              </div>
              {organisation.description && (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {organisation.description}
                </p>
              )}
              <div className="flex flex-col divide-y divide-border pl-2">
                {organisation.spaces.map((space) => (
                  <Link
                    key={space.id}
                    to={`/${lang}/spaces/${organisation.slug}/${space.slug}`}
                    className="flex flex-row items-center gap-4 py-3 hover:text-primary"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{space.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {space.location}
                      </div>
                    </div>
                    <span className="shrink-0 whitespace-nowrap text-right text-sm text-muted-foreground">
                      {space.description || organisation.name}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      <div className="h-6" />
    </div>
  );
};

export default SpacesPage;
