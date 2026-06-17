import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Globe,
  Link,
  Loader2,
  Lock,
  RefreshCw,
  Share2,
  Trash2,
  Users,
} from "lucide-react";
import { useState, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@courseweb/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@courseweb/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@courseweb/ui";
import { Button } from "@courseweb/ui";
import { Input } from "@courseweb/ui";
import { Label } from "@courseweb/ui";
import { Switch } from "@courseweb/ui";
import { Badge } from "@courseweb/ui";
import { Textarea } from "@courseweb/ui";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@courseweb/ui";
import { Separator } from "@courseweb/ui";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import {
  useTimetableShare,
  type SharedTimetable,
} from "@/hooks/useTimetableShare";
import { useAuth } from "react-oidc-context";
import { toPrettySemester } from "@/helpers/semester";
import client from "@/config/api";
import { CourseDefinition } from "@/config/supabase";

type Visibility = "link_only" | "public";

function ShareLinkPanel({
  share,
  onDelete,
}: {
  share: SharedTimetable & { shareUrl: string };
  onDelete: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/${window.location.pathname.split("/")[1]}/timetable/share/${share.id}`;

  const copy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Input value={url} readOnly className="flex-1 font-mono text-sm" />
        <Button size="icon" variant="outline" onClick={copy}>
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
      <div className="flex gap-2 items-start">
        <div className="p-2 bg-white rounded border">
          <QRCodeSVG value={url} size={120} />
        </div>
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {share.isLive ? (
              <>
                <RefreshCw className="h-3 w-3" /> Live sync
              </>
            ) : (
              <>
                <Lock className="h-3 w-3" /> Snapshot
              </>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {share.visibility === "public" ? (
              <>
                <Globe className="h-3 w-3" /> Public gallery
              </>
            ) : (
              <>
                <Link className="h-3 w-3" /> Link only
              </>
            )}
          </div>
          <Button
            size="sm"
            variant="destructive"
            className="mt-auto"
            onClick={onDelete}
          >
            <Trash2 className="h-3 w-3 mr-1" /> Delete link
          </Button>
        </div>
      </div>
    </div>
  );
}

function NoteEditor({
  courseId,
  courseNote,
  courseName,
  onSave,
}: {
  courseId: string;
  courseNote: string;
  courseName: string;
  onSave: (note: string) => void;
}) {
  const [value, setValue] = useState(courseNote);
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium truncate">{courseName}</span>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder='e.g. "No attendance required"'
          maxLength={200}
          className="text-sm h-8"
        />
        <Button
          size="sm"
          variant="outline"
          className="h-8 shrink-0"
          onClick={() => onSave(value)}
        >
          Save
        </Button>
      </div>
    </div>
  );
}

const ShareTimetableDialog = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"create" | "manage">("create");
  const [visibility, setVisibility] = useState<Visibility>("link_only");
  const [isLive, setIsLive] = useState(true);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [notesOpen, setNotesOpen] = useState(false);
  const [courseNotes, setCourseNotes] = useState<Record<string, string>>({});
  const [gradeMode, setGradeMode] = useState(false);
  const [gradeContext, setGradeContext] = useState<
    Record<string, { grade?: string; difficulty?: number; attendance?: string }>
  >({});

  const { courses, semester, getSemesterCourses, colorMap } =
    useUserTimetable();
  const { isAuthenticated } = useAuth();
  const { createShare, deleteShare, listOwnShares } = useTimetableShare();
  const queryClient = useQueryClient();

  const { data: ownShares = [], isLoading: sharesLoading } = useQuery({
    queryKey: ["own-shares"],
    queryFn: listOwnShares,
    enabled: open && isAuthenticated,
  });

  const semesterCourseIds = courses[semester] ?? [];
  const { data: semesterCourses = [] } = useQuery({
    queryKey: ["courses", [...semesterCourseIds].sort()],
    queryFn: async () => {
      if (!semesterCourseIds.length) return [];
      const res = await client.course.$get({
        query: { courses: semesterCourseIds },
      });
      return res.json() as Promise<CourseDefinition[]>;
    },
    enabled: open && semesterCourseIds.length > 0,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createShare({
        displayName: displayName || undefined,
        semesters: [semester],
        courses: { [semester]: semesterCourseIds },
        courseNotes,
        visibility,
        isLive,
        isAnonymous,
        gradeContext:
          gradeMode && Object.keys(gradeContext).length > 0
            ? gradeContext
            : undefined,
      }),
    onSuccess: (share) => {
      queryClient.invalidateQueries({ queryKey: ["own-shares"] });
      setTab("manage");
      toast({
        title: "Share link created!",
        description: `Share ID: ${share.id}`,
      });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteShare,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["own-shares"] });
      toast({ title: "Share link deleted" });
    },
  });

  if (!isAuthenticated) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Timetable</DialogTitle>
            <DialogDescription>
              Sign in to share your timetable.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" /> Share Timetable
          </DialogTitle>
          <DialogDescription>
            {toPrettySemester(semester)} · {semesterCourseIds.length} courses
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as "create" | "manage")}
        >
          <TabsList className="w-full">
            <TabsTrigger value="create" className="flex-1">
              Create Link
            </TabsTrigger>
            <TabsTrigger value="manage" className="flex-1">
              My Links
              {ownShares.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 text-xs px-1">
                  {ownShares.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="flex flex-col gap-4 mt-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="share-name">Name (optional)</Label>
              <Input
                id="share-name"
                placeholder={`${toPrettySemester(semester)} Timetable`}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Live sync</Label>
                  <p className="text-xs text-muted-foreground">
                    Viewers always see your latest courses
                  </p>
                </div>
                <Switch checked={isLive} onCheckedChange={setIsLive} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Public gallery</Label>
                  <p className="text-xs text-muted-foreground">
                    Appears in community timetable browser
                  </p>
                </div>
                <Switch
                  checked={visibility === "public"}
                  onCheckedChange={(v) =>
                    setVisibility(v ? "public" : "link_only")
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Anonymous</Label>
                  <p className="text-xs text-muted-foreground">
                    Hide your identity from viewers
                  </p>
                </div>
                <Switch
                  checked={isAnonymous}
                  onCheckedChange={setIsAnonymous}
                />
              </div>
            </div>

            <Separator />

            <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between h-8 px-2"
                >
                  <span className="text-sm">Course notes</span>
                  {notesOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="flex flex-col gap-3 mt-2">
                <p className="text-xs text-muted-foreground">
                  Add notes visible to anyone who views your timetable (e.g. "no
                  attendance", "heavy workload")
                </p>
                {semesterCourses.map((c) => (
                  <NoteEditor
                    key={c.raw_id}
                    courseId={c.raw_id}
                    courseNote={courseNotes[c.raw_id] ?? ""}
                    courseName={c.name_zh || c.name_en}
                    onSave={(note) =>
                      setCourseNotes((prev) => ({ ...prev, [c.raw_id]: note }))
                    }
                  />
                ))}
              </CollapsibleContent>
            </Collapsible>

            {visibility === "public" && (
              <Collapsible open={gradeMode} onOpenChange={setGradeMode}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between h-8 px-2"
                  >
                    <span className="text-sm">Grade & difficulty context</span>
                    {gradeMode ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="flex flex-col gap-3 mt-2">
                  <p className="text-xs text-muted-foreground">
                    Help juniors understand this semester. Optional.
                  </p>
                  {semesterCourses.map((c) => (
                    <div key={c.raw_id} className="flex flex-col gap-1">
                      <span className="text-sm font-medium truncate">
                        {c.name_zh}
                      </span>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Grade (A+, A, ...)"
                          maxLength={3}
                          className="h-7 text-sm w-24"
                          value={gradeContext[c.raw_id]?.grade ?? ""}
                          onChange={(e) =>
                            setGradeContext((prev) => ({
                              ...prev,
                              [c.raw_id]: {
                                ...prev[c.raw_id],
                                grade: e.target.value,
                              },
                            }))
                          }
                        />
                        <Input
                          placeholder="Difficulty 1-5"
                          type="number"
                          min={1}
                          max={5}
                          className="h-7 text-sm w-28"
                          value={gradeContext[c.raw_id]?.difficulty ?? ""}
                          onChange={(e) =>
                            setGradeContext((prev) => ({
                              ...prev,
                              [c.raw_id]: {
                                ...prev[c.raw_id],
                                difficulty: Number(e.target.value),
                              },
                            }))
                          }
                        />
                        <Input
                          placeholder="Attendance"
                          className="h-7 text-sm flex-1"
                          value={gradeContext[c.raw_id]?.attendance ?? ""}
                          onChange={(e) =>
                            setGradeContext((prev) => ({
                              ...prev,
                              [c.raw_id]: {
                                ...prev[c.raw_id],
                                attendance: e.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            <Button
              onClick={() => createMutation.mutate()}
              disabled={
                createMutation.isPending || semesterCourseIds.length === 0
              }
              className="w-full"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />{" "}
                  Generating...
                </>
              ) : (
                <>
                  <Link className="h-4 w-4 mr-2" /> Generate Share Link
                </>
              )}
            </Button>
            {semesterCourseIds.length === 0 && (
              <p className="text-xs text-center text-muted-foreground">
                Add courses first
              </p>
            )}
          </TabsContent>

          <TabsContent value="manage" className="mt-4">
            {sharesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : ownShares.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No share links yet. Create one in the "Create Link" tab.
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {ownShares.map((share) => (
                  <div key={share.id} className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {share.displayName ||
                          toPrettySemester(share.semesters[0] ?? "")}
                      </span>
                      {share.isLive && (
                        <Badge variant="secondary" className="text-xs">
                          Live
                        </Badge>
                      )}
                      {share.visibility === "public" && (
                        <Badge variant="outline" className="text-xs">
                          <Globe className="h-2.5 w-2.5 mr-1" />
                          Public
                        </Badge>
                      )}
                    </div>
                    <ShareLinkPanel
                      share={{ ...share, shareUrl: "" }}
                      onDelete={() => deleteMutation.mutate(share.id)}
                    />
                    <Separator />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ShareTimetableDialog;
