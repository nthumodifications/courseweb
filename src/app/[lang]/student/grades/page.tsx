'use client';
import {getACIXSTORE} from '@/types/headless_ais';
import GradesViewer from './GradesViewer';
import { GradeObject } from '@/types/grades';
import useSWR from 'swr';
import { useSettings } from '@/hooks/contexts/settings';

const StudentGradesPage = () => {
    const { ais } = useSettings();
    const { data: grades, isLoading, error } = useSWR<GradeObject>([ais.ACIXSTORE], async ([token]) => {
        const res = await fetch('/api/ais_headless/grades?ACIXSTORE='+token);
        return await res.json();
    }, {refreshInterval: 1000});

    if (isLoading) return <div>Loading...</div>
    return <GradesViewer grades={grades!}/>
}

export default StudentGradesPage;