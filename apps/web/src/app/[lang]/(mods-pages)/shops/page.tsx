import { useQuery } from "@tanstack/react-query";
import ShopList from "./ShopList";

export default function Page() {
  const { data, isLoading, error } = useQuery({
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
      <div className="grid place-items-center w-full h-64">
        <span className="text-gray-400">Loading...</span>
      </div>
    );
  }

  if (error) {
    return <div>{error.message}</div>;
  }

  return <ShopList data={data} />;
}
