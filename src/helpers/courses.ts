import {MinimalCourse, RawCourseID} from '@/types/courses';
import { createTimetableFromCourses } from './timetable';
export const getGECType = (ge_type: string) => {
    //核心通識Core GE courses 1, 核心通識Core GE courses 2  <- return this number
    if(ge_type.includes('核心通識Core GE courses')){
        return parseInt(ge_type.slice(-1));
    }
    else return null;
}

export const hasConflictingTimeslots = (courses: MinimalCourse[]) => {
    const timetableData = createTimetableFromCourses(courses);
    return timetableData.filter((timeslot, index, self) => {
        const otherTimeslots = self.filter((ts, i) => i != index);
        return otherTimeslots.find(ts => ts.dayOfWeek == timeslot.dayOfWeek && ts.startTime <= timeslot.endTime && ts.endTime >= timeslot.startTime) != undefined;
    })
};

//check if there is same dept same course but different class, return course codes
export const hasSameCourse = (courses: MinimalCourse[]) => {
    const sameCourse = courses.filter((course, index, self) => {
        const otherCourses = self.filter((c, i) => i != index);
        return otherCourses.find(c => c.department == course.department && c.course == course.course) != undefined;
    });
    return sameCourse.map(course => course.raw_id) as RawCourseID[];
}

export const getSemesterFromID = (id: string) => {
    return id.slice(0, 5) as RawCourseID;
}

export const hasTimes = (course: MinimalCourse) => {
    return course.times.length > 0 && !course.times.every((m) => m.trim() == "");
}

export const getScoreType = (score: string) => {
    // 'gpa' | 'percent'
    switch(score){
        case 'gpa': return 'GPA';
        case 'percent': return '百分制';
        default: return 'GPA';
    }
}

export const getFormattedClassCode = (class_code: string) =>{
    // Define mappings for degree types and class letters
    const degreeTypes: {[x: string]: string } = { 'B': '大學部', 'M': '碩士班', 'D': '博士班', 'P': '專班' };
    const classLetters: {[x: string]: string } = { 'A': '清班', 'B': '華班', 'C': '梅班', 'D': '班' }; // Assuming 'D' stands for a general class

    // Parse the input string
    const match = class_code.toUpperCase().match(/(^[^\d]+)(\d+)([BMD])([A-D]?)/);
    if (!match) {
        return class_code;
    }

    // Extract components
    const [, deptName, year, degreeType, classLetter] = match;

    // Translate components
    const readableYear = year + '年';
    const readableDegreeType = degreeTypes[degreeType] || '';
    const readableClassLetter = classLetters[classLetter] || '';

    // Construct the output
    return `${deptName}${readableYear}${readableDegreeType}${readableClassLetter}`;
}