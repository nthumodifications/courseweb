interface Course {
    capacity: number | null;
    course: string;
    department: string;
    semester: string;
    class: string;
    name_en: string;
    name_zh: string;
    teacher_en: string[] | null;
    teacher_zh: string[];
    credits: number;
    reserve: number;
    ge_type: string;
    ge_target?: string;
    language: string;
    compulsory_for: string[];
    elective_for: string[];
    venues: string[];
    times: string[];
    first_specialization: string[];
    second_specialization: string[];
    cross_discipline: string[];
    tags: string[];
    no_extra_selection: boolean;
    note: string;
    closed_mark: string;
    prerequisites: string;
    restrictions: string;
    raw_id: string;
    enrolled: number;
    updated_at: string;
}
export declare const scrapeArchivedCourses: (env: Env, semester: string) => Promise<Course[]>;
export declare const scrapeSyllabus: (env: Env, semester: string, cachedCourses?: Course[]) => Promise<void>;
export declare const syncCoursesToAlgolia: (env: Env, semester: string) => Promise<void>;
export declare const exportCoursesToAlgoliaFile: (env: Env, semester: string) => Promise<{
    success: boolean;
    fileName: string;
    publicUrl: string;
    stats: {
        totalCourses: number;
        fileSize: number;
        fileSizeKB: number;
    };
    storageInfo: {
        id: string;
        path: string;
        fullPath: string;
    };
}>;
export declare const uploadAlgoliaFileToStorage: (env: Env, semester: string) => Promise<{
    success: boolean;
    fileName: string;
    publicUrl: string;
    stats: {
        totalCourses: number;
        fileSize: number;
        fileSizeKB: number;
    };
    storageInfo: {
        id: string;
        path: string;
        fullPath: string;
    };
}>;
export declare const restoreAlgoliaFromFile: (env: Env, fileName: string) => Promise<{
    success: boolean;
    totalCourses: any;
    coursesRestored: number;
    chunksProcessed: number;
    totalChunks: any;
    metadata: any;
}>;
export declare const listAlgoliaBackups: (env: Env) => Promise<{
    name: string;
    size: any;
    lastModified: string;
    sizeKB: number;
}[]>;
export {};
