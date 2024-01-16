'use client';
import GradesViewer from './GradesViewer';
import { GradeObject } from '@/types/grades';
import useSWR from 'swr';
import { useSettings } from '@/hooks/contexts/settings';
import { AISLoading } from '@/components/Pages/AISLoading';
import { AISError } from '@/components/Pages/AISError';

const StudentGradesPage = () => {
    const { initializing, getACIXSTORE } = useSettings();
    
    const { data: grades, isLoading, error } = useSWR<GradeObject>([initializing], async ([init]) => {
        if(init) return null;
        const token = await getACIXSTORE();
        const res = await fetch('/api/ais_headless/grades?ACIXSTORE='+token);
        const data = await res.json();
        return data;
    });
    if (error) return <AISError/>
    if (isLoading || !grades) return <AISLoading/>
    return <GradesViewer grades={grades!}/>
}

export default StudentGradesPage;