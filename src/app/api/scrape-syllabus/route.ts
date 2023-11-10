import supabase_server from "@/config/supabase_server";
import { NextResponse } from "next/server";
import iconv from 'iconv-lite';
import jsdom from 'jsdom';
import fs from 'fs';
import https from 'https';

const fetchCourses = async () => {
    const { data, error } = await supabase_server
        .from('courses')
        .select('raw_id')
        .eq('semester', '11120')
        .order('raw_id', { ascending: true })
    if(error) throw error;
    return data;
}

const downloadPDF = async (url: string, c_key: string) => {
    //get url+c_key file as a arrayBuffer
    console.log(url)
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


export const GET = async (request: Request) => {
    // return not imlemented error
    return { status: 501, body: { error: 'Not implemented' } };
    
    const { searchParams } = new URL(request.url)
    const ACIXSTORE = searchParams.get('ACIXSTORE');
    if(ACIXSTORE === null) return NextResponse.json({ error: 'ACIXSTORE not provided' }, { status: 400 });

    const baseURL = `https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/common/Syllabus/1.php?ACIXSTORE=${ACIXSTORE}&c_key=`;

    const fetchSyllabusHTML = async (c_key: string) => {
        const text = await fetch(baseURL + encodeURIComponent(c_key))
                            .then(res => res.arrayBuffer())
                            .then(arrayBuffer => iconv.decode(Buffer.from(arrayBuffer), 'big5').toString())
        return text;
    }
    const courses = await fetchCourses();   
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

