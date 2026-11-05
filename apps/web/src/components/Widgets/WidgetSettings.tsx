import { type ReactNode, useState } from "react";
import { Link } from "react-router-dom";
import { useLocalStorage } from "usehooks-ts";
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@courseweb/ui";
import { LAUNDRY_DORMS, type LaundryDorm } from "@/const/laundry-machines";
import { useSettings } from "@/hooks/contexts/settings";
import useDictionary from "@/dictionaries/useDictionary";
import { contentLanguage } from "@/helpers/contentLanguage";
import { useLocalizedZhData } from "@/hooks/useLocalizedZh";
import { useVenueOccupancy } from "@/hooks/useVenueOccupancy";
import { useYouBikeStations } from "@/hooks/useYouBikeStations";
import { getPinnedStationIds, togglePinnedStationId } from "@/lib/youbike";
import {
  laundryDormStorageOptions,
  type LaundryDormPreference,
} from "@/lib/laundry-dorm-storage";
import { getCityBusRoutes } from "@/libs/citybus";
import {
  isBusPinned,
  useBusPins,
  type BusPin,
  type CampusBusPin,
} from "@/features/bus/busPins";
import { useQuery } from "@tanstack/react-query";
import areas from "@/app/[lang]/(mods-pages)/shops/areas.json";

const SettingField = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <div className="flex flex-col gap-2">
    <div className="text-sm font-medium">{label}</div>
    {children}
  </div>
);

