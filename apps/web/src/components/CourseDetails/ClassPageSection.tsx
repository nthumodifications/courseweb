"use client";

import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Input, Switch, Textarea } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import {
  addClassPageLink,
  blockClassPageMember,
  classPageKeys,
  getClassMembership,
  getClassPage,
  getClassPageProfile,
  getClassPageClientAccess,
  isCourseInStoredTimetable,
  joinAllCourses,
  joinClassPage,
  leaveClassPage,
  removeClassPageLink,
  reportClassPageTarget,
  setPartnerSeeking,
  type ClassPageData,
} from "@/lib/class-pages";

const ReportForm = ({
  semester,
  courseId,
  targetType,
  targetId,
  token,
  onSent,
}: {
  semester: string;
  courseId: string;
  targetType: "member" | "link";
  targetId: string;
  token: string;
  onSent: () => void;
}) => {
  const dict = useDictionary().course.details.class_pages;
  const [reason, setReason] = useState("spam");
  const [note, setNote] = useState("");
  const mutation = useMutation({
    mutationFn: () =>
      reportClassPageTarget(token, {
        semester,
        courseId,
        targetType,
        targetId,
        reason,
        note,
      }),
    onSuccess: onSent,
  });
  return (
    <form
      className="flex flex-col gap-2 border-t border-border pt-2"
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate();
      }}
    >
      <label className="flex flex-col gap-1 text-sm">
        <span>{dict.report_reason}</span>
        <select
          className="h-10 rounded-md border border-border bg-background px-2"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        >
          <option value="spam">{dict.report_spam}</option>
          <option value="harassment">{dict.report_harassment}</option>
          <option value="personal_info">{dict.report_personal_info}</option>
          <option value="other">{dict.report_other}</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>{dict.report_note}</span>
        <Textarea
          maxLength={500}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>
      {mutation.error && (
        <p className="text-sm text-destructive">{dict.error}</p>
      )}
      <Button type="submit" variant="outline" disabled={mutation.isPending}>
        {dict.send_report}
      </Button>
    </form>
  );
};

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
  ]);
};

