import React from "react";
import { useForm, Controller } from "react-hook-form";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useRxDB } from "rxdb-hooks";
import { MinimalCourse } from "@/types/courses";

interface CustomCourseFormValues {
  name: string;
  department: string;
  courseCode: string;
  classCode: string;
  credits: number;
  venues: string;
  times: string;
  teachers: string;
  language: string;
}

const CustomCourseDialog: React.FC = () => {
  const { control, handleSubmit, reset } = useForm<CustomCourseFormValues>();
  const db = useRxDB();

  const onSubmit = async (data: CustomCourseFormValues) => {
    const minimalCourse: MinimalCourse = {
      raw_id: `${data.department}${data.courseCode}${data.classCode}`,
      name_zh: data.name,
      name_en: data.name,
      semester: "2023",
      department: data.department,
      course: data.courseCode,
      class: data.classCode,
      credits: data.credits,
      venues: data.venues.split(","),
      times: data.times.split(","),
      teacher_zh: data.teachers.split(","),
      teacher_en: data.teachers.split(","),
      language: data.language as "中" | "英",
    };

    await db.items.insert({
      id: minimalCourse.raw_id,
      title: minimalCourse.name_zh,
      parent: "custom",
      credits: minimalCourse.credits,
      type: "custom",
      minimalCourse,
    });

    reset();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Add Custom Course</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Custom Course</DialogTitle>
        </DialogHeader>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <FormField
            control={control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Course Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="department"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="courseCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Course Code</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="classCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Class Code</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="credits"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Credits</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="venues"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Venues (comma separated)</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="times"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Times (comma separated)</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="teachers"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teachers (comma separated)</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="language"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Language</FormLabel>
                <FormControl>
                  <Select {...field}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="中">Chinese</SelectItem>
                      <SelectItem value="英">English</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit">Submit</Button>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CustomCourseDialog;
