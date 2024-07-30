'use server';
import { parseHTML } from 'linkedom';

export const getStudentGrades = async (ACIXSTORE: string) => {
    const baseURL = 'https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/8/R/6.3/JH8R63002.php?ACIXSTORE=';
    const html = await fetch(baseURL + ACIXSTORE)
                    .then(res => res.arrayBuffer())
                    .then(arrayBuffer => new TextDecoder('big5').decode(new Uint8Array(arrayBuffer)))
    const dom = parseHTML(html);
    const doc = dom.document;
    const table = Array.from(doc.querySelectorAll('table')).find(n => (n.textContent?.trim() ?? "").startsWith('學號 Student Number'))

    if(!table) {
        return null;
    }
    //First Row:  學號 Student Number：{studentid}　　姓名 Name：{name_zh}　　班級 Department & Class：{class_name_zh}　　
    //Second Row p:  修習總學分(包含及格,不及格及成績未到) Total credits( including passing, failing, and not submitted grades)：{total_credits}　已修及格畢業學分 Passing grade：{passed_credits}　成績未到畢業學分 Not submitted grade：{pending_credits}
	//Third Row: Header
    //Fourth Row: Data(year, semester, course_id, course_name, credits, grade, ge_type, ranking, t_scores)	
    //Last Row: same as second row																	
    
    //extract student info
    const student_info = table.querySelector('tr')?.textContent?.trim(); //regex to extract student info
    const student_info_regex = /學號 Student Number：(?<studentid>.+)　　姓名 Name：(?<name_zh>.+)　　班級 Department & Class：(?<class_name_zh>.+)/;
    const student_info_match = student_info?.match(student_info_regex);
    const student = {
        studentid: student_info_match?.groups?.studentid,
        name_zh: student_info_match?.groups?.name_zh,
        class_name_zh: student_info_match?.groups?.class_name_zh
    }

    //extract credits
    const credits_info = table.querySelectorAll('tr')[1]?.querySelector('p')?.textContent?.trim();
    const credits_info_regex = /修習總學分\(包含及格,不及格及成績未到\) Total credits\( including passing, failing, and not submitted grades\)：(?<total_credits>.+)　已修及格畢業學分 Passing grade：(?<passed_credits>.+)　成績未到畢業學分 Not submitted grade：(?<pending_credits>.+)/;
    const credits_info_match = credits_info?.match(credits_info_regex);
    const credits = {
        total_credits: parseInt(credits_info_match?.groups?.total_credits ?? "0"),
        passed_credits: parseInt(credits_info_match?.groups?.passed_credits ?? "0"),
        pending_credits: parseInt(credits_info_match?.groups?.pending_credits ?? "0")
    }

    //Extract Grades
    const rows = table.querySelectorAll('tr');
    const grades = [];
    for(let i=3; i<rows.length-1; i++) {
        const row = rows[i];
        const cells = row.querySelectorAll('td');
        // console.log(cells[0].innerHTML);
        const year = cells[0].textContent?.trim();
        const semester = cells[1].textContent?.trim();
        const course_id = cells[2].textContent?.trim();
        const course_name_raw = cells[3].textContent?.trim().split('\n');
        const name_zh_ge = course_name_raw?.[0]?.trim() ?? "";
        const name_en = course_name_raw?.[2]?.trim() ?? "";
        const credits = parseInt(cells[4].textContent?.trim() ?? "0");
        const grade_text = cells[5].textContent?.trim();
        const grade = !grade_text?.startsWith('成績未到') ? grade_text : '成績未到';
        const ge_type = cells[6].textContent?.trim().replace('Elective GE course:','');
        const ranking = cells[7].querySelector('div')?.textContent?.trim();
        // console.log(cells[7].firstChild);
        const t_scores = cells[8].textContent?.trim();
        const [name_zh, ge_description] = name_zh_ge.split(' -- ');
        grades.push({
            raw_id: `${year}${semester}${course_id}`,
            year,
            semester,
            course_id,
            name_zh,
            name_en,
            credits,
            grade,
            ge_type,
            ge_description,
            ranking,
            t_scores
        });
    }

    //table[4]: ranking and grades
    //row 0: explanation
    //row 1,2: headers
    //row 3~: data(year, sem, gpa, t_score_avg, relative_avg, credits, actual_credits, num_of_courses, summer_credits, transfer_credits, letter_class_rank, letter_dept_rank, t_score_class_rank, t_score_dept_rank, relative_class_rank, relative_dept_rank, comments)
    //row 4: 等級制累計系排名/總人數、累計班排名/總人數、GPA(至{gpa_cum_year_tw}學年暑期)： {letter_cum_dept_rank}、{letter_cum_class_rank}、{gpa}
    // Letter Grade Cumulative Department ranking/Total number of students、GPA (to the summer classes of Academic Year {gpa_cum_year}): {letter_cum_dept_rank}、{letter_cum_class_rank}、{gpa}
    // 修課相對成績學業累計系排名/總人數、累計班排名/總人數、修課相對成績學業平均成績(至{gpa_cum_year_tw}學年暑期)： {relative_cum_dept_rank}、{relative_cum_class_rank}、{relative_cum}
    // Relative Grade Cumulative Department ranking/Total number of students、Relative Grade Average (to the summer classes of Academic Year {gpa_cum_year}): {relative_cum_dept_rank}、{relative_cum_class_rank}、{relative_cum}
    // T分數學業累計系排名/總人數、T分數成績學業平均成績(至{gpa_cum_year_tw}學年暑期)： {t_scores_cum_dept_rank}、{t_scores_cum_class_rank}、{t_scores_cum}
    // T Scores Cumulative Department ranking/Total number of students、T Scores Average (to the summer classes of Academic Year {gpa_cum_year}): {t_scores_cum_dept_rank}、{t_scores_cum_class_rank}、{t_scores_cum}
    
    // const ranking_table = doc.querySelectorAll('table')[3];
    const ranking_table = Array.from(doc.querySelectorAll('table')).find(n => (n.textContent?.trim() ?? "").startsWith('以下各排名僅供參考'));

    if(!ranking_table) {
        return null;
    }

    const ranking_rows = ranking_table.querySelectorAll('tr');
    const ranking_data = [];
    for(let i=3; i<ranking_rows.length - 1; i++) {
        const row = ranking_rows[i];
        const cells = row.querySelectorAll('td');
        const year = cells[0].textContent?.trim();
        const semester = cells[1].textContent?.trim();
        const gpa = cells[2].textContent?.trim();
        const t_score_avg = cells[3].textContent?.trim();
        const relative_avg = cells[4].textContent?.trim();
        const credits = parseInt(cells[5].textContent?.trim() ?? "0");
        const actual_credits = parseInt(cells[6].textContent?.trim() ?? "0");
        const num_of_courses = parseInt(cells[7].textContent?.trim() ?? "0");
        const summer_credits = parseInt(cells[8].textContent?.trim() ?? "0");
        const transfer_credits = parseInt(cells[9].textContent?.trim() ?? "0");
        const letter_class_rank = cells[10].textContent?.trim();
        const letter_dept_rank = cells[11].textContent?.trim();
        const t_score_class_rank = cells[12].textContent?.trim();
        const t_score_dept_rank = cells[13].textContent?.trim();
        const relative_class_rank = cells[14].textContent?.trim();
        const relative_dept_rank = cells[15].textContent?.trim();
        const comments = cells[16].textContent?.trim();
        ranking_data.push({
            year,
            semester,
            gpa,
            t_score_avg,
            relative_avg,
            credits,
            actual_credits,
            num_of_courses,
            summer_credits,
            transfer_credits,
            letter_class_rank,
            letter_dept_rank,
            t_score_class_rank,
            t_score_dept_rank,
            relative_class_rank,
            relative_dept_rank,
            comments
        });
    }
    //TODO: handle 112	10	**	**	**	**	**	**	**	**	-	-	-	-	-	-
    
    //extract cumulative ranking
    const ranking_cum_row = ranking_rows[ranking_rows.length - 1];
    const ranking_cum_cells = ranking_cum_row.querySelectorAll('td > div');
    // in each cell, get firstChild textContent which is the chinese text, then regex to extract the ranking and total number of students
    const letter_cum = Array.from(ranking_cum_cells[0]?.childNodes).find(n => n.textContent?.startsWith('等級制累計系排名'))?.textContent?.trim();
    const letter_cum_regex = /等級制累計系排名\/總人數、累計班排名\/總人數、GPA\(至(?<gpa_cum_year_tw>.+)\)： (?<letter_cum_dept_rank>.+)、(?<letter_cum_class_rank>.+)、(?<gpa>.+)/;
    const letter_cum_match = letter_cum?.match(letter_cum_regex);
    const letter = {
        gpa_cum_year_tw: letter_cum_match?.groups?.gpa_cum_year_tw,
        letter_cum_dept_rank: letter_cum_match?.groups?.letter_cum_dept_rank,
        letter_cum_class_rank: letter_cum_match?.groups?.letter_cum_class_rank,
        gpa: letter_cum_match?.groups?.gpa
    }
    const relative_cum = ranking_cum_cells[1].firstChild?.textContent?.trim();
    const relative_cum_regex = /修課相對成績學業累計系排名\/總人數、累計班排名\/總人數、修課相對成績學業平均成績\(至(?<gpa_cum_year_tw>.+)\)： (?<relative_cum_dept_rank>.+)、(?<relative_cum_class_rank>.+)、(?<relative_cum>.+)/;
    const relative_cum_match = relative_cum?.match(relative_cum_regex);
    const relative = {
        gpa_cum_year_tw: relative_cum_match?.groups?.gpa_cum_year_tw,
        relative_cum_dept_rank: relative_cum_match?.groups?.relative_cum_dept_rank,
        relative_cum_class_rank: relative_cum_match?.groups?.relative_cum_class_rank,
        relative_cum: relative_cum_match?.groups?.relative_cum
    }
    const t_scores_cum = ranking_cum_cells[2].firstChild?.textContent?.trim();
    const t_scores_cum_regex = /T分數學業累計系排名\/總人數、T分數成績學業平均成績\(至(?<gpa_cum_year_tw>.+)\)： (?<t_scores_cum_dept_rank>.+)、(?<t_scores_cum_class_rank>.+)、(?<t_scores_cum>.+)/;
    const t_scores_cum_match = t_scores_cum?.match(t_scores_cum_regex);
    const t_scores = {
        gpa_cum_year_tw: t_scores_cum_match?.groups?.gpa_cum_year_tw,
        t_scores_cum_dept_rank: t_scores_cum_match?.groups?.t_scores_cum_dept_rank,
        t_scores_cum_class_rank: t_scores_cum_match?.groups?.t_scores_cum_class_rank,
        t_scores_cum: t_scores_cum_match?.groups?.t_scores_cum
    }
    const ranking_cum = {
        letter,
        relative,
        t_scores
    }
    const ranking = {
        data: ranking_data,
        cumulative: ranking_cum
    }
    
    return {
        student,
        credits,
        grades,
        ranking
    };
}

