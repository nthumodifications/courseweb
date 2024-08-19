export type WeatherAPIResponse = {
  locations: {
    datasetDescription: string;
    locationsName: string;
    dataid: string;
    location: {
      locationName: string;
      geocode: string;
      lat: string;
      lon: string;
      weatherElement: {
        elementName: string;
        description: string;
        time: {
          startTime: string;
          endTime: string;
          elementValue: {
            value: string;
            measures: string;
          }[];
        }[];
      }[];
    }[];
  }[];
};

export type WeatherData = {
  date: string;
  weatherData: {
    MinT: string;
    MaxT: string;
    PoP12h: string;
    Wx: string;
    WeatherDescription: string;
  };
}[];
