import { Button, Input, Label, Textarea } from "@courseweb/ui";
import client from "@/config/api";
import { FormEvent, useState } from "react";
import useDictionary from "@/dictionaries/useDictionary";
import Turnstile from "react-turnstile";

const EmptyIssueForm = () => {
  const dict = useDictionary();
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const title = form.get("title");
    const description = form.get("description");
    if (typeof title !== "string" || title.length === 0) {
      setError(dict.issues.form.title_required);
      return;
    }
    if (typeof description !== "string" || description.length === 0) {
      setError(dict.issues.form.description_required);
      return;
    }
    try {
      await client.issue.$post({
        json: {
          title,
          body: description,
          labels: [],
          turnstileToken: token ?? undefined,
        },
      });
      setSubmitted(true);
    } catch {
      setError(dict.issues.form.submit_error);
    }
  };

  if (submitted) {
    return <p className="text-primary">{dict.issues.form.success}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <p className="text-destructive text-sm">{error}</p>}
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">{dict.issues.form.title}</Label>
        <Input id="title" name="title" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">{dict.issues.form.description}</Label>
        <Textarea id="description" name="description" />
      </div>
      <Turnstile
        sitekey={import.meta.env.VITE_TURNSTILE_SITE_KEY!}
        onVerify={(token) => setToken(token)}
        size="flexible"
      />
      <div className="flex flex-row gap-2 justify-end">
        <Button type="submit" disabled={!token}>
          {dict.issues.form.submit}
        </Button>
      </div>
    </form>
  );
};

export default EmptyIssueForm;
