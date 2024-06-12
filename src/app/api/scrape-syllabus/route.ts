import supabase_server from "@/config/supabase_server";
import { NextRequest, NextResponse } from "next/server";
import iconv from 'iconv-lite';
import jsdom from 'jsdom';

const downloadPDF = async (url: string, c_key: string) => {
    //get url+c_key file as a arrayBuffer
    const file = await fetch(url, {cache: 'no-cache'})
                        .then(res => res.arrayBuffer())
                        .then(arrayBuffer => Buffer.from(arrayBuffer))
    //save file to local fs
    // await fs.writeFileSync(c_key + '.pdf', file)
    await supabase_server.storage.from('syllabus').upload(c_key+ '.pdf', file, {
        cacheControl: (60*60*24*30).toString(), // cache the file for 30days
        upsert: true,
        contentType: 'application/pdf'
    }).then(res => {
        console.log(res)
    })
}

const parseContent = async (html: string, c_key: string) => {
    console.log('parsing '+ c_key)
    const dom = new jsdom.JSDOM(html);
    const doc = dom.window.document;
    const brief = doc.querySelectorAll('table')[4]?.querySelector('.class2')?.textContent;
    const keywords = doc.querySelector("p")?.textContent;
    let content = null;
    if(doc.querySelectorAll('table')[5]?.querySelector('.class2')?.textContent?.includes('觀看上傳之檔案(.pdf)')) {
        const url = 'https://www.ccxp.nthu.edu.tw' + doc.querySelectorAll('table')[5]?.querySelector('.class2 a')?.getAttribute('href');
        downloadPDF(url, c_key);
    }
    else {
        content = doc.querySelectorAll('table')[5]?.querySelector('.class2')?.textContent
    }

    return {brief, keywords, content};
}

const getAnonACIX = async () => {
    const url = 'https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/6/6.2/6.2.6/JH626001.php';
    //the url should return a 302 redirect to a url with ACIXSTORE as `JH626001.php?ACIXSTORE=xxxx`
    const ACIXSTORE = await fetch(url, {redirect: 'manual'})
                            .then(res => res.headers.get('location'))
                            .then(location => location?.split('=')[1])
    return ACIXSTORE;
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
    
    const fetchCourses = async () => {
        const { data, error } = await supabase_server
            .from('courses')
            .select('raw_id')
            .eq('semester', semester)
            .order('raw_id', { ascending: true })
        if(error) throw error;
        return data;
    }

    const ACIXSTORE = await getAnonACIX();

    if(ACIXSTORE === null) return NextResponse.json({ error: 'ACIXSTORE not found' }, { status: 400 });

    const baseURL = `https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/common/Syllabus/1.php?ACIXSTORE=${ACIXSTORE}&c_key=`;

    const fetchSyllabusHTML = async (c_key: string) => {
        const text = await fetch(baseURL + encodeURIComponent(c_key))
                            .then(res => res.arrayBuffer())
                            .then(arrayBuffer => new TextDecoder('big5').decode(new Uint8Array(arrayBuffer)))
        return text;
    }
    const courses = await fetchCourses();   
    // await Promise.all(courses.map(async course => {
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
    // }))
    for(const course of courses) {
        const { raw_id } = course;
        const html = await fetchSyllabusHTML(raw_id);
        const {brief, keywords, content} = await parseContent(html, raw_id);
        console.log('scrapped', raw_id, brief)
        const { error } = await supabase_server.from('course_syllabus').upsert({
            raw_id, 
            brief, 
            keywords: keywords?.split(',') ?? [], 
            content, 
            has_file: content === null ? true : false
        });

        if(error) throw error;
    }
    return NextResponse.json({ message: 'success' }, { status: 200 });
}

