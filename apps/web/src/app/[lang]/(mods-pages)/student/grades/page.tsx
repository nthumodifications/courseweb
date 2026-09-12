import { useParams } from "react-router-dom";
import { BadgeAlert } from "lucide-react";
import { Button, EmptyState, PageHeader, PageShell } from "@courseweb/ui";
import { Link } from "react-router-dom";
import useDictionary from "@/dictionaries/useDictionary";

const StudentGradesPage = () => {
  const { lang } = useParams<{ lang: string }>();
  const dict = useDictionary();

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
  const routeLang = lang === "en" ? "en" : "zh";

  return (
    <PageShell width="app">
      <PageHeader title={dict.grade.title} />
      <EmptyState
        size="default"
        icon={BadgeAlert}
        title={dict.grade.proxy_login_required_title}
        description={dict.grade.proxy_login_required_description}
        action={
          <Button asChild>
            <Link to={`/${routeLang}/proxy-login`}>
              {dict.grade.setup_proxy_login}
            </Link>
          </Button>
        }
      />
    </PageShell>
  );
};

export default StudentGradesPage;
