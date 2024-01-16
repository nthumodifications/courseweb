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

const GradesViewer = ({ grades }: { grades: GradeObject }) => {
    const [selectedSemester, setSelectedSemester] = useState<string>("All");

    console.log(selectedSemester);

    // get unique semesters
    const semesters = Array.from(new Set(grades.ranking.data.map(grade => grade.year+grade.semester)));

    const displayGrades = grades.grades.filter(grade => {
        if (selectedSemester == "All") return semesters.includes(grade.year+grade.semester);
        return grade.year+grade.semester == selectedSemester;
    });

    
    return <div className="flex flex-col gap-2 p-4">
        <Card className="max-w-[400px]">
            <CardHeader>
                <CardTitle>總覽</CardTitle>
                <CardDescription>至{grades.ranking.cumulative.letter.gpa_cum_year_tw}學年</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-3">
                    <div className="flex flex-col">
                        <h4 className="font-bold text-2xl">{grades.ranking.cumulative.letter.gpa}</h4>
                        <p className="font-medium text-xs text-gray-500">累計GPA</p>
                    </div>
                    <div className="flex flex-col">
                        <h4 className="font-bold text-2xl">{grades.ranking.cumulative.letter.letter_cum_dept_rank}</h4>
                        <p className="font-medium text-xs text-gray-500">累計系排名</p>
                    </div>
                    <div className="flex flex-col">
                        <h4 className="font-bold text-2xl">{grades.credits.passed_credits}</h4>
                        <p className="font-medium text-xs text-gray-500">及格學分</p>
                    </div>
                </div>
            </CardContent>
        </Card>

        <Tabs defaultValue="courses">
            <TabsList  className="grid w-full grid-cols-2 md:w-[300px]">
                <TabsTrigger value="courses">課程</TabsTrigger>
                <TabsTrigger value="semesters">學期排名</TabsTrigger>
            </TabsList>
            <TabsContent value="courses">
                <Select value={selectedSemester} onValueChange={(e: string) => setSelectedSemester(e)}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Semesters" />
                    </SelectTrigger>
                    <SelectContent >
                        <SelectItem value={"All"}>All</SelectItem>
                        {semesters.map(sem_id => <SelectItem key={sem_id} value={sem_id}>{toPrettySemester(sem_id)}</SelectItem>)}
                    </SelectContent>
                </Select>

                <Table className="w-full">
                    <TableHeader>
                        <TableRow>
                            <TableHead>Course Name</TableHead >
                            <TableHead>Credits</TableHead >
                            <TableHead>Grade</TableHead >
                            <TableHead>Ranking</TableHead >
                            <TableHead>T-Score</TableHead >
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {displayGrades.map((grade, index) => (
                            <TableRow key={index} className="[&>td]:py-2">
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-500">{grade.course_id}</span>
                                        <span>{grade.name_zh}</span>
                                        {grade.ge_description && <div>
                                            <Badge className="text-xs min-w-0" variant="outline">通識：{grade.ge_type} {grade.ge_description}</Badge>
                                        </div>}
                                    </div>
                                </TableCell>
                                <TableCell>{grade.credits}</TableCell>
                                <TableCell>{grade.grade}</TableCell>
                                <TableCell>{grade.ranking}</TableCell>
                                <TableCell>{grade.t_scores}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TabsContent>
            <TabsContent value="semesters">
                <Table className="w-full">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-16">Semester</TableHead>
                            <TableHead>Scores</TableHead>
                            <TableHead>Credits</TableHead>
                            <TableHead>Rankings</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {grades.ranking.data.map((semester, index) => (
                            <TableRow key={index} className="[&>td]:py-2">
                                <TableCell>{semester.year+semester.semester}</TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span>GPA: {semester.gpa}</span>
                                        <span>T分數平均: {semester.t_score_avg}</span>
                                        {/* <span>相對成績平均: {semester.relative_avg}</span> */}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span>修課數: {semester.num_of_courses}</span>
                                        <span>修習學分: {semester.credits}</span>
                                        <span>實得學分: {semester.actual_credits}</span>
                                        <span>暑修學分: {semester.summer_credits}</span>
                                        <span>抵免學分: {semester.transfer_credits}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="grid grid-cols-2">
                                        <p className="font-bold">GPA</p>
                                        <div className="flex flex-col">
                                            <span>班: {semester.letter_class_rank}</span>
                                            <span>系: {semester.letter_dept_rank}</span>
                                        </div>
                                        <p className="font-bold">T分數平均</p>
                                        <div className="flex flex-col">
                                            <span>班: {semester.t_score_class_rank}</span>
                                            <span>系: {semester.t_score_dept_rank}</span>
                                        </div>
                                        {/* <p className="font-bold">相對成績平均</p>
                                        <div className="flex flex-col">
                                            <span>班: {semester.relative_class_rank}</span>
                                            <span>系: {semester.relative_dept_rank}</span>
                                        </div> */}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TabsContent>
        </Tabs>

        
    </div>
};

export default GradesViewer;