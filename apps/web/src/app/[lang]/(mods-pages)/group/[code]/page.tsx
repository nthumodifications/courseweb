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
import {
  EmptyState,
  PageHeader,
  PageShell,
  PageSkeleton,
} from "@courseweb/ui";
import ErrorState from "@/components/Pages/ErrorState";
import useDictionary from "@/dictionaries/useDictionary";
import {
  Copy,
  Check,
  Loader2,
  Users,
  LogOut,
  Eye,
  EyeOff,
  Trash2,
} from "lucide-react";

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
  const {
    getGroup,
    joinGroup,
    leaveGroup,
    deleteGroup,
    listOwnShares,
    createShare,
  } = useTimetableShare();
  const queryClient = useQueryClient();
  const [visibleMembers, setVisibleMembers] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [displayName, setDisplayName] = useState("");

  const dict = useDictionary();
  const { data: group, error, isLoading, refetch } = useQuery({
    queryKey: ["group", code],
    queryFn: () => getGroup(code!),
    enabled: !!code,
  });

  const {
    data: courses = [],
    error: coursesError,
    refetch: refetchCourses,
  } = useGroupCourses(group);

  const { data: ownShares = [] } = useQuery({
    queryKey: ["own-shares"],
    queryFn: listOwnShares,
    enabled: isAuthenticated,
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      const name = displayName.trim();
      if (!name) throw new Error(dict.group.name_required);

      const sem = group?.semester;
      if (!sem) throw new Error(dict.group.group_not_loaded);

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
      queryClient.invalidateQueries({ queryKey: ["my-groups"] });
      toast({ title: dict.group.joined });
    },
    onError: (e: Error) =>
      toast({
        title: dict.common.error,
        description: e.message,
        variant: "destructive",
      }),
  });

  const leaveMutation = useMutation({
    mutationFn: () => leaveGroup(code!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", code] });
      queryClient.invalidateQueries({ queryKey: ["my-groups"] });
      navigate(-1);
      toast({ title: dict.group.left });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteGroup(code!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-groups"] });
      navigate(-1);
      toast({ title: dict.group.deleted });
    },
    onError: (e: Error) =>
      toast({
        title: dict.common.error,
        description: e.message,
        variant: "destructive",
      }),
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
      <PageShell width="full" gap={false}>
        <PageHeader title={dict.group.title} />
        <PageSkeleton rows={6} />
      </PageShell>
    );
  }

  if (error || !group) {
    return (
      <PageShell width="full" gap={false}>
        <PageHeader title={dict.group.title} />
        {error ? (
          <ErrorState
            title={dict.group.load_error_title}
            description={dict.group.load_error_description}
            retryLabel={dict.common.try_again}
            onRetry={() => void refetch()}
          />
        ) : (
          <EmptyState
            icon={Users}
            title={dict.group.not_found_title}
            description={dict.group.not_found_description}
            action={
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                {dict.common.back}
              </Button>
            }
          />
        )}
      </PageShell>
    );
  }

  if (coursesError) {
    return (
      <PageShell width="full" gap={false}>
        <PageHeader title={group.name} />
        <ErrorState
          title={dict.group.load_error_title}
          description={dict.group.load_error_description}
          retryLabel={dict.common.try_again}
          onRetry={() => void refetchCourses()}
        />
      </PageShell>
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
    <PageShell width="full" gap={false} className="min-h-[calc(100dvh-var(--header-height))]">
      <PageHeader
        title={group.name}
        description={`${toPrettySemester(semester)} · ${dict.group.member_count.replace("{count}", String(group.members.length))}`}
        actions={
          <>
          <Button type="button" variant="outline" size="sm" onClick={copyInviteUrl}>
            {copied ? (
              <Check aria-hidden="true" />
            ) : (
              <Copy aria-hidden="true" />
            )}
            {dict.group.copy_invite}
          </Button>
          {isAuthenticated && isAlreadyMember && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => leaveMutation.mutate()}
              disabled={leaveMutation.isPending}
            >
              <LogOut aria-hidden="true" /> {dict.group.leave}
            </Button>
          )}
          {isAuthenticated &&
            currentUserId &&
            group.createdBy === currentUserId && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (
                    window.confirm(dict.group.delete_confirm)
                  ) {
                    deleteMutation.mutate();
                  }
                }}
                disabled={deleteMutation.isPending}
              >
                <Trash2 aria-hidden="true" /> {dict.group.delete}
              </Button>
            )}
          </>
        }
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-[3fr_2fr]">
        <div className="w-full">
          <Timetable timetableData={overlaidTimetableData} />
          {visibleMembers.size === 0 && (
            <EmptyState
              size="sm"
              icon={Users}
              title={dict.group.no_member_selected_title}
              description={dict.group.no_member_selected_description}
            />
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">{dict.group.members}</h3>
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
                  role="button"
                  tabIndex={0}
                  aria-pressed={isVisible}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      toggleMember(member.userId);
                    }
                  }}
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
                      {courseIds.length} {dict.group.courses_unit}
                    </span>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-10 w-10 shrink-0"
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
                <h3 className="text-sm font-medium">{dict.group.join_title}</h3>
                <p className="text-xs text-muted-foreground">
                  {dict.group.join_description}
                </p>
                <Input
                  placeholder={dict.group.name_placeholder}
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
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  {dict.group.join}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
};

export default GroupViewPage;
