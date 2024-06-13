import { departments } from '@/const/departments';
import { signInToCCXP } from '@/lib/headless_ais';
import { getLatestCourseEnrollment } from '@/lib/headless_ais/courses';
import { writeFileSync } from 'fs';
import {NextRequest, NextResponse} from 'next/server';

export const GET = async (request: NextRequest, _try = 0) => {
    const authHeader = request.headers.get('authorization');

    if (process.env.NODE_ENV == 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', {
        status: 401,
      });
    }

    const user = await signInToCCXP(process.env.DONER_STUDENTID!, process.env.DONER_PASSWORD!);

    if('error' in user) {
      throw new Error(user.error.message);
    }

    const {ACIXSTORE} = user;

    const courses = (await Promise.all(departments.map(async dept => await getLatestCourseEnrollment(ACIXSTORE, dept.code)))).flat();
    //save into file
    writeFileSync('courses.json', JSON.stringify(courses), 'utf8');
    return NextResponse.json(courses);
}
