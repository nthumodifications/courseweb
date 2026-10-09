import { PropsWithChildren } from "react";
import { IssueReportDialog } from "./IssueReportForm";

const IssueFormDialog = ({ children }: PropsWithChildren) => (
  <IssueReportDialog>{children}</IssueReportDialog>
);

export default IssueFormDialog;
