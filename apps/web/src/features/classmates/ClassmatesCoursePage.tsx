"use client";

import { memo, useMemo, useState, type ComponentProps } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { useMediaQuery } from "usehooks-ts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Drawer,
  DrawerContent,
  DrawerTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Switch,
} from "@courseweb/ui";
import {
  Copy,
  ExternalLink,
  Link2,
  MoreHorizontal,
  UsersRound,
} from "lucide-react";
import useDictionary from "@/dictionaries/useDictionary";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { useLocalizedZhData } from "@/hooks/useLocalizedZh";
import client from "@/config/api";
import { classmatesPath } from "@/lib/class-pages";
import {
  addClassPageLink,
  blockClassPageMember,
  classPageKeys,
  getClassMembership,
  getClassPage,
  getClassPageProfile,
  getClassPageClientAccess,
  isCourseInStoredTimetable,
  joinClassPage,
  leaveClassPage,
  removeClassPageLink,
  setPartnerSeeking,
  type ClassPageLink,
  type ClassPageMember,
} from "@/lib/class-pages";
import {
  filterAndSortClassmates,
  getClassmateInitial,
  getLinkHost,
  getMemberPrivacyHint,
} from "./classmatesLogic";
import { ReportForm } from "./ReportForm";

const invalidateOffering = async (
  queryClient: ReturnType<typeof useQueryClient>,
  semester: string,
  courseId: string,
) => {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: classPageKeys.membership(semester, courseId),
    }),
    queryClient.invalidateQueries({
      queryKey: classPageKeys.page(semester, courseId),
    }),
    queryClient.invalidateQueries({ queryKey: classPageKeys.profile }),
    queryClient.invalidateQueries({
      queryKey: ["class-pages", "counts", semester],
    }),
  ]);
};

const MemberRow = memo(
  ({
    member,
    fallback,
    openProfileLabel,
    partnerLabel,
    contactLabel,
    onSelect,
  }: {
    member: ClassPageMember;
    fallback: string;
    openProfileLabel: string;
    partnerLabel: string;
    contactLabel: string;
    onSelect: (member: ClassPageMember) => void;
  }) => (
    <button
      type="button"
      className="flex min-h-10 w-full items-center gap-2 py-1.5 text-left"
      onClick={() => onSelect(member)}
      aria-label={openProfileLabel.replace(
        "{name}",
        member.displayName ?? fallback,
      )}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
        {getClassmateInitial(member.displayName, fallback)}
      </span>
      <span className="min-w-0 flex-1 truncate font-medium">
        {member.displayName || fallback}
      </span>
      <span className="min-w-0 max-w-[38%] truncate text-xs text-muted-foreground">
        {[member.department, member.year].filter(Boolean).join(" · ")}
      </span>
      {member.lookingForPartners && (
        <UsersRound
          className="h-4 w-4 shrink-0 text-muted-foreground"
          aria-label={partnerLabel}
        />
      )}
      {member.contacts.length > 0 && (
        <Link2
          className="h-4 w-4 shrink-0 text-muted-foreground"
          aria-label={contactLabel}
        />
      )}
    </button>
  ),
);
MemberRow.displayName = "MemberRow";

