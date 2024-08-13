"use client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { usePathname, useRouter } from "next/navigation";
import { PropsWithChildren, useEffect, useState } from "react";

const DialogHandler = ({ children }: PropsWithChildren) => {
  const [open, setOpen] = useState(true);
  const [lastPathname, setLastPathname] = useState<string | null>(null);

  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Close the dialog when the route changes
    if (lastPathname && pathname !== lastPathname) {
      setOpen(false);
    }
    setLastPathname(pathname);
  }, [pathname, lastPathname]);

  // If the dialog is closed, navigate back
  useEffect(() => {
    // dialog closed and path matches /{lang}/courses/{courseId}, navigate back
    if (!open && pathname.match(/\/[a-z]{2}\/courses\/[a-zA-Z0-9-]+/)) {
      router.back();
    }
  }, [open, pathname, router]);

  return (
    <Dialog open={open} onOpenChange={() => setOpen(false)}>
      <DialogContent className="max-w-6xl p-0 gap-0">{children}</DialogContent>
    </Dialog>
  );
};

export default DialogHandler;
