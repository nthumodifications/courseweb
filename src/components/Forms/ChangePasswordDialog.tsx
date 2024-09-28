"use client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { toast } from "../ui/use-toast";
import { updateUserPassword } from "@/lib/headless_ais";

// * 8~16字元
// * 至少包含1大寫英文字母
// * 至少包含1小寫英文字母
// * 至少包含1個數字
// * 密碼三代不重覆
const formSchema = z
  .object({
    oldPassword: z.string().min(8),
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
    confirmPassword: z.string().min(8).max(16),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
  });

const ChangePasswordDialog = ({ children }: PropsWithChildren) => {
  const { getACIXSTORE, signIn, user } = useHeadlessAIS();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return;
    const ACIXSTORE = await getACIXSTORE(true);

    if (!ACIXSTORE) {
      throw new Error("Login Failed!");
    }

    const res = await updateUserPassword(
      ACIXSTORE,
      values.oldPassword,
      values.newPassword,
    );

    if (!res) {
      throw new Error("Login Failed!");
    }

    const success = await signIn(user.studentid, values.newPassword);

    if (!success) {
      throw new Error("Login Failed!");
    }

    toast({
      title: "Password Updated!",
    });
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>跟新校務資訊系統密碼</DialogTitle>
          <DialogDescription>
            在這邊更新密碼會同時更新校務資訊系統的密碼哦~
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="oldPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Old Password</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Old Password"
                      type="password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="New Password"
                      type="password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Confirm Password"
                      type="password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit">Submit</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ChangePasswordDialog;
