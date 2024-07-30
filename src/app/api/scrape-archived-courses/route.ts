import supabase_server from "@/config/supabase_server";
import { fullWidthToHalfWidth } from "@/helpers/characters";
import { Database } from "@/types/supabase";
import jsdom from 'jsdom';
import iconv from 'iconv-lite';
import { NextRequest, NextResponse } from "next/server";

import { Department } from "@/types/courses";
import { departments } from "@/const/departments";
import { writeFile } from "fs/promises";

const baseUrl = `https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/6/6.2/6.2.9/JH629002.php`;

export const GET = async (request: NextRequest, _try = 0) => {
    const authHeader = request.headers.get('authorization');

    if (process.env.NODE_ENV == 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', {
        status: 401,
      });
    }

    const semester = request.nextUrl.searchParams.get('semester');

    if(!semester) throw new Error('semester is required');

    if(_try == 3) {
        return NextResponse.json({ success: false, body: { error: "登入出錯，但不知道爲什麽 :( Something wrong, idk why." }});
    }
    let tries = 0, ACIXSTORE = "", answer = "";
    do {
        tries++;
        const url = 'https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/6/6.2/6.2.9/JH629001.php';
        const res = await fetch(url, {
            "headers": {
              "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
              "accept-language": "en-US,en;q=0.9",
              "cache-control": "max-age=0",
              "sec-ch-ua": "\"Microsoft Edge\";v=\"125\", \"Chromium\";v=\"125\", \"Not.A/Brand\";v=\"24\"",
              "sec-ch-ua-mobile": "?0",
              "sec-ch-ua-platform": "\"Windows\"",
              "sec-fetch-dest": "document",
              "sec-fetch-mode": "navigate",
              "sec-fetch-site": "same-site",
              "sec-fetch-user": "?1",
              "upgrade-insecure-requests": "1"
            },
            "body": null,
            "method": "GET",
            "mode": "cors",
            "credentials": "include",
            "cache": "no-cache"
          });
        const body = await res.text();
        if(!body) {
            continue;
        }
        const bodyMatch = body.match(/auth_img\.php\?ACIXSTORE=([a-zA-Z0-9_-]+)/);
        if(!bodyMatch) {
            continue;
        }
        ACIXSTORE = bodyMatch[1];
        //fetch the image from the url and send as base64
        console.log("ACIXSTORE: ", ACIXSTORE)
        answer = await fetch(`https://ocr.nthumods.com/?url=https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/mod/auth_img/auth_img.php?ACIXSTORE=${ACIXSTORE}`)
                    .then(res => res.text())
        console.log(answer)
        if(answer.length == 3) break;
    } while (tries <= 5);
    if(tries == 6 || answer.length != 3) {
        throw "Internal Server Error";
    }

    const fetchCourses = async (department: Department, yearSemester: string) => {
    
        const response = await fetch(baseUrl, {
            body: new URLSearchParams({
                "cache-control": "max-age=0",
                'ACIXSTORE': `${ACIXSTORE}`,
                'YS': `${yearSemester.slice(0, 3)}|${yearSemester.slice(3, 5)}`,
                'cond': 'a',
                'cou_code': `${department.code}`,
                'auth_num': `${answer}`,
            }),
            method: "POST",
            "cache": "no-cache"
        });
        return response;
    }

    
    const normalizedCourses: Database['public']['Tables']['courses']['Insert'][] = [];

    await Promise.all(departments.map(async (department) => {
        console.log(`Scraping ${department.code} ${semester}...`);

        const text = await fetchCourses(department, semester)
            .then(res => res.arrayBuffer())
            .then(arrayBuffer => new TextDecoder('big5').decode(new Uint8Array(arrayBuffer)))

        const dom = new jsdom.JSDOM(text);
        const doc = dom.window.document;
        
        const table = Array.from(doc.querySelectorAll('table')).find(n => (n.textContent?.trim() ?? "").startsWith('科號'));

        const rows = Array.from(table?.querySelectorAll('tr') ?? []);
        for (let i = 2; i < rows.length; i+=2) {
            const row = rows[i];
            const cells = row.querySelectorAll('td');

            const course_id = cells[0].textContent?.trim() ?? '';
            if (course_id === '') { continue; }
            
            const course_name = cells[1].innerHTML.split('<br>').map(text => text.trim());
            const course_name_zh = course_name[0];
            const course_name_en = course_name[1];
            const course_ge_type = course_name[2];

            const credit = cells[2].textContent?.trim() ?? '0';
            
            const time: string[] = [];
            if (cells[3].textContent?.trim()) {
                time.push(cells[3].textContent?.trim());
            }

            const venues: string[] = [];
            if (cells[4].textContent?.split('／')[0].trim()) {
                venues.push(cells[4].textContent?.split('／')[0].trim());
            }
            
            const teacher_en: string[] = [];
            const teacher_zh: string[] = [];   
            const teacher_names = cells[5].innerHTML.split('<br>').map(text => 
                text.replace(/<[^>]*>/g, '')
                    .replace(/&nbsp;/gi, ' ')
                    .trim()
            );
            
            teacher_names.forEach((name, index) => {
                if (index % 2 === 0) {
                    teacher_zh.push(name);
                } else {
                    teacher_en.push(name);
                }
            });

            let reserve = 0;
            const size_limit = cells[6].textContent?.trim() ?? '';
            if (size_limit.includes('新生保留')) {
                reserve = parseInt(size_limit.split('新生保留')[1].replace('人', ''));
            }

            const note = cells[7].textContent?.trim() ?? '';
            const normalizedNote = fullWidthToHalfWidth(note);
            
            let course_restriction = '';
            const cross_discipline: string[] = [];
            const first_specialty: string[] = [];
            const second_specialty: string[] = [];
            let remark = '';

            const note_html = cells[7].innerHTML.split('<br>');

            note_html.forEach((text) => {
                if (text.includes('<font color="black">')) {
                    let cleanedText = text.replace(/<[^>]*>/g, '')
                                        .replace(/&nbsp;/gi, ' ')
                                        .trim();
                    
                    course_restriction = cleanedText;
                } else if (text.includes('<font color="blue">')) {
                    let cleanedText = text.replace(/<[^>]*>/g, '')
                                        .replace(/&nbsp;/gi, ' ')
                                        .trim();
                    
                    cleanedText.split('/').forEach((text) => {
                        cross_discipline.push(text.replace('(跨領域)', ''));
                    });
                } else if (text.includes('<font color="#5F04B4">')) {
                    let cleanedText = text.replace(/<[^>]*>/g, '')
                                        .replace(/&nbsp;/gi, ' ')
                                        .trim();
                    
                    cleanedText.split('/').forEach((text) => {
                        if (text.includes('(第一專長)')) {
                            first_specialty.push(text.replace('(第一專長)', ''));
                        } else if (text.includes('(第二專長)')) {
                            second_specialty.push(text.replace('(第二專長)', ''));
                        }
                    }
                    );
                } else if (text.includes('<font color="#0404B4">')) {
                    let cleanedText = text.replace(/<[^>]*>/g, '')
                                        .replace(/&nbsp;/gi, ' ')
                                        .trim();
                    // replace empty string case to be ' ' so that it will be exactly
                    // the same as sync-courses function
                    if (cleanedText !== '')
                        remark = cleanedText;
                    else 
                        remark = ' ';
                }
            });

            const tags = [];
            const weeks = normalizedNote.includes('16') ? 16:
                        normalizedNote.includes('18') ? 18: 0;
            if(weeks != 0) tags.push(weeks+'週')
                const hasXClass = normalizedNote.includes('X-Class') ? true: false;
            if(hasXClass) tags.push('X-Class')
                const no_extra_selection = normalizedNote.includes('《不接受加簽 No extra selection》')
            if(no_extra_selection) tags.push('不可加簽')

            const enrollment = cells[8].textContent?.trim() ?? '';

            // replace empty string case to be ' ' so that it will be exactly
            // the same as sync-courses function
            let object = cells[9].textContent?.trim();
            if (object === '') {
                object = ' ';
            }
            
            const comp: string[] = [];
            const elect: string[] = [];  

            const required_optional_note_cell = rows[i+1].querySelectorAll('td')[0].textContent?.trim().replace('/', '');
            const required_optional_note = required_optional_note_cell?.split(',').filter(text => text.trim() !== '');

            required_optional_note?.forEach(note => {
                if (note.includes('必修')) {
                    comp.push(note.replace('必修', '').trim());
                } else {
                    elect.push(note.replace('選修', '').trim());
                }
            });

            const prerequisites = cells[10].textContent?.trim() ?? '';
            
            //check if the course is already added
            if (normalizedCourses.find(course => course.raw_id === course_id)) continue;
            normalizedCourses.push({
                capacity: parseInt(size_limit),
                course: course_id.slice(9, 13),
                department: course_id.slice(5, 9).trim(),
                semester: course_id.slice(0, 5),
                class: parseInt(course_id.slice(13, 15)).toString(),
                name_en: course_name_en,
                name_zh: course_name_zh,
                teacher_en: teacher_en,
                teacher_zh: teacher_zh,
                credits: parseInt(credit),
                reserve: reserve,
                ge_type: course_ge_type,
                ge_target: object,
                language: note.includes('/Offered in English') ? "英":"中",
                compulsory_for: comp,
                elective_for: elect,
                venues: venues,
                times: time,
                first_specialization: first_specialty,
                second_specialization: second_specialty,
                cross_discipline: cross_discipline,
                tags: tags,
                no_extra_selection: note.includes('《不接受加簽 No extra selection》'),
                note: remark,
                closed_mark: '',
                prerequisites: prerequisites,
                restrictions: course_restriction,
                raw_id: course_id,
                enrolled: parseInt(enrollment) ?? 0,
            });


        }
    }));

    // [DEBUG]: write to file
    // Write courses data to a JSON file for the current year
    const fileName = `courses_${semester}.json`;
    await writeFile(fileName, JSON.stringify(normalizedCourses, null, 4));
    
    // update supabase, check if the course with the same raw_id exists, if so, update it, otherwise insert it
    //split array into chunks of 1000
    
    const chunked = normalizedCourses.reduce((acc, cur, i) => {
        const index = Math.floor(i / 500);
        acc[index] = acc[index] || [];
        acc[index].push(cur);
        return acc;
    }, [] as Database['public']['Tables']['courses']['Insert'][][]);
    for(const chunk of chunked) {
        const { error } = await supabase_server.from('courses').upsert(chunk);
        if(error) throw error;
    }

    return NextResponse.json({ status: 200, body: { message: 'success' } })

}