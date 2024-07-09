import {NextRequest, NextResponse} from 'next/server';

export const GET = async (request: NextRequest) => {
    const authHeader = request.headers.get('authorization');
    if (process.env.NODE_ENV == 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', {
        status: 401,
      });
    }

    const semester = '11310';
    
    console.log('syncing courses uwu')

    await fetch('https://nthumods.com/api/scrape-archived-courses?semester='+semester, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${process.env.CRON_SECRET}`
        }
    });

    fetch('https://nthumods.com/api/scrape-syllabus?semester='+semester, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${process.env.CRON_SECRET}`
        }
    });   

    return NextResponse.json({ status: 200, body: { message: 'success' } })

}