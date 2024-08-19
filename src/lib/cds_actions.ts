"use server";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import supabase_server from "@/config/supabase_server";
import authConfig from "@/app/api/auth/[...nextauth]/authConfig";
import { hasConflictingTimeslots, hasSameCourse } from "@/helpers/courses";
import { MinimalCourse, selectMinimalStr } from "@/types/courses";
import { SubmissionStatus } from "@/types/cds_courses";
import { CdsTermDefinition } from "@/config/supabase";
import { revalidatePath } from "next/cache";

export const getUserCdsSelections = async (term: string) => {
  const session = await getServerSession(authConfig);
  if (session == null || !session.user || !session.user.inschool)
    return redirect("/");

  //get user cds saves
  const { data: cdsSaves, error: error1 } = await supabase_server
    .from("cds_saves")
    .select("*")
    .eq("user_id", session.user.id)
    .eq("term", term);

  if (error1) throw error1;

  const selection = cdsSaves.length > 0 ? cdsSaves[0].selection : [];

  //get user selections
  const { data: preferenceCourses = [], error: error2 } = await supabase_server
    .from("courses")
    .select("*")
    .in("raw_id", selection);
  if (error2) throw error2;

  return preferenceCourses ?? [];
};

export const saveUserSelections = async (
  term: string,
  selections: string[],
) => {
  const session = await getServerSession(authConfig);
  if (session == null || !session.user || !session.user.inschool)
    return redirect("/");

  //get user cds saves
  const { data: cdsSaves, error: error1 } = await supabase_server
    .from("cds_saves")
    .select("*")
    .eq("user_id", session.user.id)
    .eq("term", term);

  if (error1) throw error1;

  //If previous save exists, update it, otherwise create a new one
  if (cdsSaves.length > 0) {
    const { error: error2 } = await supabase_server
      .from("cds_saves")
      .update({ selection: selections, updated_at: new Date().toISOString() })
      .eq("id", cdsSaves[0].id);
    if (error2) throw error2;
  } else {
    const { error: error2 } = await supabase_server
      .from("cds_saves")
      .insert({
        user_id: session.user.id,
        term: term,
        selection: selections,
        updated_at: new Date().toISOString(),
      });
    if (error2) throw error2;
  }
};

export const isUserSubmitted = async (term: string) => {
  const session = await getServerSession(authConfig);
  if (session == null || !session.user) return SubmissionStatus.NOT_LOGGED_IN;

  if (!session.user.inschool) return SubmissionStatus.NOT_ALLOWED;

  //get user cds saves
  const { data: cdsSubmissions, error: error1 } = await supabase_server
    .from("cds_submissions")
    .select("*")
    .eq("user_id", session.user.id)
    .eq("term", term);

  if (error1) throw error1;

  return cdsSubmissions.length > 0
    ? SubmissionStatus.SUBMITTED
    : SubmissionStatus.NOT_SUBMITTED;
};

export const submitUserSelections = async (
  term: string,
  selections: string[],
) => {
  const session = await getServerSession(authConfig);
  if (session == null || !session.user || !session.user.inschool)
    return redirect("/");

  //get course datas
  const { data: courses, error: error1 } = await supabase_server
    .from("courses")
    .select("*")
    .in("raw_id", selections);
  if (error1) throw error1;

  // const timeConflicts = hasConflictingTimeslots(courses as MinimalCourse[]);
  // if(timeConflicts.length > 0) throw new Error('Time conflicts detected');

  // const duplicateCourses = hasSameCourse(courses as MinimalCourse[]);
  // if(duplicateCourses.length > 0) throw new Error('Duplicate courses detected');

  // const MAX_COURSES = 5;
  // const exceededMaxCourses = courses.length > MAX_COURSES;
  // if(exceededMaxCourses) throw new Error('Exceeded max courses');

  //check if term is open
  const termObj = await getCurrentCdsTerm();
  const termOpen =
    new Date(termObj.starts) <= new Date() &&
    new Date(termObj.ends) >= new Date();
  if (!termOpen) throw new Error("Term is not open");
  //check if term is same
  const termSame = termObj.term === term;

  const MAX_COURSES = 5;

  const conflict1 = hasConflictingTimeslots(
    courses.filter((m) => m.semester == termObj.ref_sem) as MinimalCourse[],
  );
  if (conflict1.length > 0) throw new Error("Time conflicts detected");
  const conflict2 = hasConflictingTimeslots(
    courses.filter((m) => m.semester == termObj.ref_sem_2) as MinimalCourse[],
  );
  if (conflict2.length > 0) throw new Error("Time conflicts detected");
  const duplicates1 = hasSameCourse(
    courses.filter((m) => m.semester == termObj.ref_sem) as MinimalCourse[],
  );
  if (duplicates1.length > 0) throw new Error("Duplicate courses detected");
  const duplicates2 = hasSameCourse(
    courses.filter((m) => m.semester == termObj.ref_sem_2) as MinimalCourse[],
  );
  if (duplicates2.length > 0) throw new Error("Duplicate courses detected");
  const exceedesMaxCourses1 =
    courses.filter((m) => m.semester == termObj.ref_sem).length > MAX_COURSES;
  if (exceedesMaxCourses1) throw new Error("Exceeded max courses");
  const exceedesMaxCourses2 =
    courses.filter((m) => m.semester == termObj.ref_sem_2).length > MAX_COURSES;
  if (exceedesMaxCourses2) throw new Error("Exceeded max courses");

  //save user selections
  const { error: error2 } = await supabase_server
    .from("cds_submissions")
    .insert({
      user_id: session.user.id,
      name_en: session.user.name_en,
      name_zh: session.user.name_zh,
      email: session.user.email,
      term: term,
      selections: selections,
    });

  if (error2) throw error2;
  revalidatePath("/[lang]/cds", "page");
};

export const getSubmissionDetails = async (
  courseId: string,
  termObj: CdsTermDefinition,
) => {
  const { data, error } = await supabase_server
    .from("cds_submissions")
    .select("*")
    .eq("term", termObj.term)
    .overlaps("selections", [courseId]);

  if (error) {
    console.log(error);
    throw error;
  }
  return data;
};

export const getCDSCourseSubmissions = async (termObj: CdsTermDefinition) => {
  //get all courses where count exists and > 0
  const { data: courses, error: coursesError } = await supabase_server
    .from("courses")
    .select(`${selectMinimalStr}, capacity ,cds_counts!inner(count)`)
    .in("semester", [termObj.ref_sem, termObj.ref_sem_2])
    .gt("cds_counts.count", 0);

  if (coursesError) {
    console.log(coursesError);
    throw coursesError;
  }

  return courses;
};

export const getCurrentCdsTerm = async () => {
  // get last added term
  const { data, error } = await supabase_server
    .from("cds_terms")
    .select("*")
    .order("ends", { ascending: false })
    .limit(1)
    .single();
  if (error) throw error;
  if (!data) throw new Error("No term data");
  return data;
};

export const getCDSTerm = async (term: string) => {
  const { data, error } = await supabase_server
    .from("cds_terms")
    .select("*")
    .eq("term", term)
    .single();
  if (error) throw error;
  if (!data) throw new Error("No term data");
  return data;
};
