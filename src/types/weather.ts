export type CWBWeather = [
    WeatherPrediction,
    WeatherDescription
]

export interface WeatherPrediction {
    description: "天氣現象",
    elementName: "Wx" ,
    time:{
        elementValue: {value: string, measures: string}[],
        startTime: string,
        endTime: string
    }[]
}
export interface WeatherDescription {
    description:  "天氣預報綜合描述",
    elementName: "WeatherDescription",
    time:{
        elementValue: {value: string, measures: string}[],
        startTime: string,
        endTime: string
    }[]
}