import {
  Button,
  Checkbox,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  toast,
} from "@courseweb/ui";
import { DialogDescription } from "@radix-ui/react-dialog";
import { ChevronDown, MessageCircle } from "lucide-react";
import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import Turnstile from "react-turnstile";
import client from "@/config/api";
import useDictionary from "@/dictionaries/useDictionary";
import { useSettings } from "@/hooks/contexts/settings";
import {
  DEFAULT_ATTACH_DIAGNOSTICS,
  buildIssueBody,
  findLikelyDuplicates,
  getBrowserFamily,
  getOsFamily,
  getRoutePatternFromPath,
  getAttachedDiagnostics,
  getViewportBucket,
  getReportAreaFromPath,
  ISSUE_TITLE_PREFIX,
  MAX_ISSUE_BODY_LENGTH,
  MAX_ISSUE_TITLE_LENGTH,
  type IssueDiagnostics,
  type KnownIssue,
  REPORT_AREAS,
  REPORT_TYPES,
  type ReportArea,
  type ReportType,
} from "./issue-report";

type ApiError = {
  message: string;
  code?: string;
  status?: number;
};

type ServiceWorkerState = IssueDiagnostics["serviceWorker"];
type AppliedIssueField = "reportType" | "reportArea" | "diagnostics";

const APPLIED_ISSUE_FIELDS: AppliedIssueField[] = [
  "reportType",
  "reportArea",
  "diagnostics",
];

const readServiceWorkerState = async (): Promise<ServiceWorkerState> => {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return "not-supported";
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    if (registrations.some((registration) => registration.waiting)) {
      return "update-available";
    }
    return registrations.some((registration) => registration.active)
      ? "active"
      : "unregistered";
  } catch {
    return "unregistered";
  }
};

const parseApiError = async (response: Response): Promise<ApiError> => {
  try {
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      const data = (await response.json()) as {
        error?: string;
        message?: string;
        code?: string;
      };
      return {
        message: data.error || data.message || "",
        code: data.code,
        status: response.status,
      };
    }
    return { message: await response.text(), status: response.status };
  } catch {
    return { message: "", status: response.status };
  }
};

const getIssueErrorMessage = (
  error: ApiError,
  issue: Record<string, string>,
) => {
  if (error.code?.startsWith("TURNSTILE")) {
    return {
      title: issue.verification_failed,
      description: issue.verification_failed_description,
    };
  }
  if (error.status === 429) {
    return {
      title: issue.too_many_requests,
      description: issue.too_many_requests_description,
    };
  }
  if (error.status && error.status >= 500) {
    return {
      title: issue.server_error,
      description: issue.server_error_description,
    };
  }
  return {
    title: issue.submission_failed,
    description: issue.submission_failed_description,
  };
};

const reportTypeLabels = (
  issue: Record<string, string>,
): Record<ReportType, string> => ({
  bug: issue.type_bug,
  "missing-data": issue.type_missing_data,
  suggestion: issue.type_suggestion,
  praise: issue.type_praise,
});

const reportAreaLabels = (
  issue: Record<string, string>,
): Record<ReportArea, string> => ({
  timetable: issue.area_timetable,
  search: issue.area_search,
  "sync-login": issue.area_sync_login,
  bus: issue.area_bus,
  other: issue.area_other,
});

const serviceWorkerLabels = (
  issue: Record<string, string>,
): Record<ServiceWorkerState, string> => ({
  "not-supported": issue.diagnostics_service_worker_not_supported,
  unregistered: issue.diagnostics_service_worker_unregistered,
  active: issue.diagnostics_service_worker_active,
  "update-available": issue.diagnostics_service_worker_update_available,
});

