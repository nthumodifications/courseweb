import { useAuth } from "react-oidc-context";
import { BadgeAlert } from "lucide-react";
import {
  EmptyState,
  PageHeader,
  PageShell,
  PageSkeleton,
} from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import StudentAccessState from "../StudentAccessState";

const StudentIDPage = () => {
  const dict = useDictionary();
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <PageShell width="app">
      <PageHeader
        title={dict.student.id.title}
        description={dict.student.id.description}
      />
      {isLoading ? (
        <PageSkeleton rows={2} />
      ) : !isAuthenticated ? (
        <StudentAccessState
          title={dict.student.id.signed_out_title}
          description={dict.student.id.signed_out_description}
        />
      ) : (
        <EmptyState
          size="default"
          icon={BadgeAlert}
          title={dict.student.id.unavailable_title}
          description={dict.student.id.unavailable_description}
        />
      )}
    </PageShell>
  );
};

export default StudentIDPage;
