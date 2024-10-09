"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { MessageCircle } from "lucide-react";
import { genericIssueFormAction } from "./GenericIssueFormDialog.action";
import { DialogDescription } from "@radix-ui/react-dialog";
import { useFormStatus } from "react-dom";
import { useEffect, useState } from "react";
import { toast } from "../ui/use-toast";
import { useQuery } from "@tanstack/react-query";
import { listIssuesWithTag } from "@/lib/github";
import { ScrollArea } from "../ui/scroll-area";
import { event } from "@/lib/gtag";
import Turnstile from "react-turnstile";

const placeholderIssueDescription = `   **Describe the issue**
A clear and concise description of what the issue is.

   **To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

   **Expected behavior**
A clear and concise description of what you expected to happen.
`;

const GenericIssueForm = () => {
  const { pending } = useFormStatus();
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    event({
      action: "open_report_issue",
      category: "report",
      label: "open_report_issue",
    });
  }, [open]);

  const action = async (form: FormData) => {
    if (!token) {
      toast({
        title: "Error Occured",
        description: "Please verify you're not a bot",
      });
      return;
    }

    form.append("token", token);

    const res = await genericIssueFormAction(form);
    if (res && "error" in res && res.error) {
      console.error(res.error.message);
      toast({
        title: "Error Occured",
        description: res.error.message,
      });
      return;
    }
    setOpen(false);
    toast({
      title: "Issue Submitted",
      description: "Thank you for your feedback!",
    });
  };

  const {
    data: issues,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["issues"],
    queryFn: () => listIssuesWithTag("display"),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <MessageCircle className="md:mr-2 w-4 h-4" />
          <span className="hidden md:inline-block">Feedback</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{`問題回報 Bug Reporting`}</DialogTitle>
          <DialogDescription>{`匿名的哦~ It's Anonymous!`}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[90vh]">
          <form action={action} className="flex flex-col max-w-2xl gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="title">{"標題 Title"}</Label>
              <Input
                id="title"
                name="title"
                placeholder="Whats the feature/bug you're facing"
                disabled={pending}
              />
            </div>
            {issues && issues.length > 0 && (
              <div className="flex flex-col gap-2 max-h-[30vh]">
                <h3 className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {"在解決的問題 Known Issues"}
                </h3>
                <ScrollArea>
                  <ul className="list-disc list-inside text-sm">
                    {issues.map((issue) => (
                      <li key={issue.id}>{issue.title}</li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="description">{"詳情 Describe your issue"}</Label>
              <Textarea
                id="description"
                name="description"
                placeholder={placeholderIssueDescription}
                disabled={pending}
              />
              <p className="text-xs">
                {
                  "盡量寫越詳細越好，盡可能留下可聯絡的方式。 Be as detailed as you can, and leave a contact if you'd like a follow up"
                }
              </p>
              <p className="text-xs">{"Markdown GFM enabled!"}</p>
            </div>
            <Turnstile
              sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
              onVerify={(token) => setToken(token)}
              size="flexible"
            />
            <div className="flex flex-row gap-2 justify-end">
              <Button type="submit" disabled={pending}>
                Submit
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default GenericIssueForm;
