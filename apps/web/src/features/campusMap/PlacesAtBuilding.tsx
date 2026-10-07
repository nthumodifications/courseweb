import { Button } from "@courseweb/ui";
import { Loader2, Store } from "lucide-react";
import useDictionary from "@/dictionaries/useDictionary";
import useDining from "@/features/dining/useDining";
import {
  getCampusDiningShops,
  type CampusDiningLocation,
} from "./diningLocations";

export default function PlacesAtBuilding({
  location,
}: Readonly<{
  location: CampusDiningLocation;
}>) {
  const dict = useDictionary();
  const { data, isPending, isError, refetch, isFetching } = useDining();
  const shops = data ? getCampusDiningShops(data, location) : [];

  return (
    <section
      className="mt-4 flex min-h-0 flex-col border-t border-border pt-3"
      aria-labelledby="campus-places-title"
    >
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
        <h3
          id="campus-places-title"
          className="text-sm font-bold text-foreground"
        >
          {dict.campus_map.atThisPlace}
        </h3>
        {data && shops.length > 0 && (
          <span className="text-xs tabular-nums text-muted-foreground">
            {shops.length}
          </span>
        )}
      </div>
      {isPending ? (
        <p
          className="flex items-center gap-2 py-3 text-sm text-muted-foreground"
          role="status"
        >
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {dict.campus_map.placesLoading}
        </p>
      ) : isError && !data ? (
        <div className="flex items-center justify-between gap-3 py-2">
          <p className="text-sm text-muted-foreground" role="status">
            {dict.campus_map.placesError}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            {dict.common.try_again}
          </Button>
        </div>
      ) : shops.length === 0 ? (
        <p className="py-3 text-sm text-muted-foreground" role="status">
          {dict.campus_map.placesEmpty}
        </p>
      ) : (
        <ul
          className="min-h-0 touch-pan-y divide-y divide-border overflow-y-auto overscroll-contain pr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-labelledby="campus-places-title"
          tabIndex={0}
        >
          {shops.map(({ shop, floor }) => (
            <li
              key={`${shop.area}:${shop.name}`}
              className="flex min-h-11 items-center gap-3 py-2.5"
            >
              <Store
                className="h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 break-words text-sm text-foreground">
                {shop.name}
              </span>
              {floor !== undefined && (
                <span className="shrink-0 rounded bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                  {dict.campus_map.placeFloor.replace("{floor}", String(floor))}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
