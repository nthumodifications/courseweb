import supabase from '@/config/supabase';
import { parse } from 'node-html-parser';
import {CourseJoinWithSyllabus} from '@/config/supabase';
import {selectMinimalStr} from '@/types/courses';
import { getServerSession } from 'next-auth';
import authConfig from '@/app/api/auth/[...nextauth]/authConfig';


export const getCourseWithSyllabus = async (courseId: string) => {
    const { data, error } = await supabase
        .from('courses')
        .select(`
        *,
        course_syllabus (
            *
        ),
        course_scores (
            *
        ),
        course_dates (
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
        .select(selectMinimalStr)
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

                const excessiveText = `===================個人想寫的公告===================
//↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓
有鑑於學校目前把很多科目的成績分布都不公開處理，導致選課資訊的流通被強力阻撓，
希望大家能夠多多發文寫每科的修課心得，讓後面要修課的人得到比較透明的資訊！希望
大家多多幫忙，不管是要發Dcard或臉書的通識平台都好，或者如果你願意發表到ptt上但
苦於沒有帳號，我可以協助代PO！
需要我代PO的話，請登入google帳號後，填寫下列兩個表單其一:
一、    https://tg.pe/x3Ls (推薦版本，因為寫word檔可以存檔休息，不怕電腦突然中
斷)
二、    https://tg.pe/xQHL
我收到表單之後，應該會在一星期內貼出來。
希望大家多多參與！不管是通識課或專業科目都好，否則目前版上的文章看起來是快被電
資院的課程佔據了
//↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑
===================個人想寫的公告===================

`;

                const contentWithoutExcessiveText = content.replace(excessiveText, '');

                const date = post!.querySelectorAll('.article-meta-value')[3]?.text;
                const review = { content: contentWithoutExcessiveText, date };
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