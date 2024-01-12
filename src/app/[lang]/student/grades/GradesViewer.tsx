'use client'
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select"

import { GradeObject } from "@/types/grades";
import { toPrettySemester } from "@/helpers/semester";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";

const GradesViewer = ({ grades }: { grades: GradeObject }) => {
    const [selectedSemester, setSelectedSemester] = useState<string>("All");

    console.log(selectedSemester);

    // get unique semesters
    const semesters = Array.from(new Set(grades.ranking.data.map(grade => grade.year+grade.semester)));

    const displayGrades = grades.grades.filter(grade => {
        if (selectedSemester == "All") return true;
        return grade.year+grade.semester == selectedSemester;
    });

    const renderSemesterCard = (sem_id: string) => {
        const ranking = grades.ranking.data.find(semester => semester.year+semester.semester == sem_id)!;
        const semesterGrades = grades.grades.filter(grade => grade.year+grade.semester == sem_id);
        return <Drawer>
            <DrawerTrigger asChild>
                <Card>
                    <CardHeader>
                        <CardTitle>{toPrettySemester(sem_id)}</CardTitle>
                        <CardDescription>{ranking?.actual_credits} Credits</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 place-items-center">
                            <div className="flex flex-col">
                                <h4 className="font-bold text-2xl">{ranking.gpa}</h4>
                                <p className="font-medium text-xs text-gray-500">GPA</p>
                            </div>
                            <div className="flex flex-col">
                                <h4 className="font-bold text-2xl">{ranking.t_score_avg}</h4>
                                <p className="font-medium text-xs text-gray-500">T-Score</p>
                            </div>
                            <div className="flex flex-col">
                                <h4 className="font-bold text-2xl">{ranking.num_of_courses}</h4>
                                <p className="font-medium text-xs text-gray-500">修課數</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </DrawerTrigger>
            <DrawerContent className="bg-white flex flex-col fixed bottom-0 left-0 right-0 max-h-[96%] rounded-t-[10px]">
                <div className="max-w-md w-full mx-auto flex flex-col overflow-auto p-4 rounded-t-[10px]">
                    <DrawerHeader>
                        <DrawerTitle>{toPrettySemester(sem_id)}</DrawerTitle>
                        <DrawerDescription>Set your daily activity goal.</DrawerDescription>
                    </DrawerHeader>
                    <Table className="w-full">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Course</TableHead >
                                <TableHead className="max-w-[32px] overflow-hidden break-words px-1">Credits</TableHead >
                                <TableHead className="max-w-[32px] overflow-hidden break-words px-1">Grade</TableHead >
                                <TableHead>Ranking</TableHead >
                                <TableHead>T-Score</TableHead >
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {semesterGrades.map((grade, index) => (
                                <TableRow key={index}>
                                    <TableCell>
                                        <p>{grade.course_id}</p>
                                        <p>
                                        {grade.ge_type.length > 0 && <Badge variant="outline">{grade.ge_type}</Badge>}
                                        {grade.name_zh}
                                        </p>
                                    </TableCell>
                                    <TableCell>{grade.credits}</TableCell>
                                    <TableCell>{grade.grade}</TableCell>
                                    <TableCell>{grade.ranking}</TableCell>
                                    <TableCell>{grade.t_scores}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </DrawerContent>
        </Drawer>
            

    }
    
    return <div className="flex flex-col gap-2 p-4">
        <Card>
            <CardHeader>
                <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-3">
                    <div className="flex flex-col place-items-center">
                        <h4 className="font-bold text-2xl">{grades.ranking.cumulative.letter.gpa}</h4>
                        <p className="font-medium text-xs text-gray-500">累計GPA</p>
                    </div>
                    <div className="flex flex-col">
                        <h4 className="font-bold text-2xl">{grades.credits.passed_credits}</h4>
                        <p className="font-medium text-xs text-gray-500">及格學分</p>
                    </div>
                    <div className="flex flex-col">
                        <h4 className="font-bold text-2xl">{((grades.credits.passed_credits/128)*100).toFixed(1)}%</h4>
                        <p className="font-medium text-xs text-gray-500">大學畢業</p>
                    </div>
                </div>
            </CardContent>
        </Card>

        <h2 className="font-bold text-2xl">Semesters</h2>
        {semesters.map(sem_id => renderSemesterCard(sem_id))}

    </div>
};

export default GradesViewer;