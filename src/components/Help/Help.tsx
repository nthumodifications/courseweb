"use client";
import { HelpCircle } from "lucide-react";
import useDictionary from "@/dictionaries/useDictionary";
import { useState, useEffect, ReactNode } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { useLocalStorage } from "usehooks-ts";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { LoginPage } from "@/components/Forms/LoginPage";
import { ScrollArea } from "../ui/scroll-area";

type ProgressDisplayProps = { max: number; current: number };
const ProgressDisplay = ({ current, max }: ProgressDisplayProps) => {
  return (
    <div className="w-44 h-1.5 justify-center items-center gap-1.5 inline-flex">
      {Array.from({ length: max }, (_, i) => i).map((i) => (
        <div
          key={i}
          className={cn(
            "flex-1 h-1.5 relative rounded-md",
            current >= i + 1 ? "bg-nthu-600" : "bg-zinc-100",
          )}
        />
      ))}
    </div>
  );
};

const Help = ({ children }: { children?: ReactNode }) => {
  const dict = useDictionary();

  const content = [
    {
      img: "/images/friendship.gif",
      title: dict.help.intro.title,
      description: dict.help.intro.description,
    },
    {
      img: "/images/list.gif",
      title: dict.help.courses.title,
      description: dict.help.courses.description,
    },
    {
      img: "/images/upcoming.gif",
      title: dict.help.dashboard.title,
      description: dict.help.dashboard.description,
    },
    {
      img: "/images/bus.gif",
      title: dict.help.bus.title,
      description: dict.help.bus.description,
    },
    {
      img: "/images/toolbox.gif",
      title: dict.help.tools.title,
      description: dict.help.tools.description,
    },
  ];

  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [hasVisitedBefore, setHasVisitedBefore] = useLocalStorage(
    "hasVisitedBefore",
    false,
  );

  useEffect(() => {
    if (!hasVisitedBefore) {
      setOpen(true);
    }
  }, [hasVisitedBefore]);

  useEffect(() => {
    if (open) {
      setPage(0);
    } else {
      setHasVisitedBefore(true);
    }
  }, [open]);

  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button
            size="sm"
            variant="outline"
            className="flex gap-1"
            onClick={() => setOpen(true)}
          >
            <HelpCircle size="16" />
            <span className="hidden md:inline-block">Help</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="h-[calc(100dvh-env(safe-area-inset-bottom))] p-0 w-full lg:h-[calc(100vh-48px)] pb-[env(safe-area-inset-bottom)]">
        <div className="flex flex-col items-center gap-8 px-4 py-8 max-h-[calc(100dvh-env(safe-area-inset-bottom))] overflow-y-auto">
          <div className="flex-1 grid place-items-center">
            <div className="w-[254px] h-[254px] max-h-full">
              <Image
                src={content[page].img}
                alt={content[page].title}
                width={254}
                height={254}
                unoptimized
                className="rounded-lg"
              />
            </div>
          </div>
          <div className="flex flex-row justify-center">
            <ProgressDisplay current={page + 1} max={content.length} />
          </div>
          <div className="flex flex-col gap-2 h-max">
            <h1 className="font-bold text-3xl">{content[page].title}</h1>
            <p>{content[page].description}</p>
          </div>
          {page < content.length - 1 ? (
            <Button
              className="w-full"
              onClick={() => {
                setPage(page + 1);
              }}
            >
              {dict.help.continue}
            </Button>
          ) : (
            <div className="flex flex-col gap-2 w-full">
              <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full">{dict.help.login}</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] h-[100dvh] lg:h-auto w-full">
                  <ScrollArea className="h-full">
                    <LoginPage onClose={() => setOpen(false)} />
                  </ScrollArea>
                </DialogContent>
              </Dialog>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setOpen(false)}
              >
                {dict.help.skip}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default Help;
