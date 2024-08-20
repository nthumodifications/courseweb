"use client";
import { Button } from "@/components/ui/button";
import { SubmissionDefinition } from "@/config/supabase";
import { Download } from "lucide-react";

const DownloadSubmissions = ({
  submissions,
  filename,
}: {
  submissions: SubmissionDefinition[];
  filename: string;
}) => {
  return (
    <Button
      variant="outline"
      onClick={() => {
        const csv = submissions
          .map((submission) => {
            return `${submission.user_id},${submission.name_zh},${submission.email},${submission.created_at}`;
          })
          .join("\n");
        const header = "學號,姓名,Email,提交時間\n";
        const csvWithHeader = header + csv;
        const blob = new Blob([csvWithHeader], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }}
    >
      <Download className="mr-2" /> 下載名單
    </Button>
  );
};

export default DownloadSubmissions;
