'use server';
import { createIssue } from "@/lib/github";

export const genericIssueFormAction = async (form: FormData) => {
    try {
        const title = form.get('title');
        const description = form.get('description');
        // verify that title and description are not empty and is a string
        if (typeof title !== 'string' || title.length === 0) {
            throw new Error('Title is required');
        }
        if (typeof description !== 'string' || description.length === 0) {
            throw new Error('Description is required');
        }
        console.log('sabmitting issue')
        const issue = await createIssue(`[UI Submitted]: ${title}`, description, ['generic']);
        console.log('issue submitted', issue);
    } catch (error) {
        if (error instanceof Error) {
            return {
                error: {
                    message: error.message
                }
            }
        }
    }
}