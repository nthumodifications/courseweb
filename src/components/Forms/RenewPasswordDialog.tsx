"use client";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PropsWithChildren } from "react";
import { useHeadlessAIS } from "@/hooks/contexts/useHeadlessAIS";
import { Loader2 } from "lucide-react";
import { toast } from "../ui/use-toast";

// * 8~16字元
// * 至少包含1大寫英文字母
// * 至少包含1小寫英文字母
// * 至少包含1個數字
// * 密碼三代不重覆
const formSchema = z.object({
  newPassword: z
    .string()
    .min(8)
    .max(16)
    .refine(
      (value) => {
        const hasLowerCase = /[a-z]/.test(value);
        const hasUpperCase = /[A-Z]/.test(value);
        const hasNumber = /[0-9]/.test(value);
        return hasLowerCase && hasUpperCase && hasNumber;
      },
      {
        message:
          "Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number",
      },
    ),
});

const RenewPasswordDialog = ({
  open,
  setOpen,
  children,
}: PropsWithChildren<{ open: boolean; setOpen: (s: boolean) => void }>) => {
  const { signIn, signOut, user, isACIXSTOREValid } = useHeadlessAIS();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      newPassword: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return;
    const success = await signIn(user.studentid, values.newPassword);
    if (!success) {
      setOpen(false);
      toast({
        title: "密碼更新成功",
      });
    } else {
      toast({
        title: "密碼更新失敗",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild disabled={!isACIXSTOREValid}>
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>更新密碼</DialogTitle>
          <DialogDescription>
            同學~你好像在校務資訊系統有跟新密碼哦，請也在這邊跟新！
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input placeholder="Password" type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit">
                {form.formState.isSubmitting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  "Submit"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default RenewPasswordDialog;
