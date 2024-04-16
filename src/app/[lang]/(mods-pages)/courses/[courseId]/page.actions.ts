'use server';
import supabase_server from '@/config/supabase_server';

export const getComments = async (courseId: string, page: number = 1) => {
    const { data, error } = await supabase_server
        .from('course_comments')
        .select('*, courses(raw_id, name_zh, name_en, teacher_en, teacher_zh)')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false })
        .range((page - 1) * 10, page * 10 - 1)

    if (error) throw error;
    if (!data) throw new Error('No data');
    return data;
}