const projectKnownIssue = (value: unknown): KnownIssue | null => {
  if (!value || typeof value !== "object") return null;
  const issue = value as Partial<KnownIssue>;
  if (typeof issue.id !== "number" || typeof issue.title !== "string") {
    return null;
  }

  return {
    id: issue.id,
    title: issue.title,
    ...(typeof issue.number === "number" ? { number: issue.number } : {}),
    ...(typeof issue.html_url === "string" ? { html_url: issue.html_url } : {}),
    ...(typeof issue.state === "string" ? { state: issue.state } : {}),
  };
};

export const useKnownIssues = (enabled: boolean) =>
  useQuery({
    queryKey: ["issue-report", "known"],
    queryFn: async (): Promise<KnownIssue[]> => {
      try {
        const response = await client.issue.$get({ query: { tag: "display" } });
        if (!response.ok) return [];
        const data = (await response.json()) as unknown;
        return Array.isArray(data)
          ? data.flatMap((value) => {
              const issue = projectKnownIssue(value);
              return issue ? [issue] : [];
            })
          : [];
      } catch {
        return [];
      }
    },
    enabled,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

export type IssueReportState = ReturnType<typeof useIssueReport>;

export const useIssueReport = ({
  initialArea,
  initialType,
}: { initialArea?: ReportArea; initialType?: ReportType } = {}) => {
  const dict = useDictionary();
  const issue = dict.forms.issue as Record<string, string>;
  const location = useLocation();
  const auth = useAuth();
  const { darkMode, language } = useSettings();
  const [reportType, setReportType] = useState<ReportType>(
    initialType ?? "bug",
  );
  const [reportArea, setReportArea] = useState<ReportArea>(
    initialArea ?? getReportAreaFromPath(location.pathname),
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [expected, setExpected] = useState("");
  const [actual, setActual] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [attachDiagnostics, setAttachDiagnostics] = useState(
    DEFAULT_ATTACH_DIAGNOSTICS,
  );
  const [serviceWorker, setServiceWorker] =
    useState<ServiceWorkerState>("unregistered");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [appliedFields, setAppliedFields] = useState<AppliedIssueField[]>([]);
  const [diagnosticsAttached, setDiagnosticsAttached] = useState(false);
  const submissionLock = useRef(false);

  useEffect(() => {
    let active = true;
    void readServiceWorkerState().then((state) => {
      if (active) setServiceWorker(state);
    });
    return () => {
      active = false;
    };
  }, []);

  const diagnostics = useMemo<IssueDiagnostics>(() => {
    const viewport =
      typeof window === "undefined"
        ? "standard"
        : getViewportBucket(window.innerWidth, window.innerHeight);

    return {
      appVersion: import.meta.env.VITE_APP_VERSION || "0.1.0",
      buildCommit:
        import.meta.env.VITE_BUILD_COMMIT ||
        import.meta.env.VITE_COMMIT_SHA ||
        "unknown",
      route: getRoutePatternFromPath(location.pathname),
      language,
      theme: darkMode ? "dark" : "light",
      browser: getBrowserFamily(
        typeof navigator === "undefined" ? "" : navigator.userAgent,
      ),
      os: getOsFamily(
        typeof navigator === "undefined" ? "" : navigator.userAgent,
      ),
      viewport,
      online: typeof navigator === "undefined" ? true : navigator.onLine,
      serviceWorker,
      signedIn: auth.isAuthenticated,
    };
  }, [
    auth.isAuthenticated,
    darkMode,
    language,
    location.pathname,
    serviceWorker,
  ]);

  const reset = () => {
    setReportType(initialType ?? "bug");
    setReportArea(initialArea ?? getReportAreaFromPath(location.pathname));
    setTitle("");
    setDescription("");
    setExpected("");
    setActual("");
    setToken(null);
    setAttachDiagnostics(DEFAULT_ATTACH_DIAGNOSTICS);
    setError(null);
    setSubmitted(false);
    setAppliedFields([]);
    setDiagnosticsAttached(false);
  };

  const validate = () => {
    if (!token) return issue.verification_required;
    if (
      title.trim().length < 7 ||
      title.trim().length > MAX_ISSUE_TITLE_LENGTH
    ) {
      return issue.title_invalid;
    }
    if (description.trim().length < 10) return issue.description_invalid;
    if (reportType === "bug" && (!expected.trim() || !actual.trim())) {
      return issue.expected_actual_required;
    }
    const body = buildIssueBody({ description, expected, actual });
    if (body.length > MAX_ISSUE_BODY_LENGTH - 1500) {
      return issue.description_too_long;
    }
    return null;
  };

  const postReport = async () => {
    const response = await client.issue.$post({
      json: {
        title: `${ISSUE_TITLE_PREFIX}${title.trim()}`,
        body: buildIssueBody({
          description,
          expected: reportType === "bug" ? expected : "",
          actual: reportType === "bug" ? actual : "",
        }),
        labels: ["generic"],
        turnstileToken: token,
        reportType,
        reportArea,
        diagnostics: getAttachedDiagnostics(attachDiagnostics, diagnostics),
      },
    } as any);

    if (!response.ok) throw await parseApiError(response);

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      payload = undefined;
    }

    const applied =
      payload && typeof payload === "object" && "applied" in payload
        ? (payload as { applied?: unknown }).applied
        : undefined;
    const appliedFields = Array.isArray(applied)
      ? applied.filter(
          (field): field is AppliedIssueField =>
            typeof field === "string" &&
            APPLIED_ISSUE_FIELDS.includes(field as AppliedIssueField),
        )
      : [];

    return {
      appliedFields,
      diagnosticsAttached: appliedFields.includes("diagnostics"),
    };
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submissionLock.current || isSubmitting) return false;

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      toast({
        title: issue.validation_error,
        description: validationError,
        variant: "destructive",
      });
      return false;
    }

    submissionLock.current = true;
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await postReport();
      setAppliedFields(result.appliedFields);
      setDiagnosticsAttached(result.diagnosticsAttached);
      setSubmitted(true);
      toast({
        title: issue.success_title,
        description: result.diagnosticsAttached
          ? issue.success_description_with_diagnostics
          : issue.success_description,
      });
      return true;
    } catch (caughtError) {
      const lastError =
        typeof caughtError === "object" && caughtError !== null
          ? (caughtError as ApiError)
          : { message: "", status: 0 };
      const message = getIssueErrorMessage(lastError, issue);
      setError(message.description);
      toast({ ...message, variant: "destructive" });
      return false;
    } finally {
      submissionLock.current = false;
      setIsSubmitting(false);
    }
  };

  return {
    reportType,
    setReportType,
    reportArea,
    setReportArea,
    title,
    setTitle,
    description,
    setDescription,
    expected,
    setExpected,
    actual,
    setActual,
    token,
    setToken,
    attachDiagnostics,
    setAttachDiagnostics,
    diagnostics,
    isSubmitting,
    error,
    submitted,
    appliedFields,
    diagnosticsAttached,
    reset,
    submit,
  };
};

