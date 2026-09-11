export type DiningSchedule = Record<string, string> & {
  saturday: string;
  sunday: string;
  weekday: string;
};

export type DiningShop = {
  area: string;
  image: string;
  name: string;
  note?: string;
  phone?: string;
  schedule: DiningSchedule;
};

export type DiningArea = {
  building: string;
  restaurants: DiningShop[];
};
