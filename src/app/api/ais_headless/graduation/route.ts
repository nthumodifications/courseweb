import jsdom from 'jsdom';
import iconv from 'iconv-lite';
import { NextRequest, NextResponse } from 'next/server';


const getGraduationRequirements = async (ACIXSTORE: string) => {
    const baseURL = 'https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/2/2.2/2.2.4/JH224002.php?ACIXSTORE=';
    const html = await fetch(baseURL + ACIXSTORE)
                    .then(res => res.arrayBuffer())
                    .then(arrayBuffer => iconv.decode(Buffer.from(arrayBuffer), 'big5').toString())
    const dom = new jsdom.JSDOM(html);
    const doc = dom.window.document;
    const table = Array.from(doc.querySelectorAll('table')).find(n => (n.textContent?.trim() ?? "").startsWith('學號：'));

    if(!table) {
        return null;
    }

    const student_info_row = table.querySelector('tr');
    const student_info_tds = student_info_row?.querySelectorAll('td');

    if (!student_info_tds) {
        return null;
    }

    const student_id = student_info_tds[0]?.textContent?.trim().split('：')[1];
    const name_zh = student_info_tds[1]?.textContent?.trim().split('：')[1];
    const minimum_credits = student_info_tds[2]?.textContent?.trim().split('：')[1];

    const student = {
        student_id,
        name_zh,
        minimum_credits,
    };

    const credits_info = Array.from(doc.querySelectorAll('div')).find(n => (n.textContent?.trim() ?? "").startsWith('已修及格學分數：'))?.textContent?.trim(); 
    const credits_info_regex = /已修及格學分數：(?<completed_credits>.+)　成績未到學分數：(?<ongoing_credits>.+)表列科目及學分數/;
    const credits_info_match = credits_info?.match(credits_info_regex);
    const credits = {
        completed_credits: credits_info_match?.groups?.completed_credits,
        ongoing_credits: credits_info_match?.groups?.ongoing_credits,
    }

    const electives_info = Array.from(doc.querySelectorAll('table'))
    .find(n => (n.textContent?.trim() ?? "").startsWith('院學士班專業必選修'))?.textContent?.trim().split('\n');
    
    const electives_types: { course_name_zh: string; course_name_en: string; course_credit: number; }[] = [];
    
    electives_info?.forEach(line => {
        let course_name_zh = '';
        let course_name_en = '';
        let course_credit = 0;
    
        const creditsMatch = line.match(/(\d+|[０-９]+)學分/);
        let creditStartIndex;
    
        if (creditsMatch) {
            creditStartIndex = creditsMatch.index;
            course_credit = parseInt(creditsMatch[0].replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xFEE0)), 10);
        }
    
        if (line.includes('「') && line.includes('」課程')) {
            const zhStart = line.indexOf('「') + 1;
            const zhEnd = line.indexOf('」');
            course_name_zh = line.substring(zhStart, zhEnd);
            course_name_en = line.substring(line.indexOf('課程') + 2, creditStartIndex).trim();
        } else {
            course_name_zh = line.substring(2, line.search(/[A-Za-z]/)).trim();
            course_name_en = line.substring(line.search(/[A-Za-z]/), creditStartIndex).trim();
        }

        if (course_name_zh && course_name_en && course_credit) {
            electives_types.push({
                course_name_zh,
                course_name_en,
                course_credit
            });
        }
    });

    interface Course {
        course_id: string;
        course_name_zh: string;
        course_credits: number;
        studied_credits: number;
        grade: string;
        electives_type?: string;
      }
      
    interface GroupedCourses {
        key: string;
        courses: Course[];
    }
    
    let grouped_electives_courses: GroupedCourses[] = [];
    
    let temporaryCourses: Course[] = [];
    
    const electives_courses_table = Array.from(doc.querySelectorAll('table')).filter(n => (n.textContent?.trim() ?? "").startsWith('科號'));
    const electrives_table = electives_courses_table[0];
    const rows = electrives_table?.querySelectorAll('tr');
    if (!rows) return;
    
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.querySelectorAll('td');
        if (cells.length < 8) continue;
    
        const course_id = cells[0].textContent?.trim() ?? "";
        const course_name_zh = cells[1].textContent?.trim() ?? "";
        const course_credits = parseInt(cells[2].textContent?.trim() ?? "0");
        const studied_credits = parseInt(cells[3].textContent?.trim() || "0");
        const grade = cells[4].textContent?.trim() ?? "";
        const electives_type = cells[7].textContent?.trim() ?? '';
    
        const match = course_name_zh.match(/_____以上是 (\d+) 選 (\d+)_____/);
        if (match) {
            const [total] = match.slice(1).map(Number);
            const [choose] = match.slice(2).map(Number);
            const groupedCourses: GroupedCourses = {
                key: `Grouped ${total} choose ${choose}`,
                courses: temporaryCourses.slice(-total)
            };
            grouped_electives_courses.push(groupedCourses);
            temporaryCourses = temporaryCourses.slice(0, temporaryCourses.length - total);
        } 
        else {
            const course: Course = {
                course_id,
                course_name_zh,
                course_credits,
                studied_credits,
                grade,
                electives_type
            };
            temporaryCourses.push(course);
        }
    }

    const courses: Course[] = temporaryCourses;

    function groupCoursesByElectivesType(courses: Course[]): Record<string, Course[]> {
        return courses.reduce((acc, course) => {
            if (!course.electives_type) {
                return acc;
            }
            if (!acc[course.electives_type]) {
                acc[course.electives_type] = [];
            }
            acc[course.electives_type].push(course);
            return acc;
        }, {} as Record<string, Course[]>);
    }
    
    const individual_electives_courses = groupCoursesByElectivesType(courses);


    const data = Array.from(doc.querySelectorAll('table')).find(n => (n.textContent?.trim() ?? "").startsWith('其他選修'))?.textContent?.trim().split('\n');

    const other_electives_info: { [key: string]: string[] } = {};
    let curr_other_electives_type = '';

    data?.forEach(line => {
        line = line.trim();
        
        const chineseNumeralsRegex = /(一、|二、|三、|四、|五、|六、|七、|八、|九、|十、)/;
        const digitRegex = /\(\d+\)/;
        const match = chineseNumeralsRegex.exec(line);

        if (match) {
            const numeral = match[0];
            const splitText = line.split(numeral);
            const other_electives_type = splitText[1] ? splitText[1].trim() : ""; 
            
            if(!other_electives_info[other_electives_type]) {
                other_electives_info[other_electives_type] = [];
            }
            curr_other_electives_type = other_electives_type;
        } else {
            if(curr_other_electives_type === '') return;

            let course_credit = 0;
            const creditsMatch = line.match(/(\d+|[０-９]+)學分/);
            let creditStartIndex;
        
            if (creditsMatch) {
                creditStartIndex = creditsMatch.index;
                course_credit = parseInt(creditsMatch[0].replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xFEE0)), 10);
            }

            const zhStart = line.indexOf(')') + 1;
            const zhEnd = line.indexOf('：');
            const course_type = line.substring(zhStart, zhEnd);
            other_electives_info[curr_other_electives_type].push({
                course_type,
                course_credit,
            } as any as string);
        }
      });

    const other_electives_courses: {
        course_id: string;
        course_name_zh: string;
        course_credits: number;
        grade: string;
    }[] = [];
    

    const other_electives_table = electives_courses_table[1];
    const other_electives_table_rows = other_electives_table?.querySelectorAll('tr');

    if(!other_electives_table_rows) return;

    for (let i = 1; i < other_electives_table_rows.length; i++) {
        const row = other_electives_table_rows[i];
        const cells = row.querySelectorAll('td');
        const course_id = cells[0].textContent?.trim();
        const course_name_zh = cells[1].textContent?.trim();
        const course_credits = parseInt(cells[2].textContent?.trim() ?? "0");
        const grade = cells[3].textContent?.trim();
        
        other_electives_courses.push({
            course_id: course_id || '',
            course_name_zh: course_name_zh || '',
            course_credits,
            grade: grade || ''
        });
    }

    const calibration_required_table = Array.from(doc.querySelectorAll('table')).find(n => (n.textContent?.trim() ?? "").startsWith('領域類別'));
    const calibration_table_rows = calibration_required_table?.querySelectorAll('tr');

    if (!calibration_table_rows) return;

    interface DataStructure {
        必修學分: string;
        及格學分: string;
        尚缺學分數: string;
        備註: string;
    }
      
    const calibration_info: { [category: string]: { [subcategory: string]: DataStructure[] } } = {};
    
    for (let i = 1; i < calibration_table_rows.length; i++) {
        const row = calibration_table_rows[i];
        const cols = row.querySelectorAll('td');
        let category = cols[0]?.textContent?.trim();

        if (!category) continue;

        const requiredCredits = cols[1]?.textContent?.trim();

        const passedCredits = cols[2]?.textContent?.trim();
        const missingCredits = cols[3]?.textContent?.trim().replace(/\n/g, ' ');
        const remarks = cols[6]?.textContent?.trim();

        const objStructure = {
            必修學分: requiredCredits || '0',
            及格學分: passedCredits || '',
            尚缺學分數: missingCredits || '0',
            備註: remarks || ''
        };

        const isGESubCategory = (category?.includes('通識') && category !== '通識教育科目');
        const isSportsSubCategory = (category?.includes('體育') && category !== '體育');

        const temp1 = (requiredCredits?.includes('通識') && requiredCredits !== '通識教育科目' && category === '通識教育科目'); 
        const temp2 = (requiredCredits?.includes('體育') && requiredCredits !== '體育' && category === '體育'); 

        if (isGESubCategory) {
            if (!calibration_info['通識教育科目']) {
                calibration_info['通識教育科目'] = {};
            }
            if (!calibration_info['通識教育科目'][category]) {
                calibration_info['通識教育科目'][category] = [];
            }
            calibration_info['通識教育科目'][category].push(objStructure);
        } 
        else if (isSportsSubCategory) {
            if (!calibration_info['體育']) {
                calibration_info['體育'] = {};
            }
            if (!calibration_info['體育'][category]) {
                calibration_info['體育'][category] = [];
            }
            calibration_info['體育'][category].push(objStructure);
        } 
        else {
            if (temp1) {
                if (!requiredCredits) return;

                if (!calibration_info['通識教育科目']) {
                    calibration_info['通識教育科目'] = {};
                }
                if (!calibration_info['通識教育科目'][requiredCredits]) {
                    calibration_info['通識教育科目'][requiredCredits] = [];
                }
                calibration_info['通識教育科目'][requiredCredits].push(objStructure);
            } else if (temp2) {
                if (!requiredCredits) return;

                if (!calibration_info['體育']) {
                    calibration_info['體育'] = {};
                }
                if (!calibration_info['體育'][requiredCredits]) {
                    calibration_info['體育'][requiredCredits] = [];
                }
                calibration_info['體育'][requiredCredits].push(objStructure);
            } else {
                if (!calibration_info[category]) {
                    calibration_info[category] = {'_default': []};
                }
                calibration_info[category]['_default'].push(objStructure);
            }
        }
    }

    const ge_courses_info = Array.from(doc.querySelectorAll('p')).find(n => (n.textContent?.trim() ?? "").startsWith('科目名稱(學分)成績'))?.textContent?.trim().split('　');

    const ge_courses: { [key: string]: string[] } = {};
    let currGeType = '';

    if (!ge_courses_info) return;

    for (let i = 0; i < (ge_courses_info?.length ?? 0); i++) {
        
        if (ge_courses_info[i]?.includes('通識')) {
            if (ge_courses_info[i]?.includes('科目名稱(學分)')) {
                ge_courses_info[i] = ge_courses_info[i].replace('科目名稱(學分)成績', '');
            }
            const ge_type = ge_courses_info[i].split(':')[0];
            if (!ge_courses[ge_type]) {
                ge_courses[ge_type] = [];
            }
            currGeType = ge_type;
        } 
        else if (ge_courses_info[i].match(/\(\d+.*?\)/)) {
            const ge_course_name = ge_courses_info[i].split(/\(\d+.*?\)/)[0];
            const ge_grade = ge_courses_info[i].split(/\(\d+.*?\)/)[1];

            const start = ge_courses_info[i].indexOf('(') + 1;
            const end = ge_courses_info[i].indexOf(')');
            const ge_credits = ge_courses_info[i].substring(start, end);

            ge_courses[currGeType].push({
                ge_course_name,
                ge_grade,
                ge_credits
            } as any as string);
        }
    }

    return {
        student,
        credits,
        electives_types,
        grouped_electives_courses,
        individual_electives_courses,
        other_electives_info,
        other_electives_courses,
        calibration_info,
        ge_courses
    };

}


export const GET = async (req: NextRequest) => {
    const ACIXSTORE = req.nextUrl.searchParams.get('ACIXSTORE')
    if(!ACIXSTORE) {
        return NextResponse.redirect('/');
    }
    const data = await getGraduationRequirements(ACIXSTORE as string);
    return NextResponse.json(data);
}
