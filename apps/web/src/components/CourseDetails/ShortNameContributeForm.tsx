import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";
import { Edit2 } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import {
  useCourseShortNames,
  useEditCourseShortName,
  type CourseShortNameLanguage,
} from "@/lib/course-short-names";

const ShortNameContributeForm = ({
  moduleKey,
  courseCode,
  language,
}: {
  moduleKey?: string;
  courseCode?: string;
  language: CourseShortNameLanguage;
}) => {
  const dict = useDictionary();
  const labels = dict.dialogs.ShortNameContributeForm;
  const auth = useAuth();
  const query = useCourseShortNames();
  const edit = useEditCourseShortName();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const identityType = moduleKey ? "module" : "course_code";
  const identityKey = moduleKey ?? courseCode ?? "";
  const current = query.data?.find(
    (entry) =>
      entry.identityType === identityType &&
      entry.identityKey === identityKey &&
      entry.language === language,
  );

  useEffect(() => {
    if (open) {
      setValue(current?.shortName ?? "");
      setError(false);
    }
  }, [current?.shortName, open]);

  const save = async () => {
    setError(false);
    try {
      await edit.mutateAsync({
        ...(moduleKey ? { moduleKey } : { courseCode }),
        language,
        shortName: value,
      });
      setOpen(false);
    } catch {
      setError(true);
    }
  };

  if (!current && !auth.isAuthenticated) return null;

  return (
    <div className="flex min-w-0 items-center gap-2">
      {current ? (
        <span className="text-sm text-muted-foreground">
          {labels.short_name}:{" "}
          <span className="font-medium text-foreground">
            {current.shortName}
          </span>
        </span>
      ) : null}
      {auth.isAuthenticated && (
        <Dialog open={open} onOpenChange={setOpen}>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={current ? labels.edit : labels.add}
            onClick={() => setOpen(true)}
          >
            <Edit2 className="mr-1 h-4 w-4" aria-hidden />
            {current ? labels.edit : labels.add}
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{labels.title}</DialogTitle>
              <DialogDescription>{labels.description}</DialogDescription>
            </DialogHeader>
            <Input
              autoFocus
              maxLength={32}
              value={value}
              placeholder={labels.placeholder}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void save();
              }}
            />
            <p className="text-sm text-muted-foreground">{labels.privacy}</p>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {labels.save_failed}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                {labels.cancel}
              </Button>
              <Button
                type="button"
                onClick={() => void save()}
                disabled={edit.isPending || !value.trim()}
              >
                {labels.submit}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ShortNameContributeForm;
