"use client";
import { Button } from "@courseweb/ui";
import { Dialog, DialogContent, DialogTrigger } from "@courseweb/ui";
import { ReactNode, useState } from "react";
import useDictionary from "@/dictionaries/useDictionary";
import { ScrollArea } from "@courseweb/ui";

const LoginDialog = ({ children }: { children?: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const dict = useDictionary();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ? (
          children
        ) : (
          <Button variant="outline">{dict.ccxp.connect}</Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] h-screen lg:h-auto w-full ">
        <ScrollArea className="h-full">
          <h1>Coming Soon</h1>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default LoginDialog;