const MemberDetails = ({
  member,
  semester,
  courseId,
  token,
  locked,
  isSelf,
  onClose,
  onChanged,
}: {
  member: ClassPageMember;
  semester: string;
  courseId: string;
  token: string;
  locked: string[];
  isSelf: boolean;
  onClose: () => void;
  onChanged: () => void;
}) => {
  const dict = useDictionary();
  const copy = dict.course.details.class_pages;
  const queryClient = useQueryClient();
  const [reporting, setReporting] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const blockMutation = useMutation({
    mutationFn: () =>
      blockClassPageMember(token, semester, courseId, member.id),
    onSuccess: async () => {
      await invalidateOffering(queryClient, semester, courseId);
      onClose();
    },
  });
  const privacyHint = getMemberPrivacyHint(
    member,
    locked,
    copy.member_privacy_note,
  );
  const displayedName = member.displayName || copy.classmate;
  const contactCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
    } catch {
      setCopied(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 overflow-y-auto">
      <div className="flex items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted font-bold">
          {getClassmateInitial(member.displayName, copy.classmate)}
        </span>
        <div className="min-w-0">
          <p className="font-bold">{displayedName}</p>
          {(member.department || member.year) && (
            <p className="text-sm text-muted-foreground">
              {[member.department, member.year].filter(Boolean).join(" · ")}
            </p>
          )}
          {member.lookingForPartners && (
            <Badge variant="secondary" className="mt-2">
              {copy.looking_for_partners}
            </Badge>
          )}
        </div>
      </div>
      {privacyHint && (
        <p className="text-sm text-muted-foreground leading-relaxed">
          {privacyHint}
        </p>
      )}
      {member.contacts.length > 0 && (
        <div className="flex flex-col divide-y divide-border">
          {member.contacts.map((contact, index) => (
            <div
              className="flex min-h-10 items-center justify-between gap-2 py-2"
              key={`${contact.label}-${index}`}
            >
              <span className="text-sm font-medium">{contact.label}</span>
              {contact.value.startsWith("https://") ? (
                <a
                  className="flex min-w-0 items-center gap-2 text-sm underline underline-offset-2"
                  href={contact.value}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="truncate">{contact.value}</span>
                  <ExternalLink
                    className="h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                </a>
              ) : (
                <Button
                  variant="ghost"
                  className="h-10 min-w-0 justify-end px-2"
                  aria-label={`${copy.copy_contact}: ${contact.value}`}
                  onClick={() => contactCopy(contact.value)}
                >
                  <span className="truncate">{contact.value}</span>
                  <Copy className="ml-2 h-4 w-4 shrink-0" aria-hidden="true" />
                </Button>
              )}
            </div>
          ))}
          {copied && (
            <p className="py-2 text-sm text-muted-foreground">
              {copy.contact_copied}
            </p>
          )}
        </div>
      )}
      {!isSelf && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setReporting((value) => !value)}
          >
            {copy.report}
          </Button>
          <Button
            variant="outline"
            onClick={() => setConfirmBlock(true)}
            disabled={blockMutation.isPending}
          >
            {copy.block}
          </Button>
        </div>
      )}
      {reporting && (
        <ReportForm
          semester={semester}
          courseId={courseId}
          targetType="member"
          targetId={member.id}
          token={token}
          onSent={() => {
            setReporting(false);
            onChanged();
          }}
          onCancel={() => setReporting(false)}
        />
      )}
      {blockMutation.error && (
        <p className="text-sm text-destructive">{copy.error}</p>
      )}
      <AlertDialog open={confirmBlock} onOpenChange={setConfirmBlock}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">
              {copy.block_confirm_title}
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed">
              {copy.block_confirm_description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{dict.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => blockMutation.mutate()}
            >
              {copy.block}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const MemberProfileSheet = ({
  member,
  open,
  ...detailProps
}: ComponentProps<typeof MemberDetails> & { open: boolean }) => {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const copy = useDictionary().course.details.class_pages;
  const setOpen = (open: boolean) => {
    if (!open) detailProps.onClose();
  };
  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="left-auto right-0 top-0 h-full max-h-screen w-full max-w-md translate-x-0 translate-y-0 gap-1 rounded-none p-4">
          <DialogTitle className="sr-only">
            {member.displayName || copy.classmate}
          </DialogTitle>
          <MemberDetails member={member} {...detailProps} />
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent className="max-h-[85dvh] overflow-y-auto">
        <DrawerTitle className="sr-only">
          {member.displayName || copy.classmate}
        </DrawerTitle>
        <div className="overflow-y-auto p-4">
          <MemberDetails member={member} {...detailProps} />
        </div>
      </DrawerContent>
    </Drawer>
  );
};

