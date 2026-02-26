"use client";
import { Button } from "@courseweb/ui";
import { Input } from "@courseweb/ui";
import { Label } from "@courseweb/ui";
import { Textarea } from "@courseweb/ui";
import client from "@/config/api";
import { FormEvent } from "react";

const EmptyIssueForm = () => {
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const title = form.get("title");
    const description = form.get("description");
    if (typeof title !== "string" || title.length === 0) {
      throw new Error("Title is required");
    }
    if (typeof description !== "string" || description.length === 0) {
      throw new Error("Description is required");
    }
    console.log("submitting issue");
    const issue = await client.issue.$post({
      json: {
        title,
        body: description,
        labels: [],
      },
    });
    console.log("issue submitted", issue);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col max-w-2xl gap-4">
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
