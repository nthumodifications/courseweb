'use server';
import { getRangeOfDays } from '@/helpers/dates';
import {WeatherAPIResponse, WeatherData} from '@/types/weather';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export async function getWeatherData() {
  const res = await fetch(
    `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-055?Authorization=${process.env.CWA_API_KEY}&format=JSON&locationName=%E6%9D%B1%E5%8D%80&elementName=MinT,MaxT,PoP12h,Wx,WeatherDescription`,
    {
      next: { revalidate: 60 * 60, tags: ['weather'] },
    })

  if (!res.ok) {
    throw new Error('Failed to fetch data ' + res.status + await res.text())
  }
  const apiResponse = await res.json()
  if(apiResponse.success === false) {
    throw new Error('Failed to fetch data ' + apiResponse.result)
  }
  
  const weatherResponse = apiResponse.records as WeatherAPIResponse

  // format data to be simpler
  // MinT, MaxT, PoP12h, Wx, WeatherDescription
  //get a range of 5 days starting from today
  const days = getRangeOfDays(toZonedTime(new Date(), 'Asia/Taipei'), toZonedTime(new Date(Date.now() + 86400000 * 4), 'Asia/Taipei'));
  
  // for each day, get the the MinT, MaxT, PoP12h, Wx, WeatherDescription for the day
  const weatherData = days.map((day) => {
    const dayElements = weatherResponse.locations[0].location[0].weatherElement.map((element) => {
      const data = element.time.find(t => new Date(t.startTime) <= day && new Date(t.endTime) >= day);

      if(element.elementName === 'Wx' && data) {
        return {
          element: element.elementName,
          value: data.elementValue[1].value
        }
      }
      else if(data) return {
        element: element.elementName,
        value: data.elementValue[0].value
      }
      else return {
        element: element.elementName,
        value: undefined
      }
    })
    const weatherData = {
      MinT: dayElements.find(e => e.element === 'MinT')!.value,
      MaxT: dayElements.find(e => e.element === 'MaxT')!.value,
      PoP12h: dayElements.find(e => e.element === 'PoP12h')!.value,
      Wx: dayElements.find(e => e.element === 'Wx')!.value,
      WeatherDescription: dayElements.find(e => e.element === 'WeatherDescription')!.value,
    }
    return {
      date: format(day, 'yyyy-MM-dd'),
      weatherData
    }
  })

  return weatherData as WeatherData;
}
