import { useAuth } from "react-oidc-context";
import { Package } from "lucide-react";
import {
  EmptyState,
  PageHeader,
  PageShell,
  PageSkeleton,
} from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import StudentAccessState from "../StudentAccessState";

const ParcelPage = () => {
  const dict = useDictionary();
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <PageShell width="app">
      <PageHeader
        title={dict.student.parcel.title}
        description={dict.student.parcel.description}
      />
      {isLoading ? (
        <PageSkeleton rows={2} />
      ) : !isAuthenticated ? (
        <StudentAccessState
          title={dict.student.parcel.signed_out_title}
          description={dict.student.parcel.signed_out_description}
        />
      ) : (
        <EmptyState
          icon={Package}
          title={dict.student.parcel.unavailable_title}
          description={dict.student.parcel.unavailable_description}
        />
      )}
    </PageShell>
  );
};

export default ParcelPage;
