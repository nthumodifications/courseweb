import {Checkbox, Chip} from '@mui/joy';
import {useEffect, useState} from 'react';

const RoutesFilterChips = ({ enabledRoutes, setFilter }: { enabledRoutes: string[], setFilter: (routes: string[]) => void }) => {
    const [selected, setSelected] = useState<string[]>(enabledRoutes);

    useEffect(() => {
        setFilter(selected);
    }, [selected])

    const handleFilter = (route: string) => {
        if(selected.includes(route)) {
            setSelected(selected.filter(r => r != route));
        } else {
            setSelected([...selected, route]);
        }
    }
    return <div className='flex flex-row flex-wrap gap-2 px-4 py-2'>
        {enabledRoutes.includes('G') && <Chip startDecorator={<div className='w-2 h-2 rounded-full bg-[#00CA2C]'></div>}>
            <Checkbox
                overlay
                disableIcon
                label="綠線"
                variant="outlined"
                checked={selected.includes('G')}
                onChange={() => handleFilter('G')}
            />
        </Chip>}
        {enabledRoutes.includes('R') && <Chip startDecorator={<div className='w-2 h-2 rounded-full bg-[#E4280E]'></div>}>
            <Checkbox
                overlay
                disableIcon
                label="紅線"
                variant="outlined"
                checked={selected.includes('R')}
                onChange={() => handleFilter('R')}
            />
        </Chip>}
        {enabledRoutes.includes('N') && <Chip startDecorator={<div className='w-2 h-2 rounded-full bg-[#8A00DE]'></div>}>
            <Checkbox
                overlay
                disableIcon
                variant="outlined"
                label="南大線"
                checked={selected.includes('N')}
                onChange={() => handleFilter('N')}
            />
        </Chip>}
    </div>
}

export default RoutesFilterChips;