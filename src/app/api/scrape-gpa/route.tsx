import jsdom from 'jsdom';
import supabase_server from '@/config/supabase_server';
import {NextResponse} from 'next/server';
import iconv from 'iconv-lite';
import fs from 'fs/promises';

const parseContent = async (html: string) => {
    console.log('parsing ')
    const dom = new jsdom.JSDOM(html);
    const doc = dom.window.document;
    const rows = doc.body.getElementsByTagName('table')[0]?.getElementsByTagName('tr');
    const courses = [];
    //first two rows are headers
    for(let i = 1047; i < rows!.length; i++) {
    // for(let i = 2; i < 3; i++) {
        const row = rows![i];
        console.log(i, rows.length)
        const cells = row.getElementsByTagName('td');
        const raw_id = cells[0].textContent!;
        const enrollment = cells[3].textContent!;
        const avgGPA = cells[4].textContent!;
        const stdDev = cells[5].textContent!;
        const avg = cells[6].textContent!;
        const std = cells[7].textContent!;

        
        const type = avgGPA.trim().length > 0 ? 'gpa' : avg.trim().length > 0 ? 'percent' : 'none';
        const { error } = await supabase_server.from('course_scores').upsert({
          raw_id,
          enrollment: parseInt(enrollment),
          type,
          average: type == 'gpa' ? parseFloat(avgGPA) : type == 'percent' ? parseFloat(avg) : 0,
          std_dev: type == 'gpa' ? parseFloat(stdDev) : type == 'percent' ? parseFloat(std) : 0,
        });
        if(error) console.log(error)
    }
    // console.log(courses);

    console.log('done')
}

export const GET = async (request: Request) => {
    const authHeader = request.headers.get('authorization');
    if (process.env.NODE_ENV == 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', {
        status: 401,
      });
    }

    // const text = await fetch(baseURL + encodeURIComponent(c_key))
    //                 .then(res => res.arrayBuffer())
    //                 .then(arrayBuffer => iconv.decode(Buffer.from(arrayBuffer), 'big5').toString())

    //read from files 11120.html, then decode from big5
    const html = await fs.readFile('./11120.html')
                    .then(buffer => iconv.decode(buffer, 'big5').toString())
    // for(const course of courses) {
    //     const { raw_id } = course;
    //     const html = await fetchSyllabusHTML(raw_id);
    //     const {brief, keywords, content} = await parseContent(html, raw_id);
    //     console.log('scrapped', raw_id, brief)
    //     const { error } = await supabase_server.from('course_syllabus').upsert({
    //         raw_id, 
    //         brief, 
    //         keywords: keywords?.split(',') ?? [], 
    //         content, 
    //         has_file: content === null ? true : false
    //     });

    //     if(error) throw error;
    // }

    await parseContent(html);
    return NextResponse.json({ message: 'success' }, { status: 200 });
}