export const IssueReportDisclosure = ({
  report,
  idPrefix,
}: {
  report: IssueReportState;
  idPrefix: string;
}) => {
  const dict = useDictionary();
  const issue = dict.forms.issue as Record<string, string>;
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const diagnostics = report.diagnostics;
  const typeLabels = reportTypeLabels(issue);
  const areaLabels = reportAreaLabels(issue);
  const workerLabels = serviceWorkerLabels(issue);
  const diagnosticsRows = [
    [issue.diagnostics_app_version, diagnostics.appVersion],
    [issue.diagnostics_build_commit, diagnostics.buildCommit],
    [issue.diagnostics_route, diagnostics.route],
    [issue.diagnostics_language, diagnostics.language],
    [issue.diagnostics_theme, diagnostics.theme],
    [issue.diagnostics_browser, diagnostics.browser],
    [issue.diagnostics_os, diagnostics.os],
    [issue.diagnostics_viewport, diagnostics.viewport],
    [issue.diagnostics_online, diagnostics.online ? issue.yes : issue.no],
    [issue.diagnostics_service_worker, workerLabels[diagnostics.serviceWorker]],
    [issue.diagnostics_signed_in, diagnostics.signedIn ? issue.yes : issue.no],
  ];

  return (
    <div className="flex flex-col gap-4 border-t pt-4">
      <div className="flex flex-col gap-2">
        <p className="font-medium">{issue.public_warning_title}</p>
        <p>{issue.public_warning_description}</p>
      </div>
      <div className="flex flex-col gap-2">
        <label className="flex items-start gap-2 text-sm">
          <Checkbox
            id={`${idPrefix}-attach-diagnostics`}
            checked={report.attachDiagnostics}
            onCheckedChange={(checked) =>
              report.setAttachDiagnostics(checked === true)
            }
            disabled={report.isSubmitting}
          />
          <span>{issue.diagnostics_attach}</span>
        </label>
        <p className="text-xs text-muted-foreground">
          {report.attachDiagnostics
            ? issue.diagnostics_attached
            : issue.diagnostics_opted_out}
        </p>
      </div>
      <Collapsible open={diagnosticsOpen} onOpenChange={setDiagnosticsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="p-0 h-5 text-xs text-muted-foreground hover:text-foreground"
          >
            {issue.diagnostics_see_attached}
            <ChevronDown className="h-3 w-3 ml-0.5" />
          </Button>
        </CollapsibleTrigger>
        {diagnosticsOpen && (
          <CollapsibleContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 pt-2 text-xs">
              {diagnosticsRows.map(([label, value]) => (
                <div className="contents" key={label}>
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="break-all">{value}</dd>
                </div>
              ))}
            </dl>
          </CollapsibleContent>
        )}
      </Collapsible>
      <span className="sr-only">
        {typeLabels[report.reportType]} {areaLabels[report.reportArea]}
      </span>
    </div>
  );
};

export const IssueReportFields = ({
  report,
  knownIssues = [],
  idPrefix,
}: {
  report: IssueReportState;
  knownIssues?: KnownIssue[];
  idPrefix: string;
}) => {
  const dict = useDictionary();
  const issue = dict.forms.issue as Record<string, string>;
  const typeLabels = reportTypeLabels(issue);
  const areaLabels = reportAreaLabels(issue);
  const likelyDuplicates = findLikelyDuplicates(report.title, knownIssues);

  return (
    <form onSubmit={report.submit} className="flex flex-col gap-4">
      {report.error && (
        <p className="text-destructive text-sm">{report.error}</p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-type`}>{issue.report_type}</Label>
          <Select
            value={report.reportType}
            onValueChange={(value) => report.setReportType(value as ReportType)}
            disabled={report.isSubmitting}
          >
            <SelectTrigger id={`${idPrefix}-type`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REPORT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {typeLabels[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-area`}>{issue.report_area}</Label>
          <Select
            value={report.reportArea}
            onValueChange={(value) => report.setReportArea(value as ReportArea)}
            disabled={report.isSubmitting}
          >
            <SelectTrigger id={`${idPrefix}-area`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REPORT_AREAS.map((area) => (
                <SelectItem key={area} value={area}>
                  {areaLabels[area]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-title`}>{issue.label_title}</Label>
        <Input
          id={`${idPrefix}-title`}
          name="title"
          value={report.title}
          onChange={(event) => report.setTitle(event.target.value)}
          placeholder={issue.placeholder_title}
          maxLength={MAX_ISSUE_TITLE_LENGTH}
          disabled={report.isSubmitting}
        />
      </div>
      {likelyDuplicates.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium leading-none">
            {issue.likely_duplicates}
          </h3>
          <ul className="list-disc list-inside text-sm">
            {likelyDuplicates.map((knownIssue) => (
              <li key={knownIssue.id}>
                {knownIssue.html_url ? (
                  <a
                    href={knownIssue.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    {knownIssue.title}
                  </a>
                ) : (
                  knownIssue.title
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {knownIssues.length > 0 && (
        <div className="flex flex-col gap-2 max-h-[30vh]">
          <h3 className="text-sm font-medium leading-none">
            {issue.known_issues}
          </h3>
          <ScrollArea>
            <ul className="list-disc list-inside text-sm">
              {knownIssues.map((knownIssue) => (
                <li key={knownIssue.id}>{knownIssue.title}</li>
              ))}
            </ul>
          </ScrollArea>
        </div>
      )}
      {report.reportType === "bug" && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${idPrefix}-expected`}>{issue.expected}</Label>
            <Textarea
              id={`${idPrefix}-expected`}
              value={report.expected}
              onChange={(event) => report.setExpected(event.target.value)}
              placeholder={issue.expected_placeholder}
              maxLength={800}
              disabled={report.isSubmitting}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${idPrefix}-actual`}>{issue.actual}</Label>
            <Textarea
              id={`${idPrefix}-actual`}
              value={report.actual}
              onChange={(event) => report.setActual(event.target.value)}
              placeholder={issue.actual_placeholder}
              maxLength={800}
              disabled={report.isSubmitting}
            />
          </div>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-description`}>
          {issue.label_description}
        </Label>
        <Textarea
          id={`${idPrefix}-description`}
          name="description"
          value={report.description}
          onChange={(event) => report.setDescription(event.target.value)}
          placeholder={issue.placeholder_description}
          maxLength={6000}
          disabled={report.isSubmitting}
        />
        <p className="text-xs">{issue.detail_hint}</p>
        <p className="text-xs">{issue.markdown_hint}</p>
      </div>
      <IssueReportDisclosure report={report} idPrefix={idPrefix} />
      <Turnstile
        sitekey={import.meta.env.VITE_TURNSTILE_SITE_KEY!}
        onVerify={(value) => report.setToken(value)}
        onExpire={() => report.setToken(null)}
        size="flexible"
      />
      <div className="flex flex-row gap-2 justify-end">
        <Button type="submit" disabled={report.isSubmitting || !report.token}>
          {report.isSubmitting ? issue.submitting : issue.submit}
        </Button>
      </div>
    </form>
  );
};

export const IssueReportDialog = ({ children }: { children?: ReactNode }) => {
  const dict = useDictionary();
  const issue = dict.forms.issue as Record<string, string>;
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const report = useIssueReport();
  const { data: knownIssues = [] } = useKnownIssues(
    open && report.title.trim().length >= 3,
  );

  useEffect(() => {
    if (report.submitted) {
      report.reset();
      setOpen(false);
    }
  }, [report.submitted]);

  useEffect(() => {
    if (!open) return;
    // Keep the existing analytics event shared by both dialog entry points.
    import("@/lib/gtag").then(({ event }) => {
      event({
        action: "open_report_issue",
        category: "report",
        label: "open_report_issue",
      });
    });
  }, [open]);

  const handleOpenChange = (nextOpen: boolean) => {
    const hasUnfinishedDraft = Boolean(
      report.title.trim() ||
        report.description.trim() ||
        report.expected.trim() ||
        report.actual.trim() ||
        report.token,
    );
    if (nextOpen && !hasUnfinishedDraft) {
      report.setReportArea(getReportAreaFromPath(location.pathname));
    }
    setOpen(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children ?? (
          <Button size="sm" variant="outline">
            <MessageCircle className="md:mr-2 w-4 h-4" />
            <span className="hidden md:inline-block">{issue.feedback}</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{issue.title}</DialogTitle>
          <DialogDescription>{issue.description}</DialogDescription>
        </DialogHeader>
        <IssueReportFields
          report={report}
          knownIssues={knownIssues}
          idPrefix="dialog-issue"
        />
      </DialogContent>
    </Dialog>
  );
};
