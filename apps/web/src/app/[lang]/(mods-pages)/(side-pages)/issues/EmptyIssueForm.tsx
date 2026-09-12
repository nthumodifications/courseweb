import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Input,
  Label,
  Textarea,
} from "@courseweb/ui";
import { type FormEvent, useState } from "react";

import client from "@/config/api";
import useDictionary from "@/dictionaries/useDictionary";

const EmptyIssueForm = () => {
  const dict = useDictionary();
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const title = form.get("title");
    const description = form.get("description");

    if (typeof title !== "string" || title.trim().length === 0) {
      setError(dict.issues.form.title_required);
      return;
    }
    if (typeof description !== "string" || description.trim().length === 0) {
      setError(dict.issues.form.description_required);
      return;
    }

    try {
      await client.issue.$post({
        json: {
          title,
          body: description,
          labels: [],
        },
      });
      setSubmitted(true);
      event.currentTarget.reset();
    } catch {
      setError(dict.issues.form.failure_description);
    }
  };

  if (submitted) {
    return (
      <Alert className="border-success text-success" aria-live="polite">
        <AlertTitle>{dict.issues.form.success_title}</AlertTitle>
        <AlertDescription>
          {dict.issues.form.success_description}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl space-y-3">
      {error && (
        <Alert variant="destructive" aria-live="assertive">
          <AlertTitle>{dict.issues.form.failure_title}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-1">
        <Label htmlFor="issue-title">{dict.issues.form.title_label}</Label>
        <Input id="issue-title" name="title" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="issue-description">
          {dict.issues.form.description_label}
        </Label>
        <Textarea id="issue-description" name="description" rows={6} />
      </div>
      <div className="flex justify-start pt-1">
        <Button type="submit">{dict.issues.form.submit}</Button>
      </div>
    </form>
  );
};

export default EmptyIssueForm;
