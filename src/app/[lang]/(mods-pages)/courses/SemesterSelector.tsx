import { useEffect, useMemo } from 'react';
import useCustomMenu from '@/app/[lang]/(mods-pages)/courses/useCustomMenu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toPrettySemester } from '@/helpers/semester';
import { lastSemester, semesterInfo } from '@/const/semester';

const SemesterSelector = () => {
    // refine semester for semester selector
    const {
        items,
        refine,
        canRefine,
    } = useCustomMenu({
        attribute: 'semester',
    });

    useEffect(() => {
        if (canRefine && !items.find(item => item.isRefined)) {
            // default to the latest semester
            refine(lastSemester.id);
        }
    }, [canRefine, items]);

    const handleSelect = (v: string) => {
        refine(v);
    }

    const selected = useMemo(() => items.find(item => item.isRefined)?.value, [items]);

    return <Select value={selected} onValueChange={handleSelect}>
        <SelectTrigger className="w-[200px] border-0 bg-transparent h-0">
            <SelectValue placeholder="Semester" />
        </SelectTrigger>
        <SelectContent>
            {[...semesterInfo].sort((a, b) => parseInt(b.id) - parseInt(a.id)).map(item => <SelectItem value={item.id} key={item.id}>
                {toPrettySemester(item.id)} 學期
            </SelectItem>)}
        </SelectContent>
    </Select>

}

export default SemesterSelector;