import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useAuth } from "react-oidc-context";
import { useLocalStorage } from "usehooks-ts";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@courseweb/ui";
import {
  AlertCircle,
  Check,
  Info,
  Loader2,
  LogIn,
  Plus,
  RotateCcw,
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
  calculateSemesterCumulativeGpas,
  DEFAULT_GRADEBOOK,
  getGradeBandForEntry,
  GRADE_SCALE,
  mergeGradebooks,
  normalizeGradebook,
  type GradeLetter,
  type Gradebook,
  type GradeEntry,
  type SemesterRecord,
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
  const [gradebook, setGradebook, syncReady, syncError] =
    useSyncedStorage<Gradebook>(
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
  const [letterGrade, setLetterGrade] = useState<GradeLetter | "">("");
  const [formError, setFormError] = useState<string | null>(null);
  const [semesterName, setSemesterName] = useState("");
  const [semesterGpa, setSemesterGpa] = useState("");
  const [semesterCredits, setSemesterCredits] = useState("");
  const [semesterCumulativeGpa, setSemesterCumulativeGpa] = useState("");
  const [semesterFormError, setSemesterFormError] = useState<string | null>(
    null,
  );

  const normalizedGradebook = useMemo(
    () => normalizeGradebook(gradebook),
    [gradebook],
  );
  const entries = normalizedGradebook.entries;
  const semesters = normalizedGradebook.semesters;
  const baseline = normalizedGradebook.baseline;
  const isReady = !isAuthenticated || syncReady;
  const syncUnavailable = isAuthenticated && syncError;
  const userId = user?.profile.sub;
  const currentGpa = parseOptionalNumber(baseline.currentGpa, 0, 4.3);
  const completedCredits = parseOptionalNumber(baseline.completedCredits, 0);

  const termGpa = calculateGpa(entries);
  const termCredits = calculateCredits(entries);
  const semesterHistory = calculateSemesterCumulativeGpas({
    semesters,
    currentGpa,
    completedCredits,
  });
  const projectedCumulativeGpa = calculateProjectedCumulativeGpa({
    entries,
    semesters,
    currentGpa,
    completedCredits,
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
    const parsedScore = parseOptionalNumber(score, 0, 100);

    if (!courseName.trim()) {
      setFormError(dict.grade.course_error);
      return;
    }
    if (!Number.isFinite(parsedCredits) || parsedCredits <= 0) {
      setFormError(dict.grade.credits_error);
      return;
    }
    if (score.trim() !== "" && parsedScore === null) {
      setFormError(dict.grade.score_error);
      return;
    }
    if (score.trim() === "" && !letterGrade) {
      setFormError(dict.grade.grade_required);
      return;
    }

    const entry: GradeEntry = {
      id: createEntryId(),
      courseName: courseName.trim(),
      credits: parsedCredits,
      score: parsedScore,
      letterGrade: parsedScore === null ? letterGrade || null : null,
    };
    updateGradebook((previous) => ({
      ...previous,
      entries: [...previous.entries, entry],
    }));
    setCourseName("");
    setScore("");
    setLetterGrade("");
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

  const handleAddSemester = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedGpa = parseOptionalNumber(semesterGpa, 0, 4.3);
    const parsedCredits = Number(semesterCredits);
    const parsedCumulativeGpa = parseOptionalNumber(
      semesterCumulativeGpa,
      0,
      4.3,
    );

    if (!semesterName.trim()) {
      setSemesterFormError(dict.grade.semester_name_error);
      return;
    }
    if (semesterGpa.trim() === "" || parsedGpa === null) {
      setSemesterFormError(dict.grade.semester_gpa_error);
      return;
    }
    if (!Number.isFinite(parsedCredits) || parsedCredits <= 0) {
      setSemesterFormError(dict.grade.semester_credits_error);
      return;
    }
    if (semesterCumulativeGpa.trim() !== "" && parsedCumulativeGpa === null) {
      setSemesterFormError(dict.grade.cumulative_gpa_error);
      return;
    }

    const semester: SemesterRecord = {
      id: createEntryId(),
      name: semesterName.trim(),
      gpa: parsedGpa,
      credits: parsedCredits,
      cumulativeGpa: parsedCumulativeGpa,
    };
    updateGradebook((previous) => ({
      ...previous,
      semesters: [...previous.semesters, semester],
    }));
    setSemesterName("");
    setSemesterGpa("");
    setSemesterCredits("");
    setSemesterCumulativeGpa("");
    setSemesterFormError(null);
  };

  const updateSemester = (id: string, update: Partial<SemesterRecord>) => {
    updateGradebook((previous) => ({
      ...previous,
      semesters: previous.semesters.map((semester) =>
        semester.id === id ? { ...semester, ...update } : semester,
      ),
    }));
  };

  const handleSignIn = () => {
    localStorage.setItem(SYNC_INTENT_KEY, "true");
    localStorage.setItem("redirectUri", window.location.pathname);
    void signinRedirect();
  };

  return (
    <div className="flex flex-col gap-4 px-4 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3 py-4">
        <h1 className="text-xl font-bold">{dict.grade.tracker_title}</h1>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Badge variant="outline" className="gap-1.5 py-1.5">
            {syncUnavailable ? (
              <AlertCircle className="h-3.5 w-3.5 text-destructive" />
            ) : isAuthenticated ? (
              syncReady ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
            )}
            {syncUnavailable
              ? dict.grade.sync_unavailable
              : isAuthenticated
                ? syncReady
                  ? dict.grade.synced
                  : dict.grade.syncing
                : dict.grade.local_only}
          </Badge>
          {!isAuthenticated && (
            <Button variant="outline" size="sm" onClick={handleSignIn}>
              <LogIn className="h-4 w-4" />
              {dict.grade.sign_in}
            </Button>
          )}
        </div>
      </div>

      {isAuthenticated && !syncReady ? (
        <Card>
          <CardContent className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {dict.grade.syncing}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{dict.grade.overview}</CardTitle>
              <CardDescription>
                {termCredits > 0
                  ? `${formatCredits(termCredits)} ${dict.grade.credits_counted.toLowerCase()}`
                  : dict.grade.no_courses}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 p-4 sm:grid-cols-3">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  {dict.grade.predicted_term_gpa}
                </p>
                <p className="text-3xl font-semibold">{formatGpa(termGpa)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCredits(termCredits)}{" "}
                  {dict.grade.credits_counted.toLowerCase()}
                </p>
              </div>
              <div className="space-y-1 sm:border-l sm:pl-4">
                <p className="text-sm text-muted-foreground">
                  {dict.grade.projected_cumulative_gpa}
                </p>
                <p className="text-3xl font-semibold">
                  {formatGpa(projectedCumulativeGpa)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {baseline.currentGpa && baseline.completedCredits
                    ? `${dict.grade.current_gpa}: ${baseline.currentGpa}`
                    : dict.grade.current_gpa_hint}
                </p>
              </div>
              <div className="space-y-1 sm:border-l sm:pl-4">
                <p className="text-sm text-muted-foreground">
                  {dict.grade.your_courses}
                </p>
                <p className="text-3xl font-semibold">{entries.length}</p>
                <p className="text-xs text-muted-foreground">
                  {dict.grade.courses_count.replace(
                    "{count}",
                    entries.length.toString(),
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {dict.grade.add_course_title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddCourse} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_96px_120px_120px_auto] sm:items-end">
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
                          onChange={(event) => {
                            setScore(event.target.value);
                            if (event.target.value !== "") setLetterGrade("");
                          }}
                          placeholder={dict.grade.score_placeholder}
                          disabled={!isReady}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="grade-course-letter">
                          {dict.grade.letter_grade}
                        </Label>
                        <Select
                          value={letterGrade}
                          onValueChange={(value) => {
                            setLetterGrade(value as GradeLetter);
                            setScore("");
                          }}
                          disabled={!isReady}
                        >
                          <SelectTrigger id="grade-course-letter">
                            <SelectValue
                              placeholder={dict.grade.letter_grade_placeholder}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {GRADE_SCALE.map((band) => (
                              <SelectItem key={band.letter} value={band.letter}>
                                {band.letter}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                      <div className="hidden grid-cols-[minmax(0,1fr)_72px_100px_120px_60px_40px] gap-2 px-2 text-xs font-medium text-muted-foreground sm:grid">
                        <span>{dict.grade.course_name}</span>
                        <span>{dict.course.credits}</span>
                        <span>{dict.grade.score}</span>
                        <span>{dict.grade.letter_grade}</span>
                        <span>{dict.grade.grade_points}</span>
                        <span />
                      </div>
                      {entries.map((entry) => {
                        const band = getGradeBandForEntry(entry)!;
                        return (
                          <div
                            key={entry.id}
                            className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_72px_100px_120px_60px_40px] sm:items-center sm:border-0 sm:p-2 sm:hover:bg-muted/50"
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
                              value={entry.score ?? ""}
                              onChange={(event) => {
                                if (event.target.value !== "") {
                                  updateEntry(entry.id, {
                                    score: Number(event.target.value),
                                    letterGrade: null,
                                  });
                                }
                              }}
                              disabled={!isReady}
                            />
                            <Select
                              value={entry.letterGrade ?? ""}
                              onValueChange={(value) =>
                                updateEntry(entry.id, {
                                  score: null,
                                  letterGrade: value as GradeLetter,
                                })
                              }
                              disabled={!isReady}
                            >
                              <SelectTrigger
                                aria-label={dict.grade.letter_grade}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {GRADE_SCALE.map((gradeBand) => (
                                  <SelectItem
                                    key={gradeBand.letter}
                                    value={gradeBand.letter}
                                  >
                                    {gradeBand.letter}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
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

              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-lg">
                    {dict.grade.semester_history}
                  </CardTitle>
                  {semesters.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        updateGradebook((previous) => ({
                          ...previous,
                          semesters: [],
                        }))
                      }
                    >
                      <RotateCcw className="h-4 w-4" />
                      {dict.grade.clear_semesters}
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <form onSubmit={handleAddSemester} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_100px_100px_120px_auto] sm:items-end">
                      <div className="space-y-2">
                        <Label htmlFor="grade-semester-name">
                          {dict.grade.semester_name}
                        </Label>
                        <Input
                          id="grade-semester-name"
                          value={semesterName}
                          onChange={(event) =>
                            setSemesterName(event.target.value)
                          }
                          placeholder={dict.grade.semester_name_placeholder}
                          disabled={!isReady}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="grade-semester-gpa">
                          {dict.grade.semester_gpa}
                        </Label>
                        <Input
                          id="grade-semester-gpa"
                          type="number"
                          min="0"
                          max="4.3"
                          step="0.01"
                          value={semesterGpa}
                          onChange={(event) =>
                            setSemesterGpa(event.target.value)
                          }
                          placeholder="3.45"
                          disabled={!isReady}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="grade-semester-credits">
                          {dict.course.credits}
                        </Label>
                        <Input
                          id="grade-semester-credits"
                          type="number"
                          min="0.5"
                          step="0.5"
                          value={semesterCredits}
                          onChange={(event) =>
                            setSemesterCredits(event.target.value)
                          }
                          placeholder="20"
                          disabled={!isReady}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="grade-semester-cumulative-gpa">
                          {dict.grade.cumulative_gpa}
                        </Label>
                        <Input
                          id="grade-semester-cumulative-gpa"
                          type="number"
                          min="0"
                          max="4.3"
                          step="0.01"
                          value={semesterCumulativeGpa}
                          onChange={(event) =>
                            setSemesterCumulativeGpa(event.target.value)
                          }
                          placeholder={dict.grade.optional}
                          disabled={!isReady}
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full sm:w-auto"
                        disabled={!isReady}
                      >
                        <Plus className="h-4 w-4" />
                        {dict.grade.add_semester}
                      </Button>
                    </div>
                    {semesterFormError && (
                      <p className="text-sm text-destructive" role="alert">
                        {semesterFormError}
                      </p>
                    )}
                  </form>

                  {semesters.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                      {dict.grade.no_semesters}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="hidden grid-cols-[minmax(0,1fr)_100px_100px_120px_40px] gap-2 px-2 text-xs font-medium text-muted-foreground sm:grid">
                        <span>{dict.grade.semester_name}</span>
                        <span>{dict.grade.semester_gpa}</span>
                        <span>{dict.course.credits}</span>
                        <span>{dict.grade.cumulative_gpa}</span>
                        <span />
                      </div>
                      {semesters.map((semester) => {
                        const summary = semesterHistory.find(
                          (item) => item.id === semester.id,
                        );
                        return (
                          <div
                            key={semester.id}
                            className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_100px_100px_120px_40px] sm:items-center sm:border-0 sm:p-2 sm:hover:bg-muted/50"
                          >
                            <Input
                              aria-label={dict.grade.semester_name}
                              value={semester.name}
                              onChange={(event) =>
                                updateSemester(semester.id, {
                                  name: event.target.value,
                                })
                              }
                              disabled={!isReady}
                            />
                            <Input
                              aria-label={dict.grade.semester_gpa}
                              type="number"
                              min="0"
                              max="4.3"
                              step="0.01"
                              value={semester.gpa}
                              onChange={(event) => {
                                const value = Number(event.target.value);
                                if (
                                  Number.isFinite(value) &&
                                  value >= 0 &&
                                  value <= 4.3
                                ) {
                                  updateSemester(semester.id, { gpa: value });
                                }
                              }}
                              disabled={!isReady}
                            />
                            <Input
                              aria-label={dict.course.credits}
                              type="number"
                              min="0.5"
                              step="0.5"
                              value={semester.credits}
                              onChange={(event) => {
                                const value = Number(event.target.value);
                                if (Number.isFinite(value) && value > 0) {
                                  updateSemester(semester.id, {
                                    credits: value,
                                  });
                                }
                              }}
                              disabled={!isReady}
                            />
                            <Input
                              aria-label={dict.grade.cumulative_gpa}
                              type="number"
                              min="0"
                              max="4.3"
                              step="0.01"
                              value={
                                semester.cumulativeGpa ??
                                summary?.calculatedCumulativeGpa ??
                                ""
                              }
                              onChange={(event) => {
                                if (event.target.value === "") {
                                  updateSemester(semester.id, {
                                    cumulativeGpa: null,
                                  });
                                  return;
                                }
                                const value = Number(event.target.value);
                                if (
                                  Number.isFinite(value) &&
                                  value >= 0 &&
                                  value <= 4.3
                                ) {
                                  updateSemester(semester.id, {
                                    cumulativeGpa: value,
                                  });
                                }
                              }}
                              disabled={!isReady}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={dict.grade.remove_semester}
                              onClick={() =>
                                updateGradebook((previous) => ({
                                  ...previous,
                                  semesters: previous.semesters.filter(
                                    (item) => item.id !== semester.id,
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

            <div className="space-y-4">
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
