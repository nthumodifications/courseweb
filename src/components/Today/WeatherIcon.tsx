import { CWBWeather } from '@/types/weather';
import {Tooltip} from '@mui/joy';
import {FC} from 'react';

interface WeatherIconProps { date: Date, weather: CWBWeather}

const WeatherIcon: FC<WeatherIconProps> = ({ date, weather }) => {
    if(!weather) return <></>;

    const weatherData = weather[0].time.find(t => new Date(t.startTime) <= date && new Date(t.endTime) >= date);
    const weatherDescription = weather[1].time.find(t => new Date(t.startTime) <= date && new Date(t.endTime) >= date);


    if(!weatherData || !weatherDescription) return <></>;

    return (
        <Tooltip title={weatherDescription?.elementValue?.[0].value} placement="bottom" sx={{maxWidth: '180px'}}>
            <img 
                className="w-12 h-12"
                src={`https://www.cwa.gov.tw/V8/assets/img/weather_icons/weathers/svg_icon/day/${weatherData!.elementValue?.[1].value}.svg`} 
            />
        </Tooltip>    
    )

}

export default WeatherIcon;