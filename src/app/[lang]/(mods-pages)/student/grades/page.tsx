'use client';;
import GradesViewer from './GradesViewer';
import { GradeObject } from '@/types/grades';
import useSWR from 'swr';
import { AISLoading } from '@/components/Pages/AISLoading';
import { AISError } from '@/components/Pages/AISError';
import { useHeadlessAIS } from '@/hooks/contexts/useHeadlessAIS';
import { AISNotLoggedIn } from '@/components/Pages/AISNotLoggedIn';

const StudentGradesPage = () => {
    const { initializing, getACIXSTORE, ais, loading, error:  aisError } = useHeadlessAIS();
    
    const { data: grades, isLoading, error } = useSWR<GradeObject>([initializing], async ([init]) => {
        if(init) return null;
        const token = await getACIXSTORE();
        const res = await fetch('/api/ais_headless/grades?ACIXSTORE='+token);
        const data = await res.json();
        return data;
    });
    if (!ais.enabled) return <AISNotLoggedIn/>
    if (error || aisError) return <AISError/>
    if (isLoading || !grades) return <AISLoading/>
    return <GradesViewer grades={grades!}/>
}

export default StudentGradesPage;