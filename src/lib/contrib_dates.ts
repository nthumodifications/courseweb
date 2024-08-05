'use server';
import supabase_server from '@/config/supabase_server';
import { cookies } from 'next/headers';
import { isSameDay } from 'date-fns';
import { id } from 'date-fns/locale';
import { ServerAction } from '@/types/actions';
import {getCurrentUser} from '@/lib/firebase/auth';

export const getContribDates = async (raw_id: string) => {
    cookies();
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

export const submitContribDates: ServerAction = async (raw_id: string, dates: { id?: number, type: string, title: string, date: string }[]) => {
    const session = await getCurrentUser();
    try {
        if(!session) throw new Error('Not logged in');
        //check if all dates are in yyyy-mm-dd format (We assume Taipei timezone, so no need to convert timezone)
        if(!dates.every(d => /^\d{4}-\d{2}-\d{2}$/.test(d.date))) throw new Error('Invalid date format');

        const oldContribDates = await getContribDates(raw_id) ?? [];
        // Filter out old unchanged dates
        const newDates = dates.filter(d => !oldContribDates.find(oldd => oldd.type == d.type && oldd.title == d.title && isSameDay(new Date(oldd.date), new Date(d.date))));
        // Check if updating id's exists in oldContribDates
        if(!newDates.filter(m => m.id).every(d => oldContribDates.find(oldd => oldd.id == d.id))) throw new Error('Invalid date id');
        if(newDates.length > 0) {
            const { data, error } = await supabase_server.from('course_dates').upsert(newDates.map(d => ({
                ...d.id ? { id: d.id } : {},
                raw_id,
                type: d.type,
                title: d.title,
                date: d.date,
                submitter: session.uid
            })), { onConflict: 'id', defaultToNull: false });
            if(error) throw new Error('Failed to update dates');
            
            await supabase_server.from('course_logs').insert({
                raw_id,
                action: `added ${newDates.filter(d => !d.id).length} dates and updated ${newDates.filter(d => d.id).length} dates`,
                user: session.uid,
            });
        }

        const missingIds = oldContribDates.filter(oldd => !dates.find(d => d.id == oldd.id)).map(d => d.id);
        if(missingIds.length > 0) {
            const { data: delData, error: delError } = await supabase_server.from('course_dates').delete().in('id', missingIds);
            await supabase_server.from('course_logs').insert({
                raw_id,
                action: `deleted ${missingIds.length} dates`,
                user: session.uid,
            });
            if(delError) throw new Error('Failed to delete dates');
        }

        else return true;
    } catch (error) {
        if(error instanceof Error) return {
            error: {
                message: error.message
            }
        
        }
    }
}