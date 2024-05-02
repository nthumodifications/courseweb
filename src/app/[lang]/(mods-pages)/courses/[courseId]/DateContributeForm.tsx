'use client';

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Edit2, Minus, MinusCircle, Plus } from "lucide-react";
import { useState } from "react";
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

const schema = z.object({
    dates: z.array(z.object({
        type: z.union([z.literal("exam"), z.literal("quiz"), z.literal("no_class")]),
        title: z.string().min(1, "Title is required"),
        date: z.date()
    }))
});


const DateContributeForm = () => {
    const form = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        defaultValues: {
            dates: []
        }
    });


    const { fields, append, prepend, remove, swap, move, insert } = useFieldArray({
        control: form.control, // control props comes from useForm (optional: if you are using FormProvider)
        name: "dates", // unique name for your Field Array,
    });

    const onSubmit = (data: z.infer<typeof schema>) => {
        console.log(data);
    }


    return <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold">Contribute Dates</h1>
            <p className="text-sm text-muted-foreground">Contribute important dates to the course</p>
        </div>
        <Alert>
            <Edit2 className="h-4 w-4" />
            <AlertTitle>Don't abuse the system!</AlertTitle>
            <AlertDescription>
                <p>Enter only accurate and relevant information!</p>
                <p>Your submission will contain your Student ID, and will be publicly visible.</p>
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
                                    <Select defaultValue={field.value} value={field.value} onValueChange={field.onChange}>
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
                                        <Input autoComplete="off" placeholder="Title" {...field}/>
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
                                            <PopoverTrigger asChild>
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
                        <Button variant="destructive" size="icon"  onClick={() => remove(index)}><MinusCircle className="w-4 h-4"/></Button>
                    </div>)}
                    <Button variant={'outline'} onClick={() => append({ type: "exam", title: "", date: new Date() })}><Plus className="mr-2"/> Add Date</Button>
                    <div className="flex flex-row gap-2 justify-end">
                        <Button variant={'outline'} onClick={() => form.reset()}>Reset</Button>
                        <Button type="submit" onClick={form.handleSubmit(onSubmit)}>Submit</Button>
                    </div>
                </div>
            </Form>
        </ScrollArea>
    </div>
}

export default DateContributeForm;