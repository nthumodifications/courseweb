import { getMainBuses, getNandaBuses } from "./page.actions";
import { LangProps } from "@/types/pages";
import BusDetailsContainer from "./BusDetailsContainer";
import { RedLineIcon } from "@/components/BusIcons/RedLineIcon";
import { GreenLineIcon } from "@/components/BusIcons/GreenLineIcon";
import { NandaLineIcon } from "@/components/BusIcons/NandaLineIcon";
import { redirect } from "next/navigation";
import { getDictionary } from "@/dictionaries/dictionaries";

type BusRouteDetailsPageProps = {
  params: {
    route: string;
  };
};

const BusRouteDetailsPage = async ({
  params: { lang, route },
}: BusRouteDetailsPageProps & LangProps) => {
  const dict = await getDictionary(lang);
  if (route == "main") {
    const details = await getMainBuses();

    return (
      <BusDetailsContainer
        routes={[
          {
            Icon: RedLineIcon,
            title: dict.bus.red_line,
          },
          {
            Icon: GreenLineIcon,
            title: dict.bus.green_line,
          },
        ]}
        up={{
          title: dict.bus.to + dict.bus.tsmc,
          info: details.toward_TSMC_building_info,
          weekday: details.weekday_bus_schedule_toward_TSMC_building,
          weekend: details.weekend_bus_schedule_toward_TSMC_building,
        }}
        down={{
          title: dict.bus.to + dict.bus.north_gate,
          info: details.toward_main_gate_info,
          weekday: details.weekday_bus_schedule_toward_main_gate,
          weekend: details.weekend_bus_schedule_toward_main_gate,
        }}
      />
    );
  } else if (route == "nanda") {
    const details = await getNandaBuses();

    return (
      <BusDetailsContainer
        routes={[
          {
            Icon: NandaLineIcon,
            title: dict.bus.nanda_line,
          },
        ]}
        up={{
          title: dict.bus.to + dict.bus.nanda,
          info: details.toward_south_campus_info,
          weekday: details.weekday_bus_schedule_toward_south_campus,
          weekend: details.weekend_bus_schedule_toward_south_campus,
        }}
        down={{
          title: dict.bus.to + dict.bus.main_campus,
          info: details.toward_main_campus_info,
          weekday: details.weekday_bus_schedule_toward_main_campus,
          weekend: details.weekend_bus_schedule_toward_main_campus,
        }}
      />
    );
  } else {
    redirect(`/${lang}/bus`);
  }
};

export default BusRouteDetailsPage;
