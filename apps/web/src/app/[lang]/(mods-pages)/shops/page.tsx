import ShopList from "./ShopList";
import useDictionary from "@/dictionaries/useDictionary";
import useDining from "@/features/dining/useDining";
import { Button, ErrorState } from "@courseweb/ui";

export default function Page() {
  const dict = useDictionary();
  const { data = [], isLoading, error, refetch } = useDining();

  if (isLoading) {
    return (
      <div className="flex w-full flex-col divide-y divide-border px-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            className="flex min-w-0 flex-row items-center gap-4 py-4"
            key={index}
          >
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
