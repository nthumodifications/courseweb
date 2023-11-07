import supabase_server from "@/config/supabase_server";
import { NextResponse } from "next/server";
import iconv from 'iconv-lite';
import fs from 'fs';
import https from 'https';

const fetchCourses = async () => {
    const { data, error } = await supabase_server
        .from('courses')
        .select('raw_id')
        .order('raw_id', { ascending: true })
    if(error) throw error;
    return data;
}

const downloadPDF = async (url: string, c_key: string) => {
    const file = fs.createWriteStream("temp/"+c_key+".pdf");
    https.get(url, function(response) {
        response.pipe(file);

        // after download completed close filestream
        file.on("finish", () => {
            file.close();
            console.log("Download Completed", c_key);
            supabase_server.storage.from('syllabus').upload(c_key+ '.pdf', fs.createReadStream("temp/"+c_key+".pdf"), {
                cacheControl: (60*60*24*30).toString(), // cache the file for 30days
                upsert: true,
            }).then(res => {
                console.log(res)
                //delete the file
                fs.unlink("temp/"+c_key+".pdf", (err) => {
                    if (err) {
                        console.error(err)
                        return
                    }
                    //file removed
                })
            }).catch(err => {
                console.error(err)
            })  
        });
    });
}

const parseContent = async (html: string, c_key: string) => {
    console.log('parsing '+ c_key)
    const dom = new DOMParser();
    const doc = dom.parseFromString(html, 'text/html');
    const brief = doc.querySelectorAll('table')[4]?.querySelector('.class2')?.textContent;
    const keywords = doc.querySelector("p")?.textContent;
    let content = null;
    if(doc.querySelectorAll('table')[5]?.querySelector('.class2')?.textContent?.includes('觀看上傳之檔案(.pdf)')) {
        const url = 'https://www.ccxp.nthu.edu.tw' + doc.querySelectorAll('table')[5]?.querySelector('.class2 a')?.getAttribute('href');
        await downloadPDF(url, c_key);
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
        console.log('scrapped', raw_id)
        await supabase_server.from('syllabus').insert({raw_id, brief, keywords, content, hasFile: content === null ? true : false});
    }
    return NextResponse.json({ message: 'success' }, { status: 200 });
}

