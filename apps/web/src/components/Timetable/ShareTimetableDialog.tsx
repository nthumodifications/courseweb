import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Globe,
  Link,
  Loader2,
  Lock,
  Plus,
  QrCode,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@courseweb/ui";
import { Separator } from "@courseweb/ui";
import { ScrollArea } from "@courseweb/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@courseweb/ui";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import {
  useTimetableShare,
  type SharedTimetable,
} from "@/hooks/useTimetableShare";
import { useAuth } from "react-oidc-context";
import { toPrettySemester } from "@/helpers/semester";
import { semesterInfo } from "@courseweb/shared";
import client from "@/config/api";
import { CourseDefinition } from "@/config/supabase";
import { useNavigate, useParams } from "react-router-dom";

function useLang() {
  const { lang } = useParams<{ lang: string }>();
  return lang ?? "en";
}

type Visibility = "link_only" | "public";

// ── Compact share list item with collapsible QR ──────────────────────────────
function ShareListItem({
  share,
  onDelete,
}: {
  share: SharedTimetable;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const lang = useLang();
  const url = `${window.location.origin}/${lang}/timetable/share/${share.id}`;

  const copy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="flex flex-col flex-1 min-w-0">
          <span className="text-sm font-medium truncate">
            {share.displayName || toPrettySemester(share.semesters[0] ?? "")}
          </span>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {share.isLive ? (
              <span className="flex items-center gap-0.5">
                <RefreshCw className="h-2.5 w-2.5" /> Live
              </span>
            ) : (
              <span className="flex items-center gap-0.5">
                <Lock className="h-2.5 w-2.5" /> Snapshot
              </span>
            )}
            {share.visibility === "public" && (
              <span className="flex items-center gap-0.5">
                <Globe className="h-2.5 w-2.5" /> Public
              </span>
            )}
          </div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0"
          onClick={copy}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0"
          onClick={() => setExpanded((v) => !v)}
        >
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-150 ${expanded ? "rotate-180" : ""}`}
          />
        </Button>
      </div>

      {expanded && (
        <div className="border-t px-3 py-3 flex flex-col gap-3 bg-muted/20">
          <Input value={url} readOnly className="font-mono text-xs h-7" />
          <div className="flex items-center justify-between">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs px-2"
              onClick={() => setShowQr((v) => !v)}
            >
              <QrCode className="h-3 w-3 mr-1" />
              {showQr ? "Hide QR" : "Show QR"}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="h-7 text-xs px-2"
              onClick={onDelete}
            >
              <Trash2 className="h-3 w-3 mr-1" /> Delete
            </Button>
          </div>
          {showQr && (
            <div className="flex justify-center p-3 bg-white rounded border">
              <QRCodeSVG value={url} size={96} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Course note editor ────────────────────────────────────────────────────────
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

// ── Groups tab — create a group with semester picker + nickname ───────────────
function GroupsTab({ semester: activeSemester }: { semester: string }) {
  const [groupName, setGroupName] = useState("");
  const [groupSemester, setGroupSemester] = useState(activeSemester);
  const [creatorLabel, setCreatorLabel] = useState("");
  const [created, setCreated] = useState<{
    inviteCode: string;
    name: string;
  } | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);

  const { courses } = useUserTimetable();
  const { createShare, createGroup } = useTimetableShare();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();

  const recentSemesters = [...semesterInfo].reverse().slice(0, 10);

  const createMutation = useMutation({
    mutationFn: async () => {
      // Auto-create a live share for the chosen semester
      const share = await createShare({
        displayName: groupName.trim(),
        semesters: [groupSemester],
        courses: { [groupSemester]: courses[groupSemester] ?? [] },
        isLive: true,
        visibility: "link_only",
      });
      return createGroup({
        name: groupName.trim(),
        semester: groupSemester,
        sharedTimetableId: share.id,
        creatorLabel: creatorLabel.trim() || undefined,
      });
    },
    onSuccess: (group) => {
      queryClient.invalidateQueries({ queryKey: ["my-groups"] });
      queryClient.invalidateQueries({ queryKey: ["own-shares"] });
      setCreated({ inviteCode: group.inviteCode, name: group.name });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const inviteUrl = created
    ? `${window.location.origin}/${lang}/timetable/group/${created.inviteCode}`
    : null;

  const copyInvite = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
    });
  };

  if (created && inviteUrl) {
    return (
      <div className="flex flex-col gap-4">
        <div className="text-center py-2">
          <p className="font-semibold">{created.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Group created — share the link below
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            value={inviteUrl}
            readOnly
            className="font-mono text-xs flex-1"
          />
          <Button size="icon" variant="outline" onClick={copyInvite}>
            {copiedInvite ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
        <Button
          className="w-full"
          onClick={() =>
            navigate(`/${lang}/timetable/group/${created.inviteCode}`)
          }
        >
          Open group <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => {
            setCreated(null);
            setGroupName("");
            setCreatorLabel("");
          }}
        >
          Create another
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="group-name">Group name</Label>
        <Input
          id="group-name"
          placeholder="e.g. CS Friends 113-2"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          maxLength={80}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label>Semester</Label>
          <Select value={groupSemester} onValueChange={setGroupSemester}>
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {recentSemesters.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {toPrettySemester(s.id)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="creator-label">Your nickname</Label>
          <Input
            id="creator-label"
            placeholder="How you appear"
            value={creatorLabel}
            onChange={(e) => setCreatorLabel(e.target.value)}
            maxLength={60}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground -mt-1">
        Your timetable for {toPrettySemester(groupSemester)} will be linked
        automatically.
      </p>

      <Button
        className="w-full"
        onClick={() => createMutation.mutate()}
        disabled={!groupName.trim() || createMutation.isPending}
      >
        {createMutation.isPending ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Users className="h-4 w-4 mr-2" />
        )}
        Create Group
      </Button>
    </div>
  );
}

// ── Main dialog ───────────────────────────────────────────────────────────────
const ShareTimetableDialog = ({
  children,
  initialTab = "create",
}: {
  children: React.ReactNode;
  initialTab?: "create" | "manage" | "groups";
}) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"create" | "manage" | "groups">(initialTab);
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

  const { courses, semester, colorMap } = useUserTimetable();
  const { isAuthenticated } = useAuth();
  const { createShare, deleteShare, listOwnShares } = useTimetableShare();
  const queryClient = useQueryClient();

  // Multi-semester selection
  const [selectedSemesters, setSelectedSemesters] = useState<string[]>([
    semester,
  ]);
  const allSemestersWithCourses = Object.keys(courses).filter(
    (s) => (courses[s] ?? []).length > 0,
  );
  const toggleSemester = (sem: string) => {
    setSelectedSemesters((prev) =>
      prev.includes(sem) ? prev.filter((s) => s !== sem) : [...prev, sem],
    );
  };
  const allSelectedCourseIds = selectedSemesters.flatMap(
    (s) => courses[s] ?? [],
  );

  const { data: ownShares = [], isLoading: sharesLoading } = useQuery({
    queryKey: ["own-shares"],
    queryFn: listOwnShares,
    enabled: open && isAuthenticated,
  });

  const { data: semesterCourses = [] } = useQuery({
    queryKey: ["courses", [...allSelectedCourseIds].sort()],
    queryFn: async () => {
      if (!allSelectedCourseIds.length) return [];
      const res = await client.course.$get({
        query: { courses: allSelectedCourseIds },
      });
      return res.json() as Promise<CourseDefinition[]>;
    },
    enabled: open && allSelectedCourseIds.length > 0,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createShare({
        displayName: displayName || undefined,
        semesters: selectedSemesters,
        courses: Object.fromEntries(
          selectedSemesters.map((s) => [s, courses[s] ?? []]),
        ),
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
      <DialogContent className="max-w-lg flex flex-col max-h-[90dvh] overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" /> Share Timetable
          </DialogTitle>
          <DialogDescription>
            {selectedSemesters.length === 0
              ? "No semesters selected"
              : selectedSemesters.length === 1
                ? `${toPrettySemester(selectedSemesters[0])} · ${allSelectedCourseIds.length} courses`
                : `${selectedSemesters.length} semesters · ${allSelectedCourseIds.length} courses`}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as "create" | "manage" | "groups")}
          className="flex flex-col flex-1 min-h-0"
        >
          <TabsList className="w-full shrink-0">
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
            <TabsTrigger value="groups" className="flex-1">
              <Users className="h-3.5 w-3.5 mr-1" />
              Groups
            </TabsTrigger>
          </TabsList>

          {/* ── Create Link tab ─────────────────────────────────────────────── */}
          <TabsContent value="create" className="flex-1 mt-0 min-h-0">
            <ScrollArea className="h-full max-h-[55vh] pr-1">
              <div className="flex flex-col gap-4 py-3">
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

                {allSemestersWithCourses.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <Label>Semesters</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {allSemestersWithCourses.map((sem) => (
                        <button
                          key={sem}
                          type="button"
                          onClick={() => toggleSemester(sem)}
                          className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                            selectedSemesters.includes(sem)
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background border-border text-muted-foreground hover:border-foreground"
                          }`}
                        >
                          {toPrettySemester(sem)} ·{" "}
                          {(courses[sem] ?? []).length}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

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
                      Add notes visible to anyone viewing your timetable.
                    </p>
                    {semesterCourses.map((c) => (
                      <NoteEditor
                        key={c.raw_id}
                        courseId={c.raw_id}
                        courseNote={courseNotes[c.raw_id] ?? ""}
                        courseName={c.name_zh || c.name_en}
                        onSave={(note) =>
                          setCourseNotes((prev) => ({
                            ...prev,
                            [c.raw_id]: note,
                          }))
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
                        <span className="text-sm">
                          Grade & difficulty context
                        </span>
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
                    createMutation.isPending ||
                    selectedSemesters.length === 0 ||
                    allSelectedCourseIds.length === 0
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
                {selectedSemesters.length === 0 && (
                  <p className="text-xs text-center text-muted-foreground">
                    Select at least one semester
                  </p>
                )}
                {selectedSemesters.length > 0 &&
                  allSelectedCourseIds.length === 0 && (
                    <p className="text-xs text-center text-muted-foreground">
                      Add courses first
                    </p>
                  )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ── My Links tab ───────────────────────────────────────────────── */}
          <TabsContent value="manage" className="flex-1 mt-0 min-h-0">
            <ScrollArea className="h-full max-h-[55vh] pr-1">
              <div className="flex flex-col gap-2 py-3">
                {sharesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : ownShares.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No share links yet. Create one in the "Create Link" tab.
                  </div>
                ) : (
                  ownShares.map((share) => (
                    <ShareListItem
                      key={share.id}
                      share={share}
                      onDelete={() => deleteMutation.mutate(share.id)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ── Groups tab ─────────────────────────────────────────────────── */}
          <TabsContent value="groups" className="flex-1 mt-0 min-h-0">
            <ScrollArea className="h-full max-h-[55vh] pr-1">
              <div className="py-3">
                <GroupsTab semester={semester} />
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ShareTimetableDialog;
