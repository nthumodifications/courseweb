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

import { GradeObject } from "@/types/grades";

const GradesViewer = ({ grades }: { grades: GradeObject }) => {
    return <div className="flex flex-col gap-2">
        <h1 className="font-bold text-2xl">成績</h1>
        <h2 className="text-4xl font-bold">{grades.ranking.cumulative.letter.gpa}</h2>
        <h2>Year {grades.ranking.cumulative.letter.gpa_cum_year_tw}</h2>
        <Table className="w-full">
            <TableHeader>
                <TableRow>
                    <TableHead  className="font-mono w-40">Course #</TableHead >
                    <TableHead >Course Name</TableHead >
                    <TableHead >Credits</TableHead >
                    <TableHead >Grade</TableHead >
                    <TableHead >Ranking</TableHead >
                    <TableHead >T-Score</TableHead >
                </TableRow>
            </TableHeader>
            <TableBody>
                {grades.grades.map((grade, index) => (
                    <TableRow key={index}>
                        <TableCell>{grade.raw_id}</TableCell>
                        <TableCell>
                            {grade.ge_type.length > 0 && <Badge variant="outline">{grade.ge_type}</Badge>}
                            {grade.name_zh}
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
};

export default GradesViewer;