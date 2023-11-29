import { Alert } from '@mui/joy';
import { formatISO, parseISO, sub } from 'date-fns';
import { useState, useEffect } from 'react';
import { AlertTriangle } from 'react-feather';
import useTime from '@/hooks/useTime';
import { Database } from '@/types/supabase';
import { RealtimePostgresInsertPayload } from '@supabase/supabase-js';
import supabase from '@/config/supabase';

const BusDelayAlert = () => {
    const [show, setShow] = useState(false);
    const [reports, setReports] = useState<Database['public']['Tables']['delay_reports']['Row'][]>([]);
    const [text, setText] = useState<string>('');
    const time = useTime();

    useEffect(() => {
        //get all delay reports in the last 30 minutes
        supabase.from('delay_reports').select('*').gt('created_at', formatISO(sub(Date.now(), { minutes: 30 }))).then(({ data, error }) => {
            if (error) throw error;
            if (!data) throw new Error('No data');
            if (data.length == 0) return;
            setReports(data);
        })
    }, [])

    useEffect(() => {
        const channel = supabase
            .channel('schema-db-changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'delay_reports',
                },
                (payload: RealtimePostgresInsertPayload<Database['public']['Tables']['delay_reports']['Row']>) => {
                    const { new: mod } = payload;
                    if (mod.route == null) return;
                    setReports((reports) => {
                        if (reports.find(report => report.id == mod.id)) return reports;
                        return [...reports, mod]
                    });
                }
            )
            .subscribe()

        return () => {
            channel.unsubscribe();
        }
    }, []);

    useEffect(() => {
        //Filter reports that are 30 minutes old
        const filteredReports = reports.filter(mod => parseISO(mod.created_at).getTime() > Date.now() - 30 * 60 * 1000);
        if (filteredReports.length == 0) {
            setShow(false);
            return;
        }
        else {
            const routes = Array.from(new Set(reports.map(mod => mod.route)));
            const routeNames = routes.map(route => {
                switch (route) {
                    case 'R': return '紅線';
                    case 'G': return '綠線';
                    case 'N': return '南大線';
                }
            })
            setText(`誤點通報！影響的綫路有：${routeNames.join('、')}`);
            setShow(true);
        }
    }, [reports, time])

    if (!show) return <></>;

    return <div className='p-3'>
        <Alert variant='solid' color='warning' startDecorator={<AlertTriangle />}>
            {text}
        </Alert>
    </div>
}

export default BusDelayAlert;