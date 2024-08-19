"use client";
import GradesViewer from "./GradesViewer";
import { GradeObject } from "@/types/grades";
import { AISLoading } from "@/components/Pages/AISLoading";
import { AISError } from "@/components/Pages/AISError";
import { useHeadlessAIS } from "@/hooks/contexts/useHeadlessAIS";
import { AISNotLoggedIn } from "@/components/Pages/AISNotLoggedIn";
import { useQuery } from "@tanstack/react-query";
import { getStudentGrades } from "@/lib/headless_ais/grades";

const StudentGradesPage = () => {
  const {
    initializing,
    getACIXSTORE,
    ais,
    loading,
    error: aisError,
  } = useHeadlessAIS();

  const {
    data: grades,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["grades", initializing],
    queryFn: async () => {
      if (initializing) return null;
      const token = await getACIXSTORE();
      return (await getStudentGrades(token!)) as GradeObject;
    },
  });
  if (!ais.enabled) return <AISNotLoggedIn />;
  if (error || aisError) return <AISError />;
  if (isLoading || !grades) return <AISLoading />;
  return <GradesViewer grades={grades!} />;
};

export default StudentGradesPage;
