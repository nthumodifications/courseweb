'use server';

export async function getWeatherData() {
    const res = await fetch(
      `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-055?Authorization=${process.env.CWA_API_KEY}&format=JSON&locationName=%E6%9D%B1%E5%8D%80&elementName=Wx,WeatherDescription` ,
      { 
        next: { revalidate: 60 * 60 * 24 }
      })

    if (!res.ok) {
      throw new Error('Failed to fetch data')
    }
    return res.json()
}
