"use server";
import { createIssue } from "@/lib/github";

export const genericIssueFormAction = async (form: FormData) => {
  const url = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
  const token = form.get("token") as string;

  const formData = new FormData();
  formData.append("secret", process.env.TURNSTILE_SECRET_KEY!);
  formData.append("response", token);

  try {
    const result = await fetch(url, {
      body: formData,
      method: "POST",
    });
    const outcome = await result.json();
    if (outcome.success) {
      return processForm(form);
    }
  } catch (err) {
    return {
      error: {
        message: "Error verifying token",
      },
    };
  }

  return {
    error: {
      message: "Error verifying token",
    },
  };
};

const processForm = async (form: FormData) => {
  try {
    const title = form.get("title");
    const description = form.get("description");
    // verify that title and description are not empty and is a string
    if (typeof title !== "string" || title.length === 0 || title.length < 7) {
      throw new Error("Title is required and should be more than 7 characters");
    }
    if (typeof description !== "string" || description.length === 0) {
      throw new Error("Description is required");
    }
    console.log("sabmitting issue");
    const issue = await createIssue(`[UI Submitted]: ${title}`, description, [
      "generic",
    ]);
    console.log("issue submitted", issue);
  } catch (error) {
    if (error instanceof Error) {
      return {
        error: {
          message: error.message,
        },
      };
    }
  }
};
