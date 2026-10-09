import {
  IssueReportFields,
  useKnownIssues,
  useIssueReport,
} from "@/components/Forms/IssueReportForm";
import useDictionary from "@/dictionaries/useDictionary";

const EmptyIssueForm = () => {
  const dict = useDictionary();
  const report = useIssueReport({
    initialArea: "search",
    initialType: "missing-data",
  });
  const { data: knownIssues = [] } = useKnownIssues(
    report.title.trim().length >= 3,
  );

  if (report.submitted) {
    return <p className="text-primary">{dict.issues.form.success}</p>;
  }

  return (
    <IssueReportFields
      report={report}
      knownIssues={knownIssues}
      idPrefix="page-issue"
    />
  );
};

export default EmptyIssueForm;
