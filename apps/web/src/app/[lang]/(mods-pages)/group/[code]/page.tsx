import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useTimetableShare,
  type TimetableGroup,
} from "@/hooks/useTimetableShare";
import { useAuth } from "react-oidc-context";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import client from "@/config/api";
import { MinimalCourse } from "@/types/courses";
import { createTimetableFromCourses } from "@/helpers/timetable";
import { CourseTimeslotData } from "@/types/timetable";
import Timetable from "@/components/Timetable/Timetable";
import { toPrettySemester } from "@/helpers/semester";
import { Button } from "@courseweb/ui";
import { Input } from "@courseweb/ui";
import { toast } from "@courseweb/ui";
import { Separator } from "@courseweb/ui";
import { Copy, Check, Loader2, Users, LogOut, Eye, EyeOff } from "lucide-react";

const MEMBER_COLORS = [
  "#3b82f6",
  "#a855f7",
  "#f97316",
  "#10b981",
  "#ec4899",
  "#0ea5e9",
  "#84cc16",
];

function useGroupCourses(group: TimetableGroup | undefined) {
  const semester = group?.semester ?? "";
  const allCourseIds = [
    ...new Set(
      group?.members.flatMap((m) => m.share?.courses[semester] ?? []) ?? [],
    ),
  ];

  return useQuery({
    queryKey: ["courses", [...allCourseIds].sort()],
    queryFn: async () => {
      if (!allCourseIds.length) return [];
      const res = await client.course.$get({
        query: { courses: allCourseIds },
      });
      return res.json() as Promise<MinimalCourse[]>;
    },
    enabled: allCourseIds.length > 0,
  });
}

const GroupViewPage = () => {
  const { code } = useParams<{ code: string; lang: string }>();
  const { lang } = useParams<{ lang: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user: authUser } = useAuth();
  const { courses: userCourses } = useUserTimetable();
  const { getGroup, joinGroup, leaveGroup, listOwnShares, createShare } =
    useTimetableShare();
  const queryClient = useQueryClient();
  const [visibleMembers, setVisibleMembers] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [displayName, setDisplayName] = useState("");

  const { data: group, isLoading } = useQuery({
    queryKey: ["group", code],
    queryFn: () => getGroup(code!),
    enabled: !!code,
  });

  const { data: courses = [] } = useGroupCourses(group);

  const { data: ownShares = [] } = useQuery({
    queryKey: ["own-shares"],
    queryFn: listOwnShares,
    enabled: isAuthenticated,
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      const name = displayName.trim();
      if (!name) throw new Error("Please enter your name");

      const sem = group?.semester;
      if (!sem) throw new Error("Group not loaded");

      // Reuse existing share for this semester, or auto-create one
      const existingShare = ownShares.find((s) => s.semesters.includes(sem));
      let shareId = existingShare?.id;

      if (!shareId) {
        const created = await createShare({
          displayName: name,
          semesters: [sem],
          courses: { [sem]: userCourses[sem] ?? [] },
          isLive: true,
          visibility: "link_only",
        });
        shareId = created.id;
      }

      return joinGroup(code!, { sharedTimetableId: shareId, label: name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", code] });
      queryClient.invalidateQueries({ queryKey: ["own-shares"] });
      toast({ title: "Joined group!" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const leaveMutation = useMutation({
    mutationFn: () => leaveGroup(code!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", code] });
      navigate(-1);
      toast({ title: "Left group" });
    },
  });

  const toggleMember = (userId: string) => {
    setVisibleMembers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const currentUserId = authUser?.profile?.sub;
  const isAlreadyMember =
    !!group && group.members.some((m) => m.userId === currentUserId);

  const copyInviteUrl = () => {
    const url = `${window.location.origin}/${lang}/timetable/group/${code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">Group not found.</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Go back
        </Button>
      </div>
    );
  }

  const semester = group.semester;

  // Build overlaid timetable data with per-member colors
  const overlaidTimetableData: (CourseTimeslotData & {
    memberColor: string;
    memberLabel: string;
  })[] = [];

  group.members.forEach((member, i) => {
    if (!visibleMembers.has(member.userId)) return;
    const memberCourseIds = member.share?.courses[semester] ?? [];
    const memberCourses = courses.filter((c) =>
      memberCourseIds.includes((c as MinimalCourse).raw_id),
    );
    const memberColor = MEMBER_COLORS[i % MEMBER_COLORS.length];
    const memberTimetable = createTimetableFromCourses(
      memberCourses as MinimalCourse[],
      Object.fromEntries(memberCourseIds.map((id) => [id, memberColor])),
    );
    memberTimetable.forEach((slot) => {
      overlaidTimetableData.push({
        ...slot,
        memberColor,
        memberLabel: member.label,
      });
    });
  });

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <h1 className="text-lg font-semibold">{group.name}</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {toPrettySemester(semester)} · {group.members.length} members
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyInviteUrl}>
            {copied ? (
              <Check className="h-4 w-4 mr-1" />
            ) : (
              <Copy className="h-4 w-4 mr-1" />
            )}
            Copy invite link
          </Button>
          {isAuthenticated && isAlreadyMember && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => leaveMutation.mutate()}
              disabled={leaveMutation.isPending}
            >
              <LogOut className="h-4 w-4 mr-1" /> Leave
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-4 p-4 flex-1">
        <div className="w-full">
          <Timetable timetableData={overlaidTimetableData} />
          {visibleMembers.size === 0 && (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              Toggle members on the right to overlay their timetables
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">Members</h3>
            {group.members.map((member, i) => {
              const memberColor = MEMBER_COLORS[i % MEMBER_COLORS.length];
              const isVisible = visibleMembers.has(member.userId);
              const courseIds = member.share?.courses[semester] ?? [];
              return (
                <div
                  key={member.userId}
                  className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all ${
                    isVisible ? "border-primary" : ""
                  }`}
                  onClick={() => toggleMember(member.userId)}
                >
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: memberColor }}
                  />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm font-medium truncate">
                      {member.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {courseIds.length} courses
                    </span>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMember(member.userId);
                    }}
                  >
                    {isVisible ? (
                      <Eye className="h-3.5 w-3.5" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              );
            })}
          </div>

          {isAuthenticated && !isAlreadyMember && (
            <>
              <Separator />
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-medium">Join this group</h3>
                <p className="text-xs text-muted-foreground">
                  Enter your name so members can identify you. We'll link your
                  timetable automatically.
                </p>
                <Input
                  placeholder="Your name or nickname"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={60}
                  className="text-sm"
                />
                <Button
                  onClick={() => joinMutation.mutate()}
                  disabled={!displayName.trim() || joinMutation.isPending}
                  size="sm"
                >
                  {joinMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : null}
                  Join Group
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupViewPage;