export const ClassPageSection = ({
  courseId,
  semester,
  lang,
}: {
  courseId: string;
  semester: string;
  lang: string;
}) => {
  const auth = useAuth();
  const dict = useDictionary();
  const copy = dict.course.details.class_pages;
  const queryClient = useQueryClient();
  const { courses } = useUserTimetable();
  const [partnersOnly, setPartnersOnly] = useState(false);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [reportTarget, setReportTarget] = useState<{
    type: "member" | "link";
    id: string;
  } | null>(null);
  const token = auth.user?.access_token;
  const inTimetable = isCourseInStoredTimetable(courses, semester, courseId);

  const profileQuery = useQuery({
    queryKey: classPageKeys.profile,
    queryFn: () => getClassPageProfile(token!),
    enabled: Boolean(token && inTimetable),
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
    inTimetable,
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
  const joinAllMutation = useMutation({
    mutationFn: () => joinAllCourses(token!, semester),
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
      await invalidateOffering(queryClient, semester, courseId);
    },
  });
  const removeLinkMutation = useMutation({
    mutationFn: (linkId: string) => removeClassPageLink(token!, linkId),
    onSuccess: () => invalidateOffering(queryClient, semester, courseId),
  });
  const blockMutation = useMutation({
    mutationFn: (membershipId: string) =>
      blockClassPageMember(token!, semester, courseId, membershipId),
    onSuccess: () => invalidateOffering(queryClient, semester, courseId),
  });

  const sectionClass = "flex flex-col gap-4 border-t border-border py-4";
  const heading = <h2 className="font-bold">{copy.title}</h2>;
  if (accessState === "sign_in" || !token)
    return (
      <section className={sectionClass}>
        {heading}
        <p className="text-sm text-muted-foreground">{copy.signed_out}</p>
      </section>
    );
  if (accessState === "add_course")
    return (
      <section className={sectionClass}>
        {heading}
        <p className="text-sm text-muted-foreground">{copy.not_in_timetable}</p>
      </section>
    );
  if (profileQuery.isLoading)
    return (
      <section className={sectionClass}>
        {heading}
        <p className="text-sm text-muted-foreground">
          {dict.settings.class_pages.loading}
        </p>
      </section>
    );
  if (profileQuery.error || membershipQuery.error)
    return (
      <section className={sectionClass}>
        {heading}
        <p className="text-sm text-destructive">{copy.error}</p>
      </section>
    );
  if (accessState === "create_profile")
    return (
      <section className={sectionClass}>
        {heading}
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {copy.profile_required}
          </p>
          <Link
            className="text-sm underline underline-offset-2"
            to={`/${lang}/settings#class-pages`}
          >
            {dict.settings.class_pages.title}
          </Link>
        </div>
      </section>
    );
  if (membershipQuery.isLoading)
    return (
      <section className={sectionClass}>
        {heading}
        <p className="text-sm text-muted-foreground">
          {dict.settings.class_pages.loading}
        </p>
      </section>
    );
  if (accessState === "join")
    return (
      <section className={sectionClass}>
        {heading}
        <p className="text-sm text-muted-foreground">{copy.self_declared}</p>
        {(joinMutation.error || joinAllMutation.error) && (
          <p className="text-sm text-destructive">{copy.error}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={joinMutation.isPending}
            onClick={() => joinMutation.mutate()}
          >
            {joinMutation.isPending ? copy.joining : copy.join}
          </Button>
          <Button
            variant="outline"
            disabled={joinAllMutation.isPending}
            onClick={() => joinAllMutation.mutate()}
          >
            {copy.join_all}
          </Button>
        </div>
      </section>
    );

  if (pageQuery.isLoading)
    return (
      <section className={sectionClass}>
        {heading}
        <p className="text-sm text-muted-foreground">
          {dict.settings.class_pages.loading}
        </p>
      </section>
    );
  if (pageQuery.error || !pageQuery.data)
    return (
      <section className={sectionClass}>
        {heading}
        <p className="text-sm text-destructive">{copy.error}</p>
        <Button variant="outline" onClick={() => pageQuery.refetch()}>
          {dict.common.try_again}
        </Button>
      </section>
    );

  const page: ClassPageData = pageQuery.data;
  const currentMembership = membership!;
  const members = partnersOnly
    ? page.members.filter((member) => member.lookingForPartners)
    : page.members;
  const currentMember = page.members.find(
    (member) => member.id === currentMembership.id,
  );

  return (
    <section className={sectionClass}>
      {heading}
      <p className="text-sm text-muted-foreground">{copy.self_declared}</p>
      <label className="flex min-h-10 items-center justify-between gap-4">
        <span>{copy.partner_filter}</span>
        <Switch checked={partnersOnly} onCheckedChange={setPartnersOnly} />
      </label>
      <label className="flex min-h-10 items-center justify-between gap-4">
        <span>{copy.looking_for_partners}</span>
        <Switch
          checked={currentMembership.lookingForPartners}
          onCheckedChange={(value) => partnerMutation.mutate(value)}
        />
      </label>
      {partnerMutation.error && (
        <p className="text-sm text-destructive">{copy.error}</p>
      )}
      <div className="flex flex-col divide-y divide-border">
        <h3 className="py-2 font-bold">{copy.members}</h3>
        {members.length === 0 && (
          <p className="py-2 text-sm text-muted-foreground">
            {copy.empty_members}
          </p>
        )}
        {members.map((member) => (
          <article key={member.id} className="flex flex-col gap-2 py-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex flex-col gap-1">
                <span className="font-medium">
                  {member.displayName || copy.classmate}
                </span>
                {(member.department || member.year) && (
                  <span className="text-sm text-muted-foreground">
                    {[member.department, member.year]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                )}
                {member.contacts.map((contact, index) => (
                  <span key={`${contact.label}-${index}`} className="text-sm">
                    {contact.label}:{" "}
                    {contact.value.startsWith("https://") ? (
                      <a
                        className="underline underline-offset-2"
                        href={contact.value}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {copy.open_link}
                      </a>
                    ) : (
                      contact.value
                    )}
                  </span>
                ))}
              </div>
              {member.id !== currentMembership.id && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    onClick={() =>
                      setReportTarget({ type: "member", id: member.id })
                    }
                  >
                    {copy.report}
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={blockMutation.isPending}
                    onClick={() => blockMutation.mutate(member.id)}
                  >
                    {copy.block}
                  </Button>
                </div>
              )}
            </div>
            {member.lookingForPartners && (
              <span className="text-sm text-muted-foreground">
                {copy.looking_for_partners}
              </span>
            )}
            {reportTarget?.type === "member" &&
              reportTarget.id === member.id && (
                <ReportForm
                  semester={semester}
                  courseId={courseId}
                  targetType="member"
                  targetId={member.id}
                  token={token}
                  onSent={() => setReportTarget(null)}
                />
              )}
          </article>
        ))}
      </div>

      {blockMutation.error && (
        <p className="text-sm text-destructive">{copy.error}</p>
      )}
      <div className="flex flex-col divide-y divide-border">
        <h3 className="py-2 font-bold">{copy.links}</h3>
        {page.links.length === 0 && (
          <p className="py-2 text-sm text-muted-foreground">
            {copy.empty_links}
          </p>
        )}
        {page.links.map((link) => (
          <article key={link.id} className="flex flex-col gap-2 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <a
                className="font-medium underline underline-offset-2"
                href={link.url}
                target="_blank"
                rel="noreferrer"
              >
                {link.label}
              </a>
              <div className="flex flex-wrap gap-2">
                {link.mine ? (
                  <Button
                    variant="ghost"
                    disabled={removeLinkMutation.isPending}
                    onClick={() => removeLinkMutation.mutate(link.id)}
                  >
                    {copy.remove}
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    onClick={() =>
                      setReportTarget({ type: "link", id: link.id })
                    }
                  >
                    {copy.report}
                  </Button>
                )}
              </div>
            </div>
            {reportTarget?.type === "link" && reportTarget.id === link.id && (
              <ReportForm
                semester={semester}
                courseId={courseId}
                targetType="link"
                targetId={link.id}
                token={token}
                onSent={() => setReportTarget(null)}
              />
            )}
          </article>
        ))}
      </div>

      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          addLinkMutation.mutate();
        }}
      >
        <h3 className="font-bold">{copy.add_link}</h3>
        <Input
          aria-label={copy.link_label}
          maxLength={60}
          placeholder={copy.link_label}
          value={label}
          onChange={(event) => setLabel(event.target.value)}
        />
        <Input
          aria-label={copy.link_url}
          type="url"
          maxLength={500}
          placeholder={copy.link_url}
          value={url}
          onChange={(event) => setUrl(event.target.value)}
        />
        {addLinkMutation.error && (
          <p className="text-sm text-destructive">{copy.error}</p>
        )}
        <Button
          type="submit"
          variant="outline"
          disabled={addLinkMutation.isPending || !label.trim() || !url.trim()}
        >
          {addLinkMutation.isPending ? copy.adding : copy.add}
        </Button>
      </form>

      {currentMember && (leaveMutation.error || removeLinkMutation.error) && (
        <p className="text-sm text-destructive">{copy.error}</p>
      )}
      <Button
        variant="outline"
        disabled={leaveMutation.isPending}
        onClick={() => leaveMutation.mutate()}
      >
        {copy.leave}
      </Button>
    </section>
  );
};

export default ClassPageSection;
