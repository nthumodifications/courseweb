"use client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ReactNode, useState } from "react";
import useDictionary from "@/dictionaries/useDictionary";
import { LoginPage } from "./LoginPage";
import { ScrollArea } from "@/components/ui/scroll-area";

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
          <LoginPage onClose={() => setOpen(false)} />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default LoginDialog;
