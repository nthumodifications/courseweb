import ShopList from "./ShopList"

async function getData() {
  const res = await fetch('https://api.nthusa.tw/dining/')

  if (!res.ok) {
    throw new Error('Failed to fetch data')
  }
 
  return res.json()
}
 
export default async function Page() {
  const data = await getData()
  return <ShopList data={data} />
}