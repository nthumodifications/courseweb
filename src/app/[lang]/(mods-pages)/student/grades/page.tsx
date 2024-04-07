'use client';
import GradesViewer from './GradesViewer';
import { GradeObject } from '@/types/grades';
import { AISLoading } from '@/components/Pages/AISLoading';
import { AISError } from '@/components/Pages/AISError';
import { useHeadlessAIS } from '@/hooks/contexts/useHeadlessAIS';
import { AISNotLoggedIn } from '@/components/Pages/AISNotLoggedIn';
import { useQuery } from '@tanstack/react-query';

const StudentGradesPage = () => {
    const { initializing, getACIXSTORE, ais, loading, error:  aisError } = useHeadlessAIS();
    
    const { data: grades, isLoading, error } = useQuery<GradeObject>({
        queryKey: ['grades', initializing], 
        queryFn: async () => {
            if(initializing) return null;
            const token = await getACIXSTORE();
            const res = await fetch('/api/ais_headless/grades?ACIXSTORE='+token);
            const data = await res.json();
            return data;
        }
    });
    if (!ais.enabled) return <AISNotLoggedIn/>
    if (error || aisError) return <AISError/>
    if (isLoading || !grades) return <AISLoading/>
    return <GradesViewer grades={grades!}/>
}

export default StudentGradesPage;