import { getMainBuses, getNandaBuses } from "./page.actions";
import { LangProps } from "@/types/pages";
import BusDetailsContainer from "./BusDetailsContainer";
import { RedLineIcon } from "@/components/BusIcons/RedLineIcon";
import { GreenLineIcon } from "@/components/BusIcons/GreenLineIcon";
import { NandaLineIcon } from "@/components/BusIcons/NandaLineIcon";
import { redirect } from "next/navigation";

type BusRouteDetailsPageProps = {
    params: {
        route: string;
    }
}

const BusRouteDetailsPage = async ({ params: { lang, route }}: BusRouteDetailsPageProps & LangProps) => {
    if(route == "main") {
        const details = await getMainBuses()

        return <BusDetailsContainer 
            routes={[
                {
                    Icon: RedLineIcon,
                    title: "紅線"
                },
                {
                    Icon: GreenLineIcon,
                    title: "綠線"
                }
            ]} 
            up={{
                title: "台積電",
                info: details.toward_TSMC_building_info,
                weekday: details.weekday_bus_schedule_toward_TSMC_building,
                weekend: details.weekend_bus_schedule_toward_TSMC_building,
            }}
            down={{
                title: "北校門",
                info: details.toward_main_gate_info,
                weekday: details.weekday_bus_schedule_toward_main_gate,
                weekend: details.weekend_bus_schedule_toward_main_gate,
            }}
        />;
    } else if(route == "nanda") {
        const details = await getNandaBuses()

        return <BusDetailsContainer 
            routes={[
                {
                    Icon: NandaLineIcon,
                    title: "南大區間車"
                },
            ]} 
            up={{
                title: "南大校區",
                info: details.toward_south_campus_info,
                weekday: details.weekday_bus_schedule_toward_south_campus,
                weekend: details.weekend_bus_schedule_toward_south_campus,
            }}
            down={{
                title: "校本部",
                info: details.toward_main_campus_info,
                weekday: details.weekday_bus_schedule_toward_main_campus,
                weekend: details.weekend_bus_schedule_toward_main_campus,
            }}
        />;
    } else {
        redirect(`/${lang}/bus`);
    }
    
}

export default BusRouteDetailsPage;