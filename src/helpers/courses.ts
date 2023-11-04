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