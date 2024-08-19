import ShopList from "./ShopList";

async function getData() {
  const res = await fetch("https://api.nthusa.tw/dining/");

  if (!res.ok) {
    throw new Error("Failed to fetch data from the NTHUSA API");
  }

  return res.json();
}

export default async function Page() {
  try {
    const data: any = await getData();
    return <ShopList data={data} />;
  } catch (err) {
    if (err instanceof Error) {
      return <div>{err.message}</div>;
    }
    return <div>An unknown error occurred.</div>;
  }
}
