"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from "@courseweb/ui";
import { ExternalLink, Lock } from "lucide-react";
import useDictionary from "@/dictionaries/useDictionary";
import { getContributionErrorMessage } from "./contribution-error";
import { extractAcixstore } from "./acixstore";

type CourseStatisticsCopy = {
  title: string;
  description: string;
  school_url: string;
  school_name: string;
  copied: string;
  detected: string;
  open_guide: string;
  open_school: string;
  step_indicator: string;
  step_label: string;
  back: string;
  next: string;
  retry: string;
  finish: string;
  steps: {
    open_school: { title: string; description: string };
    find_code: { title: string; description: string; caption: string };
    paste: { title: string; description: string };
    result: { title: string; description: string };
  };
  session_label: string;
  privacy: string;
  submit: string;
  loading: string;
  progress: string;
  result: string;
  already_up_to_date: string;
  no_data: string;
  no_data_count: string;
  semester_status: {
    saved: string;
    already_up_to_date: string;
    no_data: string;
  };
  errors: {
    invalid_session: string;
    session_expired: string;
    school_unreachable: string;
    school_response_invalid: string;
    invalid_semester: string;
    storage_error: string;
    rate_limited: string;
    unknown: string;
  };
};

type ContributionState =
  | { kind: "idle" }
  | { kind: "loading"; completed: number; total: number }
  | { kind: "result"; results: SemesterContribution[] }
  | { kind: "no_data" }
  | {
      kind: "error";
      code: string;
      session?: string;
      results?: SemesterContribution[];
      remaining?: SemesterOption[];
    };

type ContributionResult = {
  status: "saved" | "already_up_to_date" | "no_data";
  savedCourses: number;
};

type SemesterOption = { value: string; label: string };
type SemesterContribution = SemesterOption & {
  status: ContributionResult["status"];
  savedCourses: number;
};
type GuideStep = 1 | 2 | 3 | 4;

const API_BASE = import.meta.env.VITE_COURSEWEB_API_URL as string;
const CCXP_ENTRY_URL = "https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/";
const ADDRESS_PREFIX = "…/INQUIRE/select_entry.php?ACIXSTORE=";
const ADDRESS_VALUE = "abc123";
const ADDRESS_SUFFIX = "&hint=…";

const replaceCount = (template: string, count: number) =>
  template.replace("{count}", String(count));

const getResultCounts = (results: SemesterContribution[]) =>
  results.reduce(
    (counts, result) => ({
      savedCourses: counts.savedCourses + result.savedCourses,
      savedSemesters:
        counts.savedSemesters + (result.status === "saved" ? 1 : 0),
      upToDateSemesters:
        counts.upToDateSemesters +
        (result.status === "already_up_to_date" ? 1 : 0),
      noDataSemesters:
        counts.noDataSemesters + (result.status === "no_data" ? 1 : 0),
    }),
    {
      savedCourses: 0,
      savedSemesters: 0,
      upToDateSemesters: 0,
      noDataSemesters: 0,
    },
  );

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
    case "result": {
      const counts = getResultCounts(state.results);
      return [
        ...(counts.savedSemesters > 0
          ? [
              {
                key: "result",
                className: "text-sm",
                text: copy.result
                  .replace("{courses}", String(counts.savedCourses))
                  .replace("{semesters}", String(counts.savedSemesters)),
              },
            ]
          : []),
        ...(counts.upToDateSemesters > 0
          ? [
              {
                key: "already-up-to-date",
                className: "text-sm text-muted-foreground",
                text: replaceCount(
                  copy.already_up_to_date,
                  counts.upToDateSemesters,
                ),
              },
            ]
          : []),
        ...(counts.noDataSemesters > 0
          ? [
              {
                key: "no-data",
                className: "text-sm text-muted-foreground",
                text: replaceCount(copy.no_data_count, counts.noDataSemesters),
              },
            ]
          : []),
      ];
    }
    case "no_data":
      return [{ key: "no-data", className: "text-sm", text: copy.no_data }];
    default:
      return [];
  }
};

const getDisplayedResults = (state: ContributionState) => {
  if (state.kind === "result") return state.results;
  if (state.kind === "error") return state.results ?? [];
  return [];
};

const postContribution = async (
  session: string,
  semester?: string,
  signal?: AbortSignal,
) => {
  const body = new URLSearchParams({ ACIXSTORE: session });
  if (semester) body.set("semester", semester);
  const response = await fetch(`${API_BASE}/contribute/grades`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    signal,
  });
  const data = (await response.json()) as
    | { semesters: SemesterOption[] }
    | ContributionResult
    | { error: string };
  if (!response.ok) {
    if (response.status === 429) throw new Error("rate_limited");
    throw new Error("error" in data ? data.error : "unknown");
  }
  return data;
};

