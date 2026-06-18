import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  Camera,
  Trash2,
  ExternalLink,
  Bell,
  Users,
} from "lucide-react";
import { Button } from "@courseweb/ui";
import { Badge } from "@courseweb/ui";
import { Separator } from "@courseweb/ui";
import { ScrollArea } from "@courseweb/ui";
import { useSavedTimetables } from "@/hooks/useSavedTimetables";
import { useAuth } from "react-oidc-context";
import { toPrettySemester } from "@/helpers/semester";
import type { SavedTimetable } from "@/hooks/useTimetableShare";
import { useQuery } from "@tanstack/react-query";
import client from "@/config/api";
import { MinimalCourse } from "@/types/courses";
import { createTimetableFromCourses } from "@/helpers/timetable";
import { CourseTimeslotData } from "@/types/timetable";

export type OverlayEntry = {
  savedId: string;
  label: string;
  color: string;
  timetableData: CourseTimeslotData[];
};

const OVERLAY_COLORS = [
  "#3b82f6", // blue
  "#a855f7", // purple
  "#f97316", // orange
  "#10b981", // emerald
  "#ec4899", // pink
];

function SavedTimetableItem({
  saved,
  index,
  isOverlaid,
  onToggleOverlay,
  onUnsave,
  onMarkSeen,
  hasNewChanges,
  overlayColor,
}: {
  saved: SavedTimetable;
  index: number;
  isOverlaid: boolean;
  onToggleOverlay: (overlay: OverlayEntry | null) => void;
  onUnsave: () => void;
  onMarkSeen: () => void;
  hasNewChanges: boolean;
  overlayColor: string;
}) {
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();

  const share = saved.share;
  const semesters = share?.semesters ?? [];
  const [activeSem, setActiveSem] = useState(semesters[0] ?? "");
  const courseIds =
    (saved.syncMode === "snapshot"
      ? saved.savedCourses?.[activeSem]
      : share?.courses[activeSem]) ?? [];

  const { data: courses = [] } = useQuery({
    queryKey: ["courses", [...courseIds].sort()],
    queryFn: async () => {
      if (!courseIds.length) return [];
      const res = await client.course.$get({ query: { courses: courseIds } });
      return res.json() as Promise<MinimalCourse[]>;
    },
    enabled: courseIds.length > 0 && isOverlaid,
  });

  const handleToggle = () => {
    if (isOverlaid) {
      onToggleOverlay(null);
    } else {
      onMarkSeen();
      const timetableData = createTimetableFromCourses(
        courses as MinimalCourse[],
        Object.fromEntries(courseIds.map((id) => [id, overlayColor])),
      );
      onToggleOverlay({
        savedId: saved.id,
        label: saved.label ?? "Shared Timetable",
        color: overlayColor,
        timetableData,
      });
    }
  };

  return (
    <div
      className={`flex flex-col gap-2 p-3 rounded-lg border ${isOverlaid ? "border-blue-300 bg-blue-50 dark:bg-blue-950/20" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">
              {saved.label || "Shared Timetable"}
            </span>
            {hasNewChanges && (
              <Badge variant="destructive" className="text-xs h-4 px-1">
                New
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {saved.syncMode === "live" ? (
              <>
                <RefreshCw className="h-2.5 w-2.5" /> Live
              </>
            ) : (
              <>
                <Camera className="h-2.5 w-2.5" /> Snapshot
              </>
            )}
            {semesters.length > 0 && (
              <span>· {toPrettySemester(semesters[0])}</span>
            )}
          </div>
          {!share && (
            <span className="text-xs text-muted-foreground italic">
              Owner removed this share
            </span>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={handleToggle}
            title={isOverlaid ? "Hide overlay" : "Show overlay"}
          >
            {isOverlaid ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
          </Button>
          {share && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => navigate(`/${lang}/timetable/share/${share.id}`)}
              title="View full page"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={onUnsave}
            title="Remove"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {isOverlaid && (
        <div className="flex items-center gap-1.5 text-xs">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: overlayColor }}
          />
          <span className="text-muted-foreground">Shown in calendar</span>
        </div>
      )}
    </div>
  );
}

export type OthersTimetablePanelProps = {
  activeOverlays: OverlayEntry[];
  onOverlayChange: (overlays: OverlayEntry[]) => void;
};

const OthersTimetablePanel = ({
  activeOverlays,
  onOverlayChange,
}: OthersTimetablePanelProps) => {
  const { isAuthenticated } = useAuth();
  const {
    savedTimetables,
    isLoading,
    unsave,
    markSeen,
    hasNewChanges,
    totalUnread,
  } = useSavedTimetables();
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();

  const handleToggleOverlay = (savedId: string, entry: OverlayEntry | null) => {
    if (entry === null) {
      onOverlayChange(activeOverlays.filter((o) => o.savedId !== savedId));
    } else {
      const existing = activeOverlays.findIndex((o) => o.savedId === savedId);
      if (existing >= 0) {
        const next = [...activeOverlays];
        next[existing] = entry;
        onOverlayChange(next);
      } else {
        onOverlayChange([...activeOverlays, entry]);
      }
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
        <Users className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Sign in to save and view others' timetables
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">Others' Timetables</h3>
          {totalUnread > 0 && (
            <Badge variant="destructive" className="text-xs h-4 px-1">
              {totalUnread} new
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => navigate(`/${lang}/community`)}
        >
          Browse
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : savedTimetables.length === 0 ? (
        <div className="flex flex-col items-center py-6 gap-2 text-center">
          <p className="text-sm text-muted-foreground">
            No saved timetables yet.
          </p>
          <p className="text-xs text-muted-foreground">
            Open a share link and click "Save & follow".
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {savedTimetables.map((saved, i) => (
            <SavedTimetableItem
              key={saved.id}
              saved={saved}
              index={i}
              isOverlaid={activeOverlays.some((o) => o.savedId === saved.id)}
              overlayColor={OVERLAY_COLORS[i % OVERLAY_COLORS.length]}
              hasNewChanges={hasNewChanges(saved)}
              onToggleOverlay={(entry) => handleToggleOverlay(saved.id, entry)}
              onUnsave={() => unsave(saved.id)}
              onMarkSeen={() => markSeen(saved.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default OthersTimetablePanel;
