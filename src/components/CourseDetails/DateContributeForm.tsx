'use client';

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Edit2, Minus, MinusCircle, Plus, CalendarPlus } from 'lucide-react';
import { useEffect, useMemo, useState } from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input";
import { useFieldArray, useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query";
import { getContribDates, submitContribDates } from "@/lib/contrib_dates";
import { toast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

const schema = z.object({
    dates: z.array(z.object({
        id: z.number().optional(),
        type: z.union([z.literal("exam"), z.literal("quiz"), z.literal("no_class")]),
        title: z.string().min(1, "Title is required"),
        date: z.date()
    }))
});


const DateContributeForm = ({ courseId }: { courseId: string }) => {
    const [open, setOpen] = useState(false);

    const { data: existingDates, error, isLoading, refetch } = useQuery({
        queryKey: ["course", courseId, "dates"],
        queryFn: async () => {
            const res = await getContribDates(courseId);
            console.log('fetched dates', res)
            if (res == null) throw new Error("Failed to fetch dates");
            return res.map(d => ({
                id: d.id,
                title: d.title,
                type: d.type as "exam" | "quiz" | "no_class",
                date: new Date(d.date)
            }))
        },
    });

    useEffect(() => {
        if(open) refetch();
    }, [open]);

    const form = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        defaultValues: {
            dates: useMemo(() => existingDates ?? [], [existingDates])
        }
    });

    useEffect(() => {
        form.reset({ dates: existingDates ?? [] });
    }, [existingDates]);


    const { fields, append, prepend, remove, swap, move, insert } = useFieldArray({
        control: form.control, // control props comes from useForm (optional: if you are using FormProvider)
        name: "dates", // unique name for your Field Array,
    });

    const onSubmit = async (data: z.infer<typeof schema>) => {
        console.log(data)
        const submitDates = data.dates.map(d => ({
            id: d.id,
            type: d.type,
            title: d.title,
            date: format(d.date, "yyyy-MM-dd")
        }));
        const result = await submitContribDates(courseId, submitDates);
        if (typeof result == "object" && 'error' in result) {
            toast({
                title: "Failed to submit",
                description: result.error.message,
            });
            throw new Error(result.error.message);
        }
        setOpen(false);
        const newData = await refetch();
        form.reset({ dates: newData.data });
    }

    const disabled = isLoading || form.formState.isSubmitting;

    return <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
            <Button variant="outline" size="icon"><CalendarPlus /></Button>
        </DialogTrigger>
        <DialogContent>
            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold">Contribute Dates</h1>
                    <p className="text-sm text-muted-foreground">Contribute important dates to the course</p>
                </div>
                <Alert>
                    <Edit2 className="h-4 w-4" />
                    <AlertTitle>Don't abuse the system!</AlertTitle>
                    <AlertDescription>
                        <p>Enter only accurate and relevant information!</p>
                        <p>Your submission will contain your Student ID, and will be auditable on request.</p>
                    </AlertDescription>
                </Alert>
                <ScrollArea>
                    <Form {...form}>
                        <div className="flex flex-col gap-2">
                            {fields.map((field, index) => <div key={field.id} className="flex flex-row gap-2">
                                <FormField
                                    control={form.control}
                                    name={`dates.${index}.type`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Select defaultValue={field.value} value={field.value} onValueChange={field.onChange} disabled={disabled}>
                                                    <SelectTrigger className="w-[90px]">
                                                        <SelectValue placeholder="Type" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="exam">Exam</SelectItem>
                                                        <SelectItem value="quiz">Quiz</SelectItem>
                                                        <SelectItem value="no_class">No Class</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>)}
                                />
                                <FormField
                                    control={form.control}
                                    name={`dates.${index}.title`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input autoComplete="off" placeholder="Title" disabled={disabled} {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>)}
                                />
                                <FormField
                                    control={form.control}
                                    name={`dates.${index}.date`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Popover>
                                                    <PopoverTrigger asChild disabled={disabled}>
                                                        <Button
                                                            variant={"outline"}
                                                            className={cn(
                                                                "w-[180px] justify-start text-left font-normal",
                                                                !field.value && "text-muted-foreground"
                                                            )}
                                                        >
                                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0">
                                                        <Calendar
                                                            mode="single"
                                                            selected={field.value}
                                                            onSelect={field.onChange}
                                                            initialFocus
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>)}
                                />
                                <Button variant="destructive" size="icon" disabled={disabled} onClick={() => remove(index)}><MinusCircle className="w-4 h-4" /></Button>
                            </div>)}
                            <Button variant={'outline'} disabled={disabled} onClick={() => append({ type: "exam", title: "", date: new Date() })}><Plus className="mr-2" /> Add Date</Button>
                            <div className="flex flex-row gap-2 justify-end">
                                <Button variant={'outline'} onClick={() => form.reset()} disabled={disabled}>Reset</Button>
                                <Button type="submit" onClick={form.handleSubmit(onSubmit)} disabled={disabled}>Submit</Button>
                            </div>
                        </div>
                    </Form>
                </ScrollArea>
            </div>
        </DialogContent>
    </Dialog>
}

export default DateContributeForm;