type AddressBarIllustrationProps = {
  schoolName: string;
  copiedLabel: string;
};

const AddressBarIllustration = ({
  schoolName,
  copiedLabel,
}: AddressBarIllustrationProps) => {
  const [reducedMotion, setReducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [urlVisible, setUrlVisible] = useState(false);
  const [selectionActive, setSelectionActive] = useState(false);
  const [copiedVisible, setCopiedVisible] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => setReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setUrlVisible(true);
      setSelectionActive(true);
      setCopiedVisible(true);
      return;
    }

    const timers = new Set<number>();
    const schedule = (callback: () => void, delay: number) => {
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        callback();
      }, delay);
      timers.add(timer);
    };
    const restart = () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
      setUrlVisible(false);
      setSelectionActive(false);
      setCopiedVisible(false);
      schedule(() => setUrlVisible(true), 150);
      schedule(() => setSelectionActive(true), 900);
      schedule(() => setCopiedVisible(true), 1_650);
    };

    restart();
    const loop = window.setInterval(restart, 5_000);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.clearInterval(loop);
    };
  }, [reducedMotion]);

  return (
    <div
      className="w-full overflow-hidden rounded-lg border border-border bg-muted p-3"
      aria-hidden="true"
    >
      <div className="overflow-hidden rounded-md border border-border bg-background">
        <div className="flex h-9 items-center gap-1 border-b border-border bg-muted px-3">
          <span className="h-2 w-2 rounded-full bg-muted-foreground/50" />
          <span className="h-2 w-2 rounded-full bg-muted-foreground/50" />
          <span className="h-2 w-2 rounded-full bg-muted-foreground/50" />
          <div className="ml-2 min-w-0 max-w-[12rem] rounded-t-md border-x border-t border-border bg-background px-3 py-1 text-xs text-foreground">
            <span className="block truncate">{schoolName}</span>
          </div>
        </div>

        <div className="border-b border-border bg-muted p-3">
          <div className="flex min-w-0 items-center gap-2 rounded-full border border-border bg-background px-3 py-2">
            <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1 overflow-hidden">
              <div
                className={`whitespace-nowrap font-mono text-[8px] leading-4 text-foreground motion-safe:transition-opacity motion-safe:duration-300 sm:text-xs ${urlVisible || reducedMotion ? "opacity-100" : "opacity-0"}`}
              >
                <span>{ADDRESS_PREFIX}</span>
                <span className="relative inline-block">
                  <span
                    className={`absolute inset-0 origin-left bg-primary motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out motion-reduce:transition-none ${selectionActive ? "scale-x-100" : "scale-x-0"}`}
                  />
                  <span
                    className={`relative z-10 motion-safe:transition-colors motion-safe:duration-500 motion-reduce:transition-none ${selectionActive ? "text-primary-foreground" : ""}`}
                  >
                    {ADDRESS_VALUE}
                  </span>
                </span>
                <span>{ADDRESS_SUFFIX}</span>
              </div>
            </div>
          </div>
          <p
            className={`min-h-4 text-center text-xs text-muted-foreground motion-safe:transition-opacity motion-safe:duration-300 ${copiedVisible || reducedMotion ? "opacity-100" : "opacity-0"}`}
          >
            {copiedLabel}
          </p>
        </div>

        <div className="flex flex-col gap-3 px-4 py-4">
          <span className="h-2 w-2/3 rounded-full bg-muted" />
          <span className="h-2 w-5/6 rounded-full bg-muted" />
          <span className="h-2 w-1/2 rounded-full bg-muted" />
        </div>
      </div>
    </div>
  );
};

