'use server';
import {getServerSession} from 'next-auth';
import {redirect} from 'next/navigation';
import supabase_server from '@/config/supabase_server';
import { authConfig } from '@/app/api/auth/[...nextauth]/route';

export const getUserCdsSelections = async (term: string) => {
    const session = await getServerSession(authConfig);
    if(session == null || !session.user) return redirect('/');

    //get user cds saves
    const { data: cdsSaves, error: error1 } = await supabase_server
        .from('cds_saves')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('term', term)

    if(error1) throw error1;

    const selection = cdsSaves.length > 0 ? cdsSaves[0].selection : [];

    //get user selections
    const { data: preferenceCourses = [], error: error2 } = await supabase_server.from('cds_courses').select('*').in('raw_id', selection);
    if(error2) throw error2;
    
    return preferenceCourses ?? [];
}

export const saveUserSelections = async (term: string, selections: string[]) => {
    const session = await getServerSession(authConfig);
    if(session == null || !session.user) return redirect('/');

    console.log(session);

    //get user cds saves
    //get user cds saves
    const { data: cdsSaves, error: error1 } = await supabase_server
    .from('cds_saves')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('term', term)

    if(error1) throw error1;

    //If previous save exists, update it, otherwise create a new one
    if(cdsSaves.length > 0) {
        const { error: error2 } = await supabase_server
            .from('cds_saves')
            .update({ selection: selections, updated_at: new Date().toISOString() })
            .eq('id', cdsSaves[0].id)
        if(error2) throw error2;
    }
    else {
        const { error: error2 } = await supabase_server
            .from('cds_saves')
            .insert({ user_id: session.user.id, term: term, selection: selections, updated_at: new Date().toISOString() })
        if(error2) throw error2;
    }
}
