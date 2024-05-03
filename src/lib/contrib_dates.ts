'use server';
import supabase_server from '@/config/supabase_server';
import { cookies } from 'next/headers';
import { getUserSession } from './headless_ais';
import { isSameDay } from 'date-fns';
import { id } from 'date-fns/locale';

export const getContribDates = async (raw_id: string) => {
    const { data, error } = await supabase_server.from('course_dates').select('*').eq('raw_id', raw_id);
    if(error) {
        console.error(error)
        return null;
    }
    else return data.map(d => ({
        id: d.id,
        type: d.type,
        title: d.title,
        date: d.date
    }));
}

export const submitContribDates = async (raw_id: string, dates: { id?: number, type: string, title: string, date: string }[]) => {
    const accessToken = cookies().get('accessToken')?.value;
    const session = await getUserSession(accessToken ?? '');
    if(!session) {
        return null;
    }
    //check if all dates are in yyyy-mm-dd format (We assume Taipei timezone, so no need to convert timezone)
    if(!dates.every(d => /^\d{4}-\d{2}-\d{2}$/.test(d.date))) {
        return null;
    }
    const oldContribDates = await getContribDates(raw_id) ?? [];
    // Filter out old unchanged dates
    const newDates = dates.filter(d => !oldContribDates.find(oldd => oldd.type == d.type && oldd.title == d.title && isSameDay(oldd.date, d.date)));
    // Check if updating id's exists in oldContribDates
    if(!newDates.filter(m => m.id).every(d => oldContribDates.find(oldd => oldd.id == d.id))) {
        return null;
    }
    const { data, error } = await supabase_server.from('course_dates').upsert(newDates.map(d => ({
        ...d.id ? { id: d.id } : {},
        raw_id,
        type: d.type,
        title: d.title,
        date: d.date,
        submitter: session.studentid
    })), { onConflict: 'id', defaultToNull: false });

    // delete ids missing in newDates
    console.log('new', dates)
    const missingIds = oldContribDates.filter(oldd => !dates.find(d => d.id == oldd.id)).map(d => d.id);
    console.log('delete', missingIds)
    if(missingIds.length > 0) {
        const { data: delData, error: delError } = await supabase_server.from('course_dates').delete().in('id', missingIds);
        if(delError) {
            console.error(delError);
            return null;
        }
    }

    if(error) {
        console.error(error);
        return null;
    }
    else return true;

}