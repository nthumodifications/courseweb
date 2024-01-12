'use client';
import GradesViewer from './GradesViewer';
import { GradeObject } from '@/types/grades';
import useSWR from 'swr';
import { useSettings } from '@/hooks/contexts/settings';

const StudentGradesPage = () => {
    const { initializing, getACIXSTORE } = useSettings();
    
    const { data: grades, isLoading, error } = useSWR<GradeObject>([initializing], async ([init]) => {
        if(init) return null;
        const token = await getACIXSTORE();
        const res = await fetch('/api/ais_headless/grades?ACIXSTORE='+token);
        return await res.json();
    }, {refreshInterval: 1000});

    if (isLoading || !grades) return <div>Loading...</div>
    return <GradesViewer grades={grades!}/>
}

export default StudentGradesPage;