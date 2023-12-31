import Shops from './Shops'

const Page = async () => {
  
  const res = await fetch('https://api.nthusa.tw/dining')
  if(!res.ok) throw new Error('Failed to fetch data')
  const data = (await res.json()).reduce((a, i) => a.concat(i.restaurants), [])
  
  return <Shops data={data} />

}

export default Page