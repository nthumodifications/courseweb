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
import { Button } from "@/components/ui/button";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Class } from "leaflet";

const GradeCard = ({ title, data }: { title: string, data: string }) => <div className=" p-2 bg-white flex-col justify-center items-center gap-2 inline-flex flex-1">
    <div className="text-center text-zinc-500 text-sm font-medium font-['Inter'] leading-none">{title}</div>
    <div className="text-center text-zinc-900 text-2xl font-semibold font-['Inter']">{data}</div>
</div>

const GradeOverview = ({ grades }: { grades: GradeObject }) => {
    return <div className="w-full rounded-lg shadow border border-slate-200 justify-start items-start inline-flex flex-col md:flex-row flex-wrap divide-y md:divide-y-0 divide-slate-200 overflow-hidden">
        <div className="w-full md:w-auto flex-[3] justify-start items-start inline-flex divide-x divide-slate-200">
            <GradeCard title="GPA" data={grades.ranking.cumulative.letter.gpa} />
            <GradeCard title="及格學分" data={grades.credits.passed_credits.toString()} />
            <GradeCard title="畢業未到學分" data={(128 - grades.credits.passed_credits).toString()} />
        </div>
        <div className="w-full md:w-auto flex-[2] justify-start items-start inline-flex divide-x divide-slate-200">
            <GradeCard title="班排名" data={grades.ranking.cumulative.letter.letter_cum_class_rank} />
            <GradeCard title="系排名" data={grades.ranking.cumulative.letter.letter_cum_dept_rank} />
        </div>
    </div>
}

const GPAChart = ({ lineData }: { lineData: any[] }) => {
    return <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
            <LineChart
                data={lineData}
                margin={{
                    top: 5,
                    right: 10,
                    left: 10,
                    bottom: 0,
                }}
            >
                <Tooltip
                    content={({ active, payload, content }) => {
                        if (active && payload && payload.length) {
                            return (
                                <div className="rounded-lg border bg-background p-2 shadow-sm">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex flex-col">
                                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                                                Semester
                                            </span>
                                            <span className="font-bold text-muted-foreground">
                                                {toPrettySemester(payload[0].payload.semester)}
                                            </span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                                                GPA
                                            </span>
                                            <span className="font-bold">
                                                {payload[0].value}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )
                        }

                        return null
                    }}
                />
                <Line
                    type="monotone"
                    dataKey="gpa"
                    strokeWidth={2}
                    activeDot={{
                        r: 8,
                    }}
                />
                <XAxis dataKey="semester" />
                <YAxis />
            </LineChart>
        </ResponsiveContainer>
    </div>
}

const ClassRankChart = ({ lineData }: { lineData: any[] }) => {
    return <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
            <LineChart
                data={lineData}
                margin={{
                    top: 5,
                    right: 10,
                    left: 10,
                    bottom: 0,
                }}
            >
                <Tooltip
                    content={({ active, payload, content }) => {
                        if (active && payload && payload.length) {
                            return (
                                <div className="rounded-lg border bg-background p-2 shadow-sm">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex flex-col">
                                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                                                Semester
                                            </span>
                                            <span className="font-bold text-muted-foreground">
                                                {toPrettySemester(payload[0].payload.semester)}
                                            </span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                                                班排名
                                            </span>
                                            <span className="font-bold">
                                                {payload[0].payload.class_rank}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )
                        }

                        return null
                    }}
                />
                <Line
                    type="monotone"
                    dataKey="class_rank"
                    strokeWidth={2}
                    activeDot={{
                        r: 8,
                    }}
                />
                <XAxis dataKey="semester" />
                <YAxis />
            </LineChart>
        </ResponsiveContainer>
    </div>
}

