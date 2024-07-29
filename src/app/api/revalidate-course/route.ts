import { revalidatePath } from 'next/cache';
import {NextRequest, NextResponse} from 'next/server';

export const GET = async (request: NextRequest) => {
    revalidatePath('/[lang]/(mods-pages)/@modal/courses/[courseId]')
    revalidatePath('/[lang]/(mods-pages)/courses/[courseId]')
    return NextResponse.json({ status: 200, body: { message: 'success' } })
}