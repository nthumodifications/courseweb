"use client";
import { useEffect, useMemo, useState } from "react";
import { CommentsItem } from "./CommentsItem";
import { getComments } from "../../lib/headless_ais/comments";
import { useHeadlessAIS } from "@/hooks/contexts/useHeadlessAIS";
import { CheckCircle } from "lucide-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { MinimalCourse } from "@/types/courses";
import { Badge } from "@/components/ui/badge";
import { getStudentCommentState } from "@/lib/headless_ais/comments";
import { CommentState } from "@/types/comments";
import CommentsNotSignedIn from "./CommentsNotSignedIn";
import NewCommentDialog from "./NewCommentDialog";

export const CommentsContainer = ({ course }: { course: MinimalCourse }) => {
  const { initializing, getACIXSTORE } = useHeadlessAIS();
  const [isUserTakenCourse, setIsUserTakenCourse] = useState<CommentState>(
    CommentState.Disabled,
  );
  const [loading, setLoading] = useState<boolean>(true);

  const {
    data: comments,
    fetchNextPage,
    hasNextPage,
    isLoading,
  } = useInfiniteQuery<Awaited<ReturnType<typeof getComments>>>({
    queryKey: ["comments", course.raw_id],
    queryFn: async ({ pageParam }) =>
      await getComments(course.raw_id, pageParam as number),
    getNextPageParam: (lastPage, allPages) => {
      return (lastPage ?? []).length
        ? Math.ceil((allPages ?? []).length / 10) + 1
        : undefined;
    },
    initialPageParam: 1,
  });

  const flatComments = useMemo(
    () => comments?.pages.flatMap((p) => p).filter((m) => !!m) ?? [],
    [comments],
  );

  useEffect(() => {
    (async () => {
      try {
        if (!course.raw_id || initializing) return;
        setLoading(true);
        const token = await getACIXSTORE();
        if (!token) {
          throw new Error("Authentication token is missing.");
        }
        const res = await getStudentCommentState(course.raw_id, token);
        setIsUserTakenCourse(res);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, [course.raw_id, initializing]);

  // check if reached #comments-end, if so, fetch next page
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { threshold: 1 },
    );
    observer.observe(document.getElementById("comments-end")!);
    return () => observer.disconnect();
  }, [fetchNextPage]);

  return (
    <div className="space-y-6">
      {isUserTakenCourse == CommentState.Enabled && (
        <div className=" flex items-center space-x-4 rounded-md border p-4">
          <CheckCircle />
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium leading-none">
              你曾經修過這門課呢~
            </p>
            <p className="text-sm text-muted-foreground">
              幫助其他同學做決定，分享你的經驗吧！
            </p>
          </div>
          <NewCommentDialog course={course} />
        </div>
      )}
      {isUserTakenCourse == CommentState.Filled && (
        <div className=" flex items-center space-x-4 rounded-md border p-4">
          <p className="text-xl">🎉</p>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium leading-none">謝謝你的評價！</p>
            <p className="text-sm text-muted-foreground">
              你已經評價過這門課啦~
            </p>
          </div>
        </div>
      )}
      <div className="flex flex-col divide-y divide-border">
        {flatComments.map((m, index) => (
          <CommentsItem key={index} comment={m} />
        ))}
        <div id="comments-end" />
      </div>
      {!hasNextPage && flatComments.length == 0 && (
        <div className="text-center">還沒人來投稿 ╯︿╰</div>
      )}
      {!hasNextPage && flatComments.length != 0 && (
        <div className="text-center">沒有更多評價了！</div>
      )}
    </div>
  );
};

export const CommmentsSection = ({ course }: { course: MinimalCourse }) => {
  const { user } = useHeadlessAIS();
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-xl font-bold tracking-tight">
        修課同學評價 <Badge variant="outline">ALPHA</Badge>
      </h3>
      {user ? <CommentsContainer course={course} /> : <CommentsNotSignedIn />}
    </div>
  );
};
