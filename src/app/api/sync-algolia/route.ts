import supabase_server from '@/config/supabase_server';
import {Database} from '@/types/supabase';
import algolia from '@/config/algolia_server';
import {NextRequest, NextResponse} from 'next/server';
import { kv } from "@vercel/kv";


const syncCoursesToAlgolia = async (semester: string) => {
    const query = await supabase_server.from('courses').select('*, course_syllabus(brief, keywords)').eq('semester', semester);

    if(!query.data) throw new Error('no data found');

    const chunked = query.data.map(m => ({...m, ...m.course_syllabus})).reduce((acc, cur, i) => {
        const index = Math.floor(i / 500);
        acc[index] = acc[index] || [];
        acc[index].push(cur);
        return acc;
    }, [] as Database['public']['Tables']['courses']['Row'][][]);

    for(const chunk of chunked) {
        const algoliaChunk = chunk.map(({ elective_for, compulsory_for , ...course}) => ({
            ...course, 
            for_class: [...(elective_for || []), ...(compulsory_for || [])],
            objectID: course.raw_id,
            separate_times: course.times.flatMap(s => s.match(/.{1,2}/g)),
        }))
        algolia.saveObjects(algoliaChunk);
    }

    await kv.set('COURSE_SYNCED_ON', new Date().toISOString());

}

export const GET = async (request: NextRequest) => {
    const authHeader = request.headers.get('authorization');
    if (process.env.NODE_ENV == 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', {
        status: 401,
      });
    }

    const semester = request.nextUrl.searchParams.get('semester');

    if(!semester) throw new Error('semester is required');

    await syncCoursesToAlgolia(semester);
    return NextResponse.json({ status: 200, body: { message: 'success' } })

}
    