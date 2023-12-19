import { WeatherData } from '@/types/weather';
import {Badge, Tooltip} from '@mui/joy';
import {FC} from 'react';
import { Umbrella } from 'lucide-react';

interface WeatherIconProps { date: Date, weather: WeatherData[number] }

const WeatherIcon: FC<WeatherIconProps> = ({ date, weather }) => {
    if(!weather) return <></>;

    const weatherData = weather.weatherData.Wx
    const weatherDescription = weather.weatherData.WeatherDescription


    if(!weatherData || !weatherDescription) return <></>;

    return (
        <Tooltip title={weatherDescription} placement="bottom" sx={{maxWidth: '180px'}}>
            <div className='flex flex-row gap-4 items-center'>
                {parseInt(weather.weatherData.PoP12h ?? '0') > 0 && <Badge badgeContent={`${weather.weatherData.PoP12h}%`} size='sm'>
                    <Umbrella/>
                </Badge>}
                <div className='flex flex-col'>
                    <img 
                        className="w-9 h-8"
                        src={`https://www.cwa.gov.tw/V8/assets/img/weather_icons/weathers/svg_icon/day/${weatherData}.svg`} 
                    />

                    <p className='text-center text-xs'>
                        <span className='text-gray-600 dark:text-neutral-400 px-1'>{weather.weatherData.MaxT}</span>
                        <span className='text-gray-400 dark:text-neutral-600 px-1'>{weather.weatherData.MinT}</span>
                    </p>
                </div>
            </div>
        </Tooltip>    
    )

}

export default WeatherIcon;