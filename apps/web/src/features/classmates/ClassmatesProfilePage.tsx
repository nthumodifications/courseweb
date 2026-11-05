"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "react-oidc-context";
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
  Button,
  Input,
} from "@courseweb/ui";
import { ChevronRight, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import useDictionary from "@/dictionaries/useDictionary";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { useLocalizedZhData } from "@/hooks/useLocalizedZh";
import {
  classPageKeys,
  classmatesPath,
  getClassPageCounts,
  getClassPageProfile,
  joinAllCourses,
  leaveClassPages,
  saveClassPageProfile,
  unblockClassPageMember,
  type ClassPageContact,
  type ClassPageProfile,
} from "@/lib/class-pages";

type ProfileDraft = Omit<ClassPageProfile, "blocks">;
type VisibilityKey =
  | "displayNameVisible"
  | "departmentVisible"
  | "yearVisible"
  | "contactsVisible";

const emptyDraft: ProfileDraft = {
  displayName: "",
  department: "",
  year: "",
  contacts: [],
  displayNameVisible: true,
  departmentVisible: true,
  yearVisible: true,
  contactsVisible: false,
};

const profileDraft = (profile: ClassPageProfile): ProfileDraft => ({
  displayName: profile.displayName,
  department: profile.department,
  year: profile.year,
  contacts: profile.contacts,
  displayNameVisible: profile.displayNameVisible,
  departmentVisible: profile.departmentVisible,
  yearVisible: profile.yearVisible,
  contactsVisible: profile.contactsVisible,
});

const ProfileVisibility = ({
  visible,
  label,
  enabled,
  onChange,
}: {
  visible: boolean;
  label: string;
  enabled: boolean;
  onChange: () => void;
}) => {
  const copy = useDictionary().settings.class_pages;
  const Icon = visible ? Eye : EyeOff;
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={!enabled}
      aria-label={`${visible ? copy.hide_field : copy.show_field}: ${label}`}
      title={`${visible ? copy.visible : copy.only_me}: ${label}`}
      onClick={onChange}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </Button>
  );
};

