import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const EmptyIssueForm = () => {
  return (
    <form
      action={async (form) => {
        "use server";
        const { createIssue } = await import("@/lib/github");
        const title = form.get("title");
        const description = form.get("description");
        // verify that title and description are not empty and is a string
        if (typeof title !== "string" || title.length === 0) {
          throw new Error("Title is required");
        }
        if (typeof description !== "string" || description.length === 0) {
          throw new Error("Description is required");
        }
        console.log("sabmitting issue");
        const issue = await createIssue(title, description);
        console.log("issue submitted", issue);
      }}
      className="flex flex-col max-w-2xl gap-4"
    >
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
