import { CourseDefinition } from "@/config/supabase";

const baseUrl = `https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/OPENDATA/open_course_data.json`;

type APIResponse = {
    '科號': string,
    '課程中文名稱': string,
    '課程英文名稱': string,
    '學分數': string,
    '人限': string,
    '新生保留人數': string,
    '通識對象': string,
    '通識類別': string,
    '授課語言': string,
    '備註': string,
    '停開註記': string,
    '教室與上課時間': string,
    '授課教師': string,
    '擋修說明': string,
    '課程限制說明': string,
    '第一二專長對應': string,
    '學分學程對應': string,
    '不可加簽說明': string,
    '必選修說明': string
}[]

export const GET = async() => {
    
    const fetchCourses = async () => {
        const response = await fetch(baseUrl);
        const data = await response.json() as APIResponse;
        return data;
    }

    const courses = await fetchCourses();
    const normalizedCourses: CourseDefinition[] = [];
    for(const course of courses) {
        const comp: string[] = [];
        const elect: string[] = [];   
        course.必選修說明
        .split('\t')
        .slice(0,-1)
        .map(code => {
            const code_ = code.replace('  ', " ")
            const [classs, type] = code_.split(' ')
            // console.log(classs, type)
            if(classs == undefined || type == undefined) throw new Error('fformat error');
            if(type.trim().trimStart() === '必修') comp.push(classs);
            else elect.push(classs);
        })

        
        const venues: string[] = [];
        const times: string[] = [];   
        course.教室與上課時間
        .split('\n')
        .slice(0,-1)
        .map(code => {
            const [venue, time] = code.split('\t')
            venues.push(venue)
            times.push(time)
        })

        const first_specialty: string[] = [];
        const second_specialty: string[] = [];

        course['第一二專長對應']
        .split('\t')
        .forEach(text => {
            if(text.endsWith('(第二專長)')) {
                second_specialty.push(text.replace('(第二專長)', ''))
            }
            else if(text.endsWith('(第一專長)')) {
                first_specialty.push(text.replace('(第一專長)', ''))
            }
            else {
                throw 'sumting wong'
            }
        })

        normalizedCourses.push({
            capacity: parseInt(course['人限']),
            course: course['科號'].slice(9, 13),
            department: course['科號'].slice(5, 9).trim(),
            semester: course['科號'].slice(0, 5),
            class: course['科號'].slice(13, 15),
            name_en: course['課程英文名稱'],
            name_zh: course['課程中文名稱'],
            credits: parseInt(course['學分數']),
            reserve: parseInt(course['新生保留人數']),
            ge_type: course['通識類別'],
            ge_target: course['通識對象'],
            language: course['授課語言'],
            '備註': course['備註'],
            '停開註記': course['停開註記'],
            compulsory_for: comp,
            elective_for: elect,
            venues: venues,
            times: times,
            first_specialization: first_specialty,
            second_specialization: second_specialty,
        });

    }

}