export const LaundryWidgetSettings = () => {
  const dict = useDictionary();
  const { language } = useSettings();
  const [dorm, setDorm] = useLocalStorage<LaundryDormPreference>(
    "laundry_my_dorm",
    "all",
    laundryDormStorageOptions,
  );
  return (
    <SettingField label={dict.laundry.my_dorm}>
      <Select
        value={dorm || "all"}
        onValueChange={(value) => setDorm(value as LaundryDormPreference)}
      >
        <SelectTrigger aria-label={dict.laundry.my_dorm}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{dict.laundry.all_dorms}</SelectItem>
          {(Object.keys(LAUNDRY_DORMS) as LaundryDorm[]).map((item) => (
            <SelectItem key={item} value={item}>
              {LAUNDRY_DORMS[item][contentLanguage(language)]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </SettingField>
  );
};

export const LibraryWidgetSettings = () => {
  const dict = useDictionary();
  const [branch, setBranch] = useLocalStorage("widget_library_branch", "all");
  const branches = ["all", "main", "moonlight", "hss", "ctm"] as const;
  const labels = {
    all: dict.library.filter_branch_all,
    main: dict.library.filter_branch_main,
    moonlight: dict.library.filter_branch_moonlight,
    hss: dict.library.filter_branch_hss,
    ctm: dict.library.filter_branch_ctm,
  };
  return (
    <SettingField label={dict.library.filter_branch_all}>
      <Select
        value={
          branches.includes(branch as (typeof branches)[number])
            ? branch
            : "all"
        }
        onValueChange={setBranch}
      >
        <SelectTrigger aria-label={dict.library.filter_branch_all}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {branches.map((item) => (
            <SelectItem key={item} value={item}>
              {labels[item]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </SettingField>
  );
};

export const ShopsWidgetSettings = () => {
  const dict = useDictionary();
  const { language } = useSettings();
  const localizeData = useLocalizedZhData();
  const [area, setArea] = useLocalStorage("widget_shops_area", "anywhere");
  return (
    <SettingField label={dict.shops.area_placeholder}>
      <Select value={area} onValueChange={setArea}>
        <SelectTrigger aria-label={dict.shops.area_placeholder}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="anywhere">{dict.shops.area_all}</SelectItem>
          {areas.map((item) => (
            <SelectItem key={item} value={item}>
              {localizeData(item)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </SettingField>
  );
};

export const SportsWidgetSettings = () => {
  const dict = useDictionary();
  const [venueId, setVenueId] = useLocalStorage("widget_sports_venue", "all");
  const { data = [] } = useVenueOccupancy();
  return (
    <SettingField label={dict.sports.title}>
      <Select value={venueId} onValueChange={setVenueId}>
        <SelectTrigger aria-label={dict.sports.title}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{dict.common.all}</SelectItem>
          {data.map((item) => (
            <SelectItem key={item.project_id} value={item.project_id}>
              {item.project_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </SettingField>
  );
};

export const YouBikeWidgetSettings = () => {
  const dict = useDictionary();
  const { language } = useSettings();
  const { data } = useYouBikeStations();
  const [pinnedIds, setPinnedIds] = useLocalStorage<string[]>(
    "courseweb_youbike_pinned_stations",
    getPinnedStationIds(),
  );
  const toggle = (id: string) => {
    const next = togglePinnedStationId(id);
    setPinnedIds(next);
  };
  return (
    <SettingField label={dict.youbike.tabs.mine}>
      <div className="flex flex-col divide-y divide-border">
        {(data?.stations ?? []).slice(0, 40).map((station) => {
          const pinned = pinnedIds.includes(station.id);
          return (
            <button
              key={station.id}
              type="button"
              className="flex items-center justify-between gap-2 py-2 text-left text-sm"
              onClick={() => toggle(station.id)}
            >
              <span className="min-w-0 truncate">
                {language === "en" ? station.nameEn : station.nameZh}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {pinned ? dict.youbike.unpin : dict.youbike.pin}
              </span>
            </button>
          );
        })}
      </div>
    </SettingField>
  );
};

const CAMPUS_PINS: CampusBusPin[] = [
  { kind: "campus", line: "red", direction: "up" },
  { kind: "campus", line: "green", direction: "up" },
  { kind: "campus", line: "route1", direction: "up" },
  { kind: "campus", line: "route2", direction: "up" },
];

export const BusWidgetSettings = () => {
  const dict = useDictionary();
  const { language } = useSettings();
  const { pins, toggle } = useBusPins();
  const cityPins = pins.filter(
    (pin): pin is Extract<BusPin, { kind: "city" }> => pin.kind === "city",
  );
  const { data } = useQuery({
    queryKey: ["citybus_static_index"],
    queryFn: getCityBusRoutes,
    staleTime: 60 * 60 * 1000,
  });
  const [citySelection, setCitySelection] = useState("");
  const cityOptions = (data?.routes ?? []).flatMap((route) =>
    route.directions.flatMap((direction) =>
      direction.campusStops.map((stop) => ({
        id: `${route.id}:${direction.id}:${stop.id}`,
        pin: {
          kind: "city" as const,
          routeId: route.id,
          directionId: direction.id,
          stopId: stop.id,
          routeNameZh: route.nameZh,
          routeNameEn: route.nameEn,
          stopNameZh: stop.nameZh,
          stopNameEn: stop.nameEn,
        },
        label:
          language === "en"
            ? `${route.nameEn} · ${stop.nameEn}`
            : `${route.nameZh}・${stop.nameZh}`,
      })),
    ),
  );
  const lineLabel = (line: CampusBusPin["line"]) =>
    ({
      red: dict.bus.red_line,
      green: dict.bus.green_line,
      route1: dict.bus.route1_line,
      route2: dict.bus.route2_line,
    })[line];
  return (
    <div className="flex flex-col gap-4">
      <SettingField label={dict.bus.campus_bus}>
        <div className="flex flex-col divide-y divide-border">
          {CAMPUS_PINS.map((pin) => (
            <button
              key={`${pin.line}:${pin.direction}`}
              type="button"
              onClick={() => toggle(pin)}
              className="flex items-center justify-between py-2 text-left text-sm"
            >
              <span>{lineLabel(pin.line)}</span>
              <span className="text-xs text-muted-foreground">
                {isBusPinned(pins, pin)
                  ? dict.bus.remove_bus
                  : dict.bus.add_bus}
              </span>
            </button>
          ))}
        </div>
      </SettingField>
      <SettingField label={dict.bus.city_buses}>
        <Select
          value={citySelection}
          onValueChange={(id) => {
            const option = cityOptions.find((item) => item.id === id);
            if (option && !isBusPinned(pins, option.pin)) toggle(option.pin);
            setCitySelection("");
          }}
        >
          <SelectTrigger aria-label={dict.bus.city_catalogue}>
            <SelectValue placeholder={dict.bus.city_catalogue} />
          </SelectTrigger>
          <SelectContent>
            {cityOptions.slice(0, 100).map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex flex-col divide-y divide-border">
          {cityPins.map((pin) => (
            <button
              key={`${pin.routeId}:${pin.stopId}`}
              type="button"
              onClick={() => toggle(pin)}
              className="flex items-center justify-between gap-2 py-2 text-left text-sm"
            >
              <span className="min-w-0 truncate">
                {language === "en"
                  ? `${pin.routeNameEn} · ${pin.stopNameEn}`
                  : `${pin.routeNameZh}・${pin.stopNameZh}`}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {dict.bus.remove_bus}
              </span>
            </button>
          ))}
          {!data?.routes.length && (
            <span className="py-2 text-sm text-muted-foreground">
              {dict.bus.city_unavailable}
            </span>
          )}
        </div>
        <Link
          className="text-sm text-primary underline underline-offset-4"
          to={`/${language}/bus`}
        >
          {dict.bus.browse_lines}
        </Link>
      </SettingField>
    </div>
  );
};

export const WeatherWidgetSettings = () => {
  const dict = useDictionary();
  const [days, setDays] = useLocalStorage("widget_weather_days", 4);
  return (
    <SettingField
      label={
        dict.settings.calendar.widget_dashboard.widget_settings.weather_days
      }
    >
      <Input
        aria-label={
          dict.settings.calendar.widget_dashboard.widget_settings.weather_days
        }
        type="number"
        min={1}
        max={5}
        step={1}
        value={days}
        onChange={(event) =>
          setDays(
            Math.min(
              5,
              Math.max(1, Math.floor(Number(event.target.value) || 1)),
            ),
          )
        }
      />
    </SettingField>
  );
};

export const CountdownWidgetSettings = () => {
  const dict = useDictionary();
  const labels = dict.settings.calendar.widget_dashboard.widget_settings;
  const [title, setTitle] = useLocalStorage("widget_countdown_title", "");
  const [date, setDate] = useLocalStorage("widget_countdown_date", "");
  return (
    <div className="flex flex-col gap-4">
      <SettingField label={labels.countdown_title}>
        <Input
          aria-label={labels.countdown_title}
          maxLength={40}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </SettingField>
      <SettingField label={labels.countdown_date}>
        <Input
          aria-label={labels.countdown_date}
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
      </SettingField>
      {(date || title) && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setTitle("");
            setDate("");
          }}
        >
          {labels.reset}
        </Button>
      )}
    </div>
  );
};

export const UpcomingEventsWidgetSettings = () => {
  const dict = useDictionary();
  const labels = dict.settings.calendar.widget_dashboard.widget_settings;
  const [windowDays, setWindowDays] = useLocalStorage(
    "widget_upcoming_window_days",
    7,
  );
  const [maxEvents, setMaxEvents] = useLocalStorage(
    "widget_upcoming_max_events",
    5,
  );
  return (
    <div className="flex flex-col gap-4">
      <SettingField label={labels.upcoming_days}>
        <Select
          value={String(windowDays)}
          onValueChange={(value) => setWindowDays(Number(value))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[3, 7, 14, 30].map((value) => (
              <SelectItem key={value} value={String(value)}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingField>
      <SettingField label={labels.upcoming_count}>
        <Select
          value={String(maxEvents)}
          onValueChange={(value) => setMaxEvents(Number(value))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[3, 5, 8, 10].map((value) => (
              <SelectItem key={value} value={String(value)}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingField>
    </div>
  );
};
