import { ReactNode } from "react";
import { IssueReportDialog } from "./IssueReportForm";

const GenericIssueForm = ({ children }: { children?: ReactNode }) => (
  <IssueReportDialog>{children}</IssueReportDialog>
);

export default GenericIssueForm;
