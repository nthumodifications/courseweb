import { AISNotLoggedIn } from "@/components/Pages/AISNotLoggedIn";

const StudentGradesPage = () => {
  // const { initializing, getACIXSTORE, ais, loading } = useHeadlessAIS();

  // const {
  //   data: grades,
  //   isLoading,
  //   error,
  // } = useQuery({
  //   queryKey: ["grades", initializing],
  //   queryFn: async () => {
  //     if (initializing) return null;
  //     const token = await getACIXSTORE();
  //     return (await getStudentGrades(token!)) as GradeObject;
  //   },
  // });
  // if (!ais.enabled) return <AISNotLoggedIn />;
  // if (isLoading || !grades) return <AISLoading />;
  // return <GradesViewer grades={grades!} />;
  return <AISNotLoggedIn />;
};

export default StudentGradesPage;
