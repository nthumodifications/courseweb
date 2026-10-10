"use client";

import { useState, type FormEvent } from "react";
import { Button, Input } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import { getContributionErrorMessage } from "./contribution-error";

type CourseStatisticsCopy = {
  title: string;
  description: string;
  steps: { sign_in: string; copy: string };
  session_label: string;
  privacy: string;
  submit: string;
  loading: string;
  progress: string;
  result: string;
  already_up_to_date: string;
  no_data: string;
  errors: {
    invalid_session: string;
    session_expired: string;
    school_unreachable: string;
    school_response_invalid: string;
    invalid_semester: string;
    storage_error: string;
    unknown: string;
  };
};

type ContributionState =
  | { kind: "idle" }
  | { kind: "loading"; completed: number; total: number }
  | { kind: "success"; courses: number; semesters: number; upToDate: number }
  | { kind: "up_to_date"; semesters: number }
  | { kind: "no_data" }
  | { kind: "error"; code: string };

type ContributionResult = {
  status: "saved" | "already_up_to_date" | "no_data";
  savedCourses: number;
};

type SemesterOption = { value: string; label: string };

const API_BASE = import.meta.env.VITE_COURSEWEB_API_URL as string;

const replaceCount = (template: string, count: number) =>
  template.replace("{count}", String(count));

const getStatusMessages = (
  state: ContributionState,
  copy: CourseStatisticsCopy,
) => {
  switch (state.kind) {
    case "loading":
      return state.total > 0
        ? [
            {
              key: "progress",
              className: "text-sm text-muted-foreground",
              text: copy.progress
                .replace("{completed}", String(state.completed))
                .replace("{total}", String(state.total)),
            },
          ]
        : [];
    case "success":
      return [
        {
          key: "result",
          className: "text-sm",
          text: copy.result
            .replace("{courses}", String(state.courses))
            .replace("{semesters}", String(state.semesters)),
        },
        ...(state.upToDate > 0
          ? [
              {
                key: "already-up-to-date",
                className: "text-sm text-muted-foreground",
                text: replaceCount(copy.already_up_to_date, state.upToDate),
              },
            ]
          : []),
      ];
    case "up_to_date":
      return [
        {
          key: "already-up-to-date",
          className: "text-sm",
          text: replaceCount(copy.already_up_to_date, state.semesters),
        },
      ];
    case "no_data":
      return [{ key: "no-data", className: "text-sm", text: copy.no_data }];
    default:
      return [];
  }
};

const postContribution = async (session: string, semester?: string) => {
  const body = new URLSearchParams({ ACIXSTORE: session });
  if (semester) body.set("semester", semester);
  const response = await fetch(`${API_BASE}/contribute/grades`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = (await response.json()) as
    | { semesters: SemesterOption[] }
    | ContributionResult
    | { error: string };
  if (!response.ok) {
    throw new Error("error" in data ? data.error : "unknown");
  }
  return data;
};

const CourseStatisticsContribution = () => {
  const dict = useDictionary();
  const copy = dict.contribute.course_statistics as CourseStatisticsCopy;
  const [session, setSession] = useState("");
  const [state, setState] = useState<ContributionState>({ kind: "idle" });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submittedSession = session.trim();
    if (!submittedSession) return;
    setState({ kind: "loading", completed: 0, total: 0 });

    try {
      const discovery = (await postContribution(submittedSession)) as {
        semesters: SemesterOption[];
      };
      if (discovery.semesters.length === 0) {
        setSession("");
        setState({ kind: "no_data" });
        return;
      }
      setState({
        kind: "loading",
        completed: 0,
        total: discovery.semesters.length,
      });

      const totals = await discovery.semesters.reduce(
        async (totalsPromise, semester) => {
          const previous = await totalsPromise;
          const result = (await postContribution(
            submittedSession,
            semester.value,
          )) as ContributionResult;
          const next = {
            savedCourses: previous.savedCourses + result.savedCourses,
            savedSemesters:
              previous.savedSemesters + (result.status === "saved" ? 1 : 0),
            upToDateSemesters:
              previous.upToDateSemesters +
              (result.status === "already_up_to_date" ? 1 : 0),
            noDataSemesters:
              previous.noDataSemesters + (result.status === "no_data" ? 1 : 0),
          };
          setState((current) => ({
            kind: "loading",
            completed: current.kind === "loading" ? current.completed + 1 : 0,
            total: discovery.semesters.length,
          }));
          return next;
        },
        Promise.resolve({
          savedCourses: 0,
          savedSemesters: 0,
          upToDateSemesters: 0,
          noDataSemesters: 0,
        }),
      );

      setSession("");
      if (totals.savedSemesters > 0) {
        setState({
          kind: "success",
          courses: totals.savedCourses,
          semesters: totals.savedSemesters,
          upToDate: totals.upToDateSemesters,
        });
      } else if (totals.upToDateSemesters > 0) {
        setState({ kind: "up_to_date", semesters: totals.upToDateSemesters });
      } else if (totals.noDataSemesters > 0) {
        setState({ kind: "no_data" });
      }
    } catch (error) {
      setSession("");
      setState({
        kind: "error",
        code: error instanceof Error ? error.message : "unknown",
      });
    }
  };

  const busy = state.kind === "loading";
  const errorMessage =
    state.kind === "error"
      ? getContributionErrorMessage(copy.errors, state.code)
      : null;
  const statusMessages = getStatusMessages(state, copy);

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-base font-bold">{copy.title}</h2>
      <p className="text-muted-foreground leading-relaxed">
        {copy.description}
      </p>
      <ol className="list-decimal pl-4 text-muted-foreground leading-relaxed">
        <li>{copy.steps.sign_in}</li>
        <li>{copy.steps.copy}</li>
      </ol>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-2" htmlFor="acixstore">
          <span className="font-medium">{copy.session_label}</span>
          <Input
            id="acixstore"
            type="password"
            autoComplete="off"
            value={session}
            onChange={(event) => setSession(event.target.value)}
            disabled={busy}
          />
        </label>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {copy.privacy}
        </p>
        <div>
          <Button type="submit" disabled={busy || !session.trim()}>
            {busy ? copy.loading : copy.submit}
          </Button>
        </div>
      </form>
      {statusMessages.length > 0 ? (
        <output className="flex flex-col gap-4" aria-live="polite">
          {statusMessages.map(({ key, className, text }) => (
            <p key={key} className={className}>
              {text}
            </p>
          ))}
        </output>
      ) : null}
      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
};

export default CourseStatisticsContribution;
