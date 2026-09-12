import { useQuery } from "@tanstack/react-query";
import ShopList from "./ShopList";
import useDictionary from "@/dictionaries/useDictionary";
import { Button, ErrorState } from "@courseweb/ui";

type ShopArea = { restaurants: Array<Record<string, unknown>> };

export default function Page() {
  const dict = useDictionary();
  const { data = [], isLoading, error, refetch } = useQuery<ShopArea[]>({
    queryKey: ["dining"],
    queryFn: async () => {
      const res = await fetch("https://api.nthusa.tw/dining/");
      if (!res.ok) {
        throw new Error("Failed to fetch data from the NTHUSA API");
      }
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex w-full flex-col divide-y divide-border px-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div className="flex min-w-0 flex-row items-center gap-4 py-4" key={index}>
            <div className="h-4 w-4 shrink-0 rounded-sm bg-muted" />
            <div className="h-4 w-32 rounded bg-muted" />
            <div className="flex-1" />
            <div className="h-4 w-20 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title={dict.shops.load_error}
        action={
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            {dict.common.try_again}
          </Button>
        }
      />
    );
  }

  return <ShopList data={data} />;
}
