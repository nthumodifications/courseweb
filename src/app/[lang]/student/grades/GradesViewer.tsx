import { GradeObject } from "@/types/grades";

const GradesViewer = ({ grades }: { grades: GradeObject }) => {
    return <div className="flex flex-col gap-2">
        <h1 className="font-bold text-2xl">成績</h1>
        <h2 className="text-4xl font-bold">{grades.ranking.cumulative.letter.gpa}</h2>
        <h2>Year {grades.ranking.cumulative.letter.gpa_cum_year_tw}</h2>
    </div>
};

export default GradesViewer;