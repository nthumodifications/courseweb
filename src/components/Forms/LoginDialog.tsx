'use client';
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ExternalLinkIcon } from "lucide-react"
import { useState } from "react"
import Link from "next/link"
import useDictionary from "@/dictionaries/useDictionary";
import { LoginPage } from "./LoginPage";

const LoginDialog = () => {
  const [open, setOpen] = useState(false);
  const dict = useDictionary();

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild>
      <Button variant="outline">{dict.ccxp.connect}</Button>
    </DialogTrigger>
    <DialogContent className="sm:max-w-[425px] h-screen">
      <LoginPage onClose={() => setOpen(false)} />
    </DialogContent>
  </Dialog>

}

export default LoginDialog