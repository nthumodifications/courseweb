export type WeatherAPIResponse = {
  Locations: {
    DatasetDescription: string;
    LocationsName: string;
    Dataid: string;
    Location: {
      LocationName: string;
      Geocode: string;
      Lat: string;
      Lon: string;
      WeatherElement: {
        ElementName: string;
        Description: string;
        Time: {
          StartTime: string;
          EndTime: string;
          ElementValue: {
            [Measures: string]: string;
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
