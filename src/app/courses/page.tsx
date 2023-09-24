import { useSettings } from "@/hooks/contexts/settings";
import { NextPage } from "next";

const CourseListItem = () => {
    return <div className="space-y-1 text-gray-600">
        <h1 className="font-semibold text-xl text-blue-700">CS 135501 計算機程式設計一</h1>
        <h3>Introduction to Programming (I)</h3>
        <p>Computer Science • 3 Credits</p>
        <p>胡敏君 MIN-CHUN HU</p>
        <p>
            This course is aimed to help the students learn how to program in C.
        </p>

    </div>
}

const CoursePage: NextPage = () => {
    // const { language } = useSettings();
    return (
        <div className="flex flex-col w-full">
            <CourseListItem/>
        </div>
    )
}

export default CoursePage;