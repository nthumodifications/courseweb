import { getServerSession } from "next-auth";
import authConfig from "@/app/api/auth/[...nextauth]/authConfig";
import supabase_server from "@/config/supabase_server";

/**
 * Privacy Concern: This function is only available to logged in users.
 * Returns the list of students who are participating in the course.
 *
 * @param courseId raw id of the course
 * @returns list of students who are participating in the course, null if not logged in.
 */
export const getParticipatingStudents = async (courseId: string) => {
  // check if user is logged in and is inschool
  const session = await getServerSession(authConfig);
  if (!session?.user.inschool) return null;

  const { data, error } = await supabase_server
    .from("course_students")
    .select(`*`)
    .eq("course", courseId);
  if (error) {
    console.error(error);
    throw error;
  } else return data!;
};
