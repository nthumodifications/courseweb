import { useQuery } from "@tanstack/react-query";
import ShopList from "./ShopList";
import { PageHeader, PageShell, PageSkeleton } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import { ErrorState } from "@courseweb/ui";

export default function Page() {
  const dict = useDictionary();
  const { data, isLoading, error, refetch } = useQuery({
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
      <PageShell width="app">
        <PageSkeleton rows={5} />
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell width="app">
        <PageHeader title={dict.shops.title} />
        <ErrorState
          title={dict.shops.load_error}
          description={dict.shops.load_error_description}
          retryLabel={dict.common.try_again}
          onRetry={() => void refetch()}
        />
      </PageShell>
    );
  }

  return (
    <PageShell width="app">
      <PageHeader title={dict.shops.title} />
      <ShopList data={data} />
    </PageShell>
  );
}