const CourseStatisticsContribution = () => {
  const dict = useDictionary();
  const copy = dict.contribute.course_statistics as CourseStatisticsCopy;
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<GuideStep>(1);
  const [highestStep, setHighestStep] = useState<GuideStep>(1);
  const [sessionInput, setSessionInput] = useState("");
  const [state, setState] = useState<ContributionState>({ kind: "idle" });
  const runId = useRef(0);
  const activeController = useRef<AbortController | null>(null);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const sessionInputRef = useRef<HTMLInputElement>(null);

  const busy = state.kind === "loading";
  const errorMessage =
    state.kind === "error"
      ? getContributionErrorMessage(copy.errors, state.code)
      : null;
  const statusMessages = getStatusMessages(state, copy);
  const validSession = extractAcixstore(sessionInput);

  useEffect(() => {
    if (!open) return;
    const focusStep = window.setTimeout(() => {
      if (step === 3) {
        sessionInputRef.current?.focus();
      } else {
        stepHeading.current?.focus();
      }
    }, 0);
    return () => window.clearTimeout(focusStep);
  }, [open, step]);

  const clearRun = () => {
    activeController.current?.abort();
    activeController.current = null;
    runId.current += 1;
    setSessionInput("");
    setState({ kind: "idle" });
    setStep(1);
    setHighestStep(1);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      clearRun();
      setOpen(false);
      return;
    }
    setOpen(true);
  };

  const openGuide = () => {
    clearRun();
    setOpen(true);
  };

  const goToStep = (nextStep: GuideStep) => {
    if (busy || nextStep > highestStep) return;
    if (nextStep === 4 && state.kind === "idle") return;
    setStep(nextStep);
  };

  const goBack = () => {
    if (busy) return;
    if (step === 4) {
      setSessionInput("");
      setState({ kind: "idle" });
      setStep(3);
      setHighestStep(3);
      return;
    }
    setStep((current) => Math.max(1, current - 1) as GuideStep);
  };

  const goNext = () => {
    if (step === 3 || step === 4) return;
    const nextStep = (step + 1) as GuideStep;
    setStep(nextStep);
    setHighestStep((current) => Math.max(current, nextStep) as GuideStep);
  };

  const beginRun = () => {
    const currentRunId = runId.current + 1;
    runId.current = currentRunId;
    const controller = new AbortController();
    activeController.current = controller;
    setStep(4);
    setHighestStep(4);
    setState({ kind: "loading", completed: 0, total: 0 });
    return { currentRunId, controller };
  };

  const setContributionError = (
    error: unknown,
    session: string,
    results: SemesterContribution[] = [],
    remaining: SemesterOption[] = [],
  ) => {
    const code = error instanceof Error ? error.message : "unknown";
    if (code === "rate_limited") {
      setState({ kind: "error", code, session, results, remaining });
      return;
    }
    setState({ kind: "error", code });
  };

  const runSemesters = async (
    session: string,
    semesters: SemesterOption[],
    initialResults: SemesterContribution[],
    currentRunId: number,
    controller: AbortController,
  ) => {
    const total = initialResults.length + semesters.length;
    let results = initialResults;
    let nextSemesterIndex = 0;
    setState({ kind: "loading", completed: results.length, total });

    const isCurrentRun = () => runId.current === currentRunId;
    try {
      for (; nextSemesterIndex < semesters.length; nextSemesterIndex += 1) {
        const semester = semesters[nextSemesterIndex];
        const result = (await postContribution(
          session,
          semester.value,
          controller.signal,
        )) as ContributionResult;
        if (!isCurrentRun()) return;
        results = [
          ...results,
          {
            ...semester,
            status: result.status,
            savedCourses: result.savedCourses,
          },
        ];
        setState((current) => ({
          kind: "loading",
          completed: results.length,
          total,
        }));
      }

      activeController.current = null;
      setSessionInput("");
      setState({ kind: "result", results });
    } catch (error) {
      if (!isCurrentRun()) return;
      activeController.current = null;
      setSessionInput("");
      setContributionError(
        error,
        session,
        results,
        semesters.slice(nextSemesterIndex),
      );
    }
  };

  const runDiscovery = async (
    session: string,
    currentRunId: number,
    controller: AbortController,
  ) => {
    const isCurrentRun = () => runId.current === currentRunId;
    try {
      const discovery = (await postContribution(
        session,
        undefined,
        controller.signal,
      )) as { semesters: SemesterOption[] };
      if (!isCurrentRun()) return;
      if (discovery.semesters.length === 0) {
        activeController.current = null;
        setSessionInput("");
        setState({ kind: "no_data" });
        return;
      }
      await runSemesters(
        session,
        discovery.semesters,
        [],
        currentRunId,
        controller,
      );
    } catch (error) {
      if (!isCurrentRun()) return;
      activeController.current = null;
      setSessionInput("");
      setContributionError(error, session);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submittedSession = extractAcixstore(sessionInput);
    if (!submittedSession) return;
    const { currentRunId, controller } = beginRun();
    await runDiscovery(submittedSession, currentRunId, controller);
  };

  const retryContribution = () => {
    if (
      state.kind !== "error" ||
      state.code !== "rate_limited" ||
      !state.session
    ) {
      return;
    }
    const { currentRunId, controller } = beginRun();
    if (state.remaining && state.remaining.length > 0) {
      void runSemesters(
        state.session,
        state.remaining,
        state.results ?? [],
        currentRunId,
        controller,
      );
      return;
    }
    void runDiscovery(state.session, currentRunId, controller);
  };

  const stepCopy = [
    copy.steps.open_school,
    copy.steps.find_code,
    copy.steps.paste,
    copy.steps.result,
  ][step - 1];
  const displayedResults = getDisplayedResults(state);

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-base font-bold">{copy.title}</h2>
      <p className="text-muted-foreground leading-relaxed">
        {copy.description}
      </p>
      <div>
        <Button variant="outline" onClick={openGuide}>
          {copy.open_guide}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] overflow-hidden p-4 sm:max-w-5xl sm:w-full">
          <DialogHeader className="pr-4 text-left sm:text-left">
            <DialogTitle>{copy.title}</DialogTitle>
            <DialogDescription className="leading-relaxed">
              {stepCopy.title}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 overflow-y-auto">
            <div className="flex flex-col gap-4">
              <h3
                ref={stepHeading}
                tabIndex={-1}
                className="font-bold leading-snug focus:outline-none"
              >
                {stepCopy.title}
              </h3>

              {step === 1 ? (
                <>
                  <p className="leading-relaxed">{stepCopy.description}</p>
                  <div className="flex flex-col items-start gap-2">
                    <Button variant="outline" asChild>
                      <a
                        href={CCXP_ENTRY_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {copy.open_school}
                        <ExternalLink aria-hidden="true" />
                      </a>
                    </Button>
                    <p className="break-all text-sm leading-relaxed text-muted-foreground">
                      {copy.school_url}
                    </p>
                  </div>
                </>
              ) : null}

              {step === 2 ? (
                <>
                  <p className="leading-relaxed">{stepCopy.description}</p>
                  <AddressBarIllustration
                    schoolName={copy.school_name}
                    copiedLabel={copy.copied}
                  />
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {copy.steps.find_code.caption}
                  </p>
                </>
              ) : null}

              {step === 3 ? (
                <form
                  id="course-statistics-contribution-form"
                  className="flex flex-col gap-4"
                  onSubmit={handleSubmit}
                >
                  <p className="leading-relaxed">{stepCopy.description}</p>
                  <label className="flex flex-col gap-2" htmlFor="acixstore">
                    <span className="font-medium">{copy.session_label}</span>
                    <Input
                      ref={sessionInputRef}
                      id="acixstore"
                      type="text"
                      autoComplete="off"
                      value={sessionInput}
                      onChange={(event) => setSessionInput(event.target.value)}
                      disabled={busy}
                    />
                  </label>
                  {validSession ? (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {copy.detected.replace(
                        "{value}",
                        `${validSession.slice(0, 4)}....`,
                      )}
                    </p>
                  ) : null}
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {copy.privacy}
                  </p>
                </form>
              ) : null}

              {step === 4 ? (
                <>
                  <p className="leading-relaxed">
                    {busy ? copy.loading : stepCopy.description}
                  </p>
                  {statusMessages.length > 0 ? (
                    <output className="flex flex-col gap-4" aria-live="polite">
                      {statusMessages.map(({ key, className, text }) => (
                        <p key={key} className={className}>
                          {text}
                        </p>
                      ))}
                    </output>
                  ) : null}
                  {displayedResults.length > 0 ? (
                    <ul className="divide-y divide-border border-y border-border">
                      {displayedResults.map((result) => (
                        <li
                          key={result.value}
                          className="flex flex-row gap-4 py-4"
                        >
                          <span className="min-w-0 flex-1">{result.label}</span>
                          <span className="shrink-0 text-right text-sm text-muted-foreground">
                            {copy.semester_status[result.status]}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {errorMessage ? (
                    <>
                      <p className="text-sm text-destructive" role="alert">
                        {errorMessage}
                      </p>
                      {state.kind === "error" &&
                      state.code === "rate_limited" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={retryContribution}
                        >
                          {copy.retry}
                        </Button>
                      ) : null}
                    </>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div
                  className="flex items-center gap-1"
                  aria-label={copy.step_indicator}
                >
                  {[1, 2, 3, 4].map((stepNumber) => (
                    <button
                      key={stepNumber}
                      type="button"
                      aria-label={copy.step_label.replace(
                        "{step}",
                        String(stepNumber),
                      )}
                      aria-current={stepNumber === step ? "step" : undefined}
                      disabled={busy || stepNumber > highestStep}
                      className={`rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default ${stepNumber === step ? "h-2.5 w-2.5 bg-primary" : "h-2 w-2 bg-muted-foreground/40"}`}
                      onClick={() => goToStep(stepNumber as GuideStep)}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  {step} / 4
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={step === 1 || busy}
                  onClick={goBack}
                >
                  {copy.back}
                </Button>
                {step < 3 ? (
                  <Button type="button" size="sm" onClick={goNext}>
                    {copy.next}
                  </Button>
                ) : null}
                {step === 3 ? (
                  <Button
                    type="submit"
                    form="course-statistics-contribution-form"
                    size="sm"
                    disabled={busy || !validSession}
                  >
                    {copy.submit}
                  </Button>
                ) : null}
                {step === 4 ? (
                  <DialogClose asChild>
                    <Button type="button" size="sm" disabled={busy}>
                      {copy.finish}
                    </Button>
                  </DialogClose>
                ) : null}
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default CourseStatisticsContribution;
