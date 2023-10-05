'use server';

export async function getWeatherData() {
    const res = await fetch(`https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-055?Authorization=${process.env.CWA_API_KEY}&format=JSON&locationName=%E6%9D%B1%E5%8D%80`)
    // The return value is *not* serialized
    // You can return Date, Map, Set, etc.
   
    if (!res.ok) {
      // This will activate the closest `error.js` Error Boundary
      throw new Error('Failed to fetch data')
    }
    return res.json()
}
