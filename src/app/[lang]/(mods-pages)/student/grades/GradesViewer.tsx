"use client";
import { useSettings } from "@/hooks/contexts/settings";
import useDictionary from "@/dictionaries/useDictionary";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { GradeObject } from "@/types/grades";
import { toPrettySemester } from "@/helpers/semester";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "usehooks-ts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ExternalLink } from "lucide-react";
import dynamic from "next/dynamic";
import { distinct } from "rxjs";

const GPAChart = dynamic(async () => (await import("./GPAChart")).GPAChart, {
  ssr: false,
});
const ClassRankChart = dynamic(
  async () => (await import("./ClassRankChart")).ClassRankChart,
  { ssr: false },
);
const DeptRankChart = dynamic(
  async () => (await import("./DeptRankChart")).DeptRankChart,
  { ssr: false },
);

const SemesterGradeCard = ({
  semester,
  language,
}: {
  semester: GradeObject["ranking"]["data"][number];
  language: string;
}) => {
  const dict = useDictionary();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={"outline"} size={"icon"}>
          <ExternalLink className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {toPrettySemester(semester.year + semester.semester)}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-col justify-start items-start gap-4 inline-flex [&_td]:px-0 [&_td]:py-2 [&_td]:gap-2.5">
          <Table className="w-full">
            <TableBody>
              <TableRow>
                <TableCell>GPA</TableCell>
                <TableCell className="text-right">{semester.gpa}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{dict.grade.t_score}</TableCell>
                <TableCell className="text-right">
                  {semester.t_score_avg}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{dict.grade.relative_avg}</TableCell>
                <TableCell className="text-right">
                  {semester.relative_avg}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <Table className="w-full">
            <TableHeader className="text-slate-900 text-base font-bold leading-normal">
              Credit
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>{dict.grade.taken_actual_credits}</TableCell>
                <TableCell className="text-right">
                  {semester.credits}/{semester.actual_credits}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{dict.grade.num_of_courses}</TableCell>
                <TableCell className="text-right">
                  {semester.num_of_courses}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{dict.grade.summer_credits}</TableCell>
                <TableCell className="text-right">
                  {semester.summer_credits}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{dict.grade.transfer_credits}</TableCell>
                <TableCell className="text-right">
                  {semester.transfer_credits}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <Table className="w-full">
            <TableHeader className="text-slate-900 text-base font-bold leading-normal">
              Ranking
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>{dict.grade.class_rank}</TableCell>
                <TableCell className="text-right">
                  {semester.letter_class_rank}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{dict.grade.dept_rank}</TableCell>
                <TableCell className="text-right">
                  {semester.letter_dept_rank}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{dict.grade.t_score_class_rank}</TableCell>
                <TableCell className="text-right">
                  {semester.t_score_class_rank}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{dict.grade.t_score_dept_rank}</TableCell>
                <TableCell className="text-right">
                  {semester.t_score_dept_rank}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const GradeCard = ({ title, data }: { title: string; data: string }) => (
  <div className=" p-2 flex-col justify-center items-center gap-2 inline-flex flex-1">
    <div className="text-center text-zinc-500 dark:text-zinc-400 text-sm font-medium leading-none">
      {title}
    </div>
    <div className="text-center text-zinc-900 dark:text-zinc-100 text-2xl font-semibold">
      {data}
    </div>
  </div>
);

const GradeOverview = ({ grades }: { grades: GradeObject }) => {
  const dict = useDictionary();
  return (
    <div className="w-full rounded-lg shadow border border-slate-200 dark:border-slate-800 dark:divide-slate-800 justify-start items-start inline-flex flex-col md:flex-row flex-wrap divide-y md:divide-y-0 divide-x-0 md:divide-x divide-slate-200 overflow-hidden">
      <div className="w-full md:w-auto flex-[3] justify-start items-start inline-flex divide-x divide-slate-200 dark:divide-slate-800">
        <GradeCard title="GPA" data={grades.ranking.cumulative.letter.gpa} />
        <GradeCard
          title={dict.grade.passed_credits}
          data={grades.credits.passed_credits.toString()}
        />
        <GradeCard
          title={dict.grade.pending_credits}
          data={grades.credits.pending_credits.toString()}
        />
      </div>
      <div className="w-full md:w-auto flex-[2] justify-start items-start inline-flex divide-x divide-slate-200 dark:divide-slate-800">
        <GradeCard
          title={dict.grade.class_rank}
          data={grades.ranking.cumulative.letter.letter_cum_class_rank}
        />
        <GradeCard
          title={dict.grade.dept_rank}
          data={grades.ranking.cumulative.letter.letter_cum_dept_rank}
        />
      </div>
    </div>
  );
};

const GradesViewer = ({ grades }: { grades: GradeObject }) => {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [selectedSemester, setSelectedSemester] = useState<string>("All");
  const [semesterSort, setSemesterSort] = useState<"asc" | "desc">("asc");

  // get unique semesters
  const semesters = Array.from(
    new Set(grades.ranking.data.map((grade) => grade.year + grade.semester)),
  ).toReversed();
  // grades might have semesters that are not in ranking
  const gradesSemesters = Array.from(
    new Set(grades.grades.map((grade) => grade.year + grade.semester)),
  ).toReversed();
  const displayGrades = grades.grades.filter((grade) => {
    if (selectedSemester == "All") return true;
    return grade.year + grade.semester == selectedSemester;
  });

  const displayedSemesters = gradesSemesters.filter((semester) => {
    if (selectedSemester == "All") return true;
    return semester == selectedSemester;
  });

  const displaySemesterRankings =
    semesterSort == "asc"
      ? grades.ranking.data
      : grades.ranking.data.slice().reverse();

  const lineData = grades.ranking.data.map((semester) => ({
    semester: semester.year + semester.semester,
    gpa: semester.gpa,
    class_rank: semester.letter_class_rank.split("/")[0] ?? 0,
    max_class_rank: semester.letter_class_rank.split("/")[1] ?? 0,
    dept_rank: semester.letter_dept_rank.split("/")[0] ?? 0,
    max_dept_rank: semester.letter_dept_rank.split("/")[1] ?? 0,
  }));

  const [tab, setTab] = useState<"courses" | "semester">("courses");

  const { language } = useSettings();

  const dict = useDictionary();

  return (
    <div className="px-6 pb-12 flex-col justify-start items-start gap-12 inline-flex w-full overflow-x-hidden">
      <div className="w-full pt-8 flex-col justify-start items-start gap-4 inline-flex">
        <div className="w-full self-stretch flex-col justify-center items-center gap-2 flex">
          <div className="self-stretch text-zinc-900 dark:text-zinc-100 text-3xl font-semibold leading-9">
            Overview
          </div>
          <div className="self-stretch text-zinc-900 dark:text-zinc-100 text-sm font-normal leading-tight">
            至{grades.ranking.cumulative.letter.gpa_cum_year_tw}
          </div>
        </div>
        <GradeOverview grades={grades} />
      </div>
      <Tabs
        defaultValue="courses"
        className="w-full"
        onValueChange={(e: string) => setTab(e as "courses" | "semester")}
        value={tab}
      >
        <div className="flex flex-row justify-between flex-wrap gap-3">
          <TabsList>
            <TabsTrigger value="courses">{dict.grade.all_courses}</TabsTrigger>
            <TabsTrigger value="semester">
              {dict.grade.semester_grades}
            </TabsTrigger>
          </TabsList>
          {tab == "courses" && (
            <Select
              value={selectedSemester}
              onValueChange={(e: string) => setSelectedSemester(e)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Semesters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={"All"}>{dict.grade.all_courses}</SelectItem>
                {gradesSemesters.map((sem_id) => (
                  <SelectItem key={sem_id} value={sem_id}>
                    {toPrettySemester(sem_id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {tab == "semester" && (
            <Select
              value={semesterSort}
              onValueChange={(e: string) =>
                setSemesterSort(e as "asc" | "desc")
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Semesters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={"asc"}>{dict.grade.oldest_first}</SelectItem>
                <SelectItem value={"desc"}>
                  {dict.grade.latest_first}
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        <TabsContent value="courses">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="[&>th]:font-bold [&>th]:text-slate-900 dark:[&>th]:text-slate-100">
                <TableHead>Course Name</TableHead>
                <TableHead className="hidden md:table-cell">Credits</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Ranking</TableHead>
                <TableHead className="hidden md:table-cell">T-score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedSemesters
                .map((semester, index) => (
                  <>
                    <TableRow key={index}>
                      <TableCell
                        colSpan={3}
                        className="text-zinc-950 dark:text-zinc-50 text-2xl font-semibold leading-loose"
                      >
                        {toPrettySemester(semester)}
                      </TableCell>
                    </TableRow>
                    {displayGrades
                      .filter((c) => c.year + c.semester == semester)
                      .map((grade, index) => (
                        <TableRow
                          key={index + index * 10}
                          className="[&>td]:py-2"
                        >
                          <TableCell>
                            <div className="flex-col justify-center items-start gap-2.5 inline-flex">
                              <div className="inline-flex flex-col">
                                <span className="text-slate-400 dark:text-slate-600 text-xs">
                                  {grade.course_id}
                                </span>
                                <span>
                                  {language == "en"
                                    ? grade.name_en
                                    : grade.name_zh}
                                </span>
                              </div>
                              {grade.ge_description && (
                                <div>
                                  <Badge
                                    className="text-xs min-w-0 rounded-lg"
                                    variant="default"
                                  >
                                    通識：{grade.ge_type} -{" "}
                                    {grade.ge_description}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {grade.credits}
                          </TableCell>
                          <TableCell>{grade.grade}</TableCell>
                          <TableCell>{grade.ranking}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            {grade.t_scores}
                          </TableCell>
                        </TableRow>
                      ))}
                  </>
                ))
                .flat()}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="semester">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="[&>th]:font-bold [&>th]:text-slate-900 dark:[&>th]:text-slate-100">
                <TableHead className="min-w-[72px] break-all">
                  {dict.grade.semester}
                </TableHead>
                <TableHead>GPA</TableHead>
                <TableHead className="hidden md:table-cell">T-Score</TableHead>
                <TableHead className="hidden md:table-cell">
                  {dict.grade.relative_avg}
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  {dict.grade.taken_actual_credits}
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  {dict.grade.num_of_courses}
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  {dict.grade.summer_credits}
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  {dict.grade.transfer_credits}
                </TableHead>
                <TableHead>{dict.grade.class_rank}</TableHead>
                <TableHead>{dict.grade.dept_rank}</TableHead>
                <TableHead className="hidden md:table-cell">
                  {dict.grade.t_score_class_rank}
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  {dict.grade.t_score_dept_rank}
                </TableHead>
                <TableHead className="md:hidden table-cell"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displaySemesterRankings.map((semester, index) => (
                <TableRow key={index} className="[&>td]:py-2">
                  <TableCell>
                    {toPrettySemester(semester.year + semester.semester)}
                  </TableCell>
                  <TableCell>{semester.gpa}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {semester.t_score_avg}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {semester.relative_avg}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {semester.credits}/{semester.actual_credits}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {semester.num_of_courses}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {semester.summer_credits}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {semester.transfer_credits}
                  </TableCell>
                  <TableCell>{semester.letter_class_rank}</TableCell>
                  <TableCell>{semester.letter_dept_rank}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {semester.t_score_class_rank}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {semester.t_score_dept_rank}
                  </TableCell>
                  <TableCell className="md:hidden table-cell">
                    <SemesterGradeCard
                      semester={semester}
                      language={language}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
      {!isMobile && (
        <div className="w-full flex-col justify-start items-start gap-4 md:inline-flex hidden">
          <div className="text-zinc-900 dark:text-zinc-100 text-3xl font-semibold leading-9">
            {dict.grade.score_curve}
          </div>
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
                <CardTitle>{dict.grade.class_rank}</CardTitle>
              </CardHeader>
              <CardContent>
                <ClassRankChart lineData={lineData} />
              </CardContent>
            </Card>
            <Card className=" min-w-[300px] flex-1">
              <CardHeader>
                <CardTitle>{dict.grade.dept_rank}</CardTitle>
              </CardHeader>
              <CardContent>
                <DeptRankChart lineData={lineData} />
              </CardContent>
            </Card>
          </div>
        </div>
      )}
      {isMobile && (
        <Tabs defaultValue="gpa" className="w-full md:hidden">
          <div className="flex flex-row justify-between">
            <TabsList>
              <TabsTrigger value="gpa">GPA</TabsTrigger>
              <TabsTrigger value="class_rank">
                {dict.grade.class_rank}
              </TabsTrigger>
              <TabsTrigger value="dept_rank">
                {dict.grade.dept_rank}
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
      )}
    </div>
  );
};

export default GradesViewer;
