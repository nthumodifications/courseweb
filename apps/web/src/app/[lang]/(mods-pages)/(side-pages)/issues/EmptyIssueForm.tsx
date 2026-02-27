import { Button } from "@courseweb/ui";
import { Input } from "@courseweb/ui";
import { Label } from "@courseweb/ui";
import { Textarea } from "@courseweb/ui";
import client from "@/config/api";
import { FormEvent, useState } from "react";

const EmptyIssueForm = () => {
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const title = form.get("title");
    const description = form.get("description");
    if (typeof title !== "string" || title.length === 0) {
      setError("Title is required");
      return;
    }
    if (typeof description !== "string" || description.length === 0) {
      setError("Description is required");
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
    } catch {
      setError("Failed to submit issue. Please try again.");
    }
  };

  if (submitted) {
    return <p className="text-green-600">Issue submitted successfully!</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col max-w-2xl gap-4">
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">{"Title"}</Label>
        <Input id="title" name="title" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">{"Describe your issue"}</Label>
        <Textarea id="description" name="description" />
      </div>
      <div className="flex flex-row gap-2 justify-end">
        <Button type="submit">Submit</Button>
      </div>
    </form>
  );
};

export default EmptyIssueForm;