const ClassmatesCoursePage = () => {
  const auth = useAuth();
  const dict = useDictionary();
  const copy = dict.course.details.class_pages;
  const profileCopy = dict.settings.class_pages;
  const queryClient = useQueryClient();
  const {
    lang = "zh",
    semester = "",
    courseId = "",
  } = useParams<{
    lang: string;
    semester: string;
    courseId: string;
  }>();
  const localizeData = useLocalizedZhData();
  const timetable = useUserTimetable();
  const token = auth.user?.access_token;
  const [partnersOnly, setPartnersOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [selectedMember, setSelectedMember] = useState<ClassPageMember | null>(
    null,
  );
  const [reportLinkId, setReportLinkId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [addLinkOpen, setAddLinkOpen] = useState(false);
  const inTimetable = isCourseInStoredTimetable(
    timetable.courses,
    semester,
    courseId,
  );

  const courseQuery = useQuery({
    queryKey: ["course", courseId, "syllabus"],
    queryFn: async () => {
      const response = await client.course[":courseId"].syllabus.$get({
        param: { courseId },
      });
      if (!response.ok) throw new Error("Failed to load course");
      return response.json();
    },
    enabled: Boolean(courseId),
    retry: false,
  });
  const profileQuery = useQuery({
    queryKey: classPageKeys.profile,
    queryFn: () => getClassPageProfile(token!),
    enabled: Boolean(token),
    retry: false,
  });
  const profile = profileQuery.data?.profile;
  const membershipQuery = useQuery({
    queryKey: classPageKeys.membership(semester, courseId),
    queryFn: () => getClassMembership(token!, semester, courseId),
    enabled: Boolean(token && inTimetable && profile),
    retry: false,
  });
  const membership = membershipQuery.data?.membership;
  const accessState = getClassPageClientAccess({
    signedIn: Boolean(auth.isAuthenticated && token),
    inTimetable: inTimetable && membershipQuery.data?.eligible !== false,
    profileOptedIn: Boolean(profile),
    joined: Boolean(membership),
  });
  const pageQuery = useQuery({
    queryKey: classPageKeys.page(semester, courseId),
    queryFn: () => getClassPage(token!, semester, courseId),
    enabled: Boolean(token && membership),
    retry: false,
  });

  const joinMutation = useMutation({
    mutationFn: () => joinClassPage(token!, semester, courseId),
    onSuccess: () => invalidateOffering(queryClient, semester, courseId),
  });
  const partnerMutation = useMutation({
    mutationFn: (value: boolean) =>
      setPartnerSeeking(token!, membership!.id, value),
    onSuccess: () => invalidateOffering(queryClient, semester, courseId),
  });
  const leaveMutation = useMutation({
    mutationFn: () => leaveClassPage(token!, membership!.id),
    onSuccess: () => invalidateOffering(queryClient, semester, courseId),
  });
  const addLinkMutation = useMutation({
    mutationFn: () => addClassPageLink(token!, semester, courseId, label, url),
    onSuccess: async () => {
      setLabel("");
      setUrl("");
      setAddLinkOpen(false);
      await invalidateOffering(queryClient, semester, courseId);
    },
  });
  const removeLinkMutation = useMutation({
    mutationFn: (linkId: string) => removeClassPageLink(token!, linkId),
    onSuccess: () => invalidateOffering(queryClient, semester, courseId),
  });

  const page = pageQuery.data;
  const members = useMemo(
    () =>
      filterAndSortClassmates(page?.members ?? [], {
        query: search,
        partnersOnly,
        department,
        hiddenName: copy.classmate,
      }),
    [page?.members, search, partnersOnly, department, copy.classmate],
  );
  const departments = useMemo(
    () =>
      [...new Set((page?.members ?? []).map((member) => member.department))]
        .filter((value): value is string => Boolean(value))
        .sort((a, b) => a.localeCompare(b)),
    [page?.members],
  );
  const course = courseQuery.data;
  const courseName = course
    ? lang === "en"
      ? course.name_en || course.name_zh
      : localizeData(course.name_zh) || course.name_en
    : courseId;
  const lockedFields = page?.locked ?? [];
  const lockedLabels = lockedFields.map((field) => {
    const labels = {
      displayName: profileCopy.display_name,
      department: profileCopy.department,
      year: profileCopy.year,
      contacts: profileCopy.contacts,
    };
    return labels[field];
  });
  const retryButton = (retry: () => void) => (
    <Button variant="outline" onClick={retry}>
      {dict.common.try_again}
    </Button>
  );

  if (auth.isLoading) {
    return (
      <div className="flex flex-col gap-4 px-4 md:px-6">
        <p className="py-4 text-sm text-muted-foreground">
          {profileCopy.loading}
        </p>
      </div>
    );
  }

  if (accessState === "sign_in" || !token) {
    return (
      <div className="flex flex-col gap-2 px-4 md:px-6">
        <p className="py-4 text-sm text-muted-foreground">{copy.signed_out}</p>
        <Button className="self-start" onClick={() => auth.signinRedirect()}>
          {copy.sign_in_button}
        </Button>
      </div>
    );
  }

  const courseHeading = (
    <div className="flex flex-col gap-1 py-4">
      <h1 className="font-bold">{courseName}</h1>
      <p className="text-sm text-muted-foreground">
        {courseId} · {semester}
        {page &&
          ` · ${copy.members_count.replace("{count}", String(page.members.length))}`}
      </p>
      {courseQuery.error && (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-destructive">{copy.error}</p>
          {retryButton(() => courseQuery.refetch())}
        </div>
      )}
    </div>
  );

  if (timetable.error) {
    return (
      <div className="flex flex-col gap-2 px-4 md:px-6">
        {courseHeading}
        <p className="text-sm text-destructive">{copy.error}</p>
        {retryButton(() =>
          queryClient.invalidateQueries({ queryKey: ["courses"] }),
        )}
      </div>
    );
  }

  if (!inTimetable || membershipQuery.data?.eligible === false) {
    return (
      <div className="flex flex-col gap-2 px-4 md:px-6">
        {courseHeading}
        <p className="text-sm text-muted-foreground">{copy.not_in_timetable}</p>
        <Button variant="outline" className="self-start" asChild>
          <Link to={`/${lang}/timetable`}>{copy.open_timetable}</Link>
        </Button>
      </div>
    );
  }

  if (profileQuery.isLoading) {
    return (
      <div className="flex flex-col gap-2 px-4 md:px-6">
        {courseHeading}
        <p className="py-2 text-sm text-muted-foreground">
          {profileCopy.loading}
        </p>
      </div>
    );
  }

  if (profileQuery.error) {
    return (
      <div className="flex flex-col gap-2 px-4 md:px-6">
        {courseHeading}
        <p className="text-sm text-destructive">{copy.error}</p>
        {retryButton(() => profileQuery.refetch())}
      </div>
    );
  }

  if (accessState === "create_profile") {
    return (
      <div className="flex flex-col gap-2 px-4 md:px-6">
        {courseHeading}
        <p className="text-sm text-muted-foreground">{copy.profile_required}</p>
        <Button variant="outline" className="self-start" asChild>
          <Link to={classmatesPath(lang)}>{profileCopy.title}</Link>
        </Button>
      </div>
    );
  }

  if (membershipQuery.isLoading) {
    return (
      <div className="flex flex-col gap-2 px-4 md:px-6">
        {courseHeading}
        <p className="py-2 text-sm text-muted-foreground">
          {profileCopy.loading}
        </p>
      </div>
    );
  }

  if (membershipQuery.error) {
    return (
      <div className="flex flex-col gap-2 px-4 md:px-6">
        {courseHeading}
        <p className="text-sm text-destructive">{copy.error}</p>
        {retryButton(() => membershipQuery.refetch())}
      </div>
    );
  }

  if (accessState === "join") {
    return (
      <div className="flex flex-col gap-2 px-4 md:px-6">
        {courseHeading}
        <p className="text-sm text-muted-foreground">{copy.self_declared}</p>
        {joinMutation.error && (
          <p className="text-sm text-destructive">{copy.error}</p>
        )}
        <Button
          className="self-start"
          onClick={() => joinMutation.mutate()}
          disabled={joinMutation.isPending}
        >
          {joinMutation.isPending ? copy.joining : copy.join}
        </Button>
      </div>
    );
  }

  if (pageQuery.isLoading) {
    return (
      <div className="flex flex-col gap-2 px-4 md:px-6">
        {courseHeading}
        <p className="py-2 text-sm text-muted-foreground">
          {profileCopy.loading}
        </p>
      </div>
    );
  }

  if (pageQuery.error || !page) {
    return (
      <div className="flex flex-col gap-2 px-4 md:px-6">
        {courseHeading}
        <p className="text-sm text-destructive">{copy.error}</p>
        {retryButton(() => pageQuery.refetch())}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 md:px-6">
      {courseHeading}
      <p className="text-sm text-muted-foreground">{copy.self_declared}</p>

      <div className="flex flex-wrap items-center gap-4 border-y border-border py-2">
        <span className="text-sm font-medium">{copy.joined_status}</span>
        <label className="flex min-h-10 items-center gap-2 text-sm">
          <Switch
            checked={membership?.lookingForPartners ?? false}
            onCheckedChange={(value) => partnerMutation.mutate(value)}
            disabled={partnerMutation.isPending}
          />
          <span>{copy.looking_for_partners}</span>
        </label>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" disabled={leaveMutation.isPending}>
              {copy.leave}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base">
                {copy.leave_class_confirm_title}
              </AlertDialogTitle>
              <AlertDialogDescription className="leading-relaxed">
                {copy.leave_class_confirm_description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{dict.common.cancel}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground"
                onClick={() => leaveMutation.mutate()}
              >
                {copy.leave}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      {(partnerMutation.error || leaveMutation.error) && (
        <p className="text-sm text-destructive">{copy.error}</p>
      )}

      {lockedFields.length > 0 && (
        <p className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground leading-relaxed">
          {copy.locked_notice.replace(
            "{fields}",
            lockedLabels.join(lang === "zh" || lang === "zh-cn" ? "、" : ", "),
          )}
          <Link
            className="underline underline-offset-2"
            to={classmatesPath(lang)}
          >
            {profileCopy.title}
          </Link>
        </p>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="font-bold">{copy.members}</h2>
        <div className="flex flex-col gap-2">
          <label className="flex min-w-0 items-center">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={copy.search_placeholder}
              aria-label={copy.search_placeholder}
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={!partnersOnly ? "default" : "outline"}
              aria-pressed={!partnersOnly}
              onClick={() => setPartnersOnly(false)}
            >
              {copy.filter_all}
            </Button>
            <Button
              size="sm"
              variant={partnersOnly ? "default" : "outline"}
              aria-pressed={partnersOnly}
              onClick={() => setPartnersOnly(true)}
            >
              {copy.partner_filter}
            </Button>
            {departments.length > 1 && (
              <select
                className="h-10 min-w-32 rounded-md border border-border bg-background px-2 text-sm"
                aria-label={copy.department_filter}
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
              >
                <option value="">{copy.all_departments}</option>
                {departments.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            )}
            <span className="ml-auto whitespace-nowrap text-sm text-muted-foreground">
              {copy.results_count
                .replace("{shown}", String(members.length))
                .replace("{total}", String(page.members.length))}
            </span>
          </div>
        </div>
        {members.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            {copy.empty_members}
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {members.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                fallback={copy.classmate}
                openProfileLabel={copy.open_profile}
                partnerLabel={copy.looking_for_partners}
                contactLabel={copy.open_contact}
                onSelect={setSelectedMember}
              />
            ))}
          </div>
        )}
      </section>

      {selectedMember && (
        <MemberProfileSheet
          open={Boolean(selectedMember)}
          member={selectedMember}
          semester={semester}
          courseId={courseId}
          token={token}
          locked={lockedFields}
          isSelf={selectedMember.id === membership?.id}
          onClose={() => setSelectedMember(null)}
          onChanged={() => {
            invalidateOffering(queryClient, semester, courseId);
            setSelectedMember(null);
          }}
        />
      )}

      <section className="flex flex-col gap-2">
        <h2 className="font-bold">{copy.links}</h2>
        {page.links.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            {copy.empty_links}
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {page.links.map((link: ClassPageLink) => (
              <article className="flex flex-col gap-2 py-1.5" key={link.id}>
                <div className="flex min-h-10 items-center gap-2">
                  <a
                    className="flex min-w-0 flex-1 items-center gap-2"
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="truncate font-medium">{link.label}</span>
                    <span className="hidden truncate text-sm text-muted-foreground sm:inline">
                      {getLinkHost(link.url)}
                    </span>
                    <ExternalLink
                      className="h-4 w-4 shrink-0 text-muted-foreground"
                      aria-label={copy.open_link}
                    />
                  </a>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={copy.link_actions}
                      >
                        <MoreHorizontal
                          className="h-4 w-4"
                          aria-hidden="true"
                        />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {link.mine ? (
                        <DropdownMenuItem
                          disabled={removeLinkMutation.isPending}
                          onSelect={() => removeLinkMutation.mutate(link.id)}
                        >
                          {copy.remove}
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onSelect={() => setReportLinkId(link.id)}
                        >
                          {copy.report}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {!link.mine && reportLinkId === link.id && (
                  <ReportForm
                    semester={semester}
                    courseId={courseId}
                    targetType="link"
                    targetId={link.id}
                    token={token}
                    onSent={() => {
                      setReportLinkId(null);
                      invalidateOffering(queryClient, semester, courseId);
                    }}
                    onCancel={() => setReportLinkId(null)}
                  />
                )}
              </article>
            ))}
          </div>
        )}
        {(addLinkMutation.error || removeLinkMutation.error) && (
          <p className="text-sm text-destructive">{copy.error}</p>
        )}
        {!addLinkOpen ? (
          <Button
            variant="outline"
            className="self-start"
            onClick={() => setAddLinkOpen(true)}
          >
            {copy.add_link}
          </Button>
        ) : (
          <form
            className="flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              addLinkMutation.mutate();
            }}
          >
            <label className="flex flex-col gap-1 text-sm">
              <span>{copy.link_label}</span>
              <Input
                maxLength={60}
                value={label}
                onChange={(event) => setLabel(event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span>{copy.link_url}</span>
              <Input
                type="url"
                maxLength={500}
                value={url}
                onChange={(event) => setUrl(event.target.value)}
              />
            </label>
            {addLinkMutation.error && (
              <p className="text-sm text-destructive">{copy.error}</p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                disabled={
                  addLinkMutation.isPending || !label.trim() || !url.trim()
                }
              >
                {addLinkMutation.isPending ? copy.adding : copy.add}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAddLinkOpen(false)}
              >
                {copy.cancel}
              </Button>
            </div>
          </form>
        )}
      </section>
      <div className="h-6" />
    </div>
  );
};

export default ClassmatesCoursePage;
