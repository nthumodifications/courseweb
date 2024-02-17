import GreenLineIcon from "./GreenLineIcon"
import NandaLineIcon from "./NandaLineIcon"
import RedLineIcon from "./RedLineIcon"
import {BusRoute, BusLine} from '@/const/bus';

const RouteIcon = ({ route, line }: { route: BusRoute, line?: BusLine }) => {
    const routecode = route + (line ?? '');
    switch(routecode) {
        case '校園公車red': return <RedLineIcon/>
        case '校園公車green': return <GreenLineIcon/>
        case '南大區間車': return <NandaLineIcon/>
        default : return <></>
    }
}

export default RouteIcon;