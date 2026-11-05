"use client";

import { Link, useParams } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@courseweb/ui";
import { ChevronRight } from "lucide-react";
import useDictionary from "@/dictionaries/useDictionary";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import {
  classPageKeys,
  classmatesPath,
  getClassPageCounts,
  getClassPageProfile,
} from "@/lib/class-pages";

const ClassmatesSettingsLink = () => {
  const auth = useAuth();
  const dict = useDictionary();
  const copy = dict.settings.class_pages;
  const { lang = "zh" } = useParams<{ lang: string }>();
  const { semester } = useUserTimetable();
  const token = auth.user?.access_token;
  const profileQuery = useQuery({
    queryKey: classPageKeys.profile,
    queryFn: () => getClassPageProfile(token!),
    enabled: Boolean(auth.isAuthenticated && token),
    retry: false,
  });
  const profile = profileQuery.data?.profile;
  const countsQuery = useQuery({
    queryKey: ["class-pages", "counts", semester],
    queryFn: () => getClassPageCounts(token!, semester),
    enabled: Boolean(auth.isAuthenticated && token && profile && semester),
    retry: false,
  });
  const joinedCount = Object.values(countsQuery.data ?? {}).filter(
    (count) => count.joined,
  ).length;
  const status =
    auth.isLoading || profileQuery.isLoading || countsQuery.isLoading
      ? copy.loading
      : profileQuery.error || countsQuery.error
        ? copy.error
        : !profile
          ? copy.not_enabled
          : copy.joined_courses.replace("{count}", String(joinedCount));

  return (
    <div className="flex min-h-10 items-center gap-2 py-2">
      <Link
        className="flex min-h-10 min-w-0 flex-1 items-center gap-4"
        to={classmatesPath(lang)}
      >
        <span className="min-w-0 flex-1 text-sm font-bold">{copy.title}</span>
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {status}
        </span>
        <ChevronRight
          className="h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      </Link>
      {(profileQuery.error || countsQuery.error) && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            profileQuery.refetch();
            countsQuery.refetch();
          }}
        >
          {dict.common.try_again}
        </Button>
      )}
    </div>
  );
};

export default ClassmatesSettingsLink;
