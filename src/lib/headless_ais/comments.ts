"use server";
import supabase_server from "@/config/supabase_server";
import { revalidatePath } from "next/cache";
import { getStudentCourses } from "@/lib/headless_ais/courses";
import { CommentState } from "@/types/comments";
import { getCurrentUser } from "../firebase/auth";

export const getComments = async (courseId: string, page: number = 1) => {
  const user = await getCurrentUser();
  if (user == null) {
    throw new Error("User not authenticated");
  }

  const { data: course } = await supabase_server
    .from("courses")
    .select("*")
    .eq("raw_id", courseId)
    .single();

  if (!course) {
    throw new Error("Course not found");
  }

  const { data, error } = await supabase_server
    .from("course_comments")
    .select(
      "scoring, easiness, posted_on, comment, courses!inner(semester, department, course, raw_id, name_zh, name_en, teacher_en, teacher_zh)",
    )
    .eq("courses.department", course.department)
    .eq("courses.course", course.course)
    .containedBy("courses.teacher_zh", course.teacher_zh)
    .order("posted_on", { ascending: false })
    .range((page - 1) * 10, page * 10 - 1);

  if (error) throw error;
  if (!data) throw new Error("No data");
  console.log(data);
  return data;
};

export const getStudentCommentState = async (
  courseId: string,
  ACIXSTORE: string,
) => {
  const res = await getStudentCourses(ACIXSTORE);
  if (!res) {
    throw new Error("Failed to fetch student courses.");
  }
  if (await hasUserCommented(courseId)) return CommentState.Filled;
  if (res.courses.includes(courseId)) return CommentState.Enabled;
  else return CommentState.Disabled;
};

export const hasUserCommented = async (courseId: string) => {
  const user = await getCurrentUser();
  if (user == null) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase_server
    .from("course_comments")
    .select("id")
    .eq("raw_id", courseId)
    .eq("submitter", user.uid);

  if (error) throw error;
  return data?.length > 0;
};

export const getUserCommentsCourses = async () => {
  const user = await getCurrentUser();
  if (user == null) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase_server
    .from("course_comments")
    .select("raw_id")
    .eq("submitter", user.uid);

  if (error) throw error;
  if (!data) return [];
  return data.map((comment) => comment.raw_id);
};

export const postComment = async (
  courseId: string,
  ACIXSTORE: string,
  scoring: number,
  easiness: number,
  comment: string,
) => {
  const user = await getCurrentUser();
  if (user == null) {
    throw new Error("User not authenticated");
  }
  //! We will not parse the comment data for now, we will process it later on if needed
  // const parsedData = parseTemplate(commentText);
  // console.log(parsedData)
  // if (!parsedData) {
  //     throw new Error('Invalid comment data');
  // }

  if (await hasUserCommented(courseId)) {
    throw new Error("User has already commented");
  }

  const res = await getStudentCourses(ACIXSTORE);
  if (!res) {
    throw new Error("Failed to fetch student courses.");
  }
  if (!res.courses.includes(courseId)) {
    throw new Error("User has not taken this course");
  }

  const { data, error } = await supabase_server.from("course_comments").insert({
    raw_id: courseId,
    submitter: user.uid,
    scoring: scoring,
    easiness: easiness,
    comment: comment,
    posted_on: new Date().toISOString(),
  });

  if (error) {
    console.error("Error posting comment:", error);
    throw error;
  }

  console.log("Comment posted:", data);
  revalidatePath(`/en/courses/${courseId}`);
  revalidatePath(`/zh/courses/${courseId}`);
};

// const parseTemplate = (text: string): Partial<CommentData> => {
//     const templateKeys = {
//         'Scoring 甜度 (On 5 scale, where 1 is low and 5 is high satisfaction)': 'scoring',
//         'Easiness 涼度 (On 5 scale, where 1 is most difficult and 5 is easiest)': 'easiness',
//         'Does this course take attendance? (Yes/No)': 'attendance',
//         'Workload (Estimate the average hours per week spent on this course)': 'workload',
//         'Instructor\'s engagement (Does the instructor encourage questions and participation? Yes/No)': 'engagement',
//         'Availability of past year materials (Yes/No)': 'pastMaterials',
//         'Other Comments': 'comment'
//     };

//     const lines = text.split('-');
//     const data: Partial<CommentData> = {};

//     lines.forEach(line => {
//         const [key, value] = line.split(':').map(part => part.trim());
//         if (key in templateKeys && value !== '') {
//             const field = templateKeys[key as keyof typeof templateKeys];
//             switch (field) {
//                 case 'easiness':
//                 case 'scoring':
//                     const numericValue = parseInt(value, 10);
//                     if (!isNaN(numericValue) && numericValue >= 1 && numericValue <= 5) {
//                         data[field] = numericValue;
//                     }
//                     break;
//                 case 'attendance':
//                 case 'engagement':
//                 case 'pastMaterials':
//                     if (['yes', 'no'].includes(value.toLowerCase())) {
//                         data[field] = value.toLowerCase() === 'yes';
//                     }
//                     break;
//                 case 'workload':
//                 case 'comment':
//                     data[field] = value;
//                     break;
//                 default:
//                     break;
//             }
//         }
//     });

//     if (Object.keys(data).length === 0) {
//         data['comment'] = text;
//     }

//     return data;
// };
