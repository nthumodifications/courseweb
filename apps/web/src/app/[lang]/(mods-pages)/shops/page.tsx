import { useQuery } from "@tanstack/react-query";
import ShopList from "./ShopList";
import useDictionary from "@/dictionaries/useDictionary";
import type { DiningArea } from "./types";
import client from "@/config/api";

export default function Page() {
  const dict = useDictionary();
  const { data, isLoading, error } = useQuery({
    queryKey: ["dining"],
    queryFn: async () => {
      const res = await client.dining.$get();
      if (!res.ok) {
        throw new Error("Failed to fetch dining data");
      }
      return (await res.json()) as DiningArea[];
    },
  });

  if (isLoading) {
    return (
      <div className="grid place-items-center w-full h-64">
        <span className="text-gray-400">{dict.common.loading}</span>
      </div>
    );
  }

  if (error || !data) {
    return <div>{dict.shops.load_error}</div>;
  }

  return <ShopList data={data} />;
}
