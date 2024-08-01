"use client";
import {
    Dialog,
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

	

// * 8~16字元
// * 至少包含1大寫英文字母
// * 至少包含1小寫英文字母
// * 至少包含1個數字
// * 密碼三代不重覆
const formSchema = z.object({
    oldPassword: z.string().min(8),
    newPassword: z.string().min(8).max(16).refine((value) => {
        const hasLowerCase = /[a-z]/.test(value)
        const hasUpperCase = /[A-Z]/.test(value)
        const hasNumber = /[0-9]/.test(value)
        return hasLowerCase && hasUpperCase && hasNumber
    }, {
        message: "Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number",
    }),
    confirmPassword: z.string().min(8).max(16)
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
});

const UpdatePasswordDialog = () => {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            oldPassword: "",
            newPassword: "",
            confirmPassword: "",
        },
    })

    function onSubmit(values: z.infer<typeof formSchema>) {
        // Do something with the form values.
        // ✅ This will be type-safe and validated.
        console.log(values)
    }

    return (
        <Dialog>
            <DialogTrigger>Update Password</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Password Update</DialogTitle>
                    <DialogDescription>
                        Due to the perfect security of changing your password, we will help you to update your password, while logged in.
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
                                        <Input placeholder="password" {...field} />
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
                                        <Input placeholder="password" {...field} />
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
                                        <Input placeholder="password" {...field} />
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

    )
}

export default UpdatePasswordDialog;