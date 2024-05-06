import { set } from "date-fns";

export const semesterInfo = [
    { id: '11010', year: 2021, semester: 1, begins: new Date(2021, 9-1, 13), ends: new Date(2022, 1-1, 14) },
    { id: '11020', year: 2021, semester: 2, begins: new Date(2022, 2-1, 14), ends: new Date(2022, 6-1, 17) },
    { id: '11110', year: 2022, semester: 1, begins: new Date(2022, 9-1, 12), ends: new Date(2023, 1-1, 13) },
    { id: '11120', year: 2022, semester: 2, begins: new Date(2023, 2-1, 13), ends: new Date(2023, 6-1, 16) },
    { id: '11210', year: 2023, semester: 1, begins: new Date(2023, 9-1, 11), ends: new Date(2024, 1-1, 12) },
    { id: '11220', year: 2023, semester: 2, begins: new Date(2024, 2-1, 19), ends: new Date(2024, 6-1, 23) }
]

export const currentSemester = semesterInfo.find(semester => {
    const now = new Date();
    return now >= semester.begins && now <= semester.ends;
});

export const getSemester = (date: Date) => {
    return semesterInfo.find(semester => {
        return date >= semester.begins && date <= semester.ends;
    });
}

export const lastSemester = semesterInfo[semesterInfo.length- 1];