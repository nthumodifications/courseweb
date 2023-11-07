import supabase from '@/config/supabase';
import { parse } from 'node-html-parser';
import {CourseJoinWithSyllabus} from '@/config/supabase';


export const getCourseWithSyllabus = async (courseId: string) => {
    const { data, error } = await supabase
        .from('courses')
        .select(`
        *,
        course_syllabus (
            *
        )
        `)
        .eq('raw_id', courseId);
    if(error) {
        console.error(error)
        return null;
    }
    else return data![0] as unknown as CourseJoinWithSyllabus;
}


export const getCourse = async (courseId: string) => {
    const { data, error } = await supabase.from('courses').select('*').eq('raw_id', courseId);
    if(error) {
        console.error(error)
        return null;
    }
    else return data![0];
}


export const getMinimalCourse = async (courseId: string) => {
    const { data, error } = await supabase
        .from('courses')
        .select('raw_id, name_zh, name_en, department, course, class, credits, venues, times, teacher_zh, language')
        .eq('raw_id', courseId);
    if(error) {
        console.error(error)
        return null;
    }
    else return data![0];
}

export const getCoursePTTReview = async (courseId: string) => {
    const course = await getCourse(courseId);
    //TODO: use better search to find the posts
    try {
        const PTTWEBSITE = `https://www.ptt.cc/bbs/NTHU_Course/search?q=`;
        const searchTerm = encodeURI(`${course!.name_zh} ${course!.teacher_zh?.join(' ')}`);
        const res = await fetch(`${PTTWEBSITE}${searchTerm}`, { cache: 'force-cache' });
        const html = await res.text();
        const root = parse(html);

        const posts_link = root.querySelectorAll('.r-ent');
        const reviews = [];
        for (const post_link of posts_link) {
            const link = post_link.querySelector('.title a');
            try {
                const res = await fetch(`https://www.ptt.cc${link!.attributes.href}`, { cache: 'force-cache' });
                const html = await res.text();
                const root = parse(html);
                const post = root.querySelector('#main-content');
                const fullContent = post!.text;
                const content = fullContent.split('看板NTHU_Course標題')[1].split('--')[0];
                const date = post!.querySelectorAll('.article-meta-value')[3]?.text;
                const review = { content, date };
                reviews.push(review);
            } catch (error) {
                console.error(error);
            }
        }   
        return reviews;
    } catch (error) {
        console.error(error);
        return [];
    } 
}

export const getClassList = async () => {
    const { data, error } = await supabase.from('distinct_classes').select('class');
    if(error) {
        console.error(error)
        return null;
    }
    else return data!;
}