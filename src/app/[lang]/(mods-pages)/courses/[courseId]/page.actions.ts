'use server';
import supabase_server from '@/config/supabase_server';

const getComments = async (courseId: string, page: number = 1) => {
    const { data, error } = await supabase_server
        .from('course_comments')
        .select('*, courses(raw_id, name_zh, name_en, teacher_en, teacher_zh)')
        .eq('courses', courseId)
        .order('posted_on', { ascending: false })
        .range((page - 1) * 10, page * 10 - 1)

    if (error) throw error;
    if (!data) throw new Error('No data');
    return data;
}

interface CommentData {
    courses: string;
    studentid: string;
    comment: string;
    scoring?: number;
    easiness?: number;
    attendance?: boolean;
    workload?: string;
    engagement?: boolean;
    pastMaterials?: boolean;
    posted_on: string;
}

const postComment = async (courseId: string, studentid: string, commentText: string) => {
    const parsedData = parseTemplate(commentText);
    console.log(parsedData)
    if (!parsedData) {
        throw new Error('Invalid comment data');
    }

    const commentData: CommentData = {
        courses: courseId,
        studentid,
        comment: parsedData.comment || '',
        ...parsedData,
        posted_on: new Date().toISOString(),
    };

    const { data, error } = await supabase_server.from('course_comments').insert([commentData]);

    if (error) {
        console.error('Error posting comment:', error);
        throw error;
    }

    console.log('Comment posted:', data);
};


const parseTemplate = (text: string): Partial<CommentData> => {
    const templateKeys = {
        'Scoring 甜度 (On 5 scale, where 1 is low and 5 is high satisfaction)': 'scoring',
        'Easiness 涼度 (On 5 scale, where 1 is most difficult and 5 is easiest)': 'easiness',
        'Does this course take attendance? (Yes/No)': 'attendance',
        'Workload (Estimate the average hours per week spent on this course)': 'workload',
        'Instructor\'s engagement (Does the instructor encourage questions and participation? Yes/No)': 'engagement',
        'Availability of past year materials (Yes/No)': 'pastMaterials',
        'Other Comments': 'comment'
    };

    const lines = text.split('-');
    const data: Partial<CommentData> = {};

    lines.forEach(line => {
        const [key, value] = line.split(':').map(part => part.trim());
        if (key in templateKeys && value !== '') {
            const field = templateKeys[key as keyof typeof templateKeys];
            switch (field) {
                case 'easiness':
                case 'scoring':
                    const numericValue = parseInt(value, 10);
                    if (!isNaN(numericValue) && numericValue >= 1 && numericValue <= 5) {
                        data[field] = numericValue;
                    }
                    break;
                case 'attendance':
                case 'engagement':
                case 'pastMaterials':
                    if (['yes', 'no'].includes(value.toLowerCase())) {
                        data[field] = value.toLowerCase() === 'yes';
                    }
                    break;
                case 'workload':
                case 'comment':
                    data[field] = value;
                    break;
                default:
                    break;
            }
        }
    });

    if (Object.keys(data).length === 0) {
        data['comment'] = text;
    }

    return data;
};


export { getComments, postComment };


