import GreenLineIcon from "./GreenLineIcon"
import NandaLineIcon from "./NandaLineIcon"
import RedLineIcon from "./RedLineIcon"

const RouteIcon = ({ route_name }: { route_name: string }) => {
    switch(route_name) {
        case 'GU': return <GreenLineIcon/>
        case 'GUS': return <GreenLineIcon/>
        case 'GD': return <GreenLineIcon/>
        case 'GDS': return <GreenLineIcon/>
        case 'RU': return <RedLineIcon/>
        case 'RUS': return <RedLineIcon/>
        case 'RD': return <RedLineIcon/>
        case 'RDS': return <RedLineIcon/>
        case 'NG': return <NandaLineIcon/>
        case 'NB': return <NandaLineIcon/>
        default : return <></>
    }
}

export default RouteIcon;