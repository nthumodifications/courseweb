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
import { DialogDescription } from "@radix-ui/react-dialog";
import { useEffect, useState, ReactNode } from "react";
import { toast } from "../ui/use-toast";
import { useQuery } from "@tanstack/react-query";
import { ScrollArea } from "../ui/scroll-area";
import { event } from "@/lib/gtag";
import Turnstile from "react-turnstile";
import client from "@/config/api";

interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

const parseApiError = async (response: Response): Promise<ApiError> => {
  let errorMessage = "An unknown error occurred";
  let errorCode = "";

  try {
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
      errorCode = errorData.code || "";
    } else {
      errorMessage =
        (await response.text()) ||
        `HTTP ${response.status}: ${response.statusText}`;
    }
  } catch {
    errorMessage = `HTTP ${response.status}: ${response.statusText}`;
  }

  return {
    message: errorMessage,
    code: errorCode,
    status: response.status,
  };
};

const getErrorMessage = (
  error: ApiError,
): { title: string; description: string } => {
  const { status, message } = error;

  switch (status) {
    case 400:
      if (message.includes("Turnstile")) {
        return {
          title: "Verification Failed",
          description:
            "Please refresh the page and complete the verification again",
        };
      }
      return {
        title: "Invalid Submission",
        description: message.includes("Title")
          ? "Please ensure your title is at least 7 characters long"
          : message.includes("Description")
            ? "Please provide a description of your issue"
            : message || "Please check your input and try again",
      };
    case 401:
      return {
        title: "Authentication Required",
        description: "Please refresh the page and try again",
      };
    case 403:
      return {
        title: "Access Denied",
        description: "You don't have permission to submit issues at this time",
      };
    case 429:
      return {
        title: "Too Many Requests",
        description: "Please wait a moment before submitting another issue",
      };
    case 500:
      return {
        title: "Server Error",
        description:
          "Our servers are experiencing issues. Please try again in a few minutes",
      };
    case 502:
    case 503:
    case 504:
      return {
        title: "Service Unavailable",
        description:
          "The issue reporting service is temporarily unavailable. Please try again later",
      };
    default:
      return {
        title: "Submission Failed",
        description:
          message || "An unexpected error occurred. Please try again",
      };
  }
};

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

const GenericIssueForm = ({ children }: { children?: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<ApiError | null>(null);

  useEffect(() => {
    if (!open) return;
    event({
      action: "open_report_issue",
      category: "report",
      label: "open_report_issue",
    });
  }, [open]);

  const MAX_RETRIES = 2;
  const RETRY_DELAYS = [1000, 3000]; // 1s, then 3s

  const validateForm = (): boolean => {
    if (!token) {
      toast({
        title: "Verification Required",
        description:
          "Please complete the verification to prove you're not a bot",
        variant: "destructive",
      });
      return false;
    }

    if (!title || title.length < 7) {
      toast({
        title: "Validation Error",
        description:
          "Title is required and should be at least 7 characters long",
        variant: "destructive",
      });
      return false;
    }

    if (!description || description.trim().length < 10) {
      toast({
        title: "Validation Error",
        description:
          "Please provide a detailed description (at least 10 characters)",
        variant: "destructive",
      });
      return false;
    }

    // Check for potentially spam-like content
    const spamIndicators = ["test", "testing", "asdf", "qwerty"];
    const lowercaseTitle = title.toLowerCase();
    const lowercaseDescription = description.toLowerCase();

    if (
      spamIndicators.some(
        (indicator) =>
          lowercaseTitle.includes(indicator) &&
          lowercaseDescription.includes(indicator),
      )
    ) {
      toast({
        title: "Please Provide Details",
        description: "Please provide a more detailed description of your issue",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const attemptSubmission = async (): Promise<boolean> => {
    try {
      const response = await client.issue.$post({
        json: {
          title: `[UI Submitted]: ${title}`,
          body: description,
          labels: ["generic"],
          turnstileToken: token,
        },
      } as any);

      if (!response.ok) {
        const error = await parseApiError(response);
        setLastError(error);

        // Don't retry for client errors (4xx) except for specific cases
        if (
          response.status >= 400 &&
          response.status < 500 &&
          response.status !== 429
        ) {
          const { title: errorTitle, description: errorDescription } =
            getErrorMessage(error);
          toast({
            title: errorTitle,
            description: errorDescription,
            variant: "destructive",
          });
          return false;
        }

        throw new Error(error.message);
      }

      // Success
      setOpen(false);
      setTitle("");
      setDescription("");
      setToken(null);
      setRetryCount(0);
      setLastError(null);

      toast({
        title: "Issue Submitted Successfully",
        description: "Thank you for your feedback! We'll look into your issue.",
      });

      return true;
    } catch (error) {
      const apiError: ApiError = {
        message:
          error instanceof Error ? error.message : "Network error occurred",
        status: 0,
      };
      setLastError(apiError);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const success = await attemptSubmission();
      if (success) return;

      // If we reach here, it's a retryable error
      let currentRetry = 0;
      while (currentRetry < MAX_RETRIES) {
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAYS[currentRetry]),
        );

        setRetryCount(currentRetry + 1);

        try {
          const success = await attemptSubmission();
          if (success) return;
        } catch (retryError) {
          console.warn(`Retry ${currentRetry + 1} failed:`, retryError);
        }

        currentRetry++;
      }

      // All retries failed
      const { title: errorTitle, description: errorDescription } =
        getErrorMessage(
          lastError || {
            message: "Failed to submit after multiple attempts",
            status: 500,
          },
        );

      toast({
        title: errorTitle,
        description: `${errorDescription} (Failed after ${MAX_RETRIES + 1} attempts)`,
        variant: "destructive",
      });
    } catch (error) {
      console.error("Error submitting issue:", error);

      const { title: errorTitle, description: errorDescription } =
        getErrorMessage(
          lastError || {
            message:
              error instanceof Error
                ? error.message
                : "An unexpected error occurred",
            status: 0,
          },
        );

      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setRetryCount(0);
    }
  };

  const {
    data: issues,
    isLoading,
    error: issuesError,
  } = useQuery({
    queryKey: ["issues"],
    queryFn: async () => {
      try {
        const res = await client.issue.$get({
          query: {
            tag: "display",
          },
        });

        if (!res.ok) {
          const errorData = await res.json();
          console.warn("Failed to fetch known issues:", errorData);
          return []; // Return empty array on error to prevent UI breaking
        }

        const data = await res.json();
        if (!Array.isArray(data)) {
          console.warn("Invalid issues data format:", data);
          return [];
        }

        return data;
      } catch (error) {
        console.warn("Error fetching known issues:", error);
        return []; // Return empty array on network errors
      }
    },
    enabled: open,
    retry: 1, // Only retry once for non-critical data
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button size="sm" variant="outline">
            <MessageCircle className="md:mr-2 w-4 h-4" />
            <span className="hidden md:inline-block">Feedback</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{`問題回報 Bug Reporting`}</DialogTitle>
          <DialogDescription>{`匿名的哦~ It's Anonymous!`}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[90vh]">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col max-w-2xl gap-4"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="title">{"標題 Title"}</Label>
              <Input
                id="title"
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Whats the feature/bug you're facing"
                disabled={isSubmitting}
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
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={placeholderIssueDescription}
                disabled={isSubmitting}
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
              <Button type="submit" disabled={isSubmitting || !token}>
                {isSubmitting
                  ? retryCount > 0
                    ? `Retrying... (${retryCount}/${MAX_RETRIES})`
                    : "Submitting..."
                  : "Submit"}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default GenericIssueForm;