const DeptRankChart = ({ lineData }: { lineData: any[] }) => {
    return <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
            <LineChart
                data={lineData}
                margin={{
                    top: 5,
                    right: 10,
                    left: 10,
                    bottom: 0,
                }}
            >
                <Tooltip
                    content={({ active, payload, content }) => {
                        if (active && payload && payload.length) {
                            return (
                                <div className="rounded-lg border bg-background p-2 shadow-sm">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex flex-col">
                                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                                                Semester
                                            </span>
                                            <span className="font-bold text-muted-foreground">
                                                {toPrettySemester(payload[0].payload.semester)}
                                            </span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                                                班排名
                                            </span>
                                            <span className="font-bold">
                                                {payload[0].payload.dept_rank}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )
                        }

                        return null
                    }}
                />
                <Line
                    type="monotone"
                    dataKey="dept_rank"
                    strokeWidth={2}
                    activeDot={{
                        r: 8,
                    }}
                />
                <XAxis dataKey="semester" />
                <YAxis />
            </LineChart>
        </ResponsiveContainer>
    </div>
}

const GradesViewer = ({ grades }: { grades: GradeObject }) => {
    const [selectedSemester, setSelectedSemester] = useState<string>("All");

    // get unique semesters
    const semesters = Array.from(new Set(grades.ranking.data.map(grade => grade.year + grade.semester)));

    const displayGrades = grades.grades.filter(grade => {
        if (selectedSemester == "All") return semesters.includes(grade.year + grade.semester);
        return grade.year + grade.semester == selectedSemester;
    });

    const displayedSemesters = semesters.filter(semester => {
        if (selectedSemester == "All") return true;
        return semester == selectedSemester;
    });

    const lineData = grades.ranking.data.map(semester => ({
        semester: semester.year + semester.semester,
        gpa: semester.gpa,
        class_rank: semester.letter_class_rank.split("/")[0] ?? 0,
        dept_rank: semester.letter_dept_rank.split("/")[0] ?? 0
    }));

    return <div className="px-6 pb-12 flex-col justify-start items-start gap-12 inline-flex w-full overflow-x-hidden">
        <div className="w-full py-8 flex-col justify-start items-start gap-4 inline-flex">
            <div className="w-full self-stretch flex-col justify-center items-center gap-2 flex">
                <div className="self-stretch text-zinc-900 text-3xl font-semibold font-['Inter'] leading-9">Overview</div>
                <div className="self-stretch text-zinc-900 text-sm font-normal font-['Inter'] leading-tight">至112學年上學期</div>
            </div>
            <GradeOverview grades={grades} />
        </div>
        <Tabs defaultValue="courses" className="w-full">
            <div className="flex flex-row justify-between">
                <TabsList>
                    <TabsTrigger value="courses">
                        全部課程
                    </TabsTrigger>
                    <TabsTrigger value="semester">
                        學期成績
                    </TabsTrigger>
                </TabsList>
                <Select value={selectedSemester} onValueChange={(e: string) => setSelectedSemester(e)}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Semesters" />
                    </SelectTrigger>
                    <SelectContent >
                        <SelectItem value={"All"}>全部課程</SelectItem>
                        {semesters.map(sem_id => <SelectItem key={sem_id} value={sem_id}>{toPrettySemester(sem_id)}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <TabsContent value="courses">
                <Table className="w-full">
                    <TableHeader>
                        <TableRow>
                            <TableHead>Course Name</TableHead >
                            <TableHead>Grade</TableHead >
                            <TableHead>Ranking</TableHead >
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {displayedSemesters.map((semester, index) => <>
                            <TableRow key={index}>
                                <TableCell colSpan={3} className="text-zinc-950 text-2xl font-semibold leading-loose">{toPrettySemester(semester)}</TableCell>
                            </TableRow>
                            {displayGrades.filter(c => c.year + c.semester == semester).map((grade, index) => (
                                <TableRow key={index + index * 10} className="[&>td]:py-2">
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-xs text-gray-500">{grade.course_id}</span>
                                            <span>{grade.name_zh}</span>
                                            {grade.ge_description && <div>
                                                <Badge className="text-xs min-w-0" variant="outline">通識：{grade.ge_type} {grade.ge_description}</Badge>
                                            </div>}
                                        </div>
                                    </TableCell>
                                    <TableCell>{grade.grade}</TableCell>
                                    <TableCell>{grade.ranking}</TableCell>
                                </TableRow>
                            ))}
                        </>).flat()}

                    </TableBody>
                </Table>
            </TabsContent>
            <TabsContent value="semester">
                <Table className="w-full">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-16">Semester</TableHead>
                            <TableHead>GPA</TableHead>
                            <TableHead className="hidden md:table-cell">T-Score</TableHead>
                            <TableHead className="hidden md:table-cell">修課相對成績平均</TableHead>
                            <TableHead className="hidden md:table-cell">修習/實得學分</TableHead>
                            <TableHead className="hidden md:table-cell">修課數</TableHead>
                            <TableHead className="hidden md:table-cell">暑修學分</TableHead>
                            <TableHead className="hidden md:table-cell">抵免學分</TableHead>
                            <TableHead>班排名</TableHead>
                            <TableHead>系排名</TableHead>
                            <TableHead className="hidden md:table-cell">T分數班排名</TableHead>
                            <TableHead className="hidden md:table-cell">T分數系排名</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {grades.ranking.data.map((semester, index) => (
                            <TableRow>
                                <TableCell>{semester.year + semester.semester}</TableCell>
                                <TableCell>{semester.gpa}</TableCell>
                                <TableCell className="hidden md:table-cell">{semester.t_score_avg}</TableCell>
                                <TableCell className="hidden md:table-cell">{semester.relative_avg}</TableCell>
                                <TableCell className="hidden md:table-cell">{semester.credits}/{semester.actual_credits}</TableCell>
                                <TableCell className="hidden md:table-cell">{semester.num_of_courses}</TableCell>
                                <TableCell className="hidden md:table-cell">{semester.summer_credits}</TableCell>
                                <TableCell className="hidden md:table-cell">{semester.transfer_credits}</TableCell>
                                <TableCell>{semester.letter_class_rank}</TableCell>
                                <TableCell>{semester.letter_dept_rank}</TableCell>
                                <TableCell className="hidden md:table-cell">{semester.t_score_class_rank}</TableCell>
                                <TableCell className="hidden md:table-cell">{semester.t_score_dept_rank}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TabsContent>
        </Tabs>
        <div className="w-full flex-col justify-start items-start gap-4 md:inline-flex hidden">
            <div className="text-zinc-900 text-3xl font-semibold font-['Inter'] leading-9">成績曲線圖</div>
            <div className="flex flex-row flex-wrap gap-6">
                <Card className=" min-w-[300px] flex-1">
                    <CardHeader>
                        <CardTitle>GPA</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <GPAChart lineData={lineData} />
                    </CardContent>
                </Card>
                <Card className=" min-w-[300px] flex-1">
                    <CardHeader>
                        <CardTitle>班排名</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ClassRankChart lineData={lineData} />
                    </CardContent>
                </Card>
                <Card className=" min-w-[300px] flex-1">
                    <CardHeader>
                        <CardTitle>系排名</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <DeptRankChart lineData={lineData} />
                    </CardContent>
                </Card>
            </div>
        </div>
        <Tabs defaultValue="gpa" className="w-full md:hidden">
            <div className="flex flex-row justify-between">
                <TabsList>
                    <TabsTrigger value="gpa">
                        GPA
                    </TabsTrigger>
                    <TabsTrigger value="class_rank">
                        班排名
                    </TabsTrigger>
                    <TabsTrigger value="dept_rank">
                        系排名
                    </TabsTrigger>
                </TabsList>
            </div>
            <TabsContent value="gpa">
                <GPAChart lineData={lineData} />
            </TabsContent>
            <TabsContent value="class_rank">
                <ClassRankChart lineData={lineData} />
            </TabsContent>
            <TabsContent value="dept_rank">
                <DeptRankChart lineData={lineData} />
            </TabsContent>
        </Tabs>
    </div>
};

export default GradesViewer;