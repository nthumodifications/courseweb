import iconv from 'iconv-lite';
import jsdom from 'jsdom';
import {NextRequest, NextResponse} from 'next/server';

const getLatestCourses = async (ACIXSTORE: string) => {
    const html1 = await fetch(`https://www.ccxp.nthu.edu.tw/ccxp/COURSE/JH/7/7.2/7.2.1/JH721002.php?ACIXSTORE=${ACIXSTORE}`, {
            "headers": {
                "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "accept-language": "en-US,en;q=0.9",
                "sec-ch-ua": "\"Not A(Brand\";v=\"99\", \"Microsoft Edge\";v=\"121\", \"Chromium\";v=\"121\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "frame",
                "sec-fetch-mode": "navigate",
                "sec-fetch-site": "same-origin",
                "sec-fetch-user": "?1",
                "upgrade-insecure-requests": "1"
            },
            "body": null,
            "method": "GET",
            "mode": "cors",
            "credentials": "include"
        })
        .then(res => res.arrayBuffer())
        .then(arrayBuffer => iconv.decode(Buffer.from(arrayBuffer), 'big5').toString())
    const dom1 = new jsdom.JSDOM(html1);
    const doc1 = dom1.window.document;
    const semester = Array.from(doc1.querySelectorAll('select')[0].querySelectorAll('option'))[1].value
    const phaseArr = Array.from(doc1.querySelectorAll('select')[1].querySelectorAll('option'))
    const phase = phaseArr[phaseArr.length - 1].value;
    const stu_no = (doc1.querySelector('input[name=stu_no]') as HTMLInputElement).value;
    console.log(semester, phase, stu_no)

    const html = await fetch("https://www.ccxp.nthu.edu.tw/ccxp/COURSE/JH/7/7.2/7.2.1/JH721003.php", {
            "headers": {
                "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "accept-language": "en-US,en;q=0.9",
                "cache-control": "max-age=0",
                "content-type": "application/x-www-form-urlencoded",
                "sec-ch-ua": "\"Not A(Brand\";v=\"99\", \"Microsoft Edge\";v=\"121\", \"Chromium\";v=\"121\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "frame",
                "sec-fetch-mode": "navigate",
                "sec-fetch-site": "same-origin",
                "sec-fetch-user": "?1",
                "upgrade-insecure-requests": "1"
            },
            "body": `ACIXSTORE=${ACIXSTORE}&stu_no=${stu_no}&act=on&sem_changed=&semester=${encodeURIComponent(semester)}&phase=${phase}&Submit=%BDT%A9w+go`,
            "method": "POST",
            "mode": "cors",
            "credentials": "include"
        })
        .then(res => res.arrayBuffer())
        .then(arrayBuffer => iconv.decode(Buffer.from(arrayBuffer), 'big5').toString())
    const dom = new jsdom.JSDOM(html);
    const doc = dom.window.document;
    const raw_ids = Array.from(doc.querySelectorAll('table')[1].querySelectorAll('tbody > .class3')).map(n => n.children[0].textContent)

    return {
        semester: semester.split(',').join(''),
        phase,
        studentid: stu_no,
        courses: raw_ids
    };
}

export const GET = async (req: NextRequest) => {
    const ACIXSTORE = req.nextUrl.searchParams.get('ACIXSTORE')
    if(!ACIXSTORE) {
        return NextResponse.redirect('/');
    }
    const data = await getLatestCourses(ACIXSTORE as string);
    return NextResponse.json(data);
}