import { useQuery } from "@tanstack/react-query";
import { AISNotLoggedIn } from "@/components/Pages/AISNotLoggedIn";
import { AISLoading } from "@/components/Pages/AISLoading";
import { GradesViewer } from "./GradesViewer";
import { useHeadlessAIS } from "@/hooks/useHeadlessAIS";
import { fetchGrades } from "@/lib/headless-ais-api";
import type { GradeObject } from "@/types/grades";

const StudentGradesPage = () => {
  const { ais, getACIXSTORE } = useHeadlessAIS();

  const { data: grades, isLoading } = useQuery({
    queryKey: ["grades", ais.enabled],
    queryFn: async () => {
      const token = await getACIXSTORE();
      return (await fetchGrades(token)) as GradeObject;
    },
    enabled: ais.enabled,
    retry: false,
  });

  if (!ais.enabled) return <AISNotLoggedIn />;
  if (isLoading || !grades) return <AISLoading />;
  return <GradesViewer grades={grades} />;
};

export default StudentGradesPage;