const FieldRow = ({
  label,
  value,
  visible,
  editing,
  onToggle,
  children,
}: {
  label: string;
  value: string;
  visible: boolean;
  editing: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) => (
  <div className="grid grid-cols-[minmax(5rem,0.7fr)_minmax(0,2fr)_2.5rem] items-center gap-2 py-2">
    <span className="text-sm font-medium">{label}</span>
    <div className={`min-w-0 ${editing ? "" : "text-right"}`}>
      {editing ? children : value || "—"}
    </div>
    <ProfileVisibility
      visible={visible}
      label={label}
      enabled={editing}
      onChange={onToggle}
    />
  </div>
);

const ClassmatesProfilePage = () => {
  const auth = useAuth();
  const dict = useDictionary();
  const copy = dict.settings.class_pages;
  const classCopy = dict.course.details.class_pages;
  const queryClient = useQueryClient();
  const { lang = "zh" } = useParams<{ lang: string }>();
  const localizeData = useLocalizedZhData();
  const timetable = useUserTimetable();
  const token = auth.user?.access_token;
  const { semester } = timetable;
  const [draft, setDraft] = useState<ProfileDraft>(emptyDraft);
  const [editing, setEditing] = useState(false);
  const didLoadProfile = useRef(false);
  const profileQuery = useQuery({
    queryKey: classPageKeys.profile,
    queryFn: () => getClassPageProfile(token!),
    enabled: Boolean(token),
    retry: false,
  });
  const countsQuery = useQuery({
    queryKey: ["class-pages", "counts", semester],
    queryFn: () => getClassPageCounts(token!, semester),
    enabled: Boolean(token && semester),
    retry: false,
  });

  useEffect(() => {
    if (!profileQuery.data || didLoadProfile.current) return;
    didLoadProfile.current = true;
    setDraft(
      profileQuery.data.profile
        ? profileDraft(profileQuery.data.profile)
        : emptyDraft,
    );
    setEditing(!profileQuery.data.profile);
  }, [profileQuery.data]);

  const profile = profileQuery.data?.profile;
  const courses = useMemo(
    () => timetable.getSemesterCourses(semester),
    [semester, timetable.getSemesterCourses],
  );
  const saveMutation = useMutation({
    mutationFn: () => saveClassPageProfile(token!, draft),
    onSuccess: (result) => {
      queryClient.setQueryData(classPageKeys.profile, result);
      setDraft(profileDraft(result.profile));
      setEditing(false);
    },
  });
  const joinAllMutation = useMutation({
    mutationFn: () => joinAllCourses(token!, semester),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["class-pages", "counts", semester],
      });
      await queryClient.invalidateQueries({ queryKey: ["class-pages"] });
    },
  });
  const leaveMutation = useMutation({
    mutationFn: () => leaveClassPages(token!),
    onSuccess: async () => {
      queryClient.setQueryData(classPageKeys.profile, { profile: null });
      setDraft(emptyDraft);
      setEditing(true);
      await queryClient.invalidateQueries({ queryKey: ["class-pages"] });
    },
  });
  const unblockMutation = useMutation({
    mutationFn: (blockId: string) => unblockClassPageMember(token!, blockId),
    onSuccess: (_result, blockId) => {
      queryClient.setQueryData<{ profile: ClassPageProfile | null }>(
        classPageKeys.profile,
        (current) =>
          current?.profile
            ? {
                profile: {
                  ...current.profile,
                  blocks: current.profile.blocks.filter(
                    (block) => block.id !== blockId,
                  ),
                },
              }
            : current,
      );
      queryClient.invalidateQueries({ queryKey: ["class-pages"] });
    },
  });

  const setVisibility = (field: VisibilityKey) =>
    setDraft((current) => ({ ...current, [field]: !current[field] }));
  const updateContact = (
    index: number,
    field: keyof ClassPageContact,
    value: string,
  ) =>
    setDraft((current) => ({
      ...current,
      contacts: current.contacts.map((contact, contactIndex) =>
        contactIndex === index ? { ...contact, [field]: value } : contact,
      ),
    }));
  const semesterCounts = countsQuery.data ?? {};
  const unjoinedCount = courses.filter(
    (course) => !semesterCounts[course.raw_id]?.joined,
  ).length;
  const shownName =
    draft.displayNameVisible && draft.displayName.trim()
      ? draft.displayName.trim()
      : classCopy.classmate;
  const visibleDepartment = draft.departmentVisible
    ? draft.department.trim()
    : "";
  const visibleYear = draft.yearVisible ? draft.year.trim() : "";
  const previewContacts = draft.contactsVisible
    ? draft.contacts.filter((contact) => contact.label && contact.value)
    : [];

  if (!auth.isLoading && (!auth.isAuthenticated || !token)) {
    return (
      <div className="flex flex-col px-4 md:px-6">
        <div className="flex min-h-10 items-center gap-2 py-2">
          <p className="text-sm text-muted-foreground">{copy.signed_out}</p>
          <Button onClick={() => auth.signinRedirect()}>
            {classCopy.sign_in_button}
          </Button>
        </div>
      </div>
    );
  }

  if (auth.isLoading || profileQuery.isLoading) {
    return (
      <div className="flex flex-col px-4 md:px-6">
        <p className="py-4 text-sm text-muted-foreground">{copy.loading}</p>
      </div>
    );
  }

  if (profileQuery.error) {
    return (
      <div className="flex flex-col gap-2 px-4 md:px-6">
        <p className="py-4 text-sm text-destructive">{copy.error}</p>
        <Button variant="outline" onClick={() => profileQuery.refetch()}>
          {dict.common.try_again}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 md:px-6">
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-4 py-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted font-bold text-foreground">
            {shownName.slice(0, 1).toLocaleUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold">{shownName}</p>
            {(visibleDepartment || visibleYear) && (
              <p className="text-sm text-muted-foreground">
                {[visibleDepartment, visibleYear].filter(Boolean).join(" · ")}
              </p>
            )}
            {previewContacts.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {previewContacts.map((contact, index) => (
                  <span
                    className="rounded-full border border-border px-2 py-1 text-sm"
                    key={`${contact.label}-${index}`}
                  >
                    {contact.label}
                  </span>
                ))}
              </div>
            )}
          </div>
          {!editing && (
            <Button variant="outline" onClick={() => setEditing(true)}>
              {copy.edit}
            </Button>
          )}
        </div>

        <div className="flex flex-col divide-y divide-border">
          <FieldRow
            label={copy.display_name}
            value={draft.displayName}
            visible={draft.displayNameVisible}
            editing={editing}
            onToggle={() => setVisibility("displayNameVisible")}
          >
            <Input
              className="text-right"
              maxLength={50}
              value={draft.displayName}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  displayName: event.target.value,
                }))
              }
            />
          </FieldRow>
          <FieldRow
            label={copy.department}
            value={draft.department}
            visible={draft.departmentVisible}
            editing={editing}
            onToggle={() => setVisibility("departmentVisible")}
          >
            <Input
              className="text-right"
              maxLength={60}
              value={draft.department}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  department: event.target.value,
                }))
              }
            />
          </FieldRow>
          <FieldRow
            label={copy.year}
            value={draft.year}
            visible={draft.yearVisible}
            editing={editing}
            onToggle={() => setVisibility("yearVisible")}
          >
            <Input
              className="text-right"
              maxLength={20}
              value={draft.year}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  year: event.target.value,
                }))
              }
            />
          </FieldRow>
          <div className="grid grid-cols-[minmax(5rem,0.7fr)_minmax(0,2fr)_2.5rem] items-start gap-2 py-2">
            <span className="pt-2 text-sm font-medium">{copy.contacts}</span>
            <div
              className={`flex min-w-0 flex-col gap-2 ${editing ? "" : "items-end text-right"}`}
            >
              {draft.contacts.map((contact, index) => (
                <div
                  className="flex min-w-0 flex-col gap-2 sm:flex-row"
                  key={`contact-${index}`}
                >
                  {editing ? (
                    <>
                      <Input
                        aria-label={copy.contact_label}
                        maxLength={30}
                        placeholder={copy.contact_label}
                        value={contact.label}
                        onChange={(event) =>
                          updateContact(index, "label", event.target.value)
                        }
                      />
                      <Input
                        aria-label={copy.contact_value}
                        maxLength={200}
                        placeholder={copy.contact_value}
                        value={contact.value}
                        onChange={(event) =>
                          updateContact(index, "value", event.target.value)
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={copy.remove_contact}
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            contacts: current.contacts.filter(
                              (_, contactIndex) => contactIndex !== index,
                            ),
                          }))
                        }
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </>
                  ) : (
                    <span className="text-sm">
                      {contact.label}: {contact.value}
                    </span>
                  )}
                </div>
              ))}
              {editing && (
                <Button
                  type="button"
                  variant="outline"
                  className="self-start"
                  disabled={draft.contacts.length >= 4}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      contacts: [...current.contacts, { label: "", value: "" }],
                    }))
                  }
                >
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  {copy.add_contact}
                </Button>
              )}
            </div>
            <ProfileVisibility
              visible={draft.contactsVisible}
              label={copy.contacts}
              enabled={editing}
              onChange={() => setVisibility("contactsVisible")}
            />
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          {copy.reciprocity}
        </p>
        {editing && (
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={
                saveMutation.isPending ||
                !draft.displayName.trim() ||
                !draft.department.trim() ||
                !draft.year.trim() ||
                draft.contacts.some(
                  (contact) => !contact.label.trim() || !contact.value.trim(),
                )
              }
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? copy.saving : copy.save}
            </Button>
            {profile && (
              <Button
                variant="ghost"
                onClick={() => {
                  setDraft(profileDraft(profile));
                  setEditing(false);
                }}
              >
                {copy.cancel_edit}
              </Button>
            )}
          </div>
        )}
        {(saveMutation.error || unblockMutation.error) && (
          <p className="text-sm text-destructive">{copy.error}</p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-bold">
          {copy.my_classes}{" "}
          <span className="text-muted-foreground">{semester}</span>
        </h2>
        {timetable.error ? (
          <div className="flex flex-wrap items-center gap-2 py-2">
            <p className="text-sm text-destructive">{classCopy.error}</p>
            <Button
              variant="outline"
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: ["courses"] })
              }
            >
              {dict.common.try_again}
            </Button>
          </div>
        ) : countsQuery.error ? (
          <div className="flex flex-wrap items-center gap-2 py-2">
            <p className="text-sm text-destructive">{classCopy.error}</p>
            <Button variant="outline" onClick={() => countsQuery.refetch()}>
              {dict.common.try_again}
            </Button>
          </div>
        ) : timetable.isLoading || countsQuery.isLoading ? (
          <p className="py-2 text-sm text-muted-foreground">{copy.loading}</p>
        ) : courses.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            {copy.no_courses}
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {courses.map((course) => {
              const count = semesterCounts[course.raw_id];
              return (
                <Link
                  key={course.raw_id}
                  className="flex min-h-10 items-center gap-2 py-2"
                  to={classmatesPath(lang, semester, course.raw_id)}
                >
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {lang === "en"
                      ? course.name_en || course.name_zh
                      : localizeData(course.name_zh) || course.name_en}
                  </span>
                  <span className="whitespace-nowrap text-sm text-muted-foreground">
                    {count
                      ? `${classCopy.members_count.replace("{count}", String(count.members))} · ${count.joined ? copy.joined : copy.not_joined}`
                      : "—"}
                  </span>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </Link>
              );
            })}
          </div>
        )}
        {profile && unjoinedCount > 0 && courses.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              disabled={joinAllMutation.isPending}
              onClick={() => joinAllMutation.mutate()}
            >
              {joinAllMutation.isPending ? classCopy.joining : copy.join_all}
            </Button>
            {joinAllMutation.error && (
              <p className="text-sm text-destructive">{classCopy.error}</p>
            )}
          </div>
        )}
      </section>

      {profile && profile.blocks.length > 0 && (
        <section className="flex flex-col">
          <h2 className="py-2 font-bold">
            {copy.blocked_title} · {profile.blocks.length}
          </h2>
          <div className="flex flex-col divide-y divide-border">
            {profile.blocks.map((block) => (
              <div
                className="flex min-h-10 items-center justify-between gap-2 py-1.5"
                key={block.id}
              >
                <span className="text-sm">{copy.blocked_member}</span>
                <Button
                  variant="ghost"
                  disabled={unblockMutation.isPending}
                  onClick={() => unblockMutation.mutate(block.id)}
                >
                  {copy.unblock}
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {profile && (
        <div className="flex flex-col items-start gap-2 border-t border-border pt-4">
          {leaveMutation.error && (
            <p className="text-sm text-destructive">{copy.error}</p>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={leaveMutation.isPending}>
                {copy.leave}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-base">
                  {copy.leave_confirm_title}
                </AlertDialogTitle>
                <AlertDialogDescription className="leading-relaxed">
                  {copy.leave_confirm_description}
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
      )}
      <div className="h-6" />
    </div>
  );
};

export default ClassmatesProfilePage;
