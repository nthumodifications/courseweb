"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button, Input, Textarea } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import { reportClassPageTarget } from "@/lib/class-pages";

export const ReportForm = ({
  semester,
  courseId,
  targetType,
  targetId,
  token,
  onSent,
  onCancel,
}: {
  semester: string;
  courseId: string;
  targetType: "member" | "link";
  targetId: string;
  token: string;
  onSent: () => void;
  onCancel?: () => void;
}) => {
  const copy = useDictionary().course.details.class_pages;
  const [reason, setReason] = useState("spam");
  const [note, setNote] = useState("");
  const mutation = useMutation({
    mutationFn: () =>
      reportClassPageTarget(token, {
        semester,
        courseId,
        targetType,
        targetId,
        reason,
        note,
      }),
    onSuccess: onSent,
  });

  return (
    <form
      className="flex flex-col gap-2 border-t border-border pt-2"
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate();
      }}
    >
      <label className="flex flex-col gap-1 text-sm">
        <span>{copy.report_reason}</span>
        <select
          className="h-10 rounded-md border border-border bg-background px-2"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        >
          <option value="spam">{copy.report_spam}</option>
          <option value="harassment">{copy.report_harassment}</option>
          <option value="personal_info">{copy.report_personal_info}</option>
          <option value="other">{copy.report_other}</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>{copy.report_note}</span>
        <Textarea
          maxLength={500}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>
      {mutation.error && (
        <p className="text-sm text-destructive">{copy.error}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="outline" disabled={mutation.isPending}>
          {copy.send_report}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel ?? onSent}>
          {copy.cancel}
        </Button>
      </div>
    </form>
  );
};
