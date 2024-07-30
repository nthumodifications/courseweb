import jsdom from 'jsdom';
import supabase_server from '@/config/supabase_server';
import {NextRequest, NextResponse} from 'next/server';
import iconv from 'iconv-lite';
import fs from 'fs/promises';
import {signInToCCXP} from '@/lib/headless_ais';


export const GET = async (request: NextRequest) => {
    const authHeader = request.headers.get('authorization');
    if (process.env.NODE_ENV == 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', {
        status: 401,
      });
    }

    const semester = request.nextUrl.searchParams.get('semester');

    if(!semester) throw new Error('semester is required');

    const user = await signInToCCXP(process.env.DONER_STUDENTID!, process.env.DONER_PASSWORD!);

    if('error' in user) {
      throw new Error(user.error.message);
    }

    const {ACIXSTORE} = user;

    const html = await fetch("https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/8/8.4/8.4.2/JH84202.php", {
        "headers": {
          "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "accept-language": "en-US,en;q=0.9",
          "cache-control": "max-age=0",
          "content-type": "application/x-www-form-urlencoded",
          "sec-ch-ua": "\"Microsoft Edge\";v=\"125\", \"Chromium\";v=\"125\", \"Not.A/Brand\";v=\"24\"",
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": "\"Windows\"",
          "sec-fetch-dest": "frame",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "same-origin",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1"
        },
        "body": `ACIXSTORE=${ACIXSTORE}&qyt=${semester.slice(0, 3)}|${semester.slice(3, 5)}&kwc=&kwt=&sort=ckey&Submit=%BDT%A9w+Submit`,
        "method": "POST",
        "mode": "cors",
        "credentials": "include",
        "cache": "no-cache"
    })
    .then(res => res.arrayBuffer())
    .then(arrayBuffer => new TextDecoder('big5').decode(new Uint8Array(arrayBuffer)))

    console.log('parsing ')
    const dom = new jsdom.JSDOM(html);
    const doc = dom.window.document;
    const rows = doc.body.getElementsByTagName('table')[0]?.getElementsByTagName('tr');
    const courses = [];
    //first two rows are headers
    for(let i = 2; i < rows!.length; i++) {
    // for(let i = 2; i < 3; i++) {
        const row = rows![i];
        const cells = row.getElementsByTagName('td');
        console.log(cells[0].textContent!)
        const raw_id = cells[0].textContent!;
        const enrollment = cells[3].textContent!;
        const avgGPA = cells[4].textContent!;
        const stdDev = cells[5].textContent!;
        const avg = cells[6].textContent!;
        const std = cells[7].textContent!;

        
        const type = avgGPA.trim().length > 0 ? 'gpa' : avg.trim().length > 0 ? 'percent' : 'none';
        courses.push({
          raw_id,
          enrollment: parseInt(enrollment),
          type,
          average: type == 'gpa' ? parseFloat(avgGPA) : type == 'percent' ? parseFloat(avg) : 0,
          std_dev: type == 'gpa' ? parseFloat(stdDev) : type == 'percent' ? parseFloat(std) : 0,
        });
    }
    
    const { data } = await supabase_server.from('courses').select('raw_id').eq('semester', semester).limit(4000);

    if(!data) throw new Error('failed to fetch data from supabase');

    // only add scores that for courses in data
    const scores = courses.filter(course => data.some(d => d.raw_id == course.raw_id));
    
    const { error } = await supabase_server.from('course_scores').upsert(scores);

    if(error) console.error(error)

    console.log('done')

    return NextResponse.json({ message: 'success' }, { status: 200 });
}

