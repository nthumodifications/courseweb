"use client";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

import { z } from "zod"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
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
    newPassword: z.string().min(8).max(16).refine((value) => {
        const hasLowerCase = /[a-z]/.test(value)
        const hasUpperCase = /[A-Z]/.test(value)
        const hasNumber = /[0-9]/.test(value)
        return hasLowerCase && hasUpperCase && hasNumber
    }, {
        message: "Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number",
    }),
})

const ChangePasswordDialog = ({ open, setOpen, children }: PropsWithChildren<{ open: boolean, setOpen: (s: boolean) => void }>) => {
    const { setAISCredentials, user } = useHeadlessAIS();
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            newPassword: "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (!user) return;
        await setAISCredentials(user.studentid, values.newPassword)
        setOpen(false);
        toast({
            title: "密碼更新成功",
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>更新密碼</DialogTitle>
                    <DialogDescription>同學~你好像在校務資訊系統有跟新密碼哦，請也在這邊跟新！</DialogDescription>
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
                        <Dialog open={open} onOpenChange={setOpen}>
                            <DialogTrigger asChild>
                                <Button variant='destructive'>Logout</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>確定要登出嗎？</DialogTitle>
                                    <DialogDescription>登出後將無法使用校務資訊系統相關功能，確定要登出嗎？</DialogDescription>
                                </DialogHeader>
                                <DialogClose asChild>
                                    <Button >Cancel</Button>
                                </DialogClose>
                                <DialogClose asChild>
                                    <Button variant='destructive' onClick={() => {
                                        setAISCredentials("", "")
                                        setOpen(false)
                                    }}>Logout</Button>
                                </DialogClose>
                            </DialogContent>
                        </Dialog>
                        <Button type="submit">{form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : "Submit"}</Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>

    )
}

export default ChangePasswordDialog;