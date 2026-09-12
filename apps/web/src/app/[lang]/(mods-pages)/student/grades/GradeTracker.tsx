import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useAuth } from "react-oidc-context";
import { useLocalStorage } from "usehooks-ts";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@courseweb/ui";
import {
  Check,
  Cloud,
  GraduationCap,
  Info,
  Loader2,
  LogIn,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import useDictionary from "@/dictionaries/useDictionary";
import useSyncedStorage from "@/hooks/useSyncedStorage";
import {
  getSyncedStorageKey,
  normalizeSyncedData,
  valuesEqual,
} from "@/hooks/syncedStorage";
import {
  calculateCredits,
  calculateGpa,
  calculateProjectedCumulativeGpa,
  DEFAULT_GRADEBOOK,
  getGradeBand,
  GRADE_SCALE,
  mergeGradebooks,
  normalizeGradebook,
  type Gradebook,
  type GradeEntry,
} from "./calculator";

const STORAGE_KEY = "grades";
const SYNC_INTENT_KEY = "grades_sync_intent";

const parseOptionalNumber = (
  value: string,
  minimum = Number.NEGATIVE_INFINITY,
  maximum = Number.POSITIVE_INFINITY,
) => {
  if (value.trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= minimum && number <= maximum
    ? number
    : null;
};

const formatGpa = (value: number | null) =>
  value === null ? "—" : value.toFixed(2);

const formatCredits = (value: number) =>
  Number.isInteger(value) ? value.toString() : value.toFixed(1);

const createEntryId = () =>
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const GradeTracker = () => {
  const dict = useDictionary();
  const { isAuthenticated, signinRedirect, user } = useAuth();
  const [gradebook, setGradebook, syncReady] = useSyncedStorage<Gradebook>(
    STORAGE_KEY,
    DEFAULT_GRADEBOOK,
    mergeGradebooks,
  );
  const [anonymousStoredGradebook] = useLocalStorage<unknown>(
    getSyncedStorageKey(STORAGE_KEY),
    DEFAULT_GRADEBOOK,
  );
  const migratedUserRef = useRef<string>();
  const [courseName, setCourseName] = useState("");
  const [credits, setCredits] = useState("3");
  const [score, setScore] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const normalizedGradebook = useMemo(
    () => normalizeGradebook(gradebook),
    [gradebook],
  );
  const entries = normalizedGradebook.entries;
  const baseline = normalizedGradebook.baseline;
  const isReady = !isAuthenticated || syncReady;
  const userId = user?.profile.sub;

  const termGpa = calculateGpa(entries);
  const termCredits = calculateCredits(entries);
  const projectedCumulativeGpa = calculateProjectedCumulativeGpa({
    entries,
    currentGpa: parseOptionalNumber(baseline.currentGpa, 0, 4.3),
    completedCredits: parseOptionalNumber(baseline.completedCredits, 0),
  });

  const updateGradebook = (update: (previous: Gradebook) => Gradebook) => {
    setGradebook((previous) => update(normalizeGradebook(previous)));
  };

  useEffect(() => {
    if (
      !isAuthenticated ||
      !userId ||
      !syncReady ||
      migratedUserRef.current === userId ||
      localStorage.getItem(SYNC_INTENT_KEY) !== "true"
    ) {
      return;
    }

    migratedUserRef.current = userId;
    const anonymousGradebook = normalizeGradebook(
      normalizeSyncedData<Gradebook>(anonymousStoredGradebook, "anonymous")
        .value,
    );
    const accountGradebook = normalizeGradebook(gradebook);
    const mergedGradebook = mergeGradebooks(
      anonymousGradebook,
      accountGradebook,
    );

    if (!valuesEqual(accountGradebook, mergedGradebook)) {
      setGradebook(mergedGradebook);
    }
    localStorage.removeItem(SYNC_INTENT_KEY);
  }, [
    anonymousStoredGradebook,
    gradebook,
    isAuthenticated,
    setGradebook,
    syncReady,
    userId,
  ]);

  const handleAddCourse = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedCredits = Number(credits);
    const parsedScore = Number(score);

    if (!courseName.trim()) {
      setFormError(dict.grade.course_error);
      return;
    }
    if (!Number.isFinite(parsedCredits) || parsedCredits <= 0) {
      setFormError(dict.grade.credits_error);
      return;
    }
    if (
      score.trim() === "" ||
      !Number.isFinite(parsedScore) ||
      parsedScore < 0 ||
      parsedScore > 100
    ) {
      setFormError(dict.grade.score_error);
      return;
    }

    const entry: GradeEntry = {
      id: createEntryId(),
      courseName: courseName.trim(),
      credits: parsedCredits,
      score: parsedScore,
    };
    updateGradebook((previous) => ({
      ...previous,
      entries: [...previous.entries, entry],
    }));
    setCourseName("");
    setScore("");
    setFormError(null);
  };

  const updateEntry = (id: string, update: Partial<GradeEntry>) => {
    updateGradebook((previous) => ({
      ...previous,
      entries: previous.entries.map((entry) =>
        entry.id === id ? { ...entry, ...update } : entry,
      ),
    }));
  };

  const handleSignIn = () => {
    localStorage.setItem(SYNC_INTENT_KEY, "true");
    localStorage.setItem("redirectUri", window.location.pathname);
    void signinRedirect();
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 pb-12">
      <div className="pt-6 pb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary/10 p-3 text-primary">
            <GraduationCap className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {dict.grade.tracker_title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {dict.grade.tracker_description}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Badge variant="outline" className="gap-1.5 py-1.5">
            {isAuthenticated ? (
              syncReady ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )
            ) : (
              <ShieldCheck className="h-3.5 w-3.5" />
            )}
            {isAuthenticated
              ? syncReady
                ? dict.grade.synced
                : dict.grade.syncing
              : dict.grade.local_only}
          </Badge>
          {!isAuthenticated && (
            <Button variant="outline" size="sm" onClick={handleSignIn}>
              <LogIn className="h-4 w-4" />
              {dict.grade.sign_in_to_sync}
            </Button>
          )}
        </div>
      </div>

      {!isAuthenticated && (
        <Alert className="mb-6">
          <Cloud className="h-4 w-4" />
          <AlertDescription>{dict.grade.sync_across_devices}</AlertDescription>
        </Alert>
      )}

      {isAuthenticated && !syncReady ? (
        <Card className="mb-6">
          <CardContent className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {dict.grade.syncing}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="mb-6 overflow-hidden">
            <CardHeader className="border-b bg-primary/[0.04]">
              <CardTitle className="text-lg">{dict.grade.overview}</CardTitle>
              <CardDescription>
                {termCredits > 0
                  ? `${formatCredits(termCredits)} ${dict.grade.credits_counted.toLowerCase()}`
                  : dict.grade.no_courses}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 p-4 sm:grid-cols-3 sm:p-6">
              <div className="rounded-lg bg-primary p-4 text-primary-foreground">
                <p className="text-sm opacity-80">
                  {dict.grade.predicted_term_gpa}
                </p>
                <p className="mt-2 text-4xl font-semibold">
                  {formatGpa(termGpa)}
                </p>
                <p className="mt-1 text-xs opacity-75">
                  {formatCredits(termCredits)}{" "}
                  {dict.grade.credits_counted.toLowerCase()}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">
                  {dict.grade.projected_cumulative_gpa}
                </p>
                <p className="mt-2 text-4xl font-semibold">
                  {formatGpa(projectedCumulativeGpa)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {baseline.currentGpa && baseline.completedCredits
                    ? `${dict.grade.current_gpa}: ${baseline.currentGpa}`
                    : dict.grade.current_gpa_hint}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">
                  {dict.grade.your_courses}
                </p>
                <p className="mt-2 text-4xl font-semibold">{entries.length}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {dict.grade.courses_count.replace(
                    "{count}",
                    entries.length.toString(),
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {dict.grade.add_course_title}
                  </CardTitle>
                  <CardDescription>
                    {dict.grade.add_course_description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddCourse} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_120px_140px_auto] sm:items-end">
                      <div className="space-y-2">
                        <Label htmlFor="grade-course-name">
                          {dict.grade.course_name}
                        </Label>
                        <Input
                          id="grade-course-name"
                          value={courseName}
                          onChange={(event) =>
                            setCourseName(event.target.value)
                          }
                          placeholder={dict.grade.course_name_placeholder}
                          disabled={!isReady}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="grade-course-credits">
                          {dict.course.credits}
                        </Label>
                        <Input
                          id="grade-course-credits"
                          type="number"
                          min="0.5"
                          step="0.5"
                          value={credits}
                          onChange={(event) => setCredits(event.target.value)}
                          disabled={!isReady}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="grade-course-score">
                          {dict.grade.score}
                        </Label>
                        <Input
                          id="grade-course-score"
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          inputMode="decimal"
                          value={score}
                          onChange={(event) => setScore(event.target.value)}
                          placeholder={dict.grade.score_placeholder}
                          disabled={!isReady}
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full sm:w-auto"
                        disabled={!isReady}
                      >
                        <Plus className="h-4 w-4" />
                        {dict.grade.add_course}
                      </Button>
                    </div>
                    {formError && (
                      <p className="text-sm text-destructive" role="alert">
                        {formError}
                      </p>
                    )}
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-lg">
                      {dict.grade.your_courses}
                    </CardTitle>
                    <CardDescription>
                      {dict.grade.courses_count.replace(
                        "{count}",
                        entries.length.toString(),
                      )}
                    </CardDescription>
                  </div>
                  {entries.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        updateGradebook((previous) => ({
                          ...previous,
                          entries: [],
                        }))
                      }
                    >
                      <RotateCcw className="h-4 w-4" />
                      {dict.grade.clear_all}
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {entries.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                      {dict.grade.no_courses}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="hidden grid-cols-[minmax(0,1fr)_88px_100px_72px_60px_40px] gap-2 px-2 text-xs font-medium text-muted-foreground sm:grid">
                        <span>{dict.grade.course_name}</span>
                        <span>{dict.course.credits}</span>
                        <span>{dict.grade.score}</span>
                        <span>{dict.grade.letter_grade}</span>
                        <span>{dict.grade.grade_points}</span>
                        <span />
                      </div>
                      {entries.map((entry) => {
                        const band = getGradeBand(entry.score);
                        return (
                          <div
                            key={entry.id}
                            className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_88px_100px_72px_60px_40px] sm:items-center sm:border-0 sm:p-2 sm:hover:bg-muted/50"
                          >
                            <Input
                              aria-label={dict.grade.course_name}
                              value={entry.courseName}
                              onChange={(event) =>
                                updateEntry(entry.id, {
                                  courseName: event.target.value,
                                })
                              }
                              disabled={!isReady}
                            />
                            <Input
                              aria-label={dict.course.credits}
                              type="number"
                              min="0.5"
                              step="0.5"
                              value={entry.credits}
                              onChange={(event) => {
                                if (event.target.value !== "") {
                                  updateEntry(entry.id, {
                                    credits: Number(event.target.value),
                                  });
                                }
                              }}
                              disabled={!isReady}
                            />
                            <Input
                              aria-label={dict.grade.score}
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={entry.score}
                              onChange={(event) => {
                                if (event.target.value !== "") {
                                  updateEntry(entry.id, {
                                    score: Number(event.target.value),
                                  });
                                }
                              }}
                              disabled={!isReady}
                            />
                            <Badge
                              variant={
                                band.points === 0 ? "destructive" : "secondary"
                              }
                            >
                              {band.letter}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {band.points.toFixed(1)}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={dict.grade.remove_course}
                              onClick={() =>
                                updateGradebook((previous) => ({
                                  ...previous,
                                  entries: previous.entries.filter(
                                    (item) => item.id !== entry.id,
                                  ),
                                }))
                              }
                              disabled={!isReady}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {dict.grade.current_gpa}
                  </CardTitle>
                  <CardDescription>
                    {dict.grade.current_gpa_hint}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="space-y-2">
                    <Label htmlFor="current-gpa">
                      {dict.grade.current_gpa}{" "}
                      <span className="text-muted-foreground">
                        ({dict.grade.optional})
                      </span>
                    </Label>
                    <Input
                      id="current-gpa"
                      type="number"
                      min="0"
                      max="4.3"
                      step="0.01"
                      value={baseline.currentGpa}
                      onChange={(event) =>
                        updateGradebook((previous) => ({
                          ...previous,
                          baseline: {
                            ...previous.baseline,
                            currentGpa: event.target.value,
                          },
                        }))
                      }
                      placeholder="e.g. 3.45"
                      disabled={!isReady}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="completed-credits">
                      {dict.grade.completed_credits}{" "}
                      <span className="text-muted-foreground">
                        ({dict.grade.optional})
                      </span>
                    </Label>
                    <Input
                      id="completed-credits"
                      type="number"
                      min="0"
                      step="0.5"
                      value={baseline.completedCredits}
                      onChange={(event) =>
                        updateGradebook((previous) => ({
                          ...previous,
                          baseline: {
                            ...previous.baseline,
                            completedCredits: event.target.value,
                          },
                        }))
                      }
                      placeholder="e.g. 60"
                      disabled={!isReady}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Info className="h-4 w-4 text-primary" />
                    {dict.grade.scale_title}
                  </CardTitle>
                  <CardDescription>
                    {dict.grade.scale_description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {GRADE_SCALE.map((band, index) => {
                      const upperBound =
                        index === 0 ? 100 : GRADE_SCALE[index - 1]!.minimum - 1;
                      return (
                        <div
                          key={band.letter}
                          className="flex items-center gap-3"
                        >
                          <span className="w-12 font-medium">
                            {band.letter}
                          </span>
                          <span className="flex-1 text-muted-foreground">
                            {band.minimum}–{upperBound}
                          </span>
                          <span className="w-10 text-right font-medium">
                            {band.points.toFixed(1)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex justify-between border-t pt-3 text-xs text-muted-foreground">
                    <span>{dict.grade.score_range}</span>
                    <span>{dict.grade.points}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default GradeTracker